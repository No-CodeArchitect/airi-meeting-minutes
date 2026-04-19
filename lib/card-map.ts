// 카드 끝 4자리 → 담당자 매핑
// 추가 카드는 여기에 append
export const CARD_MAP: Record<string, string> = {
  '4116': '임춘성',
  '1558': '장주현',
  '5317': '장주현',
};

export function getHandlerByCard(cardLast4: string): string {
  return CARD_MAP[cardLast4] ?? '미지정';
}
