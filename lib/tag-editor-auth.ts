import { createClient } from '@/lib/supabase/server';

export async function requireTagEditor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to edit concept tags.');
  const membership = await supabase.from('admin_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (membership.error || !membership.data) throw new Error('An admin membership is required to edit concept tags.');
  return supabase;
}
