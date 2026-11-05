import { createClient } from '@/lib/supabase/server';
import { toQuestionPresentation, type QuestionRecord } from '@/lib/question-contract';
import { validChallengeId, type Challenge } from './challenges';

export async function getChallenge(id: string): Promise<Challenge | null> {
  if (!validChallengeId(id)) return null;
  const db = await createClient();
  const { data, error } = await db.rpc('challenge_view', { p_id: id });
  if (error) throw new Error('Challenges are temporarily unavailable. Please try again.');
  if (!data) return null;
  return { ...data, questions: data.questions.map((q: QuestionRecord) => toQuestionPresentation(q)) };
}
