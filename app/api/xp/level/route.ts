import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserLevel } from "@/lib/xp";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const level = await getUserLevel(user.id);
  return NextResponse.json(level);
}
