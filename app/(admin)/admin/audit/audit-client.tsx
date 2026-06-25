"use client";

import { useState, useMemo } from "react";
import {
  Search, Shield, Users, Activity, Clock, ChevronDown, ChevronUp,
  Filter, Download, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogEntry = {
  id: string; action: string; entityType: string; entityId: string;
  userId: string; performerName: string; performerEmail: string;
  metadata: any; ipAddress: string; createdAt: string;
};

type AdminInfo = { id: string; name: string };

export function AuditClient({
  logs, actionTypes, admins, uniqueUsers,
}: {
  logs: LogEntry[]; actionTypes: string[]; admins: AdminInfo[]; uniqueUsers: number;
}) {
  const [search, setSearch] = useState("");
  const [adminFilter, setAdminFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (adminFilter !== "all" && l.userId !== adminFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (dateFrom && new Date(l.createdAt) < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        if (new Date(l.createdAt) > end) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.action.toLowerCase().includes(q) ||
          l.entityType?.toLowerCase().includes(q) ||
          l.entityId?.toLowerCase().includes(q) ||
          l.performerName.toLowerCase().includes(q) ||
          l.performerEmail.toLowerCase().includes(q) ||
          JSON.stringify(l.metadata)?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, adminFilter, actionFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setAdminFilter("all"); setActionFilter("all");
    setDateFrom(""); setDateTo(""); setSearch("");
  };
  const hasFilters = adminFilter !== "all" || actionFilter !== "all" || dateFrom || dateTo || search;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const headers = ["Action", "Admin", "Email", "Entity Type", "Entity ID", "IP Address", "Timestamp", "Changes"];
    const rows = filtered.map((l) => [
      l.action, l.performerName, l.performerEmail,
      l.entityType || "", l.entityId || "", l.ipAddress || "",
      new Date(l.createdAt).toISOString(),
      JSON.stringify(l.metadata?.changes || l.metadata || {}),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Timeline of all admin actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-xl p-4">
          <Activity className="h-4 w-4 text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Total Actions</p>
        </div>
        <div className="border rounded-xl p-4">
          <Users className="h-4 w-4 text-purple-500 mb-1" />
          <p className="text-2xl font-bold">{uniqueUsers}</p>
          <p className="text-xs text-muted-foreground">Admins Active</p>
        </div>
        <div className="border rounded-xl p-4">
          <Shield className="h-4 w-4 text-green-500 mb-1" />
          <p className="text-2xl font-bold">{actionTypes.length}</p>
          <p className="text-xs text-muted-foreground">Action Types</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-muted-foreground" />Filters
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1">
              <X className="h-3 w-3" />Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Admin</label>
            <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)}
              className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2">
              <option value="all">All Admins</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Action</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
              className="w-full mt-1 h-8 text-xs rounded-md border border-input bg-background px-2">
              <option value="all">All Actions</option>
              {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">From</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 h-8 text-xs" />
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit log..." className="pl-8 h-8 text-xs" />
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Showing {filtered.length} of {logs.length} entries
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {filtered.map((l) => (
          <AuditTimelineEntry
            key={l.id}
            entry={l}
            expanded={expanded.has(l.id)}
            onToggle={() => toggleExpand(l.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="border rounded-xl p-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">No audit entries found</p>
            {hasFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditTimelineEntry({
  entry, expanded, onToggle,
}: {
  entry: LogEntry; expanded: boolean; onToggle: () => void;
}) {
  const timeline = formatTimeline(entry.createdAt);
  const initial = entry.performerName?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="border rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{entry.performerName}</span>
            <ActionBadge action={entry.action} />
            <span className="text-xs text-muted-foreground">{entry.entityType}</span>
            {entry.entityId && (
              <span className="text-[10px] text-muted-foreground font-mono">#{entry.entityId}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{describeAction(entry)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeline}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
      {expanded && <DiffViewer metadata={entry.metadata} entityType={entry.entityType} entityId={entry.entityId} ipAddress={entry.ipAddress} createdAt={entry.createdAt} />}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const color =
    action?.includes("delete") || action?.includes("ban") || action?.includes("remove")
      ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
      : action?.includes("create") || action?.includes("add") || action?.includes("insert")
        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
        : action?.includes("update") || action?.includes("edit") || action?.includes("change")
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
  return <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>{action}</span>;
}

function DiffViewer({
  metadata, entityType, entityId, ipAddress, createdAt,
}: {
  metadata: any; entityType: string; entityId: string; ipAddress: string; createdAt: string;
}) {
  const changes = metadata?.changes || metadata?.diff || metadata;
  const hasChanges = changes && typeof changes === "object" && Object.keys(changes).length > 0;

  return (
    <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        {entityType && <span>Entity: {entityType}</span>}
        {entityId && <span>Record: #{entityId}</span>}
        {ipAddress && <span>IP: {ipAddress}</span>}
        <span><Clock className="h-3 w-3 inline mr-0.5" />{new Date(createdAt).toLocaleString()}</span>
      </div>

      {hasChanges ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Changes</p>
          <div className="border rounded-lg overflow-hidden text-xs font-mono">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Field</th>
                  <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">Old Value</th>
                  <th className="text-left px-3 py-1.5 text-[10px] text-muted-foreground font-medium">New Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(changes).map(([field, vals]: [string, any]) => {
                  const oldVal = vals?.old ?? vals?.previous ?? vals?.from ?? "—";
                  const newVal = vals?.new ?? vals?.current ?? vals?.to ?? "—";
                  return (
                    <tr key={field} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{field}</td>
                      <td className="px-3 py-1.5 text-red-600 dark:text-red-400">
                        {formatValue(oldVal)}
                      </td>
                      <td className="px-3 py-1.5 text-green-600 dark:text-green-400">
                        {formatValue(newVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <pre className="text-xs whitespace-pre-wrap break-all max-h-40 overflow-y-auto text-muted-foreground">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function describeAction(entry: LogEntry): string {
  const a = entry.action?.toLowerCase() || "";
  if (a.includes("update") || a.includes("edit")) return `Modified ${entry.entityType || "record"}${entry.entityId ? ` #${entry.entityId}` : ""}`;
  if (a.includes("create") || a.includes("insert") || a.includes("add")) return `Created new ${entry.entityType || "record"}${entry.entityId ? ` #${entry.entityId}` : ""}`;
  if (a.includes("delete") || a.includes("remove")) return `Deleted ${entry.entityType || "record"}${entry.entityId ? ` #${entry.entityId}` : ""}`;
  if (a.includes("ban")) return `Banned user${entry.entityId ? ` #${entry.entityId}` : ""}`;
  return `${entry.action} on ${entry.entityType || "unknown"}${entry.entityId ? ` #${entry.entityId}` : ""}`;
}

function formatTimeline(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}
