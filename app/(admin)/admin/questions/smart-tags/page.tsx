import { requireTagEditor } from '@/lib/tag-editor-auth';
import { SmartTagsEditor } from './smart-tags-editor';

export const metadata = { title: 'Smart tags | Exam Prep Admin' };
export default async function SmartTagsPage() {
  try { await requireTagEditor(); }
  catch { return <p role="alert" className="rounded-lg border p-4">Sign in with an admin membership to manage concept tags.</p>; }
  return <SmartTagsEditor />;
}
