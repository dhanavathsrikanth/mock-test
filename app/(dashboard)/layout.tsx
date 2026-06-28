import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import { Sidebar } from "./sidebar";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";
import { TestLayoutWrapper } from "./test-layout-wrapper";

const XPBar = dynamic(
  () => import("@/components/xp/XPBar").then((m) => m.XPBar)
);

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [profileRes, configRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase.from("app_config").select("*").eq("key", "general").maybeSingle(),
  ]);

  const profile = profileRes.data;
  const generalConfig = configRes.data?.value as Record<string, any> | undefined;
  const maintenanceMode = generalConfig?.maintenanceMode === true;
  const userRole = profile?.role || "user";
  const userName = profile?.full_name || "User";
  const avatarUrl = profile?.avatar_url || null;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar userName={userName} userRole={userRole} avatarUrl={avatarUrl} />
      <TestLayoutWrapper>
        <main className="flex-1 min-w-0 pb-16 lg:pb-0 flex flex-col">
          <MaintenanceBanner isMaintenanceMode={maintenanceMode} isAdmin={userRole === "admin"} />
          <XPBar />
          <div className="px-3 py-2 flex-1">{children}</div>
        </main>
      </TestLayoutWrapper>
      <XPToast />
      <LevelUpModal />
    </div>
  );
}
