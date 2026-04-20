import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month   = searchParams.get('month');
  const handler = searchParams.get('handler');
  const card    = searchParams.get('card');

  let query = supabaseAdmin
    .from('meetings')
    .select('id, date, start_time, topic, store_name, amount, handler, card_last4, drive_folder_url, pdf_url')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (month)   query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
  if (handler) query = query.eq('handler', handler);
  if (card)    query = query.eq('card_last4', card);

  const { data: meetings, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: handlers } = await supabaseAdmin
    .from('meetings').select('handler').not('handler', 'is', null);
  const { data: cards } = await supabaseAdmin
    .from('meetings').select('card_last4').not('card_last4', 'is', null);

  const uniqueHandlers = [...new Set((handlers ?? []).map((r: { handler: string }) => r.handler))].filter(Boolean);
  const uniqueCards    = [...new Set((cards ?? []).map((r: { card_last4: string }) => r.card_last4))].filter(Boolean);

  return NextResponse.json({ meetings: meetings ?? [], handlers: uniqueHandlers, cards: uniqueCards });
}
