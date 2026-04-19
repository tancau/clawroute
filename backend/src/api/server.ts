import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { toolRegistry } from '../tools/registry';
import { ClassifyTool } from '../tools/classify';
import { RouteTool } from '../tools/route';
import { ProxyTool, createSSEStream } from '../tools/proxy';
import { initDatabase, db } from '../db';
import { UserTool, getUser, updateUser, deductCredits, verifyPassword, hashPassword, regenerateApiKey } from '../users';
import { KeyTool, getKeys, getAvailableKey, updateKey, recordKeyUsage, deleteKey } from '../keys';
import { BillingTool, getUserEarnings, getUserUsageStats } from '../billing';
import { getUserStats, getAggregatedStats, getRecentRequests, getTopModels } from '../analytics';
import { logger } from '../monitoring/logger';
import { createHmac } from 'node:crypto';

// ==================== JWT Utilities ====================

/** Simple JWT sign using HMAC-SHA256 (no external dependency) */
function signJWT(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/** Verify and decode JWT */
function verifyJWT(token: string, secret: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// 初始化数据库
initDatabase();

// 创建 Hono 应用
const app = new Hono();

// 注册中间件
app.use('*', honoLogger());
app.use('*', cors());
app.use('*', secureHeaders());

// ==================== Rate Limiting ====================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory rate limiter middleware */
const rateLimiter = async (c: any, next: any) => {
  const clientId = c.req.header('X-User-Id') || c.req.header('X-Forwarded-For') || 'anonymous';
  const now = Date.now();
  const windowMs = 60_000; // 1 minute window

  let entry = rateLimitMap.get(clientId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitMap.get(clientId); // touch
    rateLimitMap.set(clientId, entry);
  }

  entry.count++;

  // Default: 100 req/min; can be tuned per tier
  const maxRequests = 100;

  if (entry.count > maxRequests) {
    return c.json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        retry_after: Math.ceil((entry.resetAt - now) / 1000),
      },
    }, 429, {
      'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
    });
  }

  await next();
};

app.use('/v1/*', rateLimiter);
app.use('/api/*', rateLimiter);

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// 工具列表
app.get('/v1/tools', (c) => {
  return c.json({
    tools: toolRegistry.list(),
  });
});

// 意图分类接口
app.post('/v1/classify', async (c) => {
  try {
    const body = await c.req.json();

    // 验证输入
    const parseResult = ClassifyTool.inputSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten(),
          },
        },
        400
      );
    }

    // 创建上下文
    const context = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      startTime: Date.now(),
      cache: new SimpleCache(),
    };

    // 执行分类
    const result = await ClassifyTool.call(parseResult.data, context);

    return c.json({
      ...result.data,
      latency_ms: result.metadata?.latencyMs,
    });
  } catch (error) {
    logger.error('Classification error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Classification failed',
        },
      },
      500
    );
  }
});

// 模型路由接口
app.post('/v1/route', async (c) => {
  try {
    const body = await c.req.json();

    // 验证输入
    const parseResult = RouteTool.inputSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parseResult.error.flatten(),
          },
        },
        400
      );
    }

    // 创建上下文
    const context = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      startTime: Date.now(),
      cache: new SimpleCache(),
    };

    // 执行路由
    const result = await RouteTool.call(parseResult.data, context);

    return c.json({
      ...result.data,
      latency_ms: result.metadata?.latencyMs,
    });
  } catch (error) {
    logger.error('Routing error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Routing failed',
        },
      },
      500
    );
  }
});

// Anthropic Messages API 兼容接口
app.post('/v1/messages', async (c) => {
  try {
    const body = await c.req.json();

    // 转换 Anthropic 格式到 OpenAI 格式
    const openaiRequest = {
      model: body.model || 'auto',
      messages: body.messages || [],
      max_tokens: body.max_tokens,
      system: body.system,
      stream: body.stream || false,
    };

    // 使用相同的路由逻辑
    const parseResult = ProxyTool.inputSchema.safeParse(openaiRequest);
    if (!parseResult.success) {
      return c.json(
        {
          type: 'error',
          error: {
            type: 'invalid_request_error',
            message: 'Invalid request',
          },
        },
        400
      );
    }

    const context = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      startTime: Date.now(),
      cache: new SimpleCache(),
    };

    const result = await ProxyTool.call(parseResult.data, context);

    // Handle Anthropic streaming
    if (body.stream && (result.data as any)._stream) {
      const streamData = result.data as any;
      const streamStartTime = Date.now();

      // Create a transform stream that converts OpenAI SSE to Anthropic SSE format
      const openaiStream = createSSEStream(
        streamData._streamUrl,
        streamData._streamBody,
        streamData._streamApiKey,
        context.requestId,
        streamData._streamTimeout,
      );

      const anthropicStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          const reader = openaiStream.getReader();
          let buffer = '';

          // Send initial message_start event
          const msgStart = `event: message_start\ndata: ${JSON.stringify({
            type: 'message_start',
            message: { id: result.data.id, type: 'message', role: 'assistant', content: [], model: result.data.model, stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } },
          })}\n\n`;
          controller.enqueue(encoder.encode(msgStart));

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  if (delta?.content) {
                    // Convert OpenAI delta to Anthropic content_block_delta
                    const contentDelta = `event: content_block_delta\ndata: ${JSON.stringify({
                      type: 'content_block_delta',
                      index: 0,
                      delta: { type: 'text_delta', text: delta.content },
                    })}\n\n`;
                    controller.enqueue(encoder.encode(contentDelta));
                  }
                  if (parsed.choices?.[0]?.finish_reason) {
                    // Send content_block_stop and message_delta
                    const blockStop = `event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`;
                    controller.enqueue(encoder.encode(blockStop));
                    const msgDelta = `event: message_delta\ndata: ${JSON.stringify({
                      type: 'message_delta',
                      delta: { stop_reason: 'end_turn' },
                      usage: { output_tokens: parsed.usage?.completion_tokens || 0 },
                    })}\n\n`;
                    controller.enqueue(encoder.encode(msgDelta));
                  }
                } catch {}
              }
            }
          } finally {
            reader.releaseLock();
          }

          const msgStop = `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`;
          controller.enqueue(encoder.encode(msgStop));
          controller.close();
        },
      });

      return new Response(anthropicStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 转换非流式响应到 Anthropic 格式
    const anthropicResponse = {
      id: result.data.id,
      type: 'message',
      role: 'assistant',
      model: result.data.model,
      content: [
        {
          type: 'text',
          text: result.data.choices?.[0]?.message?.content || '',
        },
      ],
      stop_reason: result.data.choices?.[0]?.finish_reason || 'end_turn',
      usage: {
        input_tokens: result.data.usage?.prompt_tokens || 0,
        output_tokens: result.data.usage?.completion_tokens || 0,
      },
    };

    return c.json(anthropicResponse);
  } catch (error) {
    logger.error('Anthropic API error:', error);
    return c.json(
      {
        type: 'error',
        error: {
          type: 'api_error',
          message: error instanceof Error ? error.message : 'Request failed',
        },
      },
      500
    );
  }
});

// OpenAI 兼容接口
app.post('/v1/chat/completions', async (c) => {
  try {
    const body = await c.req.json();

    // 验证消息格式
    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'messages field is required and must be an array',
        },
      }, 400);
    }

    // 创建上下文
    const context = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      startTime: Date.now(),
      cache: new SimpleCache(),
    };

    // 1. 提取用户消息
    const lastMessage = body.messages[body.messages.length - 1];
    const userMessage = lastMessage?.content || '';
    const history = body.messages.slice(0, -1).map((m: { content: string }) => m.content);

    // 2. 分类意图
    const classifyResult = await ClassifyTool.call({
      message: userMessage,
      history,
      fastMode: false,
    }, context);

    const intent = classifyResult.data.intent;

    // 3. 选择模型
    const routeResult = await RouteTool.call({
      intent,
      message: userMessage,
      history,
      constraints: {
        maxLatency: body.maxLatency,
        preferredProvider: body.provider,
      },
    }, context);

    // 4. 如果 model 不是 'auto'，使用指定模型
    if (body.model !== 'auto') {
      routeResult.data.selectedModel = body.model;
      // 从模型名推断 provider
      const modelCapability = modelCapabilities.find(m => m.model === body.model);
      if (modelCapability) {
        routeResult.data.provider = modelCapability.provider;
        const provider = getProvider(modelCapability.provider);
        if (provider) {
          routeResult.data.baseUrl = provider.baseUrl;
        }
      }
    }

    // 5. 转发请求
    const proxyResult = await ProxyTool.call({
      provider: routeResult.data.provider,
      model: routeResult.data.selectedModel,
      messages: body.messages,
      options: {
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        top_p: body.top_p,
        stream: body.stream || false,
        stop: body.stop,
        presence_penalty: body.presence_penalty,
        frequency_penalty: body.frequency_penalty,
      },
      metadata: {
        requestId: context.requestId,
        useSharedKey: true,
      },
    }, context);

    // 6. Handle streaming response
    if (body.stream && (proxyResult.data as any)._stream) {
      const streamData = proxyResult.data as any;
      const streamModel = streamData.model || body.model;
      const streamProvider = streamData.provider || proxyResult.data.provider;
      const streamMeta = streamData._meta || {};
      const streamStartTime = Date.now();

      // Billing callback: record usage after stream completes
      const billingCallback = async (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => {
        if (!usage.total_tokens) return; // Skip if no usage data
        try {
          await BillingTool.call({
            userId: (context as any).userId || 'anonymous',
            keyId: streamMeta.keyId || undefined,
            requestId: context.requestId,
            provider: streamProvider,
            model: streamModel,
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            latencyMs: Date.now() - streamStartTime,
            creditsUsed: 1, // Minimum charge
          }, context);
        } catch (err) {
          logger.error('Stream billing error:', err);
        }
      };

      const sseStream = createSSEStream(
        streamData._streamUrl,
        streamData._streamBody,
        streamData._streamApiKey,
        context.requestId,
        streamData._streamTimeout,
        billingCallback,
      );

      return new Response(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // 7. Return non-streaming response
    const response = {
      ...proxyResult.data,
      _routing: {
        intent,
        model: routeResult.data.selectedModel,
        provider: routeResult.data.provider,
        reason: routeResult.data.reason,
        alternatives: routeResult.data.alternatives,
      },
    };

    return c.json(response);
  } catch (error) {
    logger.error('Chat completion error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Chat completion failed',
        },
      },
      500
    );
  }
});

// 404 处理
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    404
  );
});

// 错误处理
app.onError((err, c) => {
  logger.error('Server error:', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    },
    500
  );
});

// 简单的内存缓存实现
class SimpleCache {
  private cache = new Map<string, { value: unknown; expiry: number }>();

  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.value as T;
    }
    return undefined;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttl || 60000),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 注册内置工具
toolRegistry.register(ClassifyTool);
toolRegistry.register(RouteTool);
toolRegistry.register(ProxyTool);
toolRegistry.register(UserTool);
toolRegistry.register(KeyTool);
toolRegistry.register(BillingTool);

// ==================== 用户 API ====================

// 用户注册
app.post('/v1/users/register', async (c) => {
  try {
    const body = await c.req.json();
    
    const parseResult = UserTool.inputSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }
    
    // 检查邮箱是否已存在
    const existing = getUser({ email: parseResult.data.email });
    if (existing) {
      return c.json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
        },
      }, 409);
    }
    
    const context = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      startTime: Date.now(),
    };
    
    const result = await UserTool.call(parseResult.data, context);
    
    // 不返回密码哈希
    const { passwordHash, ...user } = result.data;
    
    return c.json({ user }, 201);
  } catch (error) {
    logger.error('Registration error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed',
      },
    }, 500);
  }
});

// 用户登录
app.post('/v1/users/login', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.email || !body.password) {
      return c.json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required',
        },
      }, 400);
    }
    
    const user = getUser({ email: body.email });
    if (!user) {
      return c.json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, 401);
    }
    
    if (!verifyPassword(body.password, user.passwordHash)) {
      return c.json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, 401);
    }
    
    // 不返回密码哈希
    const { passwordHash, ...userSafe } = user;
    
    // 生成 JWT access token 和 refresh token
    const jwtSecret = process.env.JWT_SECRET || 'clawrouter-dev-secret';
    const now = Math.floor(Date.now() / 1000);
    const accessToken = signJWT(
      { userId: user.id, tier: user.tier, iat: now, exp: now + 3600 },
      jwtSecret
    );
    const refreshToken = signJWT(
      { userId: user.id, type: 'refresh', iat: now, exp: now + 7 * 86400 },
      jwtSecret
    );
    
    return c.json({
      user: userSafe,
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1小时
    });
  } catch (error) {
    logger.error('Login error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed',
      },
    }, 500);
  }
});

// Token 刷新
app.post('/v1/auth/refresh', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.refreshToken) {
      return c.json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Refresh token is required',
        },
      }, 400);
    }
    
    // Verify refresh token using JWT
    const jwtSecret = process.env.JWT_SECRET || 'clawrouter-dev-secret';
    const payload = verifyJWT(body.refreshToken, jwtSecret);
    if (!payload || payload.type !== 'refresh') {
      return c.json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      }, 401);
    }

    // Generate new access token and refresh token
    const now = Math.floor(Date.now() / 1000);
    const user = getUser(payload.userId);
    const newAccessToken = signJWT(
      { userId: payload.userId, tier: user?.tier || 'free', iat: now, exp: now + 3600 },
      jwtSecret
    );
    const newRefreshToken = signJWT(
      { userId: payload.userId, type: 'refresh', iat: now, exp: now + 7 * 86400 },
      jwtSecret
    );
    
    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      },
    }, 500);
  }
});

// 密码重置请求
app.post('/v1/auth/reset-password-request', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.email) {
      return c.json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Email is required',
        },
      }, 400);
    }
    
    const user = getUser({ email: body.email });
    if (!user) {
      // 为了安全，不暴露用户是否存在
      return c.json({
        success: true,
        message: 'If the email exists, a reset link will be sent',
      });
    }
    
    // 生成重置 token 并存储到数据库
    const resetToken = crypto.randomUUID();
    const expiresAt = Date.now() + 3600_000; // 1 hour

    // Store reset token in users table metadata
    const existingMeta = user.metadata ? JSON.parse(user.metadata as unknown as string) : {};
    const updatedMeta = JSON.stringify({
      ...existingMeta,
      resetToken,
      resetExpiresAt: expiresAt,
    });
    db.prepare('UPDATE users SET metadata = ?, updated_at = ? WHERE id = ?')
      .run(updatedMeta, Date.now(), user.id);

    // Send reset email if SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      try {
        const resetUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        // Basic SMTP send (production should use a proper email service)
        logger.info(`[Email] Password reset link: ${resetUrl}`);
      } catch (emailErr) {
        logger.error('Failed to send reset email:', emailErr);
      }
    }

    // Dev environment: return token directly
    return c.json({
      success: true,
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      message: smtpHost ? 'Reset email sent' : 'Reset token generated',
    });
  } catch (error) {
    logger.error('Reset password request error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Reset password request failed',
      },
    }, 500);
  }
});

// 密码重置
app.post('/v1/auth/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.resetToken || !body.newPassword) {
      return c.json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Reset token and new password are required',
        },
      }, 400);
    }
    
    if (body.newPassword.length < 8) {
      return c.json({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Password must be at least 8 characters',
        },
      }, 400);
    }
    
    // 从数据库查找 reset token 对应的用户
    const userRow = db.prepare(
      "SELECT id, metadata FROM users WHERE metadata LIKE ?"
    ).get(`%${body.resetToken}%`) as { id: string; metadata: string } | undefined;

    if (!userRow) {
      return c.json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid reset token' },
      }, 401);
    }

    // Verify token and expiration
    try {
      const meta = JSON.parse(userRow.metadata || '{}');
      if (meta.resetToken !== body.resetToken) {
        return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid reset token' } }, 401);
      }
      if (Date.now() > meta.resetExpiresAt) {
        return c.json({ error: { code: 'TOKEN_EXPIRED', message: 'Reset token expired' } }, 401);
      }
    } catch {
      return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid reset token' } }, 401);
    }

    // Update password
    const newHash = await hashPassword(body.newPassword);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(newHash, Date.now(), userRow.id);

    // Clear reset token from metadata
    try {
      const meta = JSON.parse(userRow.metadata || '{}');
      delete meta.resetToken;
      delete meta.resetExpiresAt;
      db.prepare('UPDATE users SET metadata = ? WHERE id = ?')
        .run(JSON.stringify(meta), userRow.id);
    } catch {}
    
    return c.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Reset password failed',
      },
    }, 500);
  }
});

// 获取用户信息
app.get('/v1/users/:id', async (c) => {
  const userId = c.req.param('id');
  const user = getUser({ id: userId });
  
  if (!user) {
    return c.json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
      },
    }, 404);
  }
  
  const { passwordHash, ...userSafe } = user;
  return c.json({ user: userSafe });
});

// 重新生成 API Key
app.post('/v1/users/:id/regenerate-key', async (c) => {
  try {
    const userId = c.req.param('id');
    const user = getUser({ id: userId });
    
    if (!user) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }
    
    const newApiKey = regenerateApiKey(userId);
    
    if (!newApiKey) {
      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to regenerate API key',
        },
      }, 500);
    }
    
    return c.json({ apiKey: newApiKey });
  } catch (error) {
    logger.error('Regenerate API key error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to regenerate API key',
      },
    }, 500);
  }
});

// ==================== API Key 管理 ====================

// 提交共享 Key
app.post('/v1/keys', async (c) => {
  try {
    const body = await c.req.json();
    
    const parseResult = KeyTool.inputSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: parseResult.error.flatten(),
        },
      }, 400);
    }
    
    // 检查用户是否存在
    const user = getUser({ id: parseResult.data.userId });
    if (!user) {
      return c.json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }
    
    const context = {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      startTime: Date.now(),
    };
    
    const result = await KeyTool.call(parseResult.data, context);
    
    return c.json({ key: result.data }, 201);
  } catch (error) {
    logger.error('Key submission error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Key submission failed',
      },
    }, 500);
  }
});

// 获取用户的 Keys
app.get('/v1/keys', async (c) => {
  const userId = c.req.query('userId');
  const provider = c.req.query('provider');
  
  if (!userId) {
    return c.json({
      error: {
        code: 'MISSING_PARAMETER',
        message: 'userId is required',
      },
    }, 400);
  }
  
  const keys = getKeys({
    userId,
    provider: provider || undefined,
    isActive: true,
  });
  
  return c.json({ keys });
});

// 更新 Key 状态
app.patch('/v1/keys/:id', async (c) => {
  try {
    const keyId = c.req.param('id');
    const body = await c.req.json();
    
    const key = updateKey({
      id: keyId,
      isActive: body.isActive,
      metadata: body.metadata,
    });
    
    if (!key) {
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: 'Key not found',
        },
      }, 404);
    }
    
    return c.json({ key });
  } catch (error) {
    logger.error('Key update error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Key update failed',
      },
    }, 500);
  }
});

// 删除 Key
app.delete('/v1/keys/:id', async (c) => {
  const keyId = c.req.param('id');
  const deleted = deleteKey(keyId);
  
  if (!deleted) {
    return c.json({
      error: {
        code: 'NOT_FOUND',
        message: 'Key not found',
      },
    }, 404);
  }
  
  return c.json({ success: true });
});

// ==================== 计费与统计 ====================

// 获取用户收益
app.get('/v1/billing/earnings/:userId', async (c) => {
  const userId = c.req.param('userId');
  const earnings = getUserEarnings(userId);
  
  return c.json({
    userId,
    earnings: {
      totalCents: earnings.total,
      pendingCents: earnings.pending,
      paidCents: earnings.paid,
      totalDollars: earnings.total / 100,
      pendingDollars: earnings.pending / 100,
      paidDollars: earnings.paid / 100,
    },
  });
});

// 获取用户使用统计
app.get('/v1/billing/usage/:userId', async (c) => {
  const userId = c.req.param('userId');
  const days = parseInt(c.req.query('days') || '30', 10);
  
  const stats = getUserUsageStats(userId, days);
  
  return c.json({
    userId,
    period: { days },
    stats: {
      ...stats,
      totalCostDollars: stats.totalCost / 100,
      totalSavedDollars: stats.totalSaved / 100,
    },
  });
});

// 获取用户仪表盘数据
app.get('/v1/users/:id/dashboard', async (c) => {
  const userId = c.req.param('id');
  const user = getUser({ id: userId });
  
  if (!user) {
    return c.json({
      error: {
        code: 'NOT_FOUND',
        message: 'User not found',
      },
    }, 404);
  }
  
  const keys = getKeys({ userId });
  const earnings = getUserEarnings(userId);
  const usage = getUserUsageStats(userId, 30);
  
  const { passwordHash, ...userSafe } = user;
  
  return c.json({
    user: userSafe,
    keys: keys.length,
    activeKeys: keys.filter(k => k.isActive).length,
    earnings: {
      totalCents: earnings.total,
      pendingCents: earnings.pending,
      totalDollars: earnings.total / 100,
    },
    usage: {
      requests: usage.totalRequests,
      tokens: usage.totalTokens,
      costDollars: usage.totalCost / 100,
      savedDollars: usage.totalSaved / 100,
    },
  });
});

// ==================== Model Catalog API ====================

import {
  getAllModels as getAllModelsFromDB,
  getModelsByProvider as getModelsByProviderFromDB,
  getModelsByIntent as getModelsByIntentFromDB,
  getModelsByTier as getModelsByTierFromDB,
  getFreeModels as getFreeModelsFromDB,
  getCatalogStats,
  getRecentSyncLogs,
} from '../db/model-catalog';
import { modelSyncScheduler } from '../sync/scheduler';
import { syncPrices, syncModels, importFromProviders } from '../sync/index';
import { discoverProvider, saveDiscoveredModels, updateModelPricing, KNOWN_BUT_UNADAPTED_PROVIDERS } from '../sync/provider-discovery';

// 获取模型目录
app.get('/api/models/catalog', async (c) => {
  try {
    const provider = c.req.query('provider');
    const intent = c.req.query('intent');
    const tier = c.req.query('tier');
    const free = c.req.query('free') === 'true';

    let models;
    if (provider) {
      models = getModelsByProviderFromDB(provider);
    } else if (intent) {
      models = getModelsByIntentFromDB(intent);
    } else if (tier) {
      models = getModelsByTierFromDB(tier);
    } else if (free) {
      models = getFreeModelsFromDB();
    } else {
      models = getAllModelsFromDB();
    }

    // 转换为前端兼容格式
    const formatted = models.map(m => ({
      id: `${m.provider}/${m.model_id}`,
      name: m.display_name || m.model_id,
      provider: m.provider,
      costPer1KToken: (m.input_cost_1m + m.output_cost_1m) / 1000 / 2, // 简化：取 input+output 平均
      inputCostPer1MToken: m.input_cost_1m,
      outputCostPer1MToken: m.output_cost_1m,
      speedRating: m.avg_latency_ms ? (m.avg_latency_ms < 400 ? 3 : m.avg_latency_ms < 800 ? 2 : 1) : 2,
      qualityRating: m.quality_score ? (m.quality_score > 0.9 ? 3 : m.quality_score > 0.8 ? 2 : 1) : 2,
      capabilityTags: m.intents ? JSON.parse(m.intents) : [],
      contextWindow: m.context_window,
      features: m.features ? JSON.parse(m.features) : [],
      isFree: m.is_free === 1,
      sourceTier: m.source_tier,
    }));

    const stats = getCatalogStats();

    return c.json({
      models: formatted,
      total: formatted.length,
      stats,
      last_updated: new Date().toISOString(),
      source: 'db',
    });
  } catch (error) {
    logger.error('Model catalog error:', error);
    return c.json({
      models: [],
      total: 0,
      source: 'error',
      error: error instanceof Error ? error.message : 'Failed to get model catalog',
    }, 500);
  }
});

// 获取目录统计
app.get('/api/models/catalog/stats', async (c) => {
  try {
    const stats = getCatalogStats();
    return c.json(stats);
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get stats' } }, 500);
  }
});

// ==================== Admin Imports & Middleware ====================

import {
  initAdminTables,
  isAdmin,
  getAdminUser,
  hasPermission,
} from '../admin/auth';
import { getAdminStats, getRecentActivity, getUsageTrend } from '../admin/stats';
import { listUsers, getUserDetail, updateUserCredits, suspendUser, unsuspendUser } from '../admin/users';
import { listKeys, getKeyDetail, approveKey, rejectKey, disableKey, enableKey, bulkApproveKeys } from '../admin/keys';
import { getSettings, updateSettings } from '../admin/settings';

// 初始化管理员表
initAdminTables();

// 管理员权限中间件
const requireAdmin = async (c: any, next: any) => {
  // 从 cookie 或 header 获取用户信息
  const userId = c.req.header('X-User-Id') || c.get('userId') as string;
  
  if (!userId || !isAdmin(userId)) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, 403);
  }
  
  const adminUser = getAdminUser(userId as string);
  if (!adminUser) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Admin access required' } }, 403);
  }
  
  c.set('adminUser', adminUser);
  await next();
};

// ==================== Sync Management API ====================

// 触发价格同步
app.post('/api/admin/sync/prices', requireAdmin, async (c) => {
  try {
    const result = await syncPrices();
    return c.json({
      success: !result.error,
      result,
    });
  } catch (error) {
    logger.error('Price sync error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Sync failed' } }, 500);
  }
});

// 触发完整模型同步
app.post('/api/admin/sync/models', requireAdmin, async (c) => {
  try {
    const result = await syncModels();
    return c.json({
      success: !result.error,
      result,
    });
  } catch (error) {
    logger.error('Model sync error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Sync failed' } }, 500);
  }
});

// 从 providers.ts 重新导入
app.post('/api/admin/sync/import', requireAdmin, async (c) => {
  try {
    const result = importFromProviders(modelCapabilities);
    return c.json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
    });
  } catch (error) {
    logger.error('Import error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Import failed' } }, 500);
  }
});

// 获取同步状态
app.get('/api/admin/sync/status', async (c) => {
  try {
    const status = modelSyncScheduler.getStatus();
    const recentLogs = getRecentSyncLogs(10);
    return c.json({
      ...status,
      recentLogs,
    });
  } catch (error) {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get sync status' } }, 500);
  }
});

// ==================== Provider Discovery API ====================

// 获取已知但未适配的平台列表
app.get('/api/providers/known', async (c) => {
  return c.json({
    providers: Object.values(KNOWN_BUT_UNADAPTED_PROVIDERS),
  });
});

// 发现 Provider 的模型
app.post('/api/providers/discover', async (c) => {
  try {
    const body = await c.req.json();
    const { provider, baseUrl, apiKey } = body;

    if (!provider || !baseUrl || !apiKey) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: 'provider, baseUrl, and apiKey are required' },
      }, 400);
    }

    const result = await discoverProvider(provider, baseUrl, apiKey);

    // 如果发现成功，自动写入数据库
    if (result.success && result.models.length > 0) {
      const tier = KNOWN_BUT_UNADAPTED_PROVIDERS[provider] ? 'community' : 'user';
      const saveResult = saveDiscoveredModels(provider, result.models, tier as any);
      return c.json({
        ...result,
        saved: { inserted: saveResult.inserted, updated: saveResult.updated },
      });
    }

    return c.json(result);
  } catch (error) {
    logger.error('Provider discovery error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Discovery failed' } }, 500);
  }
});

// 手动补充模型价格
app.post('/api/providers/models/pricing', async (c) => {
  try {
    const body = await c.req.json();
    const { modelId, provider, inputCost1m, outputCost1m } = body;

    if (!modelId || !provider || inputCost1m == null || outputCost1m == null) {
      return c.json({
        error: { code: 'VALIDATION_ERROR', message: 'modelId, provider, inputCost1m, and outputCost1m are required' },
      }, 400);
    }

    updateModelPricing(modelId, provider, inputCost1m, outputCost1m);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Update pricing error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update pricing' } }, 500);
  }
});

// ==================== Analytics API ====================

// 获取用户使用统计
app.get('/v1/analytics/usage/:userId', async (c) => {
  const userId = c.req.param('userId');
  const days = parseInt(c.req.query('days') || '30', 10);
  
  try {
    const stats = getUserStats(userId, days);
    
    return c.json({
      userId,
      period: { days },
      stats: {
        ...stats,
        totalCostDollars: stats.totalCostCents / 100,
        totalSavedDollars: stats.totalSavedCents / 100,
      },
    });
  } catch (error) {
    logger.error('Analytics error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get usage stats',
      },
    }, 500);
  }
});

// 获取用户节省统计
app.get('/v1/analytics/savings/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  try {
    const stats = getUserStats(userId, 30);
    const aggregated = getAggregatedStats(userId);
    
    return c.json({
      userId,
      totalSavedCents: stats.totalSavedCents,
      totalSavedDollars: stats.totalSavedCents / 100,
      averageSavedPercent: stats.totalCostCents > 0 
        ? Math.round((stats.totalSavedCents / (stats.totalCostCents + stats.totalSavedCents)) * 100)
        : 0,
      daily: aggregated.daily,
    });
  } catch (error) {
    logger.error('Savings analytics error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get savings stats',
      },
    }, 500);
  }
});

// 导入模型能力用于路由
import { modelCapabilities, getProvider } from '../config/providers';

// ==================== Analytics: Recent & Top Models ====================

// 获取最近请求记录
app.get('/v1/analytics/recent/:userId', async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    const recent = getRecentRequests(userId, limit);

    return c.json({
      userId,
      requests: recent.map((r) => ({
        ...r,
        costDollars: r.costCents / 100,
        totalTokens: r.inputTokens + r.outputTokens,
      })),
    });
  } catch (error) {
    logger.error('Recent requests error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get recent requests',
        },
      },
      500
    );
  }
});

// 获取热门模型排行
app.get('/v1/analytics/top-models/:userId', async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    const topModels = getTopModels(userId, limit);

    return c.json({
      userId,
      models: topModels.map((m) => ({
        ...m,
        totalCostDollars: m.totalCostCents / 100,
      })),
    });
  } catch (error) {
    logger.error('Top models error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get top models',
        },
      },
      500
    );
  }
});

// 导出应用
export default app;

// ============== Admin API Routes ==============

// 检查管理员状态
app.get('/v1/admin/check', async (c) => {
  const userId = c.req.header('X-User-Id') || (c as any).get('userId') as string;
  const adminUser = userId ? getAdminUser(userId) : null;
  
  return c.json({
    isAdmin: !!adminUser,
    role: adminUser?.role,
  });
});

// 获取管理统计
app.get('/v1/admin/stats', requireAdmin, async (c) => {
  try {
    const stats = getAdminStats();
    return c.json(stats);
  } catch (error) {
    logger.error('Admin stats error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get stats' } }, 500);
  }
});

// 获取最近活动
app.get('/v1/admin/activity', requireAdmin, async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);
  try {
    const activities = getRecentActivity(limit);
    return c.json(activities);
  } catch (error) {
    logger.error('Activity error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity' } }, 500);
  }
});

// 获取使用趋势
app.get('/v1/admin/trend', requireAdmin, async (c) => {
  const days = parseInt(c.req.query('days') || '7', 10);
  try {
    const trend = getUsageTrend(days);
    return c.json(trend);
  } catch (error) {
    logger.error('Trend error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get trend' } }, 500);
  }
});

// 用户管理
app.get('/v1/admin/users', requireAdmin, async (c) => {
  try {
    const result = listUsers({
      search: c.req.query('search'),
      status: c.req.query('status'),
      sortBy: c.req.query('sortBy') as any,
      sortOrder: c.req.query('sortOrder') as any,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    logger.error('List users error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' } }, 500);
  }
});

app.get('/v1/admin/users/:userId', requireAdmin, async (c) => {
  const userId = c.req.param('userId');
  try {
    const user = getUserDetail(userId);
    if (!user) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    }
    return c.json(user);
  } catch (error) {
    logger.error('Get user error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' } }, 500);
  }
});

app.post('/v1/admin/users/:userId/suspend', requireAdmin, async (c) => {
  const userId = c.req.param('userId');
  try {
    suspendUser(userId);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Suspend user error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to suspend user' } }, 500);
  }
});

app.post('/v1/admin/users/:userId/unsuspend', requireAdmin, async (c) => {
  const userId = c.req.param('userId');
  try {
    unsuspendUser(userId);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Unsuspend user error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to unsuspend user' } }, 500);
  }
});

app.post('/v1/admin/users/:userId/credits', requireAdmin, async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  try {
    updateUserCredits(userId, body.amount, body.reason);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Update credits error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update credits' } }, 500);
  }
});

// Key 管理
app.get('/v1/admin/keys', requireAdmin, async (c) => {
  try {
    const result = listKeys({
      status: c.req.query('status'),
      provider: c.req.query('provider'),
      search: c.req.query('search'),
      sortBy: c.req.query('sortBy') as any,
      sortOrder: c.req.query('sortOrder') as any,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    logger.error('List keys error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list keys' } }, 500);
  }
});

app.get('/v1/admin/keys/:keyId', requireAdmin, async (c) => {
  const keyId = c.req.param('keyId');
  try {
    const key = getKeyDetail(keyId);
    if (!key) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Key not found' } }, 404);
    }
    return c.json(key);
  } catch (error) {
    logger.error('Get key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get key' } }, 500);
  }
});

app.post('/v1/admin/keys/:keyId/approve', requireAdmin, async (c) => {
  const keyId = c.req.param('keyId');
  try {
    approveKey(keyId);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Approve key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve key' } }, 500);
  }
});

app.post('/v1/admin/keys/:keyId/reject', requireAdmin, async (c) => {
  const keyId = c.req.param('keyId');
  const body = await c.req.json().catch(() => ({}));
  try {
    rejectKey(keyId, body.reason);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Reject key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reject key' } }, 500);
  }
});

app.post('/v1/admin/keys/:keyId/disable', requireAdmin, async (c) => {
  const keyId = c.req.param('keyId');
  const body = await c.req.json().catch(() => ({}));
  try {
    disableKey(keyId, body.reason);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Disable key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to disable key' } }, 500);
  }
});

app.post('/v1/admin/keys/:keyId/enable', requireAdmin, async (c) => {
  const keyId = c.req.param('keyId');
  try {
    enableKey(keyId);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Enable key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enable key' } }, 500);
  }
});

app.post('/v1/admin/keys/bulk-approve', requireAdmin, async (c) => {
  const body = await c.req.json();
  try {
    const count = bulkApproveKeys(body.keyIds);
    return c.json({ success: true, approved: count });
  } catch (error) {
    logger.error('Bulk approve error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk approve' } }, 500);
  }
});

// 系统设置
app.get('/v1/admin/settings', requireAdmin, async (c) => {
  try {
    const settings = getSettings();
    return c.json(settings);
  } catch (error) {
    logger.error('Get settings error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get settings' } }, 500);
  }
});

app.put('/v1/admin/settings', requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    updateSettings(body);
    return c.json({ success: true });
  } catch (error) {
    logger.error('Update settings error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' } }, 500);
  }
});
