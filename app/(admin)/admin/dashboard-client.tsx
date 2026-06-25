"use client";

import Link from "next/link";
import {
  HelpCircle,
  Flag,
  Users,
  Calendar,
  Settings,
  Plus,
  Upload,
  FileText,
  ArrowRight,
} from "lucide-react";
import { MathText } from "@/components/MathText";

interface DashboardStats {
  totalQuestions: number;
  pendingReports: number;
  totalUsers: number;
  todayQuestions: number;
  recentReports: {
    id: string;
    type: string;
    status: string;
    createdAt: string;
    questionText: string | null;
  }[];
}

const QUICK_ACTIONS = [
  { href: "/admin/questions/new", label: "Add Question", icon: Plus, desc: "Create a new question" },
  { href: "/admin/questions/import", label: "Bulk Import", icon: Upload, desc: "Import via CSV" },
  { href: "/admin/reports", label: "Review Reports", icon: Flag, desc: "Pending reports" },
  { href: "/admin/daily", label: "Daily Question", icon: Calendar, desc: "Set today's question" },
];

const SECTION_CARDS = [
  { href: "/admin/questions", label: "Questions", icon: HelpCircle, desc: "Manage question bank", countKey: "totalQuestions" as const, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
  { href: "/admin/reports", label: "Reports", icon: Flag, desc: "Review flagged issues", countKey: "pendingReports" as const, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" },
  { href: "/admin/users", label: "Users", icon: Users, desc: "View registered users", countKey: "totalUsers" as const, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
  { href: "/admin/daily", label: "Daily", icon: Calendar, desc: "Manage daily questions", countKey: "todayQuestions" as const, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/20" },
];

export function AdminDashboardClient({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview and quick access to all admin tools
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Questions</span>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalQuestions}</p>
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Reports</span>
            <Flag className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats.pendingReports}</p>
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Users</span>
            <Users className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Today&apos;s Questions</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats.todayQuestions}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="border rounded-xl p-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section Cards */}
      <div>
        <h2 className="font-semibold text-sm mb-3">Manage</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SECTION_CARDS.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.href}
                href={section.href}
                className="border rounded-xl p-4 hover:bg-muted/30 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`h-4 w-4 ${section.color}`} />
                </div>
                <p className="text-sm font-medium">{section.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.desc}</p>
                <p className="text-lg font-bold mt-2">{stats[section.countKey]}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Recent Reports</h2>
          <Link href="/admin/reports" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {stats.recentReports.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No reports yet
          </div>
        ) : (
          <div className="divide-y">
            {stats.recentReports.map((report) => (
              <Link
                key={report.id}
                href={`/admin/reports/${report.id}`}
                className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {report.questionText ? <MathText text={report.questionText} /> : "Unknown question"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {report.type.replace(/_/g, " ")} &middot;{" "}
                    {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-3 ${
                  report.status === "pending"
                    ? "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600"
                    : report.status === "resolved"
                    ? "bg-green-50 dark:bg-green-950/30 text-green-600"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-600"
                }`}>
                  {report.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
