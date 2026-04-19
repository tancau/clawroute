/**
 * GET /api/export/usage - 导出使用数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyJWT } from '@/lib/auth';
import { ensureRequestLogsTable } from '@/lib/db-tables';

// 使用数据类型
interface UsageRecord {
  id: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  intent?: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: number;
}

// 导出参数
interface ExportParams {
  startDate?: number;
  endDate?: number;
  format?: 'json' | 'csv';
  model?: string;
  provider?: string;
}

export async function GET(request: NextRequest): Promise<Response | NextResponse> {
  try {
    // 验证 JWT
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyJWT(token, process.env.JWT_SECRET || 'clawrouter-dev-secret');
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const params: ExportParams = {
      startDate: searchParams.get('startDate') ? parseInt(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? parseInt(searchParams.get('endDate')!) : undefined,
      format: (searchParams.get('format') as 'json' | 'csv') || 'json',
      model: searchParams.get('model') || undefined,
      provider: searchParams.get('provider') || undefined,
    };

    // 默认时间范围：最近 30 天
    if (!params.startDate) {
      params.startDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
    }
    if (!params.endDate) {
      params.endDate = Date.now();
    }

    await ensureRequestLogsTable();

    // 构建基础查询
    const baseQuery = sql`
      SELECT 
        id, model, provider, input_tokens, output_tokens, 
        cost_usd, intent, latency_ms, success, error_message, created_at
      FROM request_logs 
      WHERE user_id = ${userId}
        AND created_at >= ${params.startDate}
        AND created_at <= ${params.endDate}
      ORDER BY created_at DESC
      LIMIT 10000
    `;

    const result = await baseQuery;

    const records: UsageRecord[] = result.rows.map(row => ({
      id: row.id as string,
      model: row.model as string,
      provider: row.provider as string,
      inputTokens: row.input_tokens as number,
      outputTokens: row.output_tokens as number,
      costUsd: parseFloat(row.cost_usd as string) || 0,
      intent: (row.intent as string) || undefined,
      latencyMs: row.latency_ms as number,
      success: row.success as boolean,
      errorMessage: (row.error_message as string) || undefined,
      createdAt: row.created_at as number,
    }));

    // 根据 format 返回不同格式
    if (params.format === 'csv') {
      const csv = convertToCSV(records);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="usage-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        records,
        summary: {
          totalRecords: records.length,
          totalTokens: records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0),
          totalCost: records.reduce((sum, r) => sum + r.costUsd, 0),
          averageLatency: records.length > 0 
            ? Math.round(records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length)
            : 0,
          successRate: records.length > 0 
            ? (records.filter(r => r.success).length / records.length * 100).toFixed(1)
            : '0',
        },
        exportParams: params,
      },
    });

  } catch (error) {
    console.error('[Export Usage] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 转换为 CSV
function convertToCSV(records: UsageRecord[]): string {
  const headers = [
    'ID',
    'Model',
    'Provider',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
    'Cost (USD)',
    'Intent',
    'Latency (ms)',
    'Success',
    'Error Message',
    'Created At',
  ];

  const rows = records.map(record => [
    record.id,
    record.model,
    record.provider,
    record.inputTokens,
    record.outputTokens,
    record.inputTokens + record.outputTokens,
    record.costUsd.toFixed(6),
    record.intent || '',
    record.latencyMs,
    record.success ? 'true' : 'false',
    record.errorMessage || '',
    new Date(record.createdAt).toISOString(),
  ]);

  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ];

  return csvRows.join('\n');
}