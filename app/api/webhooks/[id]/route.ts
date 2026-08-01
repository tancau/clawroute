/**
 * DELETE /api/webhooks/[id] - 删除 Webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { verifyJWT, getJWTSecret } from '@/lib/auth';
import { ensureWebhooksTable } from '@/lib/db-tables';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
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

    const payload = await verifyJWT(token, getJWTSecret());
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = payload.userId as string;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database temporarily unavailable' },
        { status: 503 }
      );
    }
    const { id } = await params;

    await ensureWebhooksTable();

    // 删除 Webhook（确保是用户自己的）
    const result = await db`
      DELETE FROM webhooks
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Webhooks DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}