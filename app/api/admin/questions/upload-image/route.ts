import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const questionId = formData.get("questionId") as string | null;

  if (!file || !questionId) {
    return NextResponse.json({ error: "Missing file or questionId" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
  if (!ext || !allowed.includes(ext)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: jpg, jpeg, png, webp, gif" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = `${questionId}/${safeName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("question-images")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("question-images")
    .getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrlData.publicUrl, path: filePath });
}
