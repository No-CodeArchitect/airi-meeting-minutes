'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Meeting } from '@/types';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}
function formatAmt(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function MeetingListClient() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const currentMonth   = searchParams.get('month')   ?? '';
  const currentHandler = searchParams.get('handler') ?? '';
  const currentCard    = searchParams.get('card')    ?? '';

  const [meetings, setMeetings]   = useState<Meeting[]>([]);
  const [handlers, setHandlers]   = useState<string[]>([]);
  const [cards, setCards]         = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);

  // 월 옵션
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // 데이터 fetch
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentMonth)   params.set('month',   currentMonth);
    if (currentHandler) params.set('handler', currentHandler);
    if (currentCard)    params.set('card',    currentCard);

    const res  = await fetch(`/api/meetings?${params.toString()}`);
    const data = await res.json();
    setMeetings(data.meetings ?? []);
    setHandlers(data.handlers ?? []);
    setCards(data.cards ?? []);
    setLoading(false);
  }, [currentMonth, currentHandler, currentCard]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  // 삭제
  async function handleDelete(id: string, topic: string) {
    if (!confirm(`"${topic}" 회의록을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      // 즉시 목록에서 제거
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    } else {
      alert('삭제 실패');
    }
  }

  // 필터 변경
  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== 'month'   && currentMonth)   params.set('month',   currentMonth);
    if (key !== 'handler' && currentHandler) params.set('handler', currentHandler);
    if (key !== 'card'    && currentCard)    params.set('card',    currentCard);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const total = meetings.reduce((s, m) => s + m.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">전체 목록</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? '로딩 중...' : `${meetings.length}건 · 합계 ${total.toLocaleString()}원`}
          </p>
        </div>
        <Link
          href="/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 신규 등록
        </Link>
      </div>

      {/* 필터 바 */}
      <div className="flex gap-3 mb-5">
        <select
          value={currentMonth}
          onChange={(e) => applyFilter('month', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">전체 기간</option>
          {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={currentHandler}
          onChange={(e) => applyFilter('handler', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">전체 담당자</option>
          {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>

        <select
          value={currentCard}
          onChange={(e) => applyFilter('card', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">전체 카드</option>
          {cards.map((c) => <option key={c} value={c}>**** {c}</option>)}
        </select>

        {(currentMonth || currentHandler || currentCard) && (
          <button
            onClick={() => router.push(pathname)}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            필터 초기화 ✕
          </button>
        )}
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-gray-400">로딩 중...</div>
        ) : meetings.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-400">
            조건에 맞는 회의록이 없습니다.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_120px_90px_90px_80px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase pr-14">
              <span>회의 주제 / 가맹점</span>
              <span>날짜</span>
              <span>담당자</span>
              <span className="text-right">금액</span>
              <span className="text-center">링크</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {meetings.map((m) => (
                <li key={m.id} className="relative">
                  <Link
                    href={`/meetings/${m.id}`}
                    className="grid grid-cols-[1fr_120px_90px_90px_80px] gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors pr-14"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">{m.topic}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.store_name}</p>
                    </div>
                    <p className="text-sm text-gray-600">{formatDate(m.date)}</p>
                    <p className="text-sm text-gray-600">{m.handler ?? '-'}</p>
                    <p className="text-sm font-semibold text-gray-800 text-right">{formatAmt(m.amount)}</p>
                    <div className="flex justify-center gap-2">
                      {m.drive_folder_url && (
                        <a href={m.drive_folder_url} target="_blank" rel="noreferrer"
                          title="Drive 폴더"
                          className="text-gray-400 hover:text-blue-600 text-base"
                          onClick={(e) => e.stopPropagation()}>📁</a>
                      )}
                      {m.pdf_url && (
                        <a href={`/api/pdf/${m.id}`} target="_blank" rel="noreferrer"
                          title="PDF 다운로드"
                          className="text-gray-400 hover:text-red-600 text-base"
                          onClick={(e) => e.stopPropagation()}>📄</a>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(m.id, m.topic)}
                    title="삭제"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 text-lg px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
