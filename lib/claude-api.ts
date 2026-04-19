import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_CONTEXT } from './claude-context';

// 모듈 로드 시점이 아닌 함수 호출 시점에 env를 읽도록 lazy 초기화
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  return new Anthropic({ apiKey });
}

// ─── 공통 타입 ────────────────────────────────────────────────
export interface ReceiptInfo {
  date: string;           // YYYYMMDD
  startTime: string;      // HH:MM
  storeName: string;      // 가맹점 축약명 (5자 이내)
  storeFullName: string;  // 가맹점 전체명
  amount: number;
  cardLast4: string;
}

export interface ApprovalInfo {
  date: string;
  startTime: string;
  endTime: string;
  attendees: string[];    // ["(소속) 이름", ...]
  topic: string;
  place: string;
  purpose: string;
}

export interface RecentMeeting {
  date: string;
  topic: string;
  attendees: string[];
  place: string;
}

// ─── 내부 헬퍼 ────────────────────────────────────────────────
async function callClaudeJSON(
  messages: Anthropic.MessageParam[],
  maxTokens: number,
): Promise<Record<string, unknown>> {
  const response = await getClient().messages.create({
    model: 'claude-opus-4-5',
    max_tokens: maxTokens,
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // ```json ... ``` 펜스 제거 후 파싱
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

async function callClaudeText(
  messages: Anthropic.MessageParam[],
  system: string,
  maxTokens: number,
): Promise<string> {
  const response = await getClient().messages.create({
    model: 'claude-opus-4-5',
    max_tokens: maxTokens,
    system,
    messages,
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

// ─── 1. 영수증 파싱 ───────────────────────────────────────────
export async function parseReceipt(
  fileBase64: string,
  mimeType: string,
): Promise<ReceiptInfo> {
  const isPdf = mimeType === 'application/pdf';

  const fileBlock = isPdf
    ? ({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
      } as const)
    : ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: fileBase64,
        },
      } as const);

  const prompt = `이 비즈플레이 법인카드 영수증에서 다음 정보를 추출하여 JSON으로만 응답하세요.
다른 텍스트 없이 JSON만 출력하세요.

{
  "date": "YYYYMMDD",
  "startTime": "HH:MM",
  "storeName": "가맹점명 줄임 (5자 이내)",
  "storeFullName": "가맹점 전체명",
  "amount": 80000,
  "cardLast4": "1234"
}

날짜나 시각이 명확하지 않으면 null로 표기하세요.`;

  const result = await callClaudeJSON(
    [{ role: 'user', content: [fileBlock as never, { type: 'text', text: prompt }] }],
    400,
  );

  return result as unknown as ReceiptInfo;
}

// ─── 2. 사전 품의서 파싱 ──────────────────────────────────────
export async function parseApprovalDoc(fileBase64: string): Promise<ApprovalInfo> {
  const prompt = `이 사전품의서(회의비 품의서) PDF에서 다음 정보를 추출하여 JSON으로만 응답하세요.
다른 텍스트 없이 JSON만 출력하세요.

{
  "date": "YYYYMMDD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "attendees": ["(소속) 이름", ...],
  "topic": "회의 주제",
  "place": "회의 장소",
  "purpose": "회의 목적 한 줄 요약"
}

중요: attendees는 품의서에 기재된 모든 참석자를 개별 기재하세요.
"임춘성 외 X명" 같은 축약 절대 금지. 소속은 "(기관명) 이름" 형식.`;

  const result = await callClaudeJSON(
    [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 },
          } as never,
          { type: 'text', text: prompt },
        ],
      },
    ],
    600,
  );

  return result as unknown as ApprovalInfo;
}

// ─── 3. 회의록 본문 생성 ─────────────────────────────────────
export async function generateMinutesContent(
  receiptInfo: ReceiptInfo,
  approvalInfo: ApprovalInfo,
  recentMeetings: RecentMeeting[],
): Promise<string> {
  // 최근 회의 이력을 시스템 프롬프트에 동적 추가
  const recentContext =
    recentMeetings.length > 0
      ? `\n\n══════════════════════════════════════════
■ 최근 회의 이력 (참고용, 최신 ${recentMeetings.length}건)
══════════════════════════════════════════
${recentMeetings
  .map(
    (m) =>
      `- [${m.date}] ${m.topic} / 참석: ${m.attendees.join(', ')} / 장소: ${m.place}`,
  )
  .join('\n')}`
      : '';

  const systemPrompt = SYSTEM_CONTEXT + recentContext;

  // 외부 기관 힌트
  const externalOrgs = approvalInfo.attendees
    .filter((a) => a.includes('(') && !a.includes('인공지능연구원'))
    .map((a) => a.match(/\(([^)]+)\)/)?.[1] ?? '')
    .filter(Boolean);

  const orgHint =
    externalOrgs.length > 0
      ? `외부 참석 기관: ${[...new Set(externalOrgs)].join(', ')}`
      : '내부 팀 회의';

  const userPrompt = `아래 정보를 바탕으로 회의록의 "회의 내용"과 "향후 일정 및 요청 사항"을 작성해주세요.

━━ 회의 정보 ━━
회의 주제: ${approvalInfo.topic}
회의 목적: ${approvalInfo.purpose}
일시: ${approvalInfo.date} ${approvalInfo.startTime}~${approvalInfo.endTime}
장소: ${approvalInfo.place}
참석자 전원: ${approvalInfo.attendees.join(', ')}
${orgHint}
식사·음료 장소: ${receiptInfo.storeFullName} (₩${receiptInfo.amount.toLocaleString()})

━━ 작성 지침 ━━
- 시스템 프롬프트의 규칙을 엄격히 따를 것
- 참석자 구성과 회의 주제에 맞는 내용만 작성
- 외부 기관 참석자가 있으면 해당 기관의 역할과 협력 내용을 구체적으로 반영
- 주제에서 벗어나거나 창작된 사실 절대 포함 금지
- "회의 내용" 항목과 "향후 일정 및 요청 사항" 항목을 구분하여 출력`;

  return callClaudeText([{ role: 'user', content: userPrompt }], systemPrompt, 1200);
}
