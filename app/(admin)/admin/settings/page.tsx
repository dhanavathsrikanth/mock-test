import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [configRes, examsRes, countdownRes, adminProfilesRes] = await Promise.all([
    supabase.from("app_config").select("*"),
    supabase.from("exams").select("*").eq("is_active", true),
    supabase.from("exam_countdown").select("*").order("exam_date", { ascending: true }),
    supabase.from("admin_profiles").select("id, user_id, role, created_at"),
  ]);

  const adminUserIds = (adminProfilesRes.data || []).map((ap) => ap.user_id);
  const profilesRes = adminUserIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email, role").in("id", adminUserIds)
    : { data: [] };

  const config: Record<string, any> = {};
  (configRes.data || []).forEach((c) => {
    config[c.key] = c.value;
  });

  const adminProfiles = (adminProfilesRes.data || []).map((ap) => {
    const p = (profilesRes.data || []).find((p) => p.id === ap.user_id);
    return {
      id: ap.id,
      userId: ap.user_id,
      email: p?.email || "Unknown",
      name: p?.full_name || "Unknown",
      role: (ap as any).role || "admin",
      createdAt: ap.created_at,
    };
  });

  return (
    <SettingsClient
      config={config}
      exams={examsRes.data || []}
      countdowns={(countdownRes.data || []).map((c) => ({
        id: c.id,
        examId: c.exam_id,
        label: c.label,
        examDate: c.exam_date,
        isOfficial: c.is_official,
        isActive: c.is_active,
        createdAt: c.created_at,
      }))}
      adminProfiles={adminProfiles}
    />
  );
}
