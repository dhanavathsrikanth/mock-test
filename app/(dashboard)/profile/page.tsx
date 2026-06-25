import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileContent } from "./profile-content";

export const metadata = { title: "Profile | TGPSC AEE Civil Prep" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({ id: userId, full_name: user.email?.split("@")[0] || "User", email: user.email || "" })
      .select()
      .single();
    profile = newProfile;
  }

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name")
    .order("name");

  return <ProfileContent profile={profile} exams={exams || []} />;
}
