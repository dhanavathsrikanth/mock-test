"use client";

import { usePathname } from "next/navigation";

export function TestLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTestScreen = /^\/test\/[a-f0-9-]+/.test(pathname);

  return (
    <div className={`flex-1 min-w-0 flex flex-col ${isTestScreen ? "!pb-0" : ""}`}>
      {children}
    </div>
  );
}
