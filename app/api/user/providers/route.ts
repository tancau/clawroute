/**
 * 用户 Provider API Keys 管理 API
 * 
 * GET  - 获取用户的 Provider Keys（脱敏显示）
 * POST - 添加/更新 Provider Key
 * DELETE - 删除 Provider Key
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { updateUserProviderKeys, getUserProviderKeys } from '@/lib/auth';
import { maskApiKey, ProviderKeys } from '@/lib/encryption';

// 支持的 Providers
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
 * GET - 获取用户的 Provider Keys（脱敏显示）
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
    
    // 构建响应：脱敏显示
    const providers = SUPPORTED_PROVIDERS.map(provider => {
      const key = userKeys[provider.id];
      return {
        id: provider.id,
        name: provider.name,
        configured: !!key,
        maskedKey: key ? maskApiKey(key) : null,
        keyPrefix: provider.keyPrefix,
        status: key ? 'configured' : 'not_configured',
      };
    });

    return NextResponse.json({
      providers,
      supportedProviders: SUPPORTED_PROVIDERS.map(p => ({ id: p.id, name: p.name, keyPrefix: p.keyPrefix })),
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
 * POST - 添加/更新 Provider Key
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
        { error: { code: 'INVALID_PROVIDER', message: `Unsupported provider: ${provider}` } },
        { status: 400 }
      );
    }

    // 验证 API Key 格式（简单检查）
    if (providerInfo.keyPrefix && !apiKey.startsWith(providerInfo.keyPrefix)) {
      // 某些 provider 可能没有固定前缀，只警告不阻止
      console.warn(`[Providers API] Key for ${provider} doesn't match expected prefix ${providerInfo.keyPrefix}`);
    }

    // 获取现有 keys
    const existingKeys = await getUserProviderKeys(auth.userId);
    
    // 更新或添加
    const updatedKeys: ProviderKeys = {
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
 * DELETE - 删除 Provider Key
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
    const updatedKeys: ProviderKeys = { ...existingKeys };
    delete updatedKeys[provider];
    
    await updateUserProviderKeys(auth.userId, updatedKeys);

    return NextResponse.json({
      success: true,
      message: `${provider} API key removed`,
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
 * 测试 Provider API Key 是否有效
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
