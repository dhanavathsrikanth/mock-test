import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationService } from "@/lib/notifications";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = getNotificationService();
  const counts = await service.getCounts(user.id);

  return NextResponse.json(counts);
}
