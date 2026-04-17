import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { toolRegistry } from '../tools/registry';
import { ClassifyTool } from '../tools/classify';
import { RouteTool } from '../tools/route';
import { ProxyTool } from '../tools/proxy';
import { initDatabase } from '../db';
import { UserTool, getUser, updateUser, deductCredits, verifyPassword } from '../users';
import { KeyTool, getKeys, getAvailableKey, updateKey, recordKeyUsage, deleteKey } from '../keys';
import { BillingTool, getUserEarnings, getUserUsageStats } from '../billing';
import { getUserStats, getAggregatedStats, getRecentRequests, getTopModels } from '../analytics';

// 初始化数据库
initDatabase();

// 创建 Hono 应用
const app = new Hono();

// 注册中间件
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());

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
    console.error('Classification error:', error);
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
    console.error('Routing error:', error);
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

    // 转换响应到 Anthropic 格式
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
    console.error('Anthropic API error:', error);
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

    // 6. 返回响应
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
    console.error('Chat completion error:', error);
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
  console.error('Server error:', err);
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
    console.error('Registration error:', error);
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
    
    // 生成 access token 和 refresh token
    const accessToken = `at_${crypto.randomUUID()}`;
    const refreshToken = `rt_${crypto.randomUUID()}_${Date.now()}`;
    
    return c.json({
      user: userSafe,
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1小时
    });
  } catch (error) {
    console.error('Login error:', error);
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
    
    // 验证 refresh token 格式
    const parts = body.refreshToken.split('_');
    if (parts.length < 3 || parts[0] !== 'rt') {
      return c.json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
        },
      }, 401);
    }
    
    // 检查 token 是否过期（假设 7 天有效期）
    const tokenTime = parseInt(parts[2], 10);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    if (Date.now() - tokenTime > maxAge) {
      return c.json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Refresh token expired',
        },
      }, 401);
    }
    
    // 生成新的 access token
    const newAccessToken = `at_${crypto.randomUUID()}`;
    const newRefreshToken = `rt_${crypto.randomUUID()}_${Date.now()}`;
    
    return c.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
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
    
    // 生成重置 token（生产环境应存储到数据库并发送邮件）
    const resetToken = `reset_${crypto.randomUUID()}_${Date.now()}`;
    
    // TODO: 在生产环境中：
    // 1. 存储 resetToken 到数据库（带过期时间）
    // 2. 发送邮件包含重置链接
    
    // 开发环境：直接返回 token
    return c.json({
      success: true,
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      message: 'Reset token generated',
    });
  } catch (error) {
    console.error('Reset password request error:', error);
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
    
    // 验证 reset token 格式
    const parts = body.resetToken.split('_');
    if (parts.length < 3 || parts[0] !== 'reset') {
      return c.json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid reset token',
        },
      }, 401);
    }
    
    // 检查 token 是否过期（假设 1 小时有效期）
    const tokenTime = parseInt(parts[2], 10);
    const maxAge = 60 * 60 * 1000; // 1小时
    if (Date.now() - tokenTime > maxAge) {
      return c.json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Reset token expired',
        },
      }, 401);
    }
    
    // TODO: 在生产环境中从数据库获取用户 ID
    // 这里简化处理，假设 token 包含用户信息
    
    return c.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Reset password error:', error);
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
    console.error('Key submission error:', error);
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
    console.error('Key update error:', error);
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
    console.error('Analytics error:', error);
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
    console.error('Savings analytics error:', error);
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
    console.error('Recent requests error:', error);
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
    console.error('Top models error:', error);
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
