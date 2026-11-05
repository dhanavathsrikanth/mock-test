import { getSprintCatalog } from '@/lib/sprint-catalog';
import { SprintLauncher } from '@/components/practice/SprintLauncher';

export const metadata = { title: '5-Q Sprint | Exam Prep' };
export default async function PracticePage() {
  const catalog = await getSprintCatalog();
  return <div className="mx-auto w-full max-w-xl space-y-5 py-5"><header><p className="text-xs text-muted-foreground">{catalog.label}</p><h1 className="mt-1 text-2xl font-semibold">Make the next 15 minutes count.</h1><p className="mt-2 text-sm text-muted-foreground">A focused set from your question bank. Choose a concept, test your recall, and turn mistakes into revision.</p></header><SprintLauncher catalog={catalog} /></div>;
}
