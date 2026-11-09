import { requireExamContext } from "@/lib/exam-context";
import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import { Sidebar } from "./sidebar";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { TestLayoutWrapper } from "./test-layout-wrapper";

const XPToast = dynamic(
  () => import("@/components/xp/XPToast").then((m) => m.XPToast)
);

const LevelUpModal = dynamic(
  () => import("@/components/xp/LevelUpModal").then((m) => m.LevelUpModal)
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { exam, profile, stream } = await requireExamContext();
  const supabase = await createClient();
  const configRes = await supabase.from("app_config").select("*").eq("key", "general").maybeSingle();
  const generalConfig = configRes.data?.value as Record<string, unknown> | undefined;
  const maintenanceMode = generalConfig?.maintenanceMode === true;
  const userRole = profile?.role || "user";
  const userName = profile?.full_name || "User";
  const avatarUrl = profile?.avatar_url || null;

  return (
    <div className="min-h-screen bg-background flex">
      <a href="#main-content" className="workspace-skip">Skip to main content</a>
      <TestLayoutWrapper
        sidebar={<Sidebar userName={userName} userRole={userRole} avatarUrl={avatarUrl} />}
        header={null}
      >
          <MaintenanceBanner isMaintenanceMode={maintenanceMode} isAdmin={userRole === "admin"} />
          <div key={`${exam.id}:${stream?.id || ""}`} className="workspace-content px-3 py-2 flex-1 min-h-0 flex flex-col">{children}</div>
      </TestLayoutWrapper>
      <XPToast />
      <LevelUpModal />
    </div>
  );
}
