// 사업(프로젝트)별 설정 레지스트리
// - 회의록 PDF 상단/서명란 고정값
// - AI 회의록 생성용 시스템 컨텍스트
// 어느 사업인지는 "법인카드 끝 4자리"로 자동 판별한다. (등록 화면에 선택 UI 없음)
// ⚠️ 카드 끝 4자리는 사업 간 겹치면 안 됨. 겹치면 자동 판별 불가.
import { SYSTEM_CONTEXT as GUNTEUKHWA_CONTEXT } from './claude-context';
import { GONGGUN_AX_CONTEXT } from './claude-context-gonggun-ax';

export interface ProjectInfo {
  id: string;
  bizName: string;        // 사업명
  projNo: string;         // 과제번호
  projName: string;       // 과제명 (줄바꿈 \n 허용)
  orgName: string;        // 서명란 기관명
  researcherRole: string; // 서명란 직함
  piName: string;         // 연구책임자 이름
  context: string;        // AI 시스템 컨텍스트
}

// 군 장병 AI SW 역량강화 사업 (기존)
const GUNTEUKHWA: ProjectInfo = {
  id: 'gunteukhwa',
  bizName: '군 장병 AI SW 역량강화 사업',
  projNo: 'RS-2024-00431384',
  projName: '군 특화 AI 교육과정 개설·운영\n(AI 리더십·정책·프로젝트 과정)',
  orgName: '인공지능연구원',
  researcherRole: '연구책임자',
  piName: '임춘성',
  context: GUNTEUKHWA_CONTEXT,
};

// 국방AI인재양성 — 서울대-공군AX(군·산·학 협력센터) (신규)
const GONGGUN_AX: ProjectInfo = {
  id: 'gonggun-ax',
  bizName: '국방AI인재양성',
  projNo: 'RS-2026-25553157',
  projName: '군·산·학 협력센터(서울/양재)',
  orgName: '인공지능연구원',
  researcherRole: '연구책임자',
  piName: '임춘성',
  context: GONGGUN_AX_CONTEXT,
};

// 카드 끝 4자리 → 사업
const CARD_TO_PROJECT: Record<string, ProjectInfo> = {
  '4116': GUNTEUKHWA,
  '1558': GUNTEUKHWA,
  '5317': GUNTEUKHWA,
  '8252': GONGGUN_AX,
};

// 미지정 카드/과거 데이터는 기존 사업으로 처리
export const DEFAULT_PROJECT = GUNTEUKHWA;

export function getProjectByCard(cardLast4: string | null | undefined): ProjectInfo {
  if (!cardLast4) return DEFAULT_PROJECT;
  return CARD_TO_PROJECT[cardLast4.trim()] ?? DEFAULT_PROJECT;
}
