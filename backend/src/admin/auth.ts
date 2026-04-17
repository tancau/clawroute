/**
 * Admin Authentication Module
 * 管理员认证与权限系统
 */

import { db } from '../db';

export interface AdminUser {
  id: string;
  userId: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
  createdAt: number;
}

export interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

// 初始化管理员表
export function initAdminTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      permissions TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admin_users(id)
    );
  `);

  // 创建默认超级管理员（第一个用户）
  const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get() as any;
  if (firstUser) {
    db.prepare(`
      INSERT OR IGNORE INTO admin_users (id, user_id, role, permissions, created_at)
      VALUES (?, ?, 'super_admin', ?, ?)
    `).run('admin-super', firstUser.id, JSON.stringify(['*']), Date.now());
  }
}

// 检查用户是否为管理员
export function isAdmin(userId: string): boolean {
  const admin = db.prepare('SELECT id FROM admin_users WHERE user_id = ?').get(userId) as any;
  return !!admin;
}

// 获取管理员信息
export function getAdminUser(userId: string): AdminUser | null {
  const row = db.prepare(`
    SELECT id, user_id, role, permissions, created_at
    FROM admin_users
    WHERE user_id = ?
  `).get(userId) as any;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    permissions: JSON.parse(row.permissions || '[]'),
    createdAt: row.created_at,
  };
}

// 创建管理员
export function createAdminUser(
  userId: string,
  role: 'admin' | 'super_admin' = 'admin',
  permissions: string[] = []
): AdminUser {
  const id = `admin-${Date.now()}`;
  const now = Date.now();

  db.prepare(`
    INSERT INTO admin_users (id, user_id, role, permissions, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, role, JSON.stringify(permissions), now);

  return { id, userId, role, permissions, createdAt: now };
}

// 检查权限
export function hasPermission(adminUser: AdminUser, permission: string): boolean {
  // 超级管理员拥有所有权限
  if (adminUser.role === 'super_admin') return true;
  
  // 检查特定权限
  if (adminUser.permissions.includes('*')) return true;
  if (adminUser.permissions.includes(permission)) return true;

  // 检查通配符权限 (如 'users:*' 匹配 'users:read')
  const [resource] = permission.split(':');
  if (adminUser.permissions.includes(`${resource}:*`)) return true;

  return false;
}

// 创建管理员会话
export function createAdminSession(adminId: string): string {
  const id = `session-${Date.now()}`;
  const token = `adm_${generateToken()}`;
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时

  db.prepare(`
    INSERT INTO admin_sessions (id, admin_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, adminId, token, expiresAt, Date.now());

  return token;
}

// 验证管理员会话
export function validateAdminSession(token: string): AdminUser | null {
  const session = db.prepare(`
    SELECT admin_id, expires_at
    FROM admin_sessions
    WHERE token = ?
  `).get(token) as any;

  if (!session) return null;
  if (session.expires_at < Date.now()) {
    // 会话过期，删除
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    return null;
  }

  const admin = db.prepare(`
    SELECT id, user_id, role, permissions, created_at
    FROM admin_users
    WHERE id = ?
  `).get(session.admin_id) as any;

  if (!admin) return null;

  return {
    id: admin.id,
    userId: admin.user_id,
    role: admin.role,
    permissions: JSON.parse(admin.permissions || '[]'),
    createdAt: admin.created_at,
  };
}

// 删除管理员会话
export function deleteAdminSession(token: string): void {
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
}

// 列出所有管理员
export function listAdmins(): AdminUser[] {
  const rows = db.prepare(`
    SELECT id, user_id, role, permissions, created_at
    FROM admin_users
    ORDER BY created_at DESC
  `).all() as any[];

  return rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    role: row.role,
    permissions: JSON.parse(row.permissions || '[]'),
    createdAt: row.created_at,
  }));
}

// 删除管理员
export function deleteAdmin(adminId: string): void {
  db.prepare('DELETE FROM admin_sessions WHERE admin_id = ?').run(adminId);
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(adminId);
}

// 辅助函数：生成随机 token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
