/**
 * 用户 Provider API Keys 管理 API
 * 
 * GET  - 获取用户的 Provider Keys（脱敏显示）+ 自定义 Providers
 * POST - 添加/更新 Provider Key 或添加自定义 Provider
 * DELETE - 删除 Provider Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { updateUserProviderKeys, getUserProviderKeys } from '@/lib/auth';
import { maskApiKey, isCustomProvider, CustomProviderConfig } from '@/lib/encryption';

// 支持的预定义 Providers
const SUPPORTED_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', keyPrefix: 'sk-', baseUrl: 'https://api.openai.com/v1' },
  { id: 'deepseek', name: 'DeepSeek', keyPrefix: 'sk-', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'openrouter', name: 'OpenRouter', keyPrefix: 'sk-or-', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'anthropic', name: 'Anthropic', keyPrefix: 'sk-ant-', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'google', name: 'Google AI', keyPrefix: 'AIza', baseUrl: 'https://generativelanguage.googleapis.com/v1' },
  { id: 'mistral', name: 'Mistral', keyPrefix: '', baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'groq', name: 'Groq', keyPrefix: 'gsk_', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'cohere', name: 'Cohere', keyPrefix: '', baseUrl: 'https://api.cohere.ai/v1' },
];

/**
 * 验证用户身份
 */
async function authenticate(request: NextRequest): Promise<{ userId: string; email: string } | null> {
  // 尝试从 Authorization header 获取 token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    // 尝试从 cookie 获取
    const cookieToken = request.cookies.get('auth_token')?.value;
    if (!cookieToken) return null;
    
    const payload = verifyJWT(cookieToken, process.env.JWT_SECRET || 'clawrouter-dev-secret');
    if (!payload || !payload.userId) return null;
    
    return { userId: payload.userId as string, email: payload.email as string };
  }
  
  const payload = verifyJWT(token, process.env.JWT_SECRET || 'clawrouter-dev-secret');
  if (!payload || !payload.userId) return null;
  
  return { userId: payload.userId as string, email: payload.email as string };
}

/**
 * GET - 获取用户的 Provider Keys（脱敏显示）+ 自定义 Providers
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const userKeys = await getUserProviderKeys(auth.userId);
    
    // 构建预定义 Provider 响应
    const predefinedProviders = SUPPORTED_PROVIDERS.map(provider => {
      const value = userKeys[provider.id];
      const isCustom = isCustomProvider(value);
      const apiKey = isCustom ? value.apiKey : (typeof value === 'string' ? value : undefined);
      
      return {
        id: provider.id,
        name: provider.name,
        type: 'predefined' as const,
        configured: !!apiKey,
        maskedKey: apiKey ? maskApiKey(apiKey) : null,
        keyPrefix: provider.keyPrefix,
        baseUrl: provider.baseUrl,
        status: apiKey ? 'configured' : 'not_configured',
      };
    });

    // 构建自定义 Provider 响应
    const customProviders: Array<{
      id: string;
      name: string;
      type: 'custom';
      baseUrl: string;
      models: string[];
      configured: boolean;
      maskedKey: string | null;
      status: string;
    }> = [];

    for (const [key, value] of Object.entries(userKeys)) {
      if (isCustomProvider(value)) {
        customProviders.push({
          id: key,
          name: value.name,
          type: 'custom',
          baseUrl: value.baseUrl,
          models: value.models || [],
          configured: true,
          maskedKey: maskApiKey(value.apiKey),
          status: 'configured',
        });
      }
    }

    return NextResponse.json({
      providers: [...predefinedProviders, ...customProviders],
      predefinedProviders: SUPPORTED_PROVIDERS.map(p => ({ 
        id: p.id, 
        name: p.name, 
        keyPrefix: p.keyPrefix,
        baseUrl: p.baseUrl,
      })),
      customProviders: customProviders.map(p => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        models: p.models,
      })),
    });
  } catch (error) {
    console.error('[Providers API] GET error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get provider keys' } },
      { status: 500 }
    );
  }
}

/**
 * POST - 添加/更新 Provider Key 或添加自定义 Provider
 * 
 * Body for predefined provider:
 * { provider: 'openai', apiKey: 'sk-...', action?: 'test' }
 * 
 * Body for custom provider:
 * { 
 *   custom: true,
 *   name: 'New-API',
 *   baseUrl: 'http://...',
 *   apiKey: 'sk-...',
 *   models: ['model1', 'model2']
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 获取现有 keys
    const existingKeys = await getUserProviderKeys(auth.userId);

    // 检查是否为自定义 Provider
    if (body.custom === true) {
      // === 添加自定义 Provider ===
      const { name, baseUrl, apiKey, models, id } = body;
      
      if (!name || !baseUrl || !apiKey) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'name, baseUrl and apiKey are required for custom provider' } },
          { status: 400 }
        );
      }

      // 验证 baseUrl 格式
      try {
        new URL(baseUrl);
      } catch {
        return NextResponse.json(
          { error: { code: 'INVALID_URL', message: 'Invalid baseUrl format' } },
          { status: 400 }
        );
      }

      // 生成唯一 ID（使用 name 的 slug 或提供的 id）
      const providerId = id || `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

      // 构建自定义 Provider 配置
      const customProvider: CustomProviderConfig = {
        name,
        baseUrl: baseUrl.replace(/\/$/, ''), // 移除末尾斜杠
        apiKey,
        models: models || [],
        custom: true,
        enabled: true,
      };

      // 测试连接（可选）
      if (body.action === 'test') {
        try {
          const testResult = await testCustomProvider(customProvider);
          if (!testResult.valid) {
            return NextResponse.json({
              error: { code: 'TEST_FAILED', message: testResult.error || 'Connection test failed' },
            }, { status: 400 });
          }
        } catch (error) {
          return NextResponse.json({
            error: { code: 'TEST_FAILED', message: error instanceof Error ? error.message : 'Connection test failed' },
          }, { status: 500 });
        }
      }

      // 保存
      const updatedKeys = {
        ...existingKeys,
        [providerId]: customProvider,
      };

      await updateUserProviderKeys(auth.userId, updatedKeys);

      return NextResponse.json({
        success: true,
        provider: {
          id: providerId,
          name,
          type: 'custom',
          baseUrl: customProvider.baseUrl,
          models: customProvider.models,
          maskedKey: maskApiKey(apiKey),
        },
        message: `Custom provider "${name}" added successfully`,
      });
    }

    // === 预定义 Provider ===
    const { provider, apiKey, action } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'provider and apiKey are required' } },
        { status: 400 }
      );
    }

    // 验证 provider
    const providerInfo = SUPPORTED_PROVIDERS.find(p => p.id === provider);
    if (!providerInfo) {
      return NextResponse.json(
        { error: { code: 'INVALID_PROVIDER', message: `Unsupported provider: ${provider}. Use custom: true to add a custom provider.` } },
        { status: 400 }
      );
    }

    // 验证 API Key 格式（简单检查）
    if (providerInfo.keyPrefix && !apiKey.startsWith(providerInfo.keyPrefix)) {
      console.warn(`[Providers API] Key for ${provider} doesn't match expected prefix ${providerInfo.keyPrefix}`);
    }

    // 更新或添加
    const updatedKeys = {
      ...existingKeys,
      [provider]: apiKey,
    };

    // 测试 Key（可选）
    if (action === 'test') {
      try {
        const testResult = await testProviderKey(providerInfo, apiKey);
        if (!testResult.valid) {
          return NextResponse.json({
            error: { code: 'INVALID_KEY', message: testResult.error || 'API key validation failed' },
          }, { status: 400 });
        }
      } catch {
        return NextResponse.json({
          error: { code: 'TEST_FAILED', message: 'Failed to validate API key' },
        }, { status: 500 });
      }
    }

    // 保存
    await updateUserProviderKeys(auth.userId, updatedKeys);

    return NextResponse.json({
      success: true,
      provider: providerInfo.id,
      maskedKey: maskApiKey(apiKey),
      message: `${providerInfo.name} API key saved successfully`,
    });
  } catch (error) {
    console.error('[Providers API] POST error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to save provider key' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE - 删除 Provider Key（预定义或自定义）
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'provider parameter is required' } },
        { status: 400 }
      );
    }

    // 获取现有 keys
    const existingKeys = await getUserProviderKeys(auth.userId);
    
    if (!existingKeys[provider]) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: `No key configured for ${provider}` } },
        { status: 404 }
      );
    }

    // 删除
    const updatedKeys = { ...existingKeys };
    delete updatedKeys[provider];
    
    await updateUserProviderKeys(auth.userId, updatedKeys);

    return NextResponse.json({
      success: true,
      message: `${provider} removed`,
    });
  } catch (error) {
    console.error('[Providers API] DELETE error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete provider key' } },
      { status: 500 }
    );
  }
}

/**
 * 测试预定义 Provider API Key 是否有效
 */
async function testProviderKey(
  provider: typeof SUPPORTED_PROVIDERS[0],
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${provider.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key or unauthorized' };
    }

    return { valid: false, error: `API returned status ${response.status}` };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return { valid: false, error: 'Connection timeout' };
      }
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Unknown error' };
  }
}

/**
 * 测试自定义 Provider 是否可用
 */
async function testCustomProvider(
  provider: CustomProviderConfig
): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  try {
    const response = await fetch(`${provider.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const data = await response.json();
      const models = data.data?.map((m: { id: string }) => m.id) || [];
      return { valid: true, models };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key or unauthorized' };
    }

    // 某些 API 可能不支持 /models 端点，尝试基本连接
    if (response.status === 404) {
      // 尝试直接测试 chat completion（dry run）
      return { valid: true, models: provider.models || [] };
    }

    return { valid: false, error: `API returned status ${response.status}` };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return { valid: false, error: 'Connection timeout' };
      }
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Unknown error' };
  }
}
