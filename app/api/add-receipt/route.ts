import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { addReceiptToExistingMeeting } from '@/lib/drive';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const meetingId   = formData.get('meetingId') as string;
    const storeName   = formData.get('storeName') as string;
    const receiptFile = formData.get('receipt') as File | null;

    if (!meetingId || !storeName || !receiptFile) {
      return NextResponse.json({ error: '필수 데이터 누락' }, { status: 400 });
    }

    const { data: meeting, error } = await supabaseAdmin
      .from('meetings')
      .select('date, store_name, start_time, handler, card_last4, approval_doc_drive_id, pdf_drive_id')
      .eq('id', meetingId)
      .single();

    if (error || !meeting) {
      return NextResponse.json({ error: '회의를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!meeting.approval_doc_drive_id || !meeting.pdf_drive_id) {
      return NextResponse.json({ error: '기존 Drive 파일 정보가 없습니다. 해당 회의록의 Drive 업로드를 먼저 확인하세요.' }, { status: 400 });
    }

    const receiptBuf = Buffer.from(await receiptFile.arrayBuffer());
    const receiptExt = receiptFile.name.split('.').pop() ?? 'jpg';

    const result = await addReceiptToExistingMeeting({
      date:               meeting.date,
      storeName:          storeName,
      startTime:          meeting.start_time ?? '0000',
      handler:            meeting.handler    ?? 'unknown',
      cardLast4:          meeting.card_last4 ?? '기타',
      receiptBuffer:      receiptBuf,
      receiptMime:        receiptFile.type,
      receiptExt,
      approvalDocDriveId: meeting.approval_doc_drive_id,
      pdfDriveId:         meeting.pdf_drive_id,
    });

    return NextResponse.json({ folderUrl: result.folderUrl });
  } catch (err) {
    console.error('[add-receipt] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
