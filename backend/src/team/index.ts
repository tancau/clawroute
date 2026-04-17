import { z } from 'zod';
import { db } from '../db';
import crypto from 'crypto';

/**
 * Team Member role type
 */
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Team Member interface
 */
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: number;
}

/**
 * Team interface
 */
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: number;
}

/**
 * Team Invitation interface
 */
export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
  expiresAt: number;
}

/**
 * Create Team input
 */
export const CreateTeamInput = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(1).max(100),
});

/**
 * Invite Member input
 */
export const InviteMemberInput = z.object({
  teamId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  invitedBy: z.string().min(1),
});

/**
 * Update Role input
 */
export const UpdateRoleInput = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(['admin', 'member', 'viewer']),
});

/**
 * Initialize team-related database tables
 */
export function initTeamTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at INTEGER NOT NULL,
      UNIQUE(team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

    CREATE TABLE IF NOT EXISTS team_invitations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
    CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
  `);
}

/**
 * Create a new team
 */
export function createTeam(ownerId: string, name: string): Team {
  const now = Date.now();
  const teamId = crypto.randomUUID();
  const memberId = crypto.randomUUID();

  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)
  `);
  const insertMember = db.prepare(`
    INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertTeam.run(teamId, name, ownerId, now);
    insertMember.run(memberId, teamId, ownerId, 'owner', now);
  });

  transaction();

  return {
    id: teamId,
    name,
    ownerId,
    members: [
      {
        id: memberId,
        teamId,
        userId: ownerId,
        role: 'owner',
        joinedAt: now,
      },
    ],
    createdAt: now,
  };
}

/**
 * Get team by ID
 */
export function getTeam(teamId: string): Team | null {
  const teamRow = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as any;
  if (!teamRow) return null;

  const memberRows = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(teamId) as any[];

  return {
    id: teamRow.id,
    name: teamRow.name,
    ownerId: teamRow.owner_id,
    members: memberRows.map((m) => ({
      id: m.id,
      teamId: m.team_id,
      userId: m.user_id,
      role: m.role as TeamRole,
      joinedAt: m.joined_at,
    })),
    createdAt: teamRow.created_at,
  };
}

/**
 * Get all teams a user belongs to
 */
export function getUserTeams(userId: string): Team[] {
  const rows = db.prepare(`
    SELECT t.* FROM teams t
    INNER JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId) as any[];

  return rows.map((row) => {
    const memberRows = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(row.id) as any[];
    return {
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      members: memberRows.map((m) => ({
        id: m.id,
        teamId: m.team_id,
        userId: m.user_id,
        role: m.role as TeamRole,
        joinedAt: m.joined_at,
      })),
      createdAt: row.created_at,
    };
  });
}

/**
 * Get a user's role in a team
 */
export function getMemberRole(teamId: string, userId: string): TeamRole | null {
  const row = db.prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId) as any;
  return row ? (row.role as TeamRole) : null;
}

/**
 * Invite a member to a team
 */
export function inviteMember(teamId: string, email: string, role: TeamRole, invitedBy: string): TeamInvitation {
  const now = Date.now();
  const invitationId = crypto.randomUUID();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

  db.prepare(`
    INSERT INTO team_invitations (id, team_id, email, role, invited_by, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(invitationId, teamId, email, role, invitedBy, 'pending', now, expiresAt);

  return {
    id: invitationId,
    teamId,
    email,
    role,
    invitedBy,
    status: 'pending',
    createdAt: now,
    expiresAt,
  };
}

/**
 * Accept a team invitation
 */
export function acceptInvitation(invitationId: string, userId: string): TeamMember | null {
  const invitation = db.prepare('SELECT * FROM team_invitations WHERE id = ? AND status = ?').get(invitationId, 'pending') as any;
  if (!invitation) return null;

  if (invitation.expires_at < Date.now()) {
    db.prepare('UPDATE team_invitations SET status = ? WHERE id = ?').run('expired', invitationId);
    return null;
  }

  const now = Date.now();
  const memberId = crypto.randomUUID();

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)
    `).run(memberId, invitation.team_id, userId, invitation.role, now);

    db.prepare('UPDATE team_invitations SET status = ? WHERE id = ?').run('accepted', invitationId);
  });

  transaction();

  return {
    id: memberId,
    teamId: invitation.team_id,
    userId,
    role: invitation.role as TeamRole,
    joinedAt: now,
  };
}

/**
 * Remove a member from a team
 */
export function removeMember(teamId: string, userId: string): boolean {
  // Cannot remove the owner
  const team = getTeam(teamId);
  if (!team) return false;
  if (team.ownerId === userId) return false;

  const result = db.prepare('DELETE FROM team_members WHERE team_id = ? AND user_id = ?').run(teamId, userId);
  return result.changes > 0;
}

/**
 * Update a member's role
 */
export function updateRole(teamId: string, userId: string, role: TeamRole): TeamMember | null {
  // Cannot change the owner's role
  const team = getTeam(teamId);
  if (!team) return null;
  if (team.ownerId === userId) return null;

  db.prepare('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?').run(role, teamId, userId);

  const row = db.prepare('SELECT * FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId) as any;
  if (!row) return null;

  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role as TeamRole,
    joinedAt: row.joined_at,
  };
}

/**
 * Get pending invitations for a team
 */
export function getTeamInvitations(teamId: string): TeamInvitation[] {
  const rows = db.prepare('SELECT * FROM team_invitations WHERE team_id = ? ORDER BY created_at DESC').all(teamId) as any[];
  return rows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    email: row.email,
    role: row.role as TeamRole,
    invitedBy: row.invited_by,
    status: row.status as TeamInvitation['status'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Get pending invitations for a user's email
 */
export function getUserInvitations(email: string): TeamInvitation[] {
  const now = Date.now();
  // Expire old pending invitations
  db.prepare("UPDATE team_invitations SET status = 'expired' WHERE email = ? AND status = 'pending' AND expires_at < ?").run(email, now);

  const rows = db.prepare('SELECT * FROM team_invitations WHERE email = ? AND status = ? ORDER BY created_at DESC').all(email, 'pending') as any[];
  return rows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    email: row.email,
    role: row.role as TeamRole,
    invitedBy: row.invited_by,
    status: row.status as TeamInvitation['status'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Delete a team (owner only)
 */
export function deleteTeam(teamId: string, ownerId: string): boolean {
  const result = db.prepare('DELETE FROM teams WHERE id = ? AND owner_id = ?').run(teamId, ownerId);
  return result.changes > 0;
}
