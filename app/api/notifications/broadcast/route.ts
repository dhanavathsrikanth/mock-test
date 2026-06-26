import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type, title, message, link, audience } = await req.json();

  if (!type || !title) {
    return NextResponse.json({ error: "Missing required fields: type, title" }, { status: 400 });
  }

  // Fetch all target user IDs
  let query = supabase.from("profiles").select("id");
  if (audience === "free") {
    query = query.eq("subscription_tier", "free");
  } else if (audience === "pro") {
    query = query.eq("subscription_tier", "pro");
  }
  // "all" = no filter

  const { data: users } = await query;
  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const userIds = users.map((u: any) => u.id);
  const batchSize = 100;
  let sent = 0;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const rows = batch.map((uid: string) => ({
      user_id: uid,
      type,
      title,
      message: message || null,
      link: link || null,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (!error) sent += batch.length;
  }

  return NextResponse.json({ sent, total: userIds.length });
}
