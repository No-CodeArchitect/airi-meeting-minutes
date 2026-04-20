import { Suspense } from 'react';
import MeetingListClient from './MeetingListClient';

export default function MeetingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">로딩 중...</div>}>
      <MeetingListClient />
    </Suspense>
  );
}
