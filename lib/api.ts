// API 服务层 - 连接后端

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ===== Types =====
export interface User {
  id: string;
  email: string;
  name?: string;
  credits: number;
  createdAt: number;
}

export interface SharedKey {
  id: string;
  userId: string;
  provider: string;
  keyPreview: string;
  isActive: boolean;
  totalUsage: number;
  totalEarnings: number;
  createdAt: number;
  lastUsedAt?: number;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  totalSaved: number;
  byProvider: Record<string, { requests: number; cost: number }>;
  byIntent: Record<string, { requests: number; cost: number }>;
}

export interface Earnings {
  totalCents: number;
  pendingCents: number;
  paidCents: number;
  totalDollars: number;
  pendingDollars: number;
  paidDollars: number;
}

export interface DashboardData {
  user: User;
  keys: number;
  activeKeys: number;
  earnings: {
    totalCents: number;
    pendingCents: number;
    totalDollars: number;
  };
  usage: {
    requests: number;
    tokens: number;
    costDollars: number;
    savedDollars: number;
  };
}

// ===== API Client =====
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // 从 localStorage 恢复 token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('clawroute_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('clawroute_token', token);
      } else {
        localStorage.removeItem('clawroute_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    useRelativeUrl = false
  ): Promise<{ data?: T; error?: { code: string; message: string } }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // useRelativeUrl: true means use Next.js API Routes (same-origin proxy)
    // useRelativeUrl: false means call backend directly
    const url = useRelativeUrl ? path : `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || { code: 'UNKNOWN', message: 'Request failed' } };
      }

      return { data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      const isNetworkError = message.includes('Failed to fetch') || message.includes('ECONNREFUSED') || message.includes('NetworkError');

      return {
        error: {
          code: isNetworkError ? 'BACKEND_UNAVAILABLE' : 'NETWORK_ERROR',
          message: isNetworkError
            ? 'Backend service is not available. Please try again later.'
            : message,
        },
      };
    }
  }

  // ===== Auth API =====
  async register(email: string, password: string, name?: string) {
    // Use Next.js API Route proxy to avoid CORS/network issues on Vercel
    return this.request<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }, true);
  }

  async login(email: string, password: string) {
    // Use Next.js API Route proxy to avoid CORS/network issues on Vercel
    const result = await this.request<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, true);
    if (result.data?.accessToken) {
      this.setToken(result.data.accessToken);
    }
    return result;
  }

  logout() {
    this.setToken(null);
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string; expiresIn: number }>('/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async requestPasswordReset(email: string) {
    return this.request<{ success: boolean; resetToken?: string; message: string }>('/v1/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(resetToken: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  }

  async getUser(userId: string) {
    return this.request<{ user: User }>(`/v1/users/${userId}`);
  }

  async getDashboard(userId: string) {
    return this.request<DashboardData>(`/v1/users/${userId}/dashboard`);
  }

  // ===== Keys API =====
  async getKeys(userId: string, provider?: string) {
    const params = new URLSearchParams({ userId });
    if (provider) params.append('provider', provider);
    return this.request<{ keys: SharedKey[] }>(`/v1/keys?${params}`);
  }

  async submitKey(userId: string, provider: string, apiKey: string) {
    return this.request<{ key: SharedKey }>('/v1/keys', {
      method: 'POST',
      body: JSON.stringify({ userId, provider, apiKey }),
    });
  }

  async updateKey(keyId: string, data: { isActive?: boolean; metadata?: Record<string, unknown> }) {
    return this.request<{ key: SharedKey }>(`/v1/keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteKey(keyId: string) {
    return this.request<{ success: boolean }>(`/v1/keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  // ===== Billing API =====
  async getEarnings(userId: string) {
    return this.request<{ userId: string; earnings: Earnings }>(`/v1/billing/earnings/${userId}`);
  }

  async getUsageStats(userId: string, days: number = 30) {
    return this.request<{ userId: string; period: { days: number }; stats: UsageStats }>(
      `/v1/billing/usage/${userId}?days=${days}`
    );
  }

  // ===== Chat API =====
  async chat(messages: Array<{ role: string; content: string }>, model: string = 'auto') {
    return this.request<{ id: string; choices: Array<{ message: { content: string } }>; _routing?: unknown }>(
      '/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({ model, messages }),
      }
    );
  }

  // ===== Health Check =====
  async healthCheck() {
    return this.request<{ status: string; timestamp: string; version: string }>('/health');
  }

  // ===== Analytics API =====
  async getAnalyticsUsage(userId: string, days: number = 30) {
    return this.request<{ userId: string; period: { days: number }; stats: Record<string, unknown> }>(
      `/v1/analytics/usage/${userId}?days=${days}`
    );
  }

  async getSavings(userId: string) {
    return this.request<{
      userId: string;
      totalSavedCents: number;
      totalSavedDollars: number;
      averageSavedPercent: number;
      daily: Array<{ date: string; savedCents: number }>;
    }>(`/v1/analytics/savings/${userId}`);
  }

  async getRecentRequests(userId: string, limit: number = 10) {
    return this.request<{
      userId: string;
      requests: Array<{
        id: string;
        model: string;
        provider: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        costCents: number;
        costDollars: number;
        timestamp: number;
      }>;
    }>(`/v1/analytics/recent/${userId}?limit=${limit}`);
  }

  async getTopModels(userId: string, limit: number = 10) {
    return this.request<{
      userId: string;
      models: Array<{
        model: string;
        requests: number;
        totalTokens: number;
        totalCostCents: number;
        totalCostDollars: number;
      }>;
    }>(`/v1/analytics/top-models/${userId}?limit=${limit}`);
  }
}

export const api = new ApiClient(API_BASE);
