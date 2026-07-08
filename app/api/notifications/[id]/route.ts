import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationService } from "@/lib/notifications";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const service = getNotificationService();

  if (body.is_read === true) {
    const success = await service.markAsRead(id, user.id);
    if (!success) {
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.status === "archived") {
    const success = await service.archiveNotification(id, user.id);
    if (!success) {
      return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.status === "deleted") {
    const success = await service.deleteNotification(id, user.id);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (body.status === "restored") {
    const success = await service.undoDelete(id, user.id);
    if (!success) {
      return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const service = getNotificationService();
  const success = await service.deleteNotification(id, user.id);

  if (!success) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
