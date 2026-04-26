/**
 * GET /api/models/leaderboard
 * 
 * 查询基于用户真实使用行为的模型排行榜
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCategoryLeaderboard, getAllCategoriesOverview } from '@/lib/db/model-usage';

// 有效的分类
const VALID_CATEGORIES = ['coding', 'reasoning', 'math', 'translation', 'creative', 'analysis', 'chinese', 'chat'];
const VALID_SORTS = ['selections', 'tokens', 'cost', 'users'];
const VALID_PERIODS = ['24h', '7d', '30d', 'all'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const category = searchParams.get('category') || 'all';
    const sort = searchParams.get('sort') || 'selections';
    const period = searchParams.get('period') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 参数验证
    if (sort && !VALID_SORTS.includes(sort)) {
      return NextResponse.json(
        { error: `Invalid sort: ${sort}. Valid: ${VALID_SORTS.join(', ')}` },
        { status: 400 }
      );
    }

    if (period && !VALID_PERIODS.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period: ${period}. Valid: ${VALID_PERIODS.join(', ')}` },
        { status: 400 }
      );
    }

    // 获取所有分类概览
    if (category === 'all') {
      const overview = await getAllCategoriesOverview();
      return NextResponse.json({
        category: 'all',
        sort,
        period,
        overview,
      });
    }

    // 参数验证
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category: ${category}. Valid: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // 查询排行榜
    const leaderboard = await getCategoryLeaderboard({
      category,
      sort: sort as 'selections' | 'tokens' | 'cost' | 'users',
      period: period as '24h' | '7d' | '30d' | 'all',
      limit,
    });

    return NextResponse.json({
      category,
      sort,
      period,
      leaderboard,
    });
  } catch (error) {
    console.error('[leaderboard] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}

// CORS 支持
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
