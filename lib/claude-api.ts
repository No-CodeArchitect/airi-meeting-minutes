import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_CONTEXT } from './claude-context';

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

export interface LectureItem {
  time: string;       // "14:00~15:30"
  title: string;      // "미래 국방 조직을 위한 AI 협업 전략"
  instructor: string; // "KAIST 김주호 교수"
}

export interface ApprovalInfo {
  date: string;
  startTime: string;
  endTime: string;
  attendees: string[];    // ["(소속) 이름", ...]
  topic: string;
  place: string;
  purpose: string;
  lectures: LectureItem[]; // 강의 일정 (없으면 빈 배열)
}

export interface RecentMeeting {
  date: string;
  topic: string;
  attendees: string[];
  place: string;
}

// ─── 내부 헬퍼: JSON 응답 ─────────────────────────────────────
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

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

// ─── 내부 헬퍼: 텍스트 응답 ──────────────────────────────────
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
  "place": "회의·교육 장소 (식사 장소 아님)",
  "purpose": "회의 목적 한 줄 요약",
  "lectures": [
    { "time": "14:00~15:30", "title": "강의 제목", "instructor": "소속 강사명" },
    ...
  ]
}

중요사항:
- attendees는 품의서에 기재된 모든 참석자를 개별 기재. "임춘성 외 X명" 축약 절대 금지. "(기관명) 이름" 형식.
- place는 실제 회의·교육이 열리는 장소. 식당·카페 등 식사 장소는 절대 기재 금지.
- lectures는 품의서에 강의/교육 일정이 있을 경우 모두 추출. 없으면 빈 배열 [].`;

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
    1200,
  );

  return result as unknown as ApprovalInfo;
}

// ─── 3. 회의록 본문 생성 ─────────────────────────────────────
export async function generateMinutesContent(
  receiptInfo: ReceiptInfo,
  approvalInfo: ApprovalInfo,
  recentMeetings: RecentMeeting[],
): Promise<string> {
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

  const externalOrgs = approvalInfo.attendees
    .filter((a) => a.includes('(') && !a.includes('인공지능연구원'))
    .map((a) => a.match(/\(([^)]+)\)/)?.[1] ?? '')
    .filter(Boolean);

  const orgHint =
    externalOrgs.length > 0
      ? `외부 참석 기관: ${[...new Set(externalOrgs)].join(', ')}`
      : '내부 팀 회의';

  const lectureSection = approvalInfo.lectures && approvalInfo.lectures.length > 0
    ? `\n강의 일정 (반드시 이 내용을 중심으로 회의록 작성):\n` +
      approvalInfo.lectures.map(l => `  - ${l.time} : ${l.title} / ${l.instructor}`).join('\n')
    : '';

  const userPrompt = `아래 정보를 바탕으로 회의록의 "회의 내용"과 "향후 일정 및 요청 사항"을 작성해주세요.

━━ 회의 정보 ━━
회의 주제: ${approvalInfo.topic}
회의 목적: ${approvalInfo.purpose}
일시: ${approvalInfo.date} ${approvalInfo.startTime}~${approvalInfo.endTime}
[회의·교육 장소]: ${approvalInfo.place}  ※ 이곳이 실제 교육·회의 장소. 반드시 이 장소로 기재할 것.
[식사 장소]: ${receiptInfo.storeFullName}  ※ 회의 후 네트워킹 식사 장소. 본문에 불필요하게 넣지 말 것.
참석자 전원: ${approvalInfo.attendees.join(', ')}
${orgHint}${lectureSection}

━━ 작성 지침 ━━
- 강의 일정이 있는 경우, 각 강의 제목을 소제목(ㅇ)으로 삼아 해당 강의에서 다뤘을 내용을 구체적으로 서술할 것
  (강의 제목·주제를 기반으로 합리적 추론은 허용. 단, 사실과 전혀 다른 내용 창작 금지)
- 특정 개인·기관이 주어가 되는 발언 귀속 표현 절대 금지
  금지: "OOO 교수가 설명하였음", "KAIST 교수진이 주도하였음"
  허용: "AI 협업 전략에 대한 교육이 진행되었음", "드론 기술 적용 사례를 검토하였음"
- 강사명은 교육 진행 맥락에서만 간략히 언급 가능 (발언 귀속 아닌 교육 진행자로서)
- 시스템 프롬프트의 공문서 형식을 엄수할 것
- "회의 내용" 항목과 "향후 일정 및 요청 사항" 항목을 구분하여 출력`;

  return callClaudeText([{ role: 'user', content: userPrompt }], systemPrompt, 1500);
}
