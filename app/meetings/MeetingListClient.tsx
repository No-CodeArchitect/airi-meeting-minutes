'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import type { Meeting } from '@/types';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}
function formatAmt(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function MeetingListClient({
  meetings,
  handlers,
  cards,
  currentMonth,
  currentHandler,
  currentCard,
}: {
  meetings: Meeting[];
  handlers: string[];
  cards: string[];
  currentMonth: string;
  currentHandler: string;
  currentCard: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== 'month'   && currentMonth)   params.set('month',   currentMonth);
    if (key !== 'handler' && currentHandler) params.set('handler', currentHandler);
    if (key !== 'card'    && currentCard)    params.set('card',    currentCard);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  // 월 옵션: 최근 12개월
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <>
      {/* 필터 바 */}
      <div className="flex gap-3 mb-5">
        <select
          value={currentMonth}
          onChange={(e) => applyFilter('month', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">전체 기간</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={currentHandler}
          onChange={(e) => applyFilter('handler', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">전체 담당자</option>
          {handlers.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <select
          value={currentCard}
          onChange={(e) => applyFilter('card', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">전체 카드</option>
          {cards.map((c) => (
            <option key={c} value={c}>**** {c}</option>
          ))}
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
        {meetings.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-gray-400">
            조건에 맞는 회의록이 없습니다.
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="grid grid-cols-[1fr_120px_90px_90px_80px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
              <span>회의 주제 / 가맹점</span>
              <span>날짜</span>
              <span>담당자</span>
              <span className="text-right">금액</span>
              <span className="text-center">링크</span>
            </div>

            <ul className="divide-y divide-gray-100">
              {meetings.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meetings/${m.id}`}
                    className="grid grid-cols-[1fr_120px_90px_90px_80px] gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">{m.topic}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.store_name}</p>
                    </div>
                    <p className="text-sm text-gray-600">{formatDate(m.date)}</p>
                    <p className="text-sm text-gray-600">{m.handler ?? '-'}</p>
                    <p className="text-sm font-semibold text-gray-800 text-right">{formatAmt(m.amount)}</p>
                    <div className="flex justify-center gap-2" onClick={(e) => e.preventDefault()}>
                      {m.drive_folder_url && (
                        <a
                          href={m.drive_folder_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Drive 폴더"
                          className="text-gray-400 hover:text-blue-600 text-base"
                        >
                          📁
                        </a>
                      )}
                      {m.pdf_url && (
                        <a
                          href={`/api/pdf/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          title="PDF 다운로드"
                          className="text-gray-400 hover:text-red-600 text-base"
                        >
                          📄
                        </a>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
