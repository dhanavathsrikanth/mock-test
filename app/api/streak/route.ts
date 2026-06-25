import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStreakStatus, updateStreak } from "@/lib/streak";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getStreakStatus(user.id);
  return NextResponse.json(status);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await updateStreak(user.id);
  return NextResponse.json(record);
}
