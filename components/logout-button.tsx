"use client";

import { useSignOut } from "@/hooks/use-sign-out";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { signOut, signingOut, signOutError } = useSignOut();
  return <div>
    <Button onClick={signOut} disabled={signingOut} aria-busy={signingOut}>{signingOut ? "Signing out…" : "Logout"}</Button>
    {signOutError && <p role="alert" className="text-sm text-destructive">{signOutError}</p>}
  </div>;
}
