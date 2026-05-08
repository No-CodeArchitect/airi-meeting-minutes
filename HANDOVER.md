# AIRI 회의비 관리 웹앱 — 인수인계 문서

> 새 대화 시작 시 이 파일을 첨부하거나 내용을 붙여넣으세요.

---

## 프로젝트 기본 정보

| 항목 | 값 |
|------|-----|
| 프로젝트명 | AIRI 회의비 관리 웹앱 |
| GitHub | https://github.com/No-CodeArchitect/airi-meeting-minutes |
| 배포 URL | https://airi-meeting-minutes.vercel.app |
| 작업 PC 경로 | `C:\Users\feel_\project\airi-meeting-minutes` |
| 현재 상태 | ✅ 모든 기능 정상 작동 |

---

## 기술 스택

- **프레임워크**: Next.js 14 App Router
- **인증**: NextAuth.js + Google OAuth (@airi.kr 도메인 전용)
- **DB**: Supabase (PostgreSQL, supabaseAdmin = service_role key)
- **AI 파싱**: Anthropic Claude API (claude-opus-4-5)
- **PDF**: @react-pdf/renderer (renderToBuffer named import, NotoSansKR 폰트)
- **Drive**: Google Drive API v3 (Service Account, 공유 드라이브)
- **차트**: recharts
- **스타일**: Tailwind CSS + autoprefixer
- **배포**: Vercel (maxDuration=60, 동기 처리 필수)

---

## 환경변수 (.env.local — 로컬에만 존재, git 제외)

```env
GOOGLE_CLIENT_ID=<Google Cloud Console에서 확인>
GOOGLE_CLIENT_SECRET=<Google Cloud Console에서 확인>
ALLOWED_EMAIL_DOMAIN=airi.kr
GOOGLE_SERVICE_ACCOUNT_JSON=<서비스 계정 JSON — 한 줄로 변환해서 입력>
DRIVE_ROOT_FOLDER_ID=<공유 드라이브 루트 폴더 ID>
NEXT_PUBLIC_SUPABASE_URL=<Supabase 프로젝트 URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service_role key>
ANTHROPIC_API_KEY=<Anthropic Console에서 확인>
NEXTAUTH_URL=https://airi-meeting-minutes.vercel.app
NEXTAUTH_SECRET=<openssl rand -base64 32 로 생성>
```

> 실제 값은 로컬 `.env.local` 파일 또는 Vercel 대시보드 환경변수에서 확인하세요.

> Vercel 환경변수도 위와 동일하게 설정되어 있음.  
> `GOOGLE_SERVICE_ACCOUNT_JSON`은 반드시 **한 줄** JSON이어야 함 (줄바꿈 있으면 파싱 실패).

---

## Google Drive 폴더 구조

```
루트 폴더 (0APHVNUE846EDUk9PVA)
└── 2026년 04월          ← 년월 폴더
    └── 1558             ← 카드 끝 4자리
        └── 01. 4.1 순천만갯벌낙지   ← 순번.날짜 가맹점명
            ├── 영수증_260401.jpg
            ├── 회의비품의서_260401.pdf
            └── 회의록_260401_장주현_1400.pdf
```

### 카드 맵 (lib/card-map.ts)

| 카드 끝 4자리 | 담당자 |
|--------------|--------|
| 4116 | 임춘성 |
| 1558 | 장주현 |
| 5317 | 장주현 |

> 카드 추가 시 `lib/card-map.ts` 업데이트 필요.

---

## 주요 파일 구조

```
app/
├── api/
│   ├── confirm/route.ts       ← DB저장 + PDF생성 + Drive업로드 (maxDuration=60)
│   ├── meetings/
│   │   ├── route.ts           ← 목록 조회 (month/handler/card 필터)
│   │   └── [id]/route.ts      ← 상세/삭제
│   ├── parse/route.ts         ← Claude AI 파싱
│   ├── pdf/[id]/route.ts      ← PDF 다운로드
│   └── analytics/route.ts     ← 차트 데이터
├── meetings/
│   ├── page.tsx               ← Suspense 래퍼 (Vercel 빌드 필수)
│   ├── MeetingListClient.tsx  ← 클라이언트 fetch, 삭제 즉시 반영
│   └── [id]/
│       ├── page.tsx
│       └── MeetingDetailClient.tsx
├── new/page.tsx               ← 신규 등록 폼
└── analytics/page.tsx         ← 통계/차트

lib/
├── auth.ts                    ← NextAuth 설정
├── supabase.ts                ← supabaseAdmin (service_role)
├── claude-api.ts              ← lazy getClient() 초기화
├── drive.ts                   ← Drive 업로드 (supportsAllDrives: true 필수)
├── pdf.tsx                    ← PDF 생성 (stripMarkdown, groupAttendees)
└── card-map.ts                ← 카드번호→담당자 맵

public/fonts/
├── NotoSansKR-Regular.ttf     ← 반드시 git에 포함 (gitignore에서 제외됨)
└── NotoSansKR-Bold.ttf
```

---

## 중요 구현 포인트 & 해결된 버그

### 1. Claude API — lazy 초기화
```typescript
// lib/claude-api.ts
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  return new Anthropic({ apiKey });
}
```

### 2. PDF 렌더링
```typescript
import { renderToBuffer } from '@react-pdf/renderer';  // named import 필수
// default import 사용 시 "renderToBuffer is not a function" 오류
```

### 3. Drive — 공유 드라이브 필수
- 일반 Drive: Service Account 스토리지 쿼터 없음 → 업로드 실패
- 모든 API 호출에 `supportsAllDrives: true`, `includeItemsFromAllDrives: true` 추가 필수

### 4. 폰트 파일 git 포함
- `.gitignore`에서 `*.ttf` 제외 라인 삭제 완료
- Vercel 배포 시 폰트 없으면 PDF 생성 실패 → Drive 업로드 스킵됨

### 5. Vercel 서버리스 — 동기 처리
- 백그라운드 IIFE (`waitUntil` 없음) 사용 불가
- `app/api/confirm/route.ts`에 `export const maxDuration = 60` 추가
- PDF 생성과 Drive 업로드를 동기 await로 처리

### 6. useSearchParams — Suspense 래퍼
```typescript
// app/meetings/page.tsx
export default function MeetingsPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <MeetingListClient />
    </Suspense>
  );
}
```

### 7. PDF 마크다운 제거
```typescript
function stripMarkdown(text: string): string {
  return text.split('\n').map((line) =>
    line.replace(/^#{1,6}\s+/, '')
        .replace(/\*{1,2}(.+?)\*{1,2}/g, '$1')
        .replace(/^>\s+/, '')
        .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  ).join('\n');
}
```

### 8. 참석자 기관별 그룹핑
```typescript
function groupAttendees(attendees: string[]): string {
  // "(기관) 이름" 형식 → Map으로 그룹핑
  // 출력: "(건국대) 이석준, 김규현\n(AIRI) 장주현"
}
```

---

## PDF 양식 고정값

```typescript
const 사업명 = '인공지능 혁신 허브 구축 사업';
const 과제번호 = '2024-0-00XXX';
const 과제명 = '초거대 AI 기반 산학연 협력 플랫폼 개발';
const ORG_NAME = '재단법인 인공지능연구원';
const PI_NAME = '임춘성';
```

---

## 최근 커밋 이력

| 해시 | 내용 |
|------|------|
| 최신 | Drive 폴더 카드번호별 구조 + 동기 처리 최종 확인 |
| e661a56 | 폰트 파일 git 포함 (핵심 버그픽스) |
| 64efbf1 | Drive 폴더에 카드번호 레벨 추가 |
| 0602247 | 긴 제목 truncate, Drive 업로드 동기 처리 |
| ade7733 | useSearchParams Suspense 래퍼 |
| 6bb0e45 | 목록 실시간 반영, 삭제 UX, PDF 개선 |

---

## 새 PC에서 작업 시작하는 방법

```bash
git clone https://github.com/No-CodeArchitect/airi-meeting-minutes.git
cd airi-meeting-minutes
npm install

# .env.local 파일 생성 (위 환경변수 내용 복사)

npm run dev  # http://localhost:3000
```

> Vercel에 이미 배포된 상태이므로, 로컬 변경 후 `git push`하면 자동 재배포됩니다.

---

## 새 대화 시작 시 첫 메시지 템플릿

```
이 파일(HANDOVER.md)을 참고해서 작업 이어가줘.
GitHub: https://github.com/No-CodeArchitect/airi-meeting-minutes
배포: https://airi-meeting-minutes.vercel.app

이어서 할 작업: [여기에 작업 내용 입력]
```
