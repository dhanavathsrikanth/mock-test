import { requireExamContext } from '@/lib/exam-context';
import { loadSmartDiagnostic } from '@/lib/smart-tags-server';
import { SmartTagPanel } from './SmartTagPanel';

export async function DashboardConcepts() {
  const { user, exam, stream } = await requireExamContext();
  const result = await loadSmartDiagnostic({ userId: user.id, examId: exam.id, streamId: stream?.id ?? null });
  return <SmartTagPanel result={result} />;
}
