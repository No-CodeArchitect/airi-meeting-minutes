import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseReceipt, parseApprovalDoc, generateMinutesContent } from '@/lib/claude-api';
import { supabaseAdmin } from '@/lib/supabase';
import { getHandlerByCard } from '@/lib/card-map';

export const maxDuration = 60; // Vercel 타임아웃 60초

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const receiptFile = formData.get('receipt') as File | null;
    const approvalFile = formData.get('approval') as File | null;

    if (!receiptFile || !approvalFile) {
      return NextResponse.json({ error: '파일이 누락되었습니다.' }, { status: 400 });
    }

    // Base64 변환
    const [receiptBuffer, approvalBuffer] = await Promise.all([
      receiptFile.arrayBuffer(),
      approvalFile.arrayBuffer(),
    ]);
    const receiptBase64 = Buffer.from(receiptBuffer).toString('base64');
    const approvalBase64 = Buffer.from(approvalBuffer).toString('base64');

    // 영수증 + 품의서 파싱 (병렬)
    const [receiptInfo, approvalInfo] = await Promise.all([
      parseReceipt(receiptBase64, receiptFile.type),
      parseApprovalDoc(approvalBase64),
    ]);

    // 카드 → 담당자
    const handler = getHandlerByCard(receiptInfo.cardLast4 ?? '');

    // 최근 15건 컨텍스트
    const { data: recentRows } = await supabaseAdmin
      .from('meetings')
      .select('date, topic, attendees, place')
      .order('date', { ascending: false })
      .limit(15);

    const recentMeetings = (recentRows ?? []).map((m) => ({
      date: m.date as string,
      topic: m.topic as string,
      attendees: m.attendees as string[],
      place: (m.place as string) ?? '',
    }));

    // 회의록 본문 생성
    const raw = await generateMinutesContent(receiptInfo, approvalInfo, recentMeetings);

    // "향후 일정 및 요청 사항" 기준으로 분리
    const splitIdx = raw.search(/향후\s*일정/);
    const minutesContent = splitIdx > -1 ? raw.slice(0, splitIdx).trim() : raw.trim();
    const futurePlans = splitIdx > -1 ? raw.slice(splitIdx).trim() : '';

    return NextResponse.json({
      receipt: { ...receiptInfo, handler },
      approval: approvalInfo,
      minutesContent,
      futurePlans,
    });
  } catch (err) {
    console.error('[parse] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
