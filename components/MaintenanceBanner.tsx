"use client";

import { WifiOff, X } from "lucide-react";
import { useState } from "react";

export function MaintenanceBanner({
  isMaintenanceMode,
  isAdmin,
}: {
  isMaintenanceMode: boolean;
  isAdmin: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (!isMaintenanceMode || isAdmin || dismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          <strong>Scheduled maintenance in progress.</strong> Some features may be temporarily unavailable.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-600/60 hover:text-amber-700 dark:text-amber-400/60 dark:hover:text-amber-400"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
