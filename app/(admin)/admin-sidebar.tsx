"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Flag,
  HelpCircle,
  Users,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  BookOpen,
  Network,
  Award,
  Bell,
  TrendingUp,
  Megaphone,
  ClipboardList,
  MessageSquare,
  FileDown,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reports", label: "Question Reports", icon: Flag },
  {
    href: "/admin/questions",
    label: "Questions Manager",
    icon: HelpCircle,
    sub: [
      { href: "/admin/questions", label: "All Questions" },
      { href: "/admin/questions/new", label: "Add New" },
      { href: "/admin/questions/import", label: "Bulk Import" },
    ],
  },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/daily", label: "Daily Questions", icon: Calendar },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const SECONDARY_ITEMS = [
  { href: "/admin/exams", label: "Exams", icon: BookOpen },
  { href: "/admin/concept-map", label: "Concept Map", icon: Network },
  { href: "/admin/badges", label: "Badges & XP", icon: Award },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/exports", label: "Exports", icon: FileDown },
];

interface AdminSidebarProps {
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ userName, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if ("sub" in item && isActive(item.href)) {
        setExpandedItems((prev) => [...prev, item.href]);
      }
    });
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const sidebarContent = (
    <>
      <div className="p-3 border-b flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2" onClick={handleNavClick}>
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            A
          </div>
          <span className="font-bold text-sm">Admin Panel</span>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-md hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const hasSub = "sub" in item;
          const isParentActive = hasSub && isActive(item.href);
          const isExpanded = expandedItems.includes(item.href);

          return (
            <div key={item.href} className="space-y-0.5">
              {hasSub ? (
                <button
                  onClick={() => toggleExpand(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active && !isParentActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active && !isParentActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )}
              {hasSub && isExpanded && (
                <div className="ml-3 pl-3 border-l space-y-0.5">
                  {(item as any).sub.map((sub: { href: string; label: string }) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={handleNavClick}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        pathname === sub.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="pt-2 pb-0.5">
          <p className="px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tools</p>
        </div>
        {SECONDARY_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground text-xs"
          asChild
        >
          <Link href="/dashboard" onClick={handleNavClick}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to App
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-card h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <div className="relative w-72 bg-background border-r shadow-2xl flex flex-col h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
