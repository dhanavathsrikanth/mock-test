import { createClient } from "@/lib/supabase/server";
import { AuditClient } from "./audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const supabase = await createClient();

  const [logsRes, actionTypesRes, adminsRes] = await Promise.all([
    supabase
      .from("audit_log")
      .select("*, profiles!audit_log_user_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.rpc("get_distinct_audit_actions"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "admin").order("full_name"),
  ]);

  const actionTypes = (actionTypesRes.data as string[]) || [];
  const admins = (adminsRes.data || []).map((a: any) => ({ id: a.id, name: a.full_name || a.email }));

  const logs = (logsRes.data || []).map((l: any) => ({
    id: l.id,
    action: l.action,
    entityType: l.entity_type,
    entityId: l.entity_id,
    userId: l.user_id,
    performerName: l.profiles?.full_name || "Unknown",
    performerEmail: l.profiles?.email || "",
    metadata: l.metadata,
    ipAddress: l.ip_address,
    createdAt: l.created_at,
  }));

  const uniqueUsers = [...new Set(logs.map((l) => l.userId))].length;

  return <AuditClient logs={logs} actionTypes={actionTypes} admins={admins} uniqueUsers={uniqueUsers} />;
}
