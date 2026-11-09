import { getSprintCatalog } from '@/lib/sprint-catalog';
import { SprintLauncher } from '@/components/practice/SprintLauncher';
import { PageHeading } from '@/components/workspace/PageHeading';
import { Zap } from 'lucide-react';

export const metadata = { title: '5-Q Sprint | Exam Prep' };
export default async function PracticePage() {
  const catalog = await getSprintCatalog();
  return <div className="mx-auto w-full max-w-2xl space-y-6 py-6"><PageHeading title="5-Q Sprint" eyebrow={catalog.label} icon={<Zap />} description="Five questions. A focused reset. Choose your subjects and build a short practice session." /><SprintLauncher catalog={catalog} /></div>;
}
