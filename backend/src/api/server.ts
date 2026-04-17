import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { toolRegistry } from '../tools/registry';
import { ClassifyTool } from '../tools/classify';
import { RouteTool } from '../tools/route';
import { ProxyTool } from '../tools/proxy';
import { initDatabase } from '../db';
import { db as globalDb } from '../db';
import { UserTool, getUser, updateUser, deductCredits, verifyPassword } from '../users';
import { KeyTool, getKeys, getAvailableKey, updateKey, recordKeyUsage, deleteKey } from '../keys';
import { BillingTool, getUserEarnings, getUserUsageStats } from '../billing';
import {
  getUserEarningsSummary,
  getEarningsHistory,
  getEarningsByProvider,
  getEarningsTrend,
  requestWithdraw,
  calculateEarning,
} from '../billing/earnings';
import {
  getProviderStatus,
  checkAllProviders,
  updateProviderMetrics,
  getProviderRanking,
} from '../providers/status';
import { getUserStats, getAggregatedStats, getRecentRequests, getTopModels } from '../analytics';

// Phase 3 imports
import {
  createTeam,
  getTeam,
  getUserTeams,
  inviteMember,
  acceptInvitation,
  removeMember,
  updateRole as updateTeamRole,
  getTeamInvitations,
  getUserInvitations,
  deleteTeam,
  getMemberRole,
  type TeamRole,
} from '../team';
import {
  hasPermission,
  getPermissions,
  roleHasPermission,
  checkResourceAccess,
  requirePermission,
  PermissionDeniedError,
  type Permission,
} from '../auth/permissions';
import {
  logAudit,
  getAuditLogs,
  exportAuditLogs,
  type AuditLogFilters,
} from '../audit';
import {
  createApiKey,
  listApiKeys,
  listTeamApiKeys,
  getApiKey,
  validateApiKey,
  revokeApiKey,
  updateApiKey,
  deleteApiKey,
  getApiKeyUsage,
  type CreateApiKeyOptions,
} from '../api-keys';

// Phase 4 imports
import {
  listSSOProviders,
  getSSOProvider,
  createSSOConnection,
  getSSOConnection,
  deleteSSOConnection,
  updateSSOConnection,
  initiateSSO,
  handleSSOCallback,
  verifySSOAccess,
} from '../sso';
import {
  getBrandConfig,
  updateBrandConfig,
  validateCustomDomain,
  registerCustomDomain,
  verifyCustomDomain,
  getCustomDomain,
  getTeamCustomDomains,
  deleteCustomDomain,
  enableSSL,
} from '../branding';
import {
  createExportJob,
  getExportJob,
  getExportJobs,
  processExportJob,
  getDownloadUrl,
  deleteExportJob,
} from '../export';
import {
  createCustomRule,
  listCustomRules,
  getCustomRule,
  updateCustomRule,
  deleteCustomRule,
  applyCustomRules,
} from '../routing/custom';

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

// ==================== Phase 2: 收益分成 API ====================

// 获取收益汇总
app.get('/v1/billing/earnings/:userId/summary', async (c) => {
  const userId = c.req.param('userId');

  try {
    const summary = getUserEarningsSummary(userId);
    const byProvider = getEarningsByProvider(userId);
    const trend = getEarningsTrend(userId, 6);

    return c.json({
      userId,
      summary: {
        ...summary,
        totalEarningsDollars: summary.totalEarningsCents / 100,
        currentPeriodEarningsDollars: summary.currentPeriodEarningsCents / 100,
        pendingEarningsDollars: summary.pendingEarningsCents / 100,
      },
      byProvider: Object.fromEntries(
        Object.entries(byProvider).map(([k, v]) => [k, { ...v, totalEarningsDollars: v.totalEarningCents / 100 }])
      ),
      trend: trend.map(t => ({ ...t, totalEarningsDollars: t.totalEarningCents / 100 })),
    });
  } catch (error) {
    console.error('Earnings summary error:', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get earnings summary' },
    }, 500);
  }
});

// 获取收益历史
app.get('/v1/billing/earnings/:userId/history', async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '12', 10);

  try {
    const history = getEarningsHistory(userId, limit);

    return c.json({
      userId,
      history: history.map(h => ({
        ...h,
        totalEarningsDollars: h.totalEarningCents / 100,
      })),
    });
  } catch (error) {
    console.error('Earnings history error:', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get earnings history' },
    }, 500);
  }
});

// 提现申请
app.post('/v1/billing/earnings/:userId/withdraw', async (c) => {
  const userId = c.req.param('userId');

  try {
    const body = await c.req.json();

    if (!body.amountCents || body.amountCents <= 0) {
      return c.json({
        error: { code: 'INVALID_INPUT', message: 'amountCents must be a positive number' },
      }, 400);
    }

    const withdrawRequest = requestWithdraw(userId, body.amountCents);

    return c.json({
      withdraw: {
        ...withdrawRequest,
        amountDollars: withdrawRequest.amountCents / 100,
      },
    }, 201);
  } catch (error) {
    console.error('Withdraw request error:', error);
    const message = error instanceof Error ? error.message : 'Withdraw request failed';
    return c.json({
      error: { code: 'INTERNAL_ERROR', message },
    }, 400);
  }
});

// ==================== Phase 2: Provider 状态 API ====================

// 获取所有 Provider 状态
app.get('/v1/providers/status', async (c) => {
  try {
    const statuses = checkAllProviders();

    return c.json({
      providers: statuses.map(s => ({
        ...s,
        successRatePercent: Math.round(s.successRate * 100 * 10) / 10,
      })),
    });
  } catch (error) {
    console.error('Provider status error:', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get provider status' },
    }, 500);
  }
});

// 获取单个 Provider 状态
app.get('/v1/providers/:name/status', async (c) => {
  const name = c.req.param('name');

  try {
    const status = getProviderStatus(name);

    if (!status) {
      return c.json({
        error: { code: 'NOT_FOUND', message: `Provider '${name}' not found` },
      }, 404);
    }

    return c.json({
      provider: {
        ...status,
        successRatePercent: Math.round(status.successRate * 100 * 10) / 10,
      },
    });
  } catch (error) {
    console.error('Provider status error:', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get provider status' },
    }, 500);
  }
});

// 更新 Provider 指标 (内部调用)
app.post('/v1/providers/:name/metrics', async (c) => {
  const name = c.req.param('name');

  try {
    const body = await c.req.json();

    if (typeof body.success !== 'boolean' || typeof body.latencyMs !== 'number') {
      return c.json({
        error: { code: 'INVALID_INPUT', message: 'success (boolean) and latencyMs (number) are required' },
      }, 400);
    }

    updateProviderMetrics(name, {
      success: body.success,
      latencyMs: body.latencyMs,
      error: body.error,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Provider metrics update error:', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update provider metrics' },
    }, 500);
  }
});

// Provider 排行
app.get('/v1/providers/ranking', async (c) => {
  try {
    const ranking = getProviderRanking();

    return c.json({ ranking });
  } catch (error) {
    console.error('Provider ranking error:', error);
    return c.json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get provider ranking' },
    }, 500);
  }
});

// ==================== Phase 3: Team Management API ====================

// 创建团队
app.post('/v1/teams', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.ownerId || !body.name) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'ownerId and name are required' } }, 400);
    }
    const team = createTeam(body.ownerId, body.name);
    logAudit({ userId: body.ownerId, teamId: team.id, action: 'team.create', resource: 'team', resourceId: team.id });
    return c.json({ team }, 201);
  } catch (error) {
    console.error('Create team error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create team' } }, 500);
  }
});

// 获取团队信息
app.get('/v1/teams/:teamId', async (c) => {
  const teamId = c.req.param('teamId');
  const team = getTeam(teamId);
  if (!team) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Team not found' } }, 404);
  }
  return c.json({ team });
});

// 获取用户所属团队列表
app.get('/v1/users/:userId/teams', async (c) => {
  const userId = c.req.param('userId');
  const teams = getUserTeams(userId);
  return c.json({ teams });
});

// 邀请成员
app.post('/v1/teams/:teamId/invitations', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const body = await c.req.json();
    if (!body.email || !body.invitedBy) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'email and invitedBy are required' } }, 400);
    }
    const team = getTeam(teamId);
    if (!team) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Team not found' } }, 404);
    }
    // Check permission
    try {
      requirePermission(body.invitedBy, teamId, 'team:write');
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        return c.json({ error: { code: 'FORBIDDEN', message: e.message } }, 403);
      }
      throw e;
    }
    const role: TeamRole = body.role || 'member';
    const invitation = inviteMember(teamId, body.email, role, body.invitedBy);
    logAudit({ userId: body.invitedBy, teamId, action: 'team.invite', resource: 'team_invitation', resourceId: invitation.id, details: { email: body.email, role } });
    return c.json({ invitation }, 201);
  } catch (error) {
    console.error('Invite member error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to invite member' } }, 500);
  }
});

// 接受邀请
app.post('/v1/invitations/:invitationId/accept', async (c) => {
  try {
    const invitationId = c.req.param('invitationId');
    const body = await c.req.json();
    if (!body.userId) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'userId is required' } }, 400);
    }
    const member = acceptInvitation(invitationId, body.userId);
    if (!member) {
      return c.json({ error: { code: 'INVALID_INVITATION', message: 'Invitation not found, expired, or already accepted' } }, 400);
    }
    logAudit({ userId: body.userId, teamId: member.teamId, action: 'team.accept_invitation', resource: 'team_invitation', resourceId: invitationId });
    return c.json({ member });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to accept invitation' } }, 500);
  }
});

// 获取团队邀请列表
app.get('/v1/teams/:teamId/invitations', async (c) => {
  const teamId = c.req.param('teamId');
  const invitations = getTeamInvitations(teamId);
  return c.json({ invitations });
});

// 获取用户收到的邀请
app.get('/v1/users/:userId/invitations', async (c) => {
  // In a real app, we'd look up the user's email. For now, accept email as query param.
  const email = c.req.query('email');
  if (!email) {
    return c.json({ error: { code: 'INVALID_INPUT', message: 'email query parameter is required' } }, 400);
  }
  const invitations = getUserInvitations(email);
  return c.json({ invitations });
});

// 移除成员
app.delete('/v1/teams/:teamId/members/:userId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const userId = c.req.param('userId');
    const requesterId = c.req.query('requesterId');
    if (!requesterId) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'requesterId is required' } }, 400);
    }
    try {
      requirePermission(requesterId, teamId, 'team:write');
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        return c.json({ error: { code: 'FORBIDDEN', message: e.message } }, 403);
      }
      throw e;
    }
    const removed = removeMember(teamId, userId);
    if (!removed) {
      return c.json({ error: { code: 'CANNOT_REMOVE', message: 'Cannot remove this member (owner or not found)' } }, 400);
    }
    logAudit({ userId: requesterId, teamId, action: 'team.remove_member', resource: 'team_member', resourceId: userId });
    return c.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } }, 500);
  }
});

// 更新成员角色
app.patch('/v1/teams/:teamId/members/:userId/role', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const userId = c.req.param('userId');
    const body = await c.req.json();
    if (!body.role || !body.requesterId) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'role and requesterId are required' } }, 400);
    }
    try {
      requirePermission(body.requesterId, teamId, 'team:admin');
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        return c.json({ error: { code: 'FORBIDDEN', message: e.message } }, 403);
      }
      throw e;
    }
    const member = updateTeamRole(teamId, userId, body.role);
    if (!member) {
      return c.json({ error: { code: 'CANNOT_UPDATE', message: 'Cannot update this member\'s role (owner or not found)' } }, 400);
    }
    logAudit({ userId: body.requesterId, teamId, action: 'team.update_role', resource: 'team_member', resourceId: userId, details: { newRole: body.role } });
    return c.json({ member });
  } catch (error) {
    console.error('Update role error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update role' } }, 500);
  }
});

// 删除团队
app.delete('/v1/teams/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const ownerId = c.req.query('ownerId');
    if (!ownerId) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'ownerId is required' } }, 400);
    }
    const deleted = deleteTeam(teamId, ownerId);
    if (!deleted) {
      return c.json({ error: { code: 'NOT_FOUND_OR_NOT_OWNER', message: 'Team not found or user is not the owner' } }, 404);
    }
    logAudit({ userId: ownerId, teamId, action: 'team.delete', resource: 'team', resourceId: teamId });
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete team error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete team' } }, 500);
  }
});

// ==================== Phase 3: Permissions API ====================

// 获取用户在团队中的权限
app.get('/v1/teams/:teamId/members/:userId/permissions', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const userId = c.req.param('userId');
    const { getMemberRole } = await import('../team');
    const role = getMemberRole(teamId, userId);
    const perms = role ? getPermissions(role) : [];
    return c.json({ teamId, userId, role, permissions: perms });
  } catch (error) {
    console.error('Get permissions error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get permissions' } }, 500);
  }
});

// 检查特定权限
app.post('/v1/permissions/check', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.userId || !body.teamId || !body.permission) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'userId, teamId, and permission are required' } }, 400);
    }
    const granted = hasPermission(body.userId, body.teamId, body.permission as Permission);
    return c.json({ granted });
  } catch (error) {
    console.error('Permission check error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Permission check failed' } }, 500);
  }
});

// ==================== Phase 3: Audit Logs API ====================

// 获取团队审计日志
app.get('/v1/teams/:teamId/audit-logs', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const requesterId = c.req.query('requesterId');
    if (!requesterId) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'requesterId is required' } }, 400);
    }
    try {
      requirePermission(requesterId, teamId, 'analytics:read');
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        return c.json({ error: { code: 'FORBIDDEN', message: e.message } }, 403);
      }
      throw e;
    }
    const filters: AuditLogFilters = {
      userId: c.req.query('filterUserId') || undefined,
      action: c.req.query('filterAction') || undefined,
      resource: c.req.query('filterResource') || undefined,
      limit: parseInt(c.req.query('limit') || '100', 10),
      offset: parseInt(c.req.query('offset') || '0', 10),
    };
    const logs = getAuditLogs(teamId, filters);
    return c.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' } }, 500);
  }
});

// 导出审计日志
app.get('/v1/teams/:teamId/audit-logs/export', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const requesterId = c.req.query('requesterId');
    if (!requesterId) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'requesterId is required' } }, 400);
    }
    try {
      requirePermission(requesterId, teamId, 'analytics:export');
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        return c.json({ error: { code: 'FORBIDDEN', message: e.message } }, 403);
      }
      throw e;
    }
    const format = c.req.query('format') === 'csv' ? 'csv' : 'json';
    const data = exportAuditLogs(teamId, format);
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    return c.text(data, 200, { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="audit-logs-${teamId}.${format}"` });
  } catch (error) {
    console.error('Export audit logs error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to export audit logs' } }, 500);
  }
});

// ==================== Phase 3: Developer API Keys ====================

// 创建 API Key
app.post('/v1/api-keys', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.userId || !body.name) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'userId and name are required' } }, 400);
    }
    const options: CreateApiKeyOptions = {
      userId: body.userId,
      teamId: body.teamId,
      name: body.name,
      permissions: body.permissions,
      rateLimit: body.rateLimit,
      usageLimit: body.usageLimit,
      expiresAt: body.expiresAt,
    };
    const result = createApiKey(options);
    logAudit({ userId: body.userId, teamId: body.teamId, action: 'api_key.create', resource: 'api_key', resourceId: result.apiKey.id });
    return c.json({ apiKey: result.apiKey, rawKey: result.rawKey }, 201);
  } catch (error) {
    console.error('Create API key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } }, 500);
  }
});

// 列出用户的 API Keys
app.get('/v1/users/:userId/api-keys', async (c) => {
  const userId = c.req.param('userId');
  const keys = listApiKeys(userId);
  // Don't return key hash
  const safeKeys = keys.map((k) => ({ ...k, key: undefined }));
  return c.json({ keys: safeKeys });
});

// 列出团队的 API Keys
app.get('/v1/teams/:teamId/api-keys', async (c) => {
  const teamId = c.req.param('teamId');
  const keys = listTeamApiKeys(teamId);
  const safeKeys = keys.map((k) => ({ ...k, key: undefined }));
  return c.json({ keys: safeKeys });
});

// 获取单个 API Key
app.get('/v1/api-keys/:keyId', async (c) => {
  const keyId = c.req.param('keyId');
  const key = getApiKey(keyId);
  if (!key) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }
  const { key: _keyHash, ...safeKey } = key;
  return c.json({ apiKey: safeKey });
});

// 撤销 API Key
app.post('/v1/api-keys/:keyId/revoke', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const body = await c.req.json();
    const revoked = revokeApiKey(keyId);
    if (!revoked) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
    }
    logAudit({ userId: body.userId, teamId: body.teamId, action: 'api_key.revoke', resource: 'api_key', resourceId: keyId });
    return c.json({ success: true });
  } catch (error) {
    console.error('Revoke API key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' } }, 500);
  }
});

// 更新 API Key
app.patch('/v1/api-keys/:keyId', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const body = await c.req.json();
    const updated = updateApiKey(keyId, {
      name: body.name,
      permissions: body.permissions,
      rateLimit: body.rateLimit,
      usageLimit: body.usageLimit,
      expiresAt: body.expiresAt,
    });
    if (!updated) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
    }
    logAudit({ userId: body.userId, teamId: body.teamId, action: 'api_key.update', resource: 'api_key', resourceId: keyId });
    const { key: _keyHash, ...safeKey } = updated;
    return c.json({ apiKey: safeKey });
  } catch (error) {
    console.error('Update API key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update API key' } }, 500);
  }
});

// 删除 API Key
app.delete('/v1/api-keys/:keyId', async (c) => {
  const keyId = c.req.param('keyId');
  const deleted = deleteApiKey(keyId);
  if (!deleted) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }
  return c.json({ success: true });
});

// 获取 API Key 使用统计
app.get('/v1/api-keys/:keyId/usage', async (c) => {
  const keyId = c.req.param('keyId');
  const usage = getApiKeyUsage(keyId);
  if (!usage) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
  }
  return c.json(usage);
});

// ==================== Phase 4: SSO API ====================

// 列出 SSO Providers
app.get('/v1/sso/providers', async (c) => {
  const providers = listSSOProviders();
  return c.json({ providers });
});

// 获取 SSO Provider
app.get('/v1/sso/providers/:id', async (c) => {
  const id = c.req.param('id');
  const provider = getSSOProvider(id);
  if (!provider) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'SSO provider not found' } }, 404);
  }
  return c.json({ provider });
});

// 创建 SSO 连接
app.post('/v1/sso/connections', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.teamId || !body.providerId || !body.domain) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'teamId, providerId, and domain are required' } }, 400);
    }
    const conn = createSSOConnection(body.teamId, body.providerId, body.domain, body.config || {});
    return c.json({ connection: conn }, 201);
  } catch (error) {
    console.error('SSO connection error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to create SSO connection' } }, 500);
  }
});

// 获取团队 SSO 连接
app.get('/v1/teams/:teamId/sso/connection', async (c) => {
  const teamId = c.req.param('teamId');
  const conn = getSSOConnection(teamId);
  if (!conn) {
    return c.json({ connection: null });
  }
  return c.json({ connection: conn });
});

// 更新 SSO 连接
app.patch('/v1/sso/connections/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const body = await c.req.json();
    const conn = updateSSOConnection(teamId, { domain: body.domain, config: body.config });
    if (!conn) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'SSO connection not found' } }, 404);
    }
    return c.json({ connection: conn });
  } catch (error) {
    console.error('SSO update error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to update SSO connection' } }, 500);
  }
});

// 删除 SSO 连接
app.delete('/v1/sso/connections/:teamId', async (c) => {
  const teamId = c.req.param('teamId');
  const deleted = deleteSSOConnection(teamId);
  return c.json({ success: deleted });
});

// 发起 SSO 登录
app.post('/v1/sso/connections/:connectionId/initiate', async (c) => {
  try {
    const connectionId = c.req.param('connectionId');
    const body = await c.req.json();
    const redirectUri = body.redirectUri;
    if (!redirectUri) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'redirectUri is required' } }, 400);
    }
    const result = initiateSSO(connectionId, redirectUri);
    return c.json(result);
  } catch (error) {
    console.error('SSO initiate error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to initiate SSO' } }, 500);
  }
});

// 处理 SSO 回调
app.post('/v1/sso/callback', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.connectionId || !body.code || !body.state) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'connectionId, code, and state are required' } }, 400);
    }
    const conn = getSSOConnection(
      globalDb.prepare('SELECT team_id FROM sso_connections WHERE id = ?').get(body.connectionId) as any
    );
    const providerType = conn ? getSSOProvider(conn.providerId)?.type || 'oidc' : 'oidc';
    const result = await handleSSOCallback(providerType, {
      connectionId: body.connectionId,
      code: body.code,
      state: body.state,
      redirectUri: body.redirectUri,
    });
    return c.json(result);
  } catch (error) {
    console.error('SSO callback error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'SSO callback failed' } }, 500);
  }
});

// ==================== Phase 4: Branding API ====================

// 获取品牌配置
app.get('/v1/teams/:teamId/branding', async (c) => {
  const teamId = c.req.param('teamId');
  const config = getBrandConfig(teamId);
  return c.json({ config });
});

// 更新品牌配置
app.patch('/v1/teams/:teamId/branding', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const body = await c.req.json();
    const config = updateBrandConfig(teamId, body);
    return c.json({ config });
  } catch (error) {
    console.error('Branding update error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to update branding' } }, 500);
  }
});

// 验证自定义域名
app.post('/v1/branding/domains/validate', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.domain) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'domain is required' } }, 400);
    }
    const result = validateCustomDomain(body.domain);
    return c.json(result);
  } catch (error) {
    console.error('Domain validation error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Domain validation failed' } }, 500);
  }
});

// 注册自定义域名
app.post('/v1/teams/:teamId/branding/domains', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const body = await c.req.json();
    if (!body.domain) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'domain is required' } }, 400);
    }
    const domain = registerCustomDomain(teamId, body.domain);
    return c.json({ domain }, 201);
  } catch (error) {
    console.error('Domain registration error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to register domain' } }, 500);
  }
});

// 验证自定义域名（DNS 验证）
app.post('/v1/branding/domains/:domain/verify', async (c) => {
  try {
    const domain = c.req.param('domain');
    const body = await c.req.json();
    if (!body.token) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'token is required' } }, 400);
    }
    const verified = verifyCustomDomain(domain, body.token);
    return c.json({ verified });
  } catch (error) {
    console.error('Domain verification error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Domain verification failed' } }, 500);
  }
});

// 获取团队自定义域名
app.get('/v1/teams/:teamId/branding/domains', async (c) => {
  const teamId = c.req.param('teamId');
  const domains = getTeamCustomDomains(teamId);
  return c.json({ domains });
});

// 删除自定义域名
app.delete('/v1/branding/domains/:domain', async (c) => {
  const domain = c.req.param('domain');
  const deleted = deleteCustomDomain(domain);
  return c.json({ success: deleted });
});

// 启用 SSL
app.post('/v1/branding/domains/:domain/ssl', async (c) => {
  const domain = c.req.param('domain');
  const enabled = enableSSL(domain);
  return c.json({ sslEnabled: enabled });
});

// ==================== Phase 4: Export API ====================

// 创建导出任务
app.post('/v1/exports', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.teamId || !body.userId || !body.type || !body.format) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'teamId, userId, type, and format are required' } }, 400);
    }
    const job = createExportJob(body.teamId, body.userId, body.type, body.format, body.filters || {});
    return c.json({ job }, 201);
  } catch (error) {
    console.error('Export creation error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to create export' } }, 500);
  }
});

// 获取导出任务
app.get('/v1/exports/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const job = getExportJob(jobId);
  if (!job) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Export job not found' } }, 404);
  }
  return c.json({ job });
});

// 获取团队导出任务列表
app.get('/v1/teams/:teamId/exports', async (c) => {
  const teamId = c.req.param('teamId');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const jobs = getExportJobs(teamId, limit);
  return c.json({ jobs });
});

// 处理导出任务
app.post('/v1/exports/:jobId/process', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const job = processExportJob(jobId);
    return c.json({ job });
  } catch (error) {
    console.error('Export processing error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to process export' } }, 500);
  }
});

// 获取下载链接
app.get('/v1/exports/:jobId/download', async (c) => {
  const jobId = c.req.param('jobId');
  const result = getDownloadUrl(jobId);
  if (!result) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Export job or download not found' } }, 404);
  }
  if (result.expired) {
    return c.json({ error: { code: 'EXPIRED', message: 'Download link has expired' } }, 410);
  }
  return c.json({ url: result.url, expiresAt: result.expired });
});

// 删除导出任务
app.delete('/v1/exports/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const deleted = deleteExportJob(jobId);
  return c.json({ success: deleted });
});

// ==================== Phase 4: Custom Routing API ====================


// 创建路由规则
app.post('/v1/teams/:teamId/routing-rules', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const body = await c.req.json();
    if (!body.name || !body.action?.preferredModels) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'name and action.preferredModels are required' } }, 400);
    }
    const rule = createCustomRule(teamId, {
      name: body.name,
      condition: body.condition || {},
      action: body.action,
      priority: body.priority || 0,
      enabled: body.enabled !== false,
    });
    return c.json({ rule }, 201);
  } catch (error) {
    console.error('Routing rule creation error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to create routing rule' } }, 500);
  }
});

// 获取团队路由规则列表
app.get('/v1/teams/:teamId/routing-rules', async (c) => {
  const teamId = c.req.param('teamId');
  const rules = listCustomRules(teamId);
  return c.json({ rules });
});

// 获取单个路由规则
app.get('/v1/routing-rules/:ruleId', async (c) => {
  const ruleId = c.req.param('ruleId');
  const rule = getCustomRule(ruleId);
  if (!rule) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Routing rule not found' } }, 404);
  }
  return c.json({ rule });
});

// 更新路由规则
app.patch('/v1/routing-rules/:ruleId', async (c) => {
  try {
    const ruleId = c.req.param('ruleId');
    const body = await c.req.json();
    const rule = updateCustomRule(ruleId, body);
    if (!rule) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Routing rule not found' } }, 404);
    }
    return c.json({ rule });
  } catch (error) {
    console.error('Routing rule update error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to update routing rule' } }, 500);
  }
});

// 删除路由规则
app.delete('/v1/routing-rules/:ruleId', async (c) => {
  const ruleId = c.req.param('ruleId');
  const deleted = deleteCustomRule(ruleId);
  return c.json({ success: deleted });
});

// ==================== Custom Routing Evaluation ====================

// 应用自定义路由规则
app.post('/v1/teams/:teamId/routing/evaluate', async (c) => {
  const teamId = c.req.param('teamId');
  try {
    const body = await c.req.json();
    const decision = applyCustomRules(teamId, body);
    return c.json({ decision });
  } catch (error) {
    console.error('Routing evaluation error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to evaluate routing rules' } }, 500);
  }
});

// ==================== Admin Phase 3: Teams Management ====================

import * as adminTeams from '../admin/teams';
import * as adminDevApiKeys from '../admin/api-keys';
import * as adminAudit from '../admin/audit';
import * as adminSSO from '../admin/sso';
import * as adminBranding from '../admin/branding';
import * as adminExports from '../admin/exports';
import * as adminCustomRoutes from '../admin/custom-routes';

// Admin: List Teams
app.get('/v1/admin/teams', async (c) => {
  try {
    const result = adminTeams.listTeams({
      search: c.req.query('search') || undefined,
      status: c.req.query('status') || undefined,
      sortBy: (c.req.query('sortBy') as any) || undefined,
      sortOrder: (c.req.query('sortOrder') as any) || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin list teams error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list teams' } }, 500);
  }
});

// Admin: Get Team Detail
app.get('/v1/admin/teams/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const detail = adminTeams.getTeamDetail(teamId);
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Team not found' } }, 404);
    }
    return c.json({ team: detail });
  } catch (error) {
    console.error('Admin get team detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get team detail' } }, 500);
  }
});

// Admin: Suspend Team
app.post('/v1/admin/teams/:teamId/suspend', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const body = await c.req.json().catch(() => ({}));
    adminTeams.suspendTeam(teamId, body.reason);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin suspend team error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to suspend team' } }, 500);
  }
});

// Admin: Unsuspend Team
app.post('/v1/admin/teams/:teamId/unsuspend', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    adminTeams.unsuspendTeam(teamId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin unsuspend team error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to unsuspend team' } }, 500);
  }
});

// Admin: Delete Team
app.delete('/v1/admin/teams/:teamId', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    adminTeams.deleteTeam(teamId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin delete team error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete team' } }, 500);
  }
});

// Admin: Get Team Activity Log
app.get('/v1/admin/teams/:teamId/activity', async (c) => {
  try {
    const teamId = c.req.param('teamId');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const logs = adminTeams.getTeamActivityLog(teamId, limit);
    return c.json({ logs });
  } catch (error) {
    console.error('Admin team activity error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get team activity' } }, 500);
  }
});

// ==================== Admin Phase 3: Dev API Keys Management ====================

// Admin: List Developer API Keys
app.get('/v1/admin/dev-api-keys', async (c) => {
  try {
    const result = adminDevApiKeys.listDeveloperApiKeys({
      status: c.req.query('status') || undefined,
      userId: c.req.query('userId') || undefined,
      teamId: c.req.query('teamId') || undefined,
      search: c.req.query('search') || undefined,
      sortBy: (c.req.query('sortBy') as any) || undefined,
      sortOrder: (c.req.query('sortOrder') as any) || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin list dev api keys error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list API keys' } }, 500);
  }
});

// Admin: Get API Key Detail
app.get('/v1/admin/dev-api-keys/:keyId', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const detail = adminDevApiKeys.getApiKeyDetail(keyId);
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'API key not found' } }, 404);
    }
    return c.json({ apiKey: detail });
  } catch (error) {
    console.error('Admin get api key detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get API key detail' } }, 500);
  }
});

// Admin: Revoke API Key
app.post('/v1/admin/dev-api-keys/:keyId/revoke', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const body = await c.req.json().catch(() => ({}));
    adminDevApiKeys.revokeApiKey(keyId, body.reason);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin revoke api key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke API key' } }, 500);
  }
});

// Admin: Reactivate API Key
app.post('/v1/admin/dev-api-keys/:keyId/reactivate', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    adminDevApiKeys.reactivateApiKey(keyId);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin reactivate api key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to reactivate API key' } }, 500);
  }
});

// Admin: Get API Key Usage
app.get('/v1/admin/dev-api-keys/:keyId/usage', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const days = parseInt(c.req.query('days') || '7', 10);
    const usage = adminDevApiKeys.getApiKeyUsage(keyId, days);
    return c.json(usage);
  } catch (error) {
    console.error('Admin api key usage error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get API key usage' } }, 500);
  }
});

// Admin: Update API Key Settings
app.patch('/v1/admin/dev-api-keys/:keyId', async (c) => {
  try {
    const keyId = c.req.param('keyId');
    const body = await c.req.json();
    adminDevApiKeys.updateApiKeySettings(keyId, {
      name: body.name,
      permissions: body.permissions,
      rateLimit: body.rateLimit,
      usageLimit: body.usageLimit,
      expiresAt: body.expiresAt,
    });
    const updated = adminDevApiKeys.getApiKeyDetail(keyId);
    return c.json({ apiKey: updated });
  } catch (error) {
    console.error('Admin update api key error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update API key' } }, 500);
  }
});

// Admin: Bulk Revoke API Keys
app.post('/v1/admin/dev-api-keys/bulk-revoke', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.keyIds || !Array.isArray(body.keyIds)) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'keyIds array is required' } }, 400);
    }
    const count = adminDevApiKeys.bulkRevokeApiKeys(body.keyIds, body.reason);
    return c.json({ revoked: count });
  } catch (error) {
    console.error('Admin bulk revoke error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk revoke' } }, 500);
  }
});

// ==================== Admin Phase 3: Audit Logs ====================

// Admin: Get Audit Logs
app.get('/v1/admin/audit', async (c) => {
  try {
    const result = adminAudit.getAuditLogs({
      userId: c.req.query('userId') || undefined,
      teamId: c.req.query('teamId') || undefined,
      action: c.req.query('action') || undefined,
      resource: c.req.query('resource') || undefined,
      startTime: c.req.query('startTime') ? parseInt(c.req.query('startTime')!) : undefined,
      endTime: c.req.query('endTime') ? parseInt(c.req.query('endTime')!) : undefined,
      search: c.req.query('search') || undefined,
      sortBy: (c.req.query('sortBy') as any) || undefined,
      sortOrder: (c.req.query('sortOrder') as any) || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' } }, 500);
  }
});

// Admin: Get Audit Stats
app.get('/v1/admin/audit/stats', async (c) => {
  try {
    const stats = adminAudit.getAuditLogStats(
      c.req.query('startTime') ? parseInt(c.req.query('startTime')!) : undefined,
      c.req.query('endTime') ? parseInt(c.req.query('endTime')!) : undefined
    );
    return c.json({ stats });
  } catch (error) {
    console.error('Admin audit stats error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit stats' } }, 500);
  }
});

// Admin: Export Audit Logs
app.get('/v1/admin/audit/export', async (c) => {
  try {
    const format = c.req.query('format') === 'csv' ? 'csv' : 'json';
    const data = adminAudit.exportAuditLogs({
      action: c.req.query('action') || undefined,
      resource: c.req.query('resource') || undefined,
      search: c.req.query('search') || undefined,
    }, format);
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    return c.text(data, 200, {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="audit-logs.${format}"`,
    });
  } catch (error) {
    console.error('Admin export audit error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to export audit logs' } }, 500);
  }
});

// Admin: Get Audit Log Detail
app.get('/v1/admin/audit/:logId', async (c) => {
  try {
    const logId = c.req.param('logId');
    const detail = adminAudit.getAuditLogDetail(logId);
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Audit log not found' } }, 404);
    }
    return c.json({ log: detail });
  } catch (error) {
    console.error('Admin audit log detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit log detail' } }, 500);
  }
});

// Admin: Cleanup Old Audit Logs
app.post('/v1/admin/audit/cleanup', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const retentionDays = body.retentionDays || 90;
    const deleted = adminAudit.cleanupAuditLogs(retentionDays);
    return c.json({ deleted, retentionDays });
  } catch (error) {
    console.error('Admin audit cleanup error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to cleanup audit logs' } }, 500);
  }
});

// ==================== Admin Phase 4: SSO Management ====================

// Admin: List SSO Providers
app.get('/v1/admin/sso/providers', async (c) => {
  try {
    const result = adminSSO.listSSOProviders({
      type: c.req.query('type') || undefined,
      enabled: c.req.query('enabled') === 'true' ? true : c.req.query('enabled') === 'false' ? false : undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin SSO providers error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list SSO providers' } }, 500);
  }
});

// Admin: Get SSO Provider Detail
app.get('/v1/admin/sso/providers/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId');
    const detail = adminSSO.getSSOProviderDetail(providerId);
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'SSO provider not found' } }, 404);
    }
    return c.json({ provider: detail });
  } catch (error) {
    console.error('Admin SSO provider detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get SSO provider' } }, 500);
  }
});

// Admin: Enable SSO Provider
app.post('/v1/admin/sso/providers/:providerId/enable', async (c) => {
  try {
    adminSSO.enableSSOProvider(c.req.param('providerId'));
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin enable SSO provider error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to enable SSO provider' } }, 500);
  }
});

// Admin: Disable SSO Provider
app.post('/v1/admin/sso/providers/:providerId/disable', async (c) => {
  try {
    adminSSO.disableSSOProvider(c.req.param('providerId'));
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin disable SSO provider error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to disable SSO provider' } }, 500);
  }
});

// Admin: List SSO Connections
app.get('/v1/admin/sso/connections', async (c) => {
  try {
    const result = adminSSO.listSSOConnections({
      teamId: c.req.query('teamId') || undefined,
      providerId: c.req.query('providerId') || undefined,
      status: c.req.query('status') || undefined,
      domain: c.req.query('domain') || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin SSO connections error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list SSO connections' } }, 500);
  }
});

// Admin: Get SSO Connection Detail
app.get('/v1/admin/sso/connections/:connectionId', async (c) => {
  try {
    const detail = adminSSO.getSSOConnectionDetail(c.req.param('connectionId'));
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'SSO connection not found' } }, 404);
    }
    return c.json({ connection: detail });
  } catch (error) {
    console.error('Admin SSO connection detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get SSO connection' } }, 500);
  }
});

// Admin: Approve SSO Connection
app.post('/v1/admin/sso/connections/:connectionId/approve', async (c) => {
  try {
    adminSSO.approveSSOConnection(c.req.param('connectionId'));
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin approve SSO connection error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve SSO connection' } }, 500);
  }
});

// Admin: Reject SSO Connection
app.post('/v1/admin/sso/connections/:connectionId/reject', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    adminSSO.rejectSSOConnection(c.req.param('connectionId'), body.reason);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin reject SSO connection error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reject SSO connection' } }, 500);
  }
});

// Admin: Test SSO Connection
app.post('/v1/admin/sso/connections/:connectionId/test', async (c) => {
  try {
    const result = adminSSO.testSSOConnection(c.req.param('connectionId'));
    return c.json(result);
  } catch (error) {
    console.error('Admin test SSO connection error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to test SSO connection' } }, 500);
  }
});

// ==================== Admin Phase 4: Branding Management ====================

// Admin: List Brand Configs
app.get('/v1/admin/branding', async (c) => {
  try {
    const result = adminBranding.listBrandConfigs({
      teamId: c.req.query('teamId') || undefined,
      status: c.req.query('status') || undefined,
      search: c.req.query('search') || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin branding list error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list brand configs' } }, 500);
  }
});

// Admin: Get Brand Config Detail
app.get('/v1/admin/branding/:configId', async (c) => {
  try {
    const detail = adminBranding.getBrandConfigDetail(c.req.param('configId'));
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Brand config not found' } }, 404);
    }
    return c.json({ config: detail });
  } catch (error) {
    console.error('Admin branding detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get brand config' } }, 500);
  }
});

// Admin: Approve Brand Config
app.post('/v1/admin/branding/:configId/approve', async (c) => {
  try {
    adminBranding.approveBrandConfig(c.req.param('configId'));
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin approve branding error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve brand config' } }, 500);
  }
});

// Admin: Reject Brand Config
app.post('/v1/admin/branding/:configId/reject', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    adminBranding.rejectBrandConfig(c.req.param('configId'), body.reason);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin reject branding error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reject brand config' } }, 500);
  }
});

// Admin: Validate Custom Domain
app.post('/v1/admin/branding/domains/validate', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.domain) {
      return c.json({ error: { code: 'INVALID_INPUT', message: 'domain is required' } }, 400);
    }
    const result = adminBranding.verifyCustomDomain(body.domain);
    return c.json(result);
  } catch (error) {
    console.error('Admin domain validation error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to validate domain' } }, 500);
  }
});

// ==================== Admin Phase 4: Export Management ====================

// Admin: List Export Jobs
app.get('/v1/admin/exports', async (c) => {
  try {
    const result = adminExports.listExportJobs({
      teamId: c.req.query('teamId') || undefined,
      userId: c.req.query('userId') || undefined,
      type: c.req.query('type') || undefined,
      status: c.req.query('status') || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin exports list error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list export jobs' } }, 500);
  }
});

// Admin: Get Export Stats
app.get('/v1/admin/exports/stats', async (c) => {
  try {
    const stats = adminExports.getExportStats();
    return c.json({ stats });
  } catch (error) {
    console.error('Admin export stats error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get export stats' } }, 500);
  }
});

// Admin: Get Export Job Detail
app.get('/v1/admin/exports/:jobId', async (c) => {
  try {
    const detail = adminExports.getExportJobDetail(c.req.param('jobId'));
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Export job not found' } }, 404);
    }
    return c.json({ job: detail });
  } catch (error) {
    console.error('Admin export job detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get export job' } }, 500);
  }
});

// Admin: Cancel Export Job
app.post('/v1/admin/exports/:jobId/cancel', async (c) => {
  try {
    const cancelled = adminExports.cancelExportJob(c.req.param('jobId'));
    if (!cancelled) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot cancel this job (not found or not cancellable)' } }, 400);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin cancel export error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel export job' } }, 500);
  }
});

// Admin: Retry Export Job
app.post('/v1/admin/exports/:jobId/retry', async (c) => {
  try {
    const retried = adminExports.retryExportJob(c.req.param('jobId'));
    if (!retried) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Cannot retry this job (not found or not retriable)' } }, 400);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin retry export error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to retry export job' } }, 500);
  }
});

// ==================== Admin Phase 4: Custom Routing Rules ====================

// Admin: List Custom Routing Rules
app.get('/v1/admin/custom-routes', async (c) => {
  try {
    const result = adminCustomRoutes.listCustomRoutingRules({
      teamId: c.req.query('teamId') || undefined,
      status: c.req.query('status') || undefined,
      enabled: c.req.query('enabled') === 'true' ? true : c.req.query('enabled') === 'false' ? false : undefined,
      search: c.req.query('search') || undefined,
      offset: parseInt(c.req.query('offset') || '0', 10),
      limit: parseInt(c.req.query('limit') || '50', 10),
    });
    return c.json(result);
  } catch (error) {
    console.error('Admin custom routes list error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list custom routing rules' } }, 500);
  }
});

// Admin: Get Custom Route Stats
app.get('/v1/admin/custom-routes/stats', async (c) => {
  try {
    const stats = adminCustomRoutes.getCustomRuleStats();
    return c.json({ stats });
  } catch (error) {
    console.error('Admin custom route stats error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get custom route stats' } }, 500);
  }
});

// Admin: Get Custom Rule Detail
app.get('/v1/admin/custom-routes/:ruleId', async (c) => {
  try {
    const detail = adminCustomRoutes.getCustomRuleDetail(c.req.param('ruleId'));
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Custom routing rule not found' } }, 404);
    }
    return c.json({ rule: detail });
  } catch (error) {
    console.error('Admin custom route detail error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get custom routing rule' } }, 500);
  }
});

// Admin: Approve Custom Rule
app.post('/v1/admin/custom-routes/:ruleId/approve', async (c) => {
  try {
    adminCustomRoutes.approveCustomRule(c.req.param('ruleId'));
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin approve custom route error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to approve custom routing rule' } }, 500);
  }
});

// Admin: Reject Custom Rule
app.post('/v1/admin/custom-routes/:ruleId/reject', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    adminCustomRoutes.rejectCustomRule(c.req.param('ruleId'), body.reason);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin reject custom route error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reject custom routing rule' } }, 500);
  }
});

// Admin: Toggle Custom Rule
app.post('/v1/admin/custom-routes/:ruleId/toggle', async (c) => {
  try {
    const body = await c.req.json();
    const toggled = adminCustomRoutes.toggleCustomRule(c.req.param('ruleId'), body.enabled);
    if (!toggled) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Custom routing rule not found' } }, 404);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin toggle custom route error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle custom routing rule' } }, 500);
  }
});

// Admin: Test Custom Rule
app.post('/v1/admin/custom-routes/:ruleId/test', async (c) => {
  try {
    const body = await c.req.json();
    const result = adminCustomRoutes.testCustomRule(c.req.param('ruleId'), body);
    return c.json(result);
  } catch (error) {
    console.error('Admin test custom route error:', error);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to test custom routing rule' } }, 500);
  }
});

// 导出应用
export default app;
