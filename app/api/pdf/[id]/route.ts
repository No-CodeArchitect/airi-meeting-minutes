import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateMeetingPDF } from '@/lib/pdf';
import type { Meeting } from '@/types';

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

  if (error || !data) {
    return NextResponse.json({ error: '회의록을 찾을 수 없습니다.' }, { status: 404 });
  }

  const pdfBuffer = await generateMeetingPDF(data as Meeting);

  const dateStr = (data.date as string).replace(/-/g, '');
  const handler = (data.handler as string | null) ?? 'unknown';
  const time = ((data.start_time as string | null) ?? '').replace(':', '');
  const filename = `회의록_${dateStr}_${handler}_${time}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
