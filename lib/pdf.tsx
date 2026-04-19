import ReactPDF, {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
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

// ── 스타일 ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansKR',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 55,
    color: '#1a1a1a',
    lineHeight: 1.6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 4,
  },
  metaTable: {
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingVertical: 4,
  },
  metaLabel: {
    width: '28%',
    fontWeight: 'bold',
    color: '#333',
  },
  metaValue: {
    width: '72%',
    color: '#1a1a1a',
  },
  contentText: {
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  signatureArea: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#aaa',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: 200,
    borderWidth: 0.5,
    borderColor: '#888',
    padding: 12,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#555',
    marginBottom: 4,
  },
  signatureName: {
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 8,
  },
  signatureLine: {
    marginTop: 4,
    width: '80%',
    borderBottomWidth: 0.5,
    borderBottomColor: '#888',
  },
  pageNum: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: '#aaa',
  },
});

// ── 날짜 포맷 ──────────────────────────────────────────────
function fmtDateFromDB(dateStr: string) {
  // DB DATE 형식: YYYY-MM-DD
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

// ── PDF 문서 컴포넌트 ──────────────────────────────────────
function MeetingDocument({ meeting }: { meeting: Meeting }) {
  const dateLabel = meeting.date ? fmtDateFromDB(meeting.date) : '';
  const timeLabel =
    meeting.start_time && meeting.end_time
      ? `${meeting.start_time} ~ ${meeting.end_time}`
      : meeting.start_time ?? '';

  const attendees = Array.isArray(meeting.attendees) ? meeting.attendees : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 제목 */}
        <Text style={styles.title}>회  의  록</Text>

        {/* 메타 정보 */}
        <View style={styles.metaTable}>
          {[
            ['사업명',   '군 장병 AI SW 역량강화 사업'],
            ['과제번호', 'RS-2024-00431384'],
            ['과제명',   '군 특화 AI 교육과정 개설·운영 (AI 리더십·정책·프로젝트 과정)'],
            ['일시',     `${dateLabel}  ${timeLabel}`],
            ['장소',     meeting.place ?? ''],
            ['담당자',   meeting.handler ?? ''],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaRow}>
              <Text style={styles.metaLabel}>{label}</Text>
              <Text style={styles.metaValue}>{value}</Text>
            </View>
          ))}

          {/* 참석자 */}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>참석자</Text>
            <View style={styles.metaValue}>
              {attendees.map((a, i) => (
                <Text key={i}>{a}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* 회의 내용 */}
        <Text style={styles.sectionTitle}>회의 내용</Text>
        <Text style={styles.contentText}>{meeting.minutes_content ?? ''}</Text>

        {/* 향후 일정 */}
        {meeting.future_plans && (
          <>
            <Text style={styles.sectionTitle}>향후 일정 및 요청 사항</Text>
            <Text style={styles.contentText}>{meeting.future_plans}</Text>
          </>
        )}

        {/* 서명란 */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>인공지능연구원</Text>
            <Text style={styles.signatureLabel}>연구책임자</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>임  춘  성</Text>
          </View>
        </View>

        {/* 페이지 번호 */}
        <Text
          style={styles.pageNum}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

// ── 공개 API ───────────────────────────────────────────────
export async function generateMeetingPDF(meeting: Meeting): Promise<Buffer> {
  const stream = await ReactPDF.renderToBuffer(<MeetingDocument meeting={meeting} />);
  return stream;
}
