"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  User as UserIcon,
  Activity,
  TrendingUp,
  Zap,
  Download,
  Ban,
  Bell,
  CheckSquare,
  Square,
} from "lucide-react";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  xp: number;
  role: string;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  avgStreak: number;
  totalSessions: number;
}

export function UsersClient({ users, stats }: { users: UserRow[]; stats: Stats }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 25;

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / limit);
  const paged = filtered.slice((page - 1) * limit, page * limit);

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map((u) => u.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{stats.totalUsers} total users</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            <UserIcon className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold mt-1">{stats.totalUsers}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Today</span>
            <Activity className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xl font-bold mt-1">{stats.activeToday}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">New This Week</span>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold mt-1">{stats.newThisWeek}</p>
        </div>
        <div className="border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Avg Streak</span>
            <Zap className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-xl font-bold mt-1">{stats.avgStreak} days</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-muted-foreground mr-1">{selected.size} selected</span>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Bell className="h-3.5 w-3.5" /> Notify
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
              <Ban className="h-3.5 w-3.5" /> Ban
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 px-3 py-3">
                  <button onClick={toggleAll} className="flex items-center justify-center w-full">
                    {selected.size === paged.length && paged.length > 0
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </th>
                <th className="text-left px-3 py-3 font-medium text-xs text-muted-foreground">Name</th>
                <th className="text-left px-3 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Email</th>
                <th className="text-center px-3 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Role</th>
                <th className="text-right px-3 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">XP</th>
                <th className="text-left px-3 py-3 font-medium text-xs text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="text-right px-3 py-3 font-medium text-xs text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-3">
                    <button onClick={() => toggle(u.id)} className="flex items-center justify-center w-full">
                      {selected.has(u.id)
                        ? <CheckSquare className="h-4 w-4 text-primary" />
                        : <Square className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold shrink-0">
                        {u.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[160px]">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{u.email}</td>
                  <td className="px-3 py-3 text-center hidden md:table-cell">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">User</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground hidden md:table-cell">{u.xp.toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                      <Link href={`/admin/users/${u.id}`}>
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
