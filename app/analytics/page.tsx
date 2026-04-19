'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface AnalyticsData {
  totalAmount: number;
  totalCount: number;
  byMonth:   { month: string; amount: number }[];
  byHandler: { name: string; count: number; amount: number }[];
  byCard:    { card: string; count: number; amount: number }[];
  byOrg:     { org: string; count: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function formatAmt(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만원`;
  return `${n.toLocaleString()}원`;
}

// 최근 12개월 목록 생성
function getMonthOptions() {
  const opts: string[] = [''];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return opts;
}

export default function AnalyticsPage() {
  const [month, setMonth]   = useState('');
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = month ? `/api/analytics?month=${month}` : '/api/analytics';
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month]);

  const monthOptions = getMonthOptions();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">분석 브리핑</h2>
          <p className="text-sm text-gray-500 mt-0.5">회의비 사용 현황 분석</p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>{m || '전체 기간'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">로딩 중...</div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">데이터를 불러올 수 없습니다.</div>
      ) : (
        <div className="space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 mb-1">총 회의비</p>
              <p className="text-3xl font-bold text-gray-900">{data.totalAmount.toLocaleString()}원</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-500 mb-1">총 회의 건수</p>
              <p className="text-3xl font-bold text-gray-900">{data.totalCount}건</p>
            </div>
          </div>

          {/* 월별 회의비 */}
          {data.byMonth.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">월별 회의비 추이</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byMonth} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatAmt(v)} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, '회의비']} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* 담당자별 */}
            {data.byHandler.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">담당자별 사용 현황</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.byHandler}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.byHandler.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${Number(v).toLocaleString()}원`} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 space-y-1.5">
                  {data.byHandler.map((h, i) => (
                    <li key={i} className="flex justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                        {h.name} ({h.count}건)
                      </span>
                      <span className="font-medium">{h.amount.toLocaleString()}원</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 카드별 */}
            {data.byCard.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">카드별 사용 현황</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.byCard}
                      dataKey="amount"
                      nameKey="card"
                      cx="50%" cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `****${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.byCard.map((_, i) => (
                        <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `${Number(v).toLocaleString()}원`} />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-3 space-y-1.5">
                  {data.byCard.map((c, i) => (
                    <li key={i} className="flex justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS[(i + 2) % COLORS.length] }} />
                        ****{c.card} ({c.count}건)
                      </span>
                      <span className="font-medium">{c.amount.toLocaleString()}원</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 외부 기관별 미팅 빈도 */}
          {data.byOrg.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">외부 기관별 미팅 빈도 (Top 10)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.byOrg}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="org" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v) => [`${v}회`, '미팅 횟수']} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.totalCount === 0 && (
            <div className="text-center py-10 text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
              해당 기간에 데이터가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
