import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateMeetingPDF } from '@/lib/pdf';
import { uploadMeetingFiles } from '@/lib/drive';
import type { Meeting } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();

    // ── 텍스트 필드 파싱 ──────────────────────────────────
    const body = {
      date:           formData.get('date') as string,
      startTime:      formData.get('startTime') as string,
      endTime:        formData.get('endTime') as string,
      topic:          formData.get('topic') as string,
      attendees:      JSON.parse(formData.get('attendees') as string) as string[],
      place:          formData.get('place') as string,
      amount:         Number(formData.get('amount')),
      storeFullName:  formData.get('storeFullName') as string,
      storeName:      formData.get('storeName') as string,
      cardLast4:      formData.get('cardLast4') as string,
      handler:        formData.get('handler') as string,
      minutesContent: formData.get('minutesContent') as string,
      futurePlans:    formData.get('futurePlans') as string,
    };

    // ── 업로드된 파일 ─────────────────────────────────────
    const receiptFile   = formData.get('receipt') as File | null;
    const approvalFile  = formData.get('approval') as File | null;

    // ── 1. DB 저장 ────────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from('meetings')
      .insert({
        date:              body.date,
        start_time:        body.startTime || null,
        end_time:          body.endTime   || null,
        topic:             body.topic,
        attendees:         body.attendees,
        place:             body.place     || null,
        amount:            body.amount,
        store_name:        body.storeFullName,
        store_name_short:  body.storeName || null,
        card_last4:        body.cardLast4 || null,
        handler:           body.handler   || null,
        minutes_content:   body.minutesContent || null,
        future_plans:      body.futurePlans    || null,
        status:            'confirmed',
      })
      .select('*')
      .single();

    if (error) throw error;
    const meeting = data as Meeting;

    // ── 2. PDF/Drive는 백그라운드 처리 (await 하지 않음) ──
    const receiptBuf  = receiptFile  ? Buffer.from(await receiptFile.arrayBuffer())  : null;
    const approvalBuf = approvalFile ? Buffer.from(await approvalFile.arrayBuffer()) : null;
    const receiptMime = receiptFile?.type ?? '';
    const receiptExt  = receiptFile?.name.split('.').pop() ?? 'jpg';

    // 사용자는 즉시 상세 페이지로 이동, PDF/Drive 결과는 나중에 DB에 반영됨
    (async () => {
      try {
        console.log('[PDF] 생성 시작:', meeting.id);
        const pdfBuffer = await generateMeetingPDF(meeting);
        console.log('[PDF] 생성 완료, size:', pdfBuffer.length);

        if (receiptBuf && approvalBuf) {
          console.log('[Drive] 업로드 시작:', meeting.id);
          const driveResult = await uploadMeetingFiles({
            date:           body.date,
            storeName:      body.storeFullName,
            startTime:      body.startTime ?? '0000',
            handler:        body.handler   ?? 'unknown',
            receiptBuffer:  receiptBuf,
            receiptMime,
            receiptExt,
            approvalBuffer: approvalBuf,
            pdfBuffer,
          });

          await supabaseAdmin
            .from('meetings')
            .update({
              drive_folder_id:      driveResult.folderId,
              drive_folder_url:     driveResult.folderUrl,
              folder_sequence:      driveResult.folderSequence,
              receipt_drive_id:     driveResult.receiptDriveId,
              approval_doc_drive_id: driveResult.approvalDocDriveId,
              pdf_drive_id:         driveResult.pdfDriveId,
              pdf_url:              driveResult.pdfUrl,
            })
            .eq('id', meeting.id);

          console.log('[Drive] 업로드 완료:', meeting.id, driveResult.folderUrl);
        }
      } catch (bgErr) {
        console.error('[PDF/Drive 오류]', bgErr instanceof Error ? bgErr.message : bgErr);
      }
    })();

    // ── 즉시 응답 (PDF/Drive 기다리지 않음) ──────────────
    return NextResponse.json({ id: meeting.id });
  } catch (err) {
    console.error('[confirm] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
