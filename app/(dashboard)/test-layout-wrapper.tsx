"use client";

import { usePathname } from "next/navigation";

export function TestLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTestScreen = pathname.startsWith("/test/");

  return (
    <div className={isTestScreen ? "!pb-0" : ""}>
      {children}
    </div>
  );
}
