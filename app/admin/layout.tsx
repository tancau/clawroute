/**
 * Admin Layout
 * 管理后台布局
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch('/v1/admin/check');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  };

  // Loading
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  // Not admin - redirect to login
  if (!isAdmin) {
    // Allow access to login page
    if (typeof window !== 'undefined' && window.location.pathname === '/admin/login') {
      return <>{children}</>;
    }

    // Redirect to admin login
    if (typeof window !== 'undefined') {
      router.push('/admin/login');
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] border-r border-[#1e293b] p-4">
        <div className="mb-8">
          <Link href="/admin/dashboard" className="text-xl font-bold">
            ClawRoute Admin
          </Link>
        </div>

        <nav className="space-y-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>📊</span>
            <span>Dashboard</span>
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>👥</span>
            <span>Users</span>
          </Link>

          <Link
            href="/admin/keys"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>🔑</span>
            <span>Keys</span>
          </Link>

          <Link
            href="/admin/teams"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>🏢</span>
            <span>Teams</span>
          </Link>

          <Link
            href="/admin/api-keys"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>🗝️</span>
            <span>API Keys</span>
          </Link>

          <Link
            href="/admin/audit"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>📋</span>
            <span>Audit</span>
          </Link>

          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </Link>

          <hr className="border-[#1e293b] my-4" />

          <div className="text-xs text-[#475569] uppercase tracking-wider mb-2 px-4">Phase 4</div>

          <Link
            href="/admin/sso"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>🔐</span>
            <span>SSO</span>
          </Link>

          <Link
            href="/admin/branding"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>🎨</span>
            <span>Branding</span>
          </Link>

          <Link
            href="/admin/exports"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>📦</span>
            <span>Exports</span>
          </Link>

          <Link
            href="/admin/custom-routes"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <span>🔀</span>
            <span>Custom Routes</span>
          </Link>

          <hr className="border-[#1e293b] my-4" />

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#1e293b] transition-colors text-[#94a3b8]"
          >
            <span>←</span>
            <span>Back to App</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
