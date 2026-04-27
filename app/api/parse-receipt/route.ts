import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseReceipt } from '@/lib/claude-api';
import { getHandlerByCard } from '@/lib/card-map';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const receiptFile = formData.get('receipt') as File | null;

    if (!receiptFile) {
      return NextResponse.json({ error: '영수증 파일이 누락되었습니다.' }, { status: 400 });
    }

    const buffer = await receiptFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const receiptInfo = await parseReceipt(base64, receiptFile.type);
    const handler = getHandlerByCard(receiptInfo.cardLast4 ?? '');

    return NextResponse.json({ ...receiptInfo, handler });
  } catch (err) {
    console.error('[parse-receipt] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '파싱 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
