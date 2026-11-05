import { loadSmartDiagnostic } from '@/lib/smart-tags-server';
import { SmartTagPanel } from './SmartTagPanel';

export async function SessionConcepts(scope: Parameters<typeof loadSmartDiagnostic>[0]) {
  return <SmartTagPanel result={await loadSmartDiagnostic(scope)} variant="result" />;
}
