'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const NAV = [
  { href: '/',           label: '대시보드',     icon: '🏠' },
  { href: '/new',        label: '신규 등록',    icon: '➕' },
  { href: '/meetings',   label: '전체 목록',    icon: '📋' },
  { href: '/analytics',  label: '분석 브리핑',  icon: '📊' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-gray-900 text-white h-screen sticky top-0">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-gray-700">
        <p className="text-xs text-gray-400 font-medium leading-tight">인공지능연구원</p>
        <h1 className="text-sm font-bold mt-0.5 leading-snug">회의비 관리 시스템</h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 사용자 정보 */}
      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate mb-2">{session?.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-xs text-gray-400 hover:text-white py-1.5 rounded hover:bg-gray-800 transition-colors text-left px-2"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
