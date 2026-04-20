import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import type { Meeting } from '@/types';

export const dynamic = 'force-dynamic';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatAmount(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default async function DashboardPage() {
  await getServerSession(authOptions);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: recent }, { data: thisMonth }] = await Promise.all([
    supabaseAdmin
      .from('meetings')
      .select('id, date, topic, store_name, amount, handler, card_last4')
      .order('date', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('meetings')
      .select('amount')
      .gte('date', monthStart),
  ]);

  const monthTotal = (thisMonth ?? []).reduce((s: number, m: { amount: number }) => s + m.amount, 0);
  const monthCount = (thisMonth ?? []).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">대시보드</h2>
      <p className="text-sm text-gray-500 mb-8">군 장병 AI SW 역량강화 사업 · RS-2024-00431384</p>

      {/* 이달 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">이번 달 회의비 합계</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(monthTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">이번 달 회의 건수</p>
          <p className="text-2xl font-bold text-gray-900">{monthCount}건</p>
        </div>
        <Link
          href="/new"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-5 flex flex-col justify-between transition-colors"
        >
          <p className="text-sm font-medium opacity-90">새 회의록 등록</p>
          <p className="text-3xl font-bold mt-2">+</p>
        </Link>
      </div>

      {/* 최근 목록 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">최근 등록</h3>
        </div>
        {!recent || recent.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            등록된 회의록이 없습니다.{' '}
            <Link href="/new" className="text-blue-600 underline">
              첫 번째 회의록을 등록하세요
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(recent as Meeting[]).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/meetings/${m.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.topic}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(m.date)} · {m.store_name} · {m.handler ?? '-'}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{formatAmount(m.amount)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(recent?.length ?? 0) > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-right">
            <Link href="/meetings" className="text-xs text-blue-600 hover:underline">
              전체 목록 보기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
