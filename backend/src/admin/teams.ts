/**
 * Admin Teams Management Module
 * 团队管理 API
 */

import { db } from '../db';

export interface AdminTeamView {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  memberCount: number;
  keyCount: number;
  requestCount: number;
  totalCost: number;
  status: 'active' | 'suspended' | 'banned';
  createdAt: number;
}

export interface TeamListOptions {
  search?: string;
  status?: string;
  sortBy?: 'created_at' | 'members' | 'requests' | 'cost';
  sortOrder?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
}

export interface TeamDetail extends AdminTeamView {
  members: TeamMemberView[];
  invitations: TeamInvitationView[];
}

export interface TeamMemberView {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: number;
}

export interface TeamInvitationView {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: number;
  expiresAt: number;
}

// 团队列表
export function listTeams(options: TeamListOptions = {}): { teams: AdminTeamView[]; total: number } {
  const {
    search,
    status,
    sortBy = 'created_at',
    sortOrder = 'desc',
    offset = 0,
    limit = 50,
  } = options;

  let whereClauses: string[] = [];
  let params: any[] = [];

  if (search) {
    whereClauses.push('(t.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClauses.push('t.status = ?');
    params.push(status);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // 排序映射
  const sortMap: Record<string, string> = {
    created_at: 't.created_at',
    members: 'member_count',
    requests: 'request_count',
    cost: 'total_cost',
  };
  const orderBy = sortMap[sortBy] || 't.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // 获取总数
  const countQuery = `
    SELECT COUNT(DISTINCT t.id) as total
    FROM teams t
    LEFT JOIN users u ON t.owner_id = u.id
    ${whereClause}
  `;
  const total = (db.prepare(countQuery).get(...params) as any)?.total || 0;

  // 获取团队列表
  const query = `
    SELECT 
      t.id,
      t.name,
      t.owner_id,
      u.email as owner_email,
      t.status,
      t.created_at,
      COUNT(DISTINCT tm.id) as member_count,
      COUNT(DISTINCT sk.id) as key_count,
      COUNT(ul.id) as request_count,
      COALESCE(SUM(ul.cost), 0) as total_cost
    FROM teams t
    LEFT JOIN users u ON t.owner_id = u.id
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN shared_keys sk ON sk.user_id IN (SELECT user_id FROM team_members WHERE team_id = t.id)
    LEFT JOIN usage_logs ul ON ul.key_id = sk.id
    ${whereClause}
    GROUP BY t.id
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(query).all(...params, limit, offset) as any[];

  const teams: AdminTeamView[] = rows.map(row => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    ownerEmail: row.owner_email,
    memberCount: row.member_count,
    keyCount: row.key_count,
    requestCount: row.request_count,
    totalCost: row.total_cost,
    status: row.status || 'active',
    createdAt: row.created_at,
  }));

  return { teams, total };
}

// 团队详情
export function getTeamDetail(teamId: string): TeamDetail | null {
  const row = db.prepare(`
    SELECT 
      t.id,
      t.name,
      t.owner_id,
      u.email as owner_email,
      t.status,
      t.created_at,
      COUNT(DISTINCT tm.id) as member_count,
      COUNT(DISTINCT sk.id) as key_count,
      COUNT(ul.id) as request_count,
      COALESCE(SUM(ul.cost), 0) as total_cost
    FROM teams t
    LEFT JOIN users u ON t.owner_id = u.id
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN shared_keys sk ON sk.user_id IN (SELECT user_id FROM team_members WHERE team_id = t.id)
    LEFT JOIN usage_logs ul ON ul.key_id = sk.id
    WHERE t.id = ?
    GROUP BY t.id
  `).get(teamId) as any;

  if (!row) return null;

  // 获取成员列表
  const memberRows = db.prepare(`
    SELECT tm.id, tm.user_id, u.email, tm.role, tm.joined_at
    FROM team_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ?
    ORDER BY tm.joined_at ASC
  `).all(teamId) as any[];

  const members: TeamMemberView[] = memberRows.map(m => ({
    id: m.id,
    userId: m.user_id,
    email: m.email,
    role: m.role,
    joinedAt: m.joined_at,
  }));

  // 获取邀请列表
  const invitationRows = db.prepare(`
    SELECT id, email, role, status, created_at, expires_at
    FROM team_invitations
    WHERE team_id = ?
    ORDER BY created_at DESC
  `).all(teamId) as any[];

  const invitations: TeamInvitationView[] = invitationRows.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    createdAt: inv.created_at,
    expiresAt: inv.expires_at,
  }));

  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    ownerEmail: row.owner_email,
    memberCount: row.member_count,
    keyCount: row.key_count,
    requestCount: row.request_count,
    totalCost: row.total_cost,
    status: row.status || 'active',
    createdAt: row.created_at,
    members,
    invitations,
  };
}

// 封禁团队
export function suspendTeam(teamId: string, reason?: string): void {
  // 更新团队状态
  db.prepare(`
    UPDATE teams SET status = 'suspended' WHERE id = ?
  `).run(teamId);

  // 禁用团队成员的所有 Key
  db.prepare(`
    UPDATE shared_keys SET is_active = 0 
    WHERE user_id IN (SELECT user_id FROM team_members WHERE team_id = ?)
  `).run(teamId);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, team_id, action, resource, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    teamId,
    'team_suspended',
    'team',
    JSON.stringify({ reason: reason || 'Admin suspended' }),
    Date.now()
  );
}

// 解封团队
export function unsuspendTeam(teamId: string): void {
  // 更新团队状态
  db.prepare(`
    UPDATE teams SET status = 'active' WHERE id = ?
  `).run(teamId);

  // 重新启用团队成员的 Key
  db.prepare(`
    UPDATE shared_keys SET is_active = 1 
    WHERE user_id IN (SELECT user_id FROM team_members WHERE team_id = ?)
    AND status = 'active'
  `).run(teamId);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, team_id, action, resource, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    teamId,
    'team_unsuspended',
    'team',
    JSON.stringify({}),
    Date.now()
  );
}

// 删除团队
export function deleteTeam(teamId: string): void {
  // 先禁用所有 Key
  db.prepare(`
    UPDATE shared_keys SET is_active = 0 
    WHERE user_id IN (SELECT user_id FROM team_members WHERE team_id = ?)
  `).run(teamId);

  // 删除团队成员
  db.prepare('DELETE FROM team_members WHERE team_id = ?').run(teamId);

  // 删除邀请
  db.prepare('DELETE FROM team_invitations WHERE team_id = ?').run(teamId);

  // 删除团队
  db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);

  // 记录操作日志
  db.prepare(`
    INSERT INTO audit_logs (id, action, resource, resource_id, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `audit-${Date.now()}`,
    'team_deleted',
    'team',
    teamId,
    JSON.stringify({}),
    Date.now()
  );
}

// 获取团队活动日志
export function getTeamActivityLog(teamId: string, limit: number = 50): any[] {
  return db.prepare(`
    SELECT id, user_id, team_id, action, resource, resource_id, details, timestamp
    FROM audit_logs
    WHERE team_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(teamId, limit) as any[];
}
