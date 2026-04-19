import { supabaseAdmin } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import type { Meeting } from '@/types';
import MeetingDetailClient from './MeetingDetailClient';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('meetings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) notFound();

  return <MeetingDetailClient meeting={data as Meeting} />;
}
