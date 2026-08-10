import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateMeetingPDF } from '@/lib/pdf';
import { uploadMeetingFiles } from '@/lib/drive';
import type { Meeting } from '@/types';

export const maxDuration = 60;

// googleapis(Gaxios) 에러는 진짜 원인이 response.data.error 안에 묻혀 있어
// err.message만으로는 원인을 알 수 없다. 최대한 구체적인 문구를 뽑아낸다.
function describeDriveError(err: unknown): string {
  const anyErr = err as {
    message?: string;
    code?: string | number;
    errors?: Array<{ reason?: string; message?: string }>;
    response?: { status?: number; data?: { error?: { message?: string; errors?: Array<{ reason?: string; message?: string }> } } };
  };

  const parts: string[] = [];
  const status = anyErr?.response?.status ?? anyErr?.code;
  if (status) parts.push(`[${status}]`);

  const apiErr = anyErr?.response?.data?.error;
  const detail =
    apiErr?.message ||
    apiErr?.errors?.[0]?.message ||
    anyErr?.errors?.[0]?.message ||
    anyErr?.message ||
    String(err);
  parts.push(detail);

  const reason = apiErr?.errors?.[0]?.reason || anyErr?.errors?.[0]?.reason;
  if (reason) parts.push(`(reason: ${reason})`);

  return parts.join(' ');
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();

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

    const receiptFile  = formData.get('receipt')  as File | null;
    const approvalFile = formData.get('approval') as File | null;

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

    // ── 2. PDF 생성 ───────────────────────────────────────
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateMeetingPDF(meeting);
    } catch (pdfErr) {
      console.warn('[PDF] 생성 실패 (non-fatal):', pdfErr instanceof Error ? pdfErr.message : pdfErr);
    }

    // ── 3. Drive 업로드 ───────────────────────────────────
    // 회의록(DB)은 이미 저장됨. Drive 업로드가 실패해도 저장 자체는 성공이지만,
    // 실패 원인을 조용히 삼키지 않고 응답(driveError)에 담아 화면에 노출한다.
    let driveError: string | null = null;

    if (pdfBuffer && receiptFile && approvalFile) {
      try {
        const [receiptBuf, approvalBuf] = await Promise.all([
          receiptFile.arrayBuffer().then(Buffer.from),
          approvalFile.arrayBuffer().then(Buffer.from),
        ]);
        const receiptExt = receiptFile.name.split('.').pop() ?? 'jpg';

        const driveResult = await uploadMeetingFiles({
          date:          body.date,
          storeName:     body.storeFullName,
          startTime:     body.startTime ?? '0000',
          handler:       body.handler   ?? 'unknown',
          cardLast4:     body.cardLast4 ?? '기타',
          receiptBuffer: receiptBuf,
          receiptMime:   receiptFile.type,
          receiptExt,
          approvalBuffer: approvalBuf,
          pdfBuffer,
        });

        await supabaseAdmin
          .from('meetings')
          .update({
            drive_folder_id:       driveResult.folderId,
            drive_folder_url:      driveResult.folderUrl,
            folder_sequence:       driveResult.folderSequence,
            receipt_drive_id:      driveResult.receiptDriveId,
            approval_doc_drive_id: driveResult.approvalDocDriveId,
            pdf_drive_id:          driveResult.pdfDriveId,
            pdf_url:               driveResult.pdfUrl,
          })
          .eq('id', meeting.id);

        console.log('[Drive] 업로드 완료:', driveResult.folderUrl);
      } catch (driveErr) {
        driveError = describeDriveError(driveErr);
        console.error('[Drive] 업로드 실패:', driveError, driveErr);
      }
    } else {
      // Drive 코드에 도달하지 못한 경우(=선행 단계 실패)도 이유를 알려준다.
      const missing: string[] = [];
      if (!pdfBuffer)     missing.push('PDF 생성 실패');
      if (!receiptFile)   missing.push('영수증 파일 누락');
      if (!approvalFile)  missing.push('품의서 파일 누락');
      driveError = `Drive 업로드 건너뜀 (${missing.join(', ')})`;
      console.warn('[Drive]', driveError);
    }

    return NextResponse.json({ id: meeting.id, driveError });
  } catch (err) {
    console.error('[confirm] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
