import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";
import { Sidebar } from "./sidebar";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name || "User";
  const userRole = profile?.role || "user";

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar userName={userName} userRole={userRole} />
      <main className="flex-1 min-w-0 pb-16 lg:pb-0 flex flex-col">
        <XPBar />
        <div className="px-3 py-2 flex-1">{children}</div>
      </main>
      <XPToast />
      <LevelUpModal />
    </div>
  );
}
