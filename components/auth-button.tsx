import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "./ui/button";

export async function AuthButton() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return user ? (
    <Button asChild size="sm" variant="outline">
      <Link href="/dashboard">Dashboard</Link>
    </Button>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
