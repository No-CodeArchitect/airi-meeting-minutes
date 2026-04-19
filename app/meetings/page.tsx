import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import type { Meeting } from '@/types';
import MeetingListClient from './MeetingListClient';

export const dynamic = 'force-dynamic';

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: { month?: string; handler?: string; card?: string };
}) {
  // 필터 파라미터
  const { month, handler, card } = searchParams;

  let query = supabaseAdmin
    .from('meetings')
    .select('id, date, start_time, topic, store_name, amount, handler, card_last4, drive_folder_url, pdf_url')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (month) query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
  if (handler) query = query.eq('handler', handler);
  if (card) query = query.eq('card_last4', card);

  const { data: meetings } = await query;

  // 필터 옵션용 고유값
  const { data: handlers } = await supabaseAdmin
    .from('meetings')
    .select('handler')
    .not('handler', 'is', null);

  const { data: cards } = await supabaseAdmin
    .from('meetings')
    .select('card_last4')
    .not('card_last4', 'is', null);

  const uniqueHandlers = [...new Set((handlers ?? []).map((r: { handler: string }) => r.handler))].filter(Boolean);
  const uniqueCards    = [...new Set((cards ?? []).map((r: { card_last4: string }) => r.card_last4))].filter(Boolean);

  const total = (meetings ?? []).reduce((s: number, m: { amount: number }) => s + m.amount, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">전체 목록</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {(meetings ?? []).length}건 · 합계 {total.toLocaleString()}원
          </p>
        </div>
        <Link
          href="/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 신규 등록
        </Link>
      </div>

      <MeetingListClient
        meetings={(meetings ?? []) as Meeting[]}
        handlers={uniqueHandlers as string[]}
        cards={uniqueCards as string[]}
        currentMonth={month ?? ''}
        currentHandler={handler ?? ''}
        currentCard={card ?? ''}
      />
    </div>
  );
}
