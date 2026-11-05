import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChallenge } from '@/lib/challenge-server';
import { ChallengeClient } from '@/components/challenges/ChallengeClient';
import { formatMarks } from '@/lib/marking';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ challengeId: string }> }): Promise<Metadata> {
  const { challengeId } = await params;
  const c = await getChallenge(challengeId);
  if (!c) return { title:'Challenge not found' };
  const title = `${c.creatorName} challenged you to a ${c.label} sprint!`;
  const description = `Score to beat: ${formatMarks(c.creatorScore)}/${formatMarks(c.maximum)}. Same 5 questions. ${c.minutes} minutes. Start as a guest!`;
  return { title, description, robots:{ index:false, follow:false }, referrer:'no-referrer',
    openGraph:{ title, description, type:'website', images:[{url:`/c/${c.id}/opengraph-image`,width:1200,height:630}] },
    twitter:{ card:'summary_large_image', title, description, images:[`/c/${c.id}/opengraph-image`] } };
}
export default async function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const challenge = await getChallenge(challengeId);
  if (!challenge) notFound();
  return <ChallengeClient challenge={challenge} />;
}
