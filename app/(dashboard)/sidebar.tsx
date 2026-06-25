"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  LayoutDashboard,
  PlaySquare,
  ClipboardList,
  BarChart3,
  Bookmark,
  User,
  LogOut,
  GraduationCap,
  Users,
  CalendarCheck,
  BookOpen,
  Menu,
  X,
  ChevronRight,
  Shield,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily", icon: CalendarCheck },
  { href: "/revision", label: "Revision", icon: BookOpen },
  { href: "/test/select", label: "Start Test", icon: PlaySquare },
  { href: "/recent-tests", label: "Recent Tests", icon: ClipboardList },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
];

const TAB_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily", label: "Daily", icon: CalendarCheck },
  { href: "/test/select", label: "Test", icon: PlaySquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const drawerItems = NAV_ITEMS.filter(
    (item) => !TAB_ITEMS.some((tab) => tab.href === item.href)
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:border-r lg:bg-card h-screen sticky top-0">
        <div className="p-5 border-b">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <GraduationCap className="h-6 w-6 text-primary" />
            TGPSC Prep
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {userRole === "admin" && (
            <>
              <div className="pt-3 pb-1">
                <div className="h-px bg-border" />
              </div>
              <div className="px-3 pb-1 pt-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium truncate">{userName}</span>
          </div>
          <div className="flex items-center justify-between">
            <ThemeSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile: backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile: drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-background border-r shadow-2xl transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-lg"
              onClick={() => setDrawerOpen(false)}
            >
              <GraduationCap className="h-6 w-6 text-primary" />
              TGPSC Prep
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-4 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userRole}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
            {drawerItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <ChevronRight
                    className={`h-4 w-4 ml-auto transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </Link>
              );
            })}

            {userRole === "admin" && (
              <>
                <div className="pt-2 pb-0.5">
                  <div className="h-px bg-border" />
                </div>
                <Link
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </Link>
              </>
            )}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">Appearance</span>
              <ThemeSwitcher />
            </div>
            <Button
              variant="outline"
              className="w-full gap-2 text-muted-foreground"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile: bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-around h-16 px-1">
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-0 max-w-[72px] ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-full transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="truncate w-full text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors min-w-0 max-w-[72px] text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center justify-center h-7 w-7 rounded-full">
              <Menu className="h-5 w-5" />
            </div>
            <span className="truncate w-full text-center leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
