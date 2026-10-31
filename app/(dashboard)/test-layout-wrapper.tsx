"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function TestLayoutWrapper({
  children,
  header,
  sidebar,
}: {
  children: ReactNode;
  header: ReactNode;
  sidebar: ReactNode;
}) {
  const pathname = usePathname();
  const isTestScreen = /^\/test\/[a-f0-9-]+/.test(pathname);

  return (
    <>
      {!isTestScreen && sidebar}
      <div className={`flex-1 min-w-0 flex flex-col ${isTestScreen ? "h-dvh min-h-0 overflow-hidden" : "min-h-screen"}`}>
        {!isTestScreen && header}
        <main className={`flex-1 min-w-0 ${isTestScreen ? "" : "pb-16 lg:pb-0"} flex flex-col min-h-0`}>
          {children}
        </main>
      </div>
    </>
  );
}
