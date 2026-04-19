import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .insert({
        date: body.date,
        start_time: body.startTime || null,
        end_time: body.endTime || null,
        topic: body.topic,
        attendees: body.attendees,
        place: body.place || null,
        amount: Number(body.amount),
        store_name: body.storeFullName,
        store_name_short: body.storeName || null,
        card_last4: body.cardLast4 || null,
        handler: body.handler || null,
        minutes_content: body.minutesContent || null,
        future_plans: body.futurePlans || null,
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error('[confirm] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
