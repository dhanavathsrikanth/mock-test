"use client";

import { redirect, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminSidebar } from "./admin-sidebar";
import { useEffect, useState } from "react";
import { Menu, Bell, Search } from "lucide-react";
import Link from "next/link";

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/reports": "Question Reports",
  "/admin/questions": "Questions Manager",
  "/admin/questions/new": "Add New Question",
  "/admin/questions/import": "Bulk Import",
  "/admin/users": "Users",
  "/admin/daily": "Daily Questions",
  "/admin/settings": "Settings",
  "/admin/exams": "Exams",
  "/admin/concept-map": "Concept Map",
  "/admin/badges": "Badges & XP",
  "/admin/notifications": "Notifications",
  "/admin/analytics": "Analytics",
  "/admin/announcements": "Announcements",
  "/admin/audit": "Audit Log",
  "/admin/feedback": "Feedback",
  "/admin/exports": "Exports",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        redirect("/auth/login");
        return;
      }
      supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.role !== "admin") {
            redirect("/dashboard");
            return;
          }
          setUserName(profile.full_name || "Admin");
        });
    });
  }, []);

  const getPageTitle = () => {
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (pathname === path) return title;
    }
    if (pathname.startsWith("/admin/questions/")) return "Question Details";
    if (pathname.startsWith("/admin/reports/")) return "Report Details";
    if (pathname.startsWith("/admin/users/")) return "User Details";
    if (pathname.startsWith("/admin/exams/")) return "Exam Details";
    return "Admin";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 border-b bg-card px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              A
            </div>
            <span className="font-semibold text-sm">{getPageTitle()}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/notifications"
            className="p-1.5 rounded-md hover:bg-muted relative"
          >
            <Bell className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Sidebar */}
      <AdminSidebar
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="px-3 sm:px-4 py-2 lg:py-4">
          {children}
        </div>
      </main>
    </div>
  );
}
