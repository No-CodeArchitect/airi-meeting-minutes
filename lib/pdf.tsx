import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer';
import path from 'path';
import type { Meeting } from '@/types';

// ── 폰트 등록 ──────────────────────────────────────────────
const fontDir = path.join(process.cwd(), 'public', 'fonts');
Font.register({
  family: 'NotoSansKR',
  fonts: [
    { src: path.join(fontDir, 'NotoSansKR-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(fontDir, 'NotoSansKR-Bold.ttf'),    fontWeight: 'bold'   },
  ],
});

// ── 고정 상수 ──────────────────────────────────────────────
const BIZ_NAME    = '군 장병 AI SW 역량강화 사업';
const PROJ_NO     = 'RS-2024-00431384';
const PROJ_NAME   = '군 특화 AI 교육과정 개설·운영\n(AI 리더십·정책·프로젝트 과정)';
const ORG_NAME    = '인공지능연구원';
const RESEARCHER  = '연구책임자';
const PI_NAME     = '임춘성';

// ── 색상 / 두께 ─────────────────────────────────────────────
const BORDER   = 0.8;
const BORDER_C = '#555';
const LABEL_BG = '#e8e8e8';

// ── 마크다운 제거 ───────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, '')      // ## 제목
        .replace(/^\*{1,2}(.+?)\*{1,2}$/, '$1')  // **bold**
        .replace(/\*{1,2}(.+?)\*{1,2}/g, '$1')
        .replace(/^>\s+/, '')           // > 인용
        .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')   // `code`
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [링크](url)
    )
    .join('\n');
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    fontSize: 9,
    paddingVertical: 40,
    paddingHorizontal: 45,
    color: '#000',
  },
  // 제목
  titleBox: {
    borderWidth: BORDER,
    borderColor: BORDER_C,
    backgroundColor: '#d0d0d0',
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 0,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 6,
  },
  // 테이블 공통
  row: {
    flexDirection: 'row',
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
  },
  labelCell: {
    backgroundColor: LABEL_BG,
    fontWeight: 'bold',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
    width: 52,
  },
  labelCellWide: {
    backgroundColor: LABEL_BG,
    fontWeight: 'bold',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  // 참석자 열
  attendeeHeader: {
    backgroundColor: LABEL_BG,
    fontWeight: 'bold',
    fontSize: 9,
    width: 68,
    borderLeftWidth: BORDER,
    borderColor: BORDER_C,
    paddingHorizontal: 4,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeBody: {
    width: 68,
    borderLeftWidth: BORDER,
    borderColor: BORDER_C,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'center',
  },
  // 회의내용 / 향후일정
  sectionLabelRow: {
    flexDirection: 'row',
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
  },
  sectionLabel: {
    backgroundColor: LABEL_BG,
    fontWeight: 'bold',
    fontSize: 9,
    width: 52,
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 120,
  },
  futureContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 60,
  },
  contentText: {
    fontSize: 9,
    lineHeight: 1.7,
  },
  // 하단 서명 행
  footerRow: {
    flexDirection: 'row',
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
    marginTop: 0,
  },
  footerOrg: {
    flex: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
  },
  footerOrgText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  footerRole: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: BORDER,
    borderColor: BORDER_C,
  },
  footerName: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNum: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaa',
  },
});

// ── 날짜/시간 포맷 ──────────────────────────────────────────
function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}

// ── 참석자 기관별 그룹핑 ────────────────────────────────────
// ["(건국대) 이석준", "(건국대) 김규현", "(인공지능연구원) 전영진"]
// → "(건국대) 이석준, 김규현\n(인공지능연구원) 전영진"
function groupAttendees(attendees: string[]): string {
  const orgMap = new Map<string, string[]>();
  const noOrg: string[] = [];

  for (const a of attendees) {
    const match = a.match(/^\(([^)]+)\)\s*(.+)/);
    if (match) {
      const org = match[1].trim();
      const name = match[2].trim();
      if (!orgMap.has(org)) orgMap.set(org, []);
      orgMap.get(org)!.push(name);
    } else {
      noOrg.push(a.trim());
    }
  }

  const lines: string[] = [];
  for (const [org, names] of orgMap) {
    lines.push(`(${org}) ${names.join(', ')}`);
  }
  if (noOrg.length) lines.push(noOrg.join(', '));
  return lines.join('\n');
}

// ── PDF 문서 ────────────────────────────────────────────────
function MeetingDocument({ meeting }: { meeting: Meeting }) {
  const dateStr = meeting.date ? fmtDate(meeting.date) : '';
  const timeStr = [meeting.start_time, meeting.end_time].filter(Boolean).join(' ~ ');
  const dateTime = [dateStr, timeStr].filter(Boolean).join('  ');

  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];
  const attendeeText = groupAttendees(attendees);

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── 제목 ── */}
        <View style={S.titleBox}>
          <Text style={S.titleText}>회  의  록</Text>
        </View>

        {/* ── 상단 메타 테이블: 좌(사업명~장소) + 우(참석자) 나란히 ── */}
        <View style={{ flexDirection: 'row', borderWidth: BORDER, borderColor: BORDER_C }}>

          {/* 좌측: 5개 행 */}
          <View style={{ flex: 1 }}>
            {/* 사업명 */}
            <View style={{ flexDirection: 'row', borderBottomWidth: BORDER, borderColor: BORDER_C }}>
              <View style={[S.labelCell, { borderRightWidth: BORDER, borderColor: BORDER_C }]}><Text>사업명</Text></View>
              <View style={S.valueCell}><Text>{BIZ_NAME}</Text></View>
            </View>
            {/* 과제번호 */}
            <View style={{ flexDirection: 'row', borderBottomWidth: BORDER, borderColor: BORDER_C }}>
              <View style={[S.labelCell, { borderRightWidth: BORDER, borderColor: BORDER_C }]}><Text>과제번호</Text></View>
              <View style={S.valueCell}><Text>{PROJ_NO}</Text></View>
            </View>
            {/* 과제명 */}
            <View style={{ flexDirection: 'row', borderBottomWidth: BORDER, borderColor: BORDER_C }}>
              <View style={[S.labelCell, { borderRightWidth: BORDER, borderColor: BORDER_C }]}><Text>과제명</Text></View>
              <View style={S.valueCell}><Text>{PROJ_NAME}</Text></View>
            </View>
            {/* 일시 */}
            <View style={{ flexDirection: 'row', borderBottomWidth: BORDER, borderColor: BORDER_C }}>
              <View style={[S.labelCell, { borderRightWidth: BORDER, borderColor: BORDER_C }]}><Text>일  시</Text></View>
              <View style={S.valueCell}><Text>{dateTime}</Text></View>
            </View>
            {/* 장소 */}
            <View style={{ flexDirection: 'row' }}>
              <View style={[S.labelCell, { borderRightWidth: BORDER, borderColor: BORDER_C }]}><Text>장  소</Text></View>
              <View style={S.valueCell}><Text>{meeting.place ?? ''}</Text></View>
            </View>
          </View>

          {/* 우측: 참석자 단일 셀 */}
          <View style={{ width: 90, borderLeftWidth: BORDER, borderColor: BORDER_C }}>
            <View style={{ backgroundColor: LABEL_BG, borderBottomWidth: BORDER, borderColor: BORDER_C, paddingVertical: 4, alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 9 }}>참  석  자</Text>
            </View>
            <View style={{ flex: 1, padding: 6 }}>
              <Text style={{ fontSize: 8, lineHeight: 1.7 }}>{attendeeText}</Text>
            </View>
          </View>

        </View>

        {/* ── 회의 내용 ── */}
        <View style={S.sectionLabelRow}>
          <View style={S.sectionLabel}><Text>회의{'\n'}내용</Text></View>
          <View style={S.sectionContent}>
            <Text style={S.contentText}>{stripMarkdown(meeting.minutes_content ?? '')}</Text>
          </View>
        </View>

        {/* ── 향후 일정 ── */}
        <View style={S.sectionLabelRow}>
          <View style={S.sectionLabel}><Text>향후{'\n'}일정</Text></View>
          <View style={S.futureContent}>
            <Text style={S.contentText}>{stripMarkdown(meeting.future_plans ?? '')}</Text>
          </View>
        </View>

        {/* ── 서명란 ── */}
        <View style={S.footerRow}>
          <View style={S.footerOrg}>
            <Text style={S.footerOrgText}>{ORG_NAME}</Text>
          </View>
          <View style={S.footerRole}>
            <Text style={{ fontSize: 9 }}>{RESEARCHER}</Text>
          </View>
          <View style={S.footerName}>
            <Text style={{ fontSize: 9 }}>{PI_NAME}</Text>
          </View>
        </View>

        {/* 페이지 번호 */}
        <Text
          style={S.pageNum}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

// ── 공개 API ───────────────────────────────────────────────
export async function generateMeetingPDF(meeting: Meeting): Promise<Buffer> {
  return renderToBuffer(<MeetingDocument meeting={meeting} />);
}
