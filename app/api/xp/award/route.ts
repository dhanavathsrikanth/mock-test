import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardTestXP } from "@/lib/xp";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  try {
    const result = await awardTestXP(user.id, sessionId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("XP award error:", err);
    return NextResponse.json({ error: "Failed to award XP" }, { status: 500 });
  }
}
