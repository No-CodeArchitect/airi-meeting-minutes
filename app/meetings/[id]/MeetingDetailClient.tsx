'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Meeting } from '@/types';

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}
function formatAmt(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300';

export default function MeetingDetailClient({ meeting }: { meeting: Meeting }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [topic, setTopic]         = useState(meeting.topic);
  const [place, setPlace]         = useState(meeting.place ?? '');
  const [startTime, setStartTime] = useState(meeting.start_time ?? '');
  const [endTime, setEndTime]     = useState(meeting.end_time ?? '');
  const [handler, setHandler]     = useState(meeting.handler ?? '');
  const [attendeesText, setAttendeesText] = useState(
    Array.isArray(meeting.attendees) ? meeting.attendees.join('\n') : '',
  );
  const [minutesContent, setMinutesContent] = useState(meeting.minutes_content ?? '');
  const [futurePlans, setFuturePlans]       = useState(meeting.future_plans ?? '');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          place,
          start_time: startTime || null,
          end_time:   endTime   || null,
          handler,
          attendees: attendeesText.split('\n').map((s) => s.trim()).filter(Boolean),
          minutes_content: minutesContent,
          future_plans:    futurePlans,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? '저장 실패');
      }
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/meetings" className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
            ← 목록으로
          </Link>
          {editing ? (
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="text-2xl font-bold text-gray-900 w-full border-b-2 border-blue-300 focus:outline-none pb-1 bg-transparent"
            />
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">{topic}</h2>
          )}
          <p className="text-sm text-gray-500 mt-1">{formatDate(meeting.date)}</p>
        </div>

        <div className="flex gap-2 shrink-0 ml-4">
          <a
            href={`/api/pdf/${meeting.id}`}
            target="_blank"
            className="flex items-center gap-1.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
          >
            📄 PDF 다운로드
          </a>
          {meeting.drive_folder_url && (
            <a
              href={meeting.drive_folder_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
            >
              📁 Drive 폴더
            </a>
          )}
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); }}
                className="border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
            >
              ✏️ 수정
            </button>
          )}
        </div>
      </div>

      {saved && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">
          ✅ 저장되었습니다.
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">기본 정보</h3>
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <Field label="장소"><input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} /></Field>
              <Field label="담당자"><input value={handler} onChange={(e) => setHandler(e.target.value)} className={inputCls} /></Field>
              <Field label="시작 시각"><input value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} placeholder="HH:MM" /></Field>
              <Field label="종료 시각"><input value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} placeholder="HH:MM" /></Field>
            </>
          ) : (
            <>
              <InfoRow label="날짜" value={formatDate(meeting.date)} />
              <InfoRow label="장소" value={meeting.place ?? '-'} />
              <InfoRow label="시각" value={`${meeting.start_time ?? '-'} ~ ${meeting.end_time ?? '-'}`} />
              <InfoRow label="담당자" value={meeting.handler ?? '-'} />
              <InfoRow label="가맹점" value={meeting.store_name} />
              <InfoRow label="결제 금액" value={formatAmt(meeting.amount)} />
              <InfoRow label="카드" value={meeting.card_last4 ? `**** ${meeting.card_last4}` : '-'} />
              {meeting.drive_folder_url && (
                <InfoRow label="Drive 폴더" value={
                  <a href={meeting.drive_folder_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">
                    바로가기
                  </a>
                } />
              )}
            </>
          )}
        </div>
      </div>

      {/* 참석자 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">참석자</h3>
        {editing ? (
          <>
            <p className="text-xs text-gray-400 mb-2">한 줄에 한 명 · 형식: (소속) 이름</p>
            <textarea
              rows={Math.max(4, attendeesText.split('\n').length + 1)}
              value={attendeesText}
              onChange={(e) => setAttendeesText(e.target.value)}
              className={`${inputCls} font-mono text-xs`}
            />
          </>
        ) : (
          <ul className="space-y-1">
            {(Array.isArray(meeting.attendees) ? meeting.attendees : []).map((a, i) => (
              <li key={i} className="text-sm text-gray-700">{a}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 회의 내용 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">회의 내용</h3>
        {editing ? (
          <textarea
            rows={14}
            value={minutesContent}
            onChange={(e) => setMinutesContent(e.target.value)}
            className={`${inputCls} font-mono text-xs leading-relaxed`}
          />
        ) : (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
            {meeting.minutes_content ?? '-'}
          </pre>
        )}
      </div>

      {/* 향후 일정 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">향후 일정 및 요청 사항</h3>
        {editing ? (
          <textarea
            rows={6}
            value={futurePlans}
            onChange={(e) => setFuturePlans(e.target.value)}
            className={`${inputCls} font-mono text-xs leading-relaxed`}
          />
        ) : (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
            {meeting.future_plans ?? '-'}
          </pre>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs font-medium text-gray-400 w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}
