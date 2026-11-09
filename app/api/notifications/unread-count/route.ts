import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationService } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = getNotificationService(supabase);
    const counts = await service.getCounts(user.id);

    return NextResponse.json(counts);
  } catch (error) {
    console.warn("Notifications count temporarily unavailable:", error);
    return NextResponse.json(
      { error: "Notifications count temporarily unavailable" },
      { status: 503 }
    );
  }
}
