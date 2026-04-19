import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// ── GET: 단건 조회 ────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: '없음' }, { status: 404 });
  return NextResponse.json(data);
}

// ── PATCH: 수정 ───────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // 허용 필드만 추출
    const allowed = [
      'topic', 'place', 'start_time', 'end_time',
      'handler', 'attendees', 'minutes_content', 'future_plans',
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    const { data, error } = await supabaseAdmin
      .from('meetings')
      .update(update)
      .eq('id', params.id)
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '수정 실패' },
      { status: 500 },
    );
  }
}

// ── DELETE: 삭제 ──────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('meetings')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
