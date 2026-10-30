"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSignOut() {
  const inFlight = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const signOut = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      // Start a fresh document so protected routes aren't kept in router memory.
      window.location.replace("/auth/login");
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      inFlight.current = false;
      setSigningOut(false);
    }
  };

  return { signOut, signingOut, signOutError };
}
