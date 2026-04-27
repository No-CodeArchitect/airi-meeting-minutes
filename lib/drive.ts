import { google } from 'googleapis';
import { Readable } from 'stream';

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID!;

// ── Auth 초기화 ────────────────────────────────────────────
function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const credentials = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

// ── 폴더 찾기 또는 생성 ────────────────────────────────────
async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDrive();

  // 기존 폴더 검색
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // 없으면 생성
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  });

  return created.data.id!;
}

// ── 해당 월 폴더 내 다음 시퀀스 번호 ─────────────────────
async function getNextSequence(monthFolderId: string): Promise<number> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${monthFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(name)',
    spaces: 'drive',
    orderBy: 'name',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const folders = res.data.files ?? [];
  let max = 0;
  for (const f of folders) {
    const match = f.name?.match(/^(\d+)\./);
    if (match) max = Math.max(max, parseInt(match[1]));
  }
  return max + 1;
}

// ── 파일 업로드 ────────────────────────────────────────────
async function uploadFile(
  parentId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDrive();
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentId],
    },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  return {
    id: res.data.id!,
    webViewLink: res.data.webViewLink!,
  };
}

// ── 폴더 공개 URL ──────────────────────────────────────────
function folderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

// ── 날짜 파싱 (YYYYMMDD 또는 YYYY-MM-DD) ─────────────────
function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const clean = dateStr.replace(/-/g, '');
  return {
    year:  parseInt(clean.slice(0, 4)),
    month: parseInt(clean.slice(4, 6)),
    day:   parseInt(clean.slice(6, 8)),
  };
}

// ── 파일 복사 ─────────────────────────────────────────────
async function copyFile(
  fileId: string,
  parentId: string,
  fileName: string,
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDrive();
  const res = await drive.files.copy({
    fileId,
    requestBody: { name: fileName, parents: [parentId] },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });
  return { id: res.data.id!, webViewLink: res.data.webViewLink! };
}

// ── 공개 API ───────────────────────────────────────────────
export interface DriveUploadResult {
  folderId: string;
  folderUrl: string;
  folderSequence: number;
  receiptDriveId: string;
  approvalDocDriveId: string;
  pdfDriveId: string;
  pdfUrl: string;
}

export async function uploadMeetingFiles(params: {
  date: string;          // YYYYMMDD 또는 YYYY-MM-DD
  storeName: string;     // 가맹점 전체명
  startTime: string;     // HH:MM
  handler: string;
  cardLast4: string;     // 카드 끝 4자리
  receiptBuffer: Buffer;
  receiptMime: string;
  receiptExt: string;    // jpg / png / pdf
  approvalBuffer: Buffer;
  pdfBuffer: Buffer;
}): Promise<DriveUploadResult> {
  const { year, month, day } = parseDate(params.date);

  // 1️⃣  연-월 폴더: "2026년 04월"
  const monthFolderName = `${year}년 ${String(month).padStart(2, '0')}월`;
  const monthFolderId = await findOrCreateFolder(monthFolderName, ROOT_FOLDER_ID);

  // 2️⃣  카드 폴더: "1558"
  const cardFolderName = params.cardLast4 || '기타';
  const cardFolderId = await findOrCreateFolder(cardFolderName, monthFolderId);

  // 3️⃣  시퀀스 번호 결정 (카드 폴더 내 기준)
  const seq = await getNextSequence(cardFolderId);
  const seqStr = String(seq).padStart(2, '0');

  // 4️⃣  날짜 폴더: "01. 4.1 순천만갯벌낙지"
  const dateFolderName = `${seqStr}. ${month}.${day} ${params.storeName}`;
  const dateFolderId = await findOrCreateFolder(dateFolderName, cardFolderId);

  // 4️⃣  파일명 접미사
  const dateSuffix = `${String(year).slice(2)}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const timeSuffix = params.startTime.replace(':', '');

  // 5️⃣  파일 3개 업로드 (병렬)
  const [receipt, approval, pdf] = await Promise.all([
    uploadFile(
      dateFolderId,
      `영수증_${dateSuffix}.${params.receiptExt}`,
      params.receiptMime,
      params.receiptBuffer,
    ),
    uploadFile(
      dateFolderId,
      `회의비품의서_${dateSuffix}.pdf`,
      'application/pdf',
      params.approvalBuffer,
    ),
    uploadFile(
      dateFolderId,
      `회의록_${dateSuffix}_${params.handler}_${timeSuffix}.pdf`,
      'application/pdf',
      params.pdfBuffer,
    ),
  ]);

  return {
    folderId: dateFolderId,
    folderUrl: folderUrl(dateFolderId),
    folderSequence: seq,
    receiptDriveId: receipt.id,
    approvalDocDriveId: approval.id,
    pdfDriveId: pdf.id,
    pdfUrl: pdf.webViewLink,
  };
}

// ── 기존 회의록에 영수증만 추가 ───────────────────────────
export interface AddReceiptResult {
  folderId: string;
  folderUrl: string;
  receiptDriveId: string;
}

export async function addReceiptToExistingMeeting(params: {
  date: string;
  storeName: string;
  startTime: string;
  handler: string;
  cardLast4: string;
  receiptBuffer: Buffer;
  receiptMime: string;
  receiptExt: string;
  approvalDocDriveId: string;
  pdfDriveId: string;
}): Promise<AddReceiptResult> {
  const { year, month, day } = parseDate(params.date);

  const monthFolderName = `${year}년 ${String(month).padStart(2, '0')}월`;
  const monthFolderId = await findOrCreateFolder(monthFolderName, ROOT_FOLDER_ID);

  const cardFolderName = params.cardLast4 || '기타';
  const cardFolderId = await findOrCreateFolder(cardFolderName, monthFolderId);

  const seq = await getNextSequence(cardFolderId);
  const seqStr = String(seq).padStart(2, '0');

  const dateFolderName = `${seqStr}. ${month}.${day} ${params.storeName}`;
  const dateFolderId = await findOrCreateFolder(dateFolderName, cardFolderId);

  const dateSuffix = `${String(year).slice(2)}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
  const timeSuffix = (params.startTime ?? '0000').replace(':', '');

  const [receipt] = await Promise.all([
    uploadFile(
      dateFolderId,
      `영수증_${dateSuffix}.${params.receiptExt}`,
      params.receiptMime,
      params.receiptBuffer,
    ),
    copyFile(params.approvalDocDriveId, dateFolderId, `회의비품의서_${dateSuffix}.pdf`),
    copyFile(params.pdfDriveId, dateFolderId, `회의록_${dateSuffix}_${params.handler}_${timeSuffix}.pdf`),
  ]);

  return {
    folderId: dateFolderId,
    folderUrl: folderUrl(dateFolderId),
    receiptDriveId: receipt.id,
  };
}
