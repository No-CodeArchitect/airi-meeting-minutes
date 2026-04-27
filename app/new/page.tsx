'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ParsedData } from '@/types';

// ── 단계 타입 ──────────────────────────────────────────────
type Stage = 'upload' | 'parsing' | 'editing' | 'confirming' | 'done';
type Mode  = 'new' | 'add-receipt';

// ── 파일 업로드 구역 ───────────────────────────────────────
function FileZone({
  label,
  accept,
  file,
  onFile,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors text-center ${
        drag
          ? 'border-blue-400 bg-blue-50'
          : file
          ? 'border-green-400 bg-green-50'
          : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {file ? (
        <>
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-medium text-green-700">{file.name}</p>
          <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
        </>
      ) : (
        <>
          <p className="text-3xl mb-3">📎</p>
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          <p className="text-xs text-gray-400 mt-1">클릭하거나 파일을 드래그하세요</p>
          <p className="text-xs text-gray-400">이미지(JPG/PNG) 또는 PDF</p>
        </>
      )}
    </div>
  );
}

// ── 편집 폼 ────────────────────────────────────────────────
function MinutesEditor({
  data,
  onConfirm,
  confirming,
}: {
  data: ParsedData;
  onConfirm: (d: ParsedData) => void;
  confirming: boolean;
}) {
  const [form, setForm] = useState<ParsedData>(data);
  const [attendeesText, setAttendeesText] = useState(data.approval.attendees.join('\n'));

  const setReceipt = (k: keyof ParsedData['receipt'], v: string | number) =>
    setForm((f) => ({ ...f, receipt: { ...f.receipt, [k]: v } }));
  const setApproval = (k: keyof ParsedData['approval'], v: string | string[]) =>
    setForm((f) => ({ ...f, approval: { ...f.approval, [k]: v } }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = { ...form, approval: { ...form.approval, attendees: attendeesText.split('\n').map((s) => s.trim()).filter(Boolean) } };
    onConfirm(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">기본 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="날짜">
            <input
              type="date"
              value={form.approval.date
                ? `${form.approval.date.slice(0,4)}-${form.approval.date.slice(4,6)}-${form.approval.date.slice(6,8)}`
                : ''}
              onChange={(e) => setApproval('date', e.target.value.replace(/-/g, ''))}
              className={inputCls}
            />
          </Field>
          <Field label="장소">
            <input value={form.approval.place} onChange={(e) => setApproval('place', e.target.value)} className={inputCls} />
          </Field>
          <Field label="시작 시각">
            <input value={form.approval.startTime} onChange={(e) => setApproval('startTime', e.target.value)} className={inputCls} placeholder="HH:MM" />
          </Field>
          <Field label="종료 시각">
            <input value={form.approval.endTime} onChange={(e) => setApproval('endTime', e.target.value)} className={inputCls} placeholder="HH:MM" />
          </Field>
          <Field label="회의 주제">
            <input value={form.approval.topic} onChange={(e) => setApproval('topic', e.target.value)} className={inputCls} />
          </Field>
          <Field label="담당자">
            <input value={form.receipt.handler} onChange={(e) => setReceipt('handler', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* 결제 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">결제 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="가맹점명 (전체)">
            <input value={form.receipt.storeFullName} onChange={(e) => setReceipt('storeFullName', e.target.value)} className={inputCls} />
          </Field>
          <Field label="가맹점명 (축약)">
            <input value={form.receipt.storeName} onChange={(e) => setReceipt('storeName', e.target.value)} className={inputCls} />
          </Field>
          <Field label="결제 금액 (원)">
            <input type="number" value={form.receipt.amount} onChange={(e) => setReceipt('amount', Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="카드 끝 4자리">
            <input value={form.receipt.cardLast4} onChange={(e) => setReceipt('cardLast4', e.target.value)} maxLength={4} className={inputCls} />
          </Field>
        </div>
      </div>

      {/* 참석자 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">참석자</h3>
        <p className="text-xs text-gray-400 mb-3">한 줄에 한 명 · 형식: (소속) 이름</p>
        <textarea
          rows={Math.max(4, attendeesText.split('\n').length + 1)}
          value={attendeesText}
          onChange={(e) => setAttendeesText(e.target.value)}
          className={`${inputCls} font-mono text-xs`}
        />
      </div>

      {/* 회의 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">회의 내용</h3>
        <textarea
          rows={14}
          value={form.minutesContent}
          onChange={(e) => setForm((f) => ({ ...f, minutesContent: e.target.value }))}
          className={`${inputCls} font-mono text-xs leading-relaxed`}
        />
      </div>

      {/* 향후 일정 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">향후 일정 및 요청 사항</h3>
        <textarea
          rows={6}
          value={form.futurePlans}
          onChange={(e) => setForm((f) => ({ ...f, futurePlans: e.target.value }))}
          className={`${inputCls} font-mono text-xs leading-relaxed`}
        />
      </div>

      <button
        type="submit"
        disabled={confirming}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
      >
        {confirming ? '저장 중...' : '✅ 확정 — DB 저장'}
      </button>
    </form>
  );
}

// ── 기존 회의 선택기 ───────────────────────────────────────
type MeetingSummary = {
  id: string;
  date: string;
  start_time: string | null;
  topic: string;
  store_name: string;
  handler: string | null;
};

function MeetingPicker({
  selected,
  onSelect,
}: {
  selected: MeetingSummary | null;
  onSelect: (m: MeetingSummary) => void;
}) {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/meetings')
      .then((r) => r.json())
      .then((j) => setMeetings(j.meetings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = meetings.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      m.topic.toLowerCase().includes(q) ||
      m.store_name.toLowerCase().includes(q) ||
      m.date.includes(q) ||
      (m.handler ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="주제, 가맹점, 날짜, 담당자로 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={inputCls}
      />
      {loading ? (
        <p className="text-xs text-gray-400 text-center py-4">불러오는 중...</p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">검색 결과 없음</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-blue-50 ${
                  selected?.id === m.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'bg-white'
                }`}
              >
                <span className="font-medium text-gray-800">{m.topic}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {m.date} · {m.store_name} · {m.handler ?? '-'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────
export default function NewPage() {
  const router = useRouter();

  // 신규 회의록 모드
  const [stage, setStage]     = useState<Stage>('upload');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [approval, setApproval] = useState<File | null>(null);
  const [parsed, setParsed]   = useState<ParsedData | null>(null);
  const [error, setError]     = useState('');

  // 모드 전환
  const [mode, setMode] = useState<Mode>('new');

  // 영수증 추가 모드
  const [addReceipt, setAddReceipt]           = useState<File | null>(null);
  const [addStoreName, setAddStoreName]       = useState('');
  const [addParsing, setAddParsing]           = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingSummary | null>(null);
  const [addSubmitting, setAddSubmitting]     = useState(false);
  const [addResult, setAddResult]             = useState<string | null>(null);

  const canParse = receipt && approval;

  const handleAddReceiptFile = async (file: File) => {
    setAddReceipt(file);
    setAddStoreName('');
    setAddParsing(true);
    try {
      const fd = new FormData();
      fd.append('receipt', file);
      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '파싱 실패');
      setAddStoreName(json.storeName ?? '');
    } catch {
      setAddStoreName('');
    } finally {
      setAddParsing(false);
    }
  };

  const handleParse = async () => {
    if (!receipt || !approval) return;
    setStage('parsing');
    setError('');

    const fd = new FormData();
    fd.append('receipt', receipt);
    fd.append('approval', approval);

    try {
      const res = await fetch('/api/parse', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '파싱 실패');
      setParsed(json);
      setStage('editing');
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setStage('upload');
    }
  };

  const handleConfirm = async (data: ParsedData) => {
    setStage('confirming');
    setError('');

    try {
      const fd = new FormData();
      fd.append('date',           data.approval.date);
      fd.append('startTime',      data.approval.startTime);
      fd.append('endTime',        data.approval.endTime);
      fd.append('topic',          data.approval.topic);
      fd.append('attendees',      JSON.stringify(data.approval.attendees));
      fd.append('place',          data.approval.place);
      fd.append('amount',         String(data.receipt.amount));
      fd.append('storeFullName',  data.receipt.storeFullName);
      fd.append('storeName',      data.receipt.storeName);
      fd.append('cardLast4',      data.receipt.cardLast4);
      fd.append('handler',        data.receipt.handler);
      fd.append('minutesContent', data.minutesContent);
      fd.append('futurePlans',    data.futurePlans);
      if (receipt)  fd.append('receipt',  receipt);
      if (approval) fd.append('approval', approval);

      const res = await fetch('/api/confirm', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '저장 실패');
      router.push(`/meetings/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
      setStage('editing');
    }
  };

  const handleAddReceipt = async () => {
    if (!addReceipt || !selectedMeeting || !addStoreName.trim()) return;
    setAddSubmitting(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('meetingId', selectedMeeting.id);
      fd.append('storeName', addStoreName.trim());
      fd.append('receipt',   addReceipt);

      const res = await fetch('/api/add-receipt', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '업로드 실패');
      setAddResult(json.folderUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setAddSubmitting(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setAddResult(null);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">신규 등록</h2>

      {/* ── 모드 탭 ── */}
      <div className="flex gap-2 mb-6 mt-4">
        <button
          onClick={() => switchMode('new')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'new'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          신규 회의록 등록
        </button>
        <button
          onClick={() => switchMode('add-receipt')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'add-receipt'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          기존 회의록에 영수증 추가
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ══════ 신규 회의록 모드 ══════ */}
      {mode === 'new' && (
        <>
          <p className="text-sm text-gray-500 mb-6">영수증과 사전 품의서를 업로드하면 회의록 초안을 자동 생성합니다.</p>

          {stage === 'upload' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">① 영수증</p>
                  <FileZone
                    label="비즈플레이 영수증"
                    accept="image/*,application/pdf"
                    file={receipt}
                    onFile={setReceipt}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">② 사전 품의서</p>
                  <FileZone
                    label="사전 품의서 PDF"
                    accept="application/pdf"
                    file={approval}
                    onFile={setApproval}
                  />
                </div>
              </div>
              <button
                onClick={handleParse}
                disabled={!canParse}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors mt-2"
              >
                🤖 AI로 파싱 + 회의록 초안 생성
              </button>
            </div>
          )}

          {stage === 'parsing' && (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
              <div className="text-4xl mb-4 animate-spin">⚙️</div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Claude AI가 분석 중입니다...</p>
              <p className="text-xs text-gray-400">영수증 파싱 → 품의서 파싱 → 회의록 초안 생성</p>
              <p className="text-xs text-gray-400 mt-1">약 20~30초 소요됩니다.</p>
            </div>
          )}

          {(stage === 'editing' || stage === 'confirming') && parsed && (
            <MinutesEditor
              data={parsed}
              onConfirm={handleConfirm}
              confirming={stage === 'confirming'}
            />
          )}
        </>
      )}

      {/* ══════ 영수증 추가 모드 ══════ */}
      {mode === 'add-receipt' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            기존 회의록의 회의비품의서·회의록 PDF를 그대로 복사하여 새 영수증 폴더를 Drive에 생성합니다.
            회의록 내용은 재생성되지 않습니다.
          </p>

          {addResult ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-2xl">✅</p>
              <p className="text-sm font-semibold text-green-800">Drive 폴더 생성 완료</p>
              <a
                href={addResult}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-blue-600 underline"
              >
                Drive 폴더 열기
              </a>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setAddResult(null);
                    setAddReceipt(null);
                    setAddStoreName('');
                    setAddParsing(false);
                    setSelectedMeeting(null);
                  }}
                  className="text-xs text-gray-500 underline"
                >
                  다른 영수증 추가
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 영수증 업로드 */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">① 새 영수증</p>
                <FileZone
                  label="비즈플레이 영수증"
                  accept="image/*,application/pdf"
                  file={addReceipt}
                  onFile={handleAddReceiptFile}
                />
                {addParsing && (
                  <p className="text-xs text-blue-500 mt-2">⚙️ 가맹점명 추출 중...</p>
                )}
                {!addParsing && addStoreName && (
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    ✅ 가맹점명: {addStoreName}
                  </p>
                )}
                {!addParsing && addReceipt && !addStoreName && (
                  <p className="text-xs text-red-500 mt-2">⚠️ 가맹점명 추출 실패 — 영수증을 다시 업로드해 주세요.</p>
                )}
              </div>

              {/* 기존 회의록 선택 */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
                <p className="text-xs font-semibold text-gray-600">③ 연결할 기존 회의록</p>
                <MeetingPicker selected={selectedMeeting} onSelect={setSelectedMeeting} />
                {selectedMeeting && (
                  <div className="bg-blue-50 rounded-lg px-4 py-3 text-xs text-blue-800">
                    선택됨: <span className="font-semibold">{selectedMeeting.topic}</span>
                    {' '}— {selectedMeeting.date} · {selectedMeeting.store_name}
                  </div>
                )}
              </div>

              <button
                onClick={handleAddReceipt}
                disabled={!addReceipt || !addStoreName || addParsing || !selectedMeeting || addSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {addSubmitting ? 'Drive 업로드 중...' : '📁 Drive 폴더 생성'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
