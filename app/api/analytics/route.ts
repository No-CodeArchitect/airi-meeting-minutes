import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM

  let query = supabaseAdmin
    .from('meetings')
    .select('date, amount, handler, card_last4, attendees');

  if (month) {
    query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meetings = data ?? [];

  // ── 월별 합계 (전체 기간 쿼리일 때만 의미 있음) ──────
  const byMonth: Record<string, number> = {};
  for (const m of meetings) {
    const ym = (m.date as string).slice(0, 7); // YYYY-MM
    byMonth[ym] = (byMonth[ym] ?? 0) + (m.amount as number);
  }

  // ── 담당자별 ──────────────────────────────────────────
  const byHandler: Record<string, { count: number; amount: number }> = {};
  for (const m of meetings) {
    const h = (m.handler as string | null) ?? '미지정';
    if (!byHandler[h]) byHandler[h] = { count: 0, amount: 0 };
    byHandler[h].count  += 1;
    byHandler[h].amount += m.amount as number;
  }

  // ── 카드별 ────────────────────────────────────────────
  const byCard: Record<string, { count: number; amount: number }> = {};
  for (const m of meetings) {
    const c = (m.card_last4 as string | null) ?? '미등록';
    if (!byCard[c]) byCard[c] = { count: 0, amount: 0 };
    byCard[c].count  += 1;
    byCard[c].amount += m.amount as number;
  }

  // ── 외부 기관별 미팅 빈도 ─────────────────────────────
  const byOrg: Record<string, number> = {};
  for (const m of meetings) {
    const attendees = (m.attendees as string[]) ?? [];
    const orgs = attendees
      .filter((a) => a.includes('(') && !a.includes('인공지능연구원') && !a.includes('AIRI'))
      .map((a) => a.match(/\(([^)]+)\)/)?.[1] ?? '')
      .filter(Boolean);
    const unique = [...new Set(orgs)];
    for (const org of unique) {
      byOrg[org] = (byOrg[org] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    totalAmount: meetings.reduce((s: number, m: { amount: number }) => s + m.amount, 0),
    totalCount: meetings.length,
    byMonth: Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount })),
    byHandler: Object.entries(byHandler)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .map(([name, d]) => ({ name, ...d })),
    byCard: Object.entries(byCard)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .map(([card, d]) => ({ card, ...d })),
    byOrg: Object.entries(byOrg)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([org, count]) => ({ org, count })),
  });
}
