"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast-provider";
import {
  Award,
  Trophy,
  TrendingUp,
  Zap,
  Plus,
  Pencil,
  Power,
  PowerOff,
  X,
  Loader2,
  Check,
  Trash2,
  BarChart3,
  Users,
  Gauge,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon_emoji: string;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
  slug: string;
  is_active: boolean;
  earned_count: number;
  created_at: string;
}

interface LevelThreshold {
  level: number;
  name: string;
  xp_required: number;
}

interface XpRule {
  id: string;
  event_key: string;
  label: string;
  description: string | null;
  amount: number;
}

interface BadgeStats {
  mostEarned: { name: string; count: number };
  rarest: { name: string; count: number };
  totalXpViaBadges: number;
}

// ─── Condition Type Labels ───────────────────────────────────────

const CONDITION_LABELS: Record<string, string> = {
  streak_days: "Streak Days",
  questions_correct: "Questions Correct",
  tests_completed: "Tests Completed",
  daily_questions: "Daily Questions",
  perfect_scores: "Perfect Scores",
  all_subjects_mastered: "All Subjects Mastered",
};

// ─── Emoji Picker Data ───────────────────────────────────────────

const EMOJI_LIST = [
  "🔥", "💪", "🏆", "⭐", "🌟", "✨", "🎯", "🎖️", "🏅", "🥇",
  "🥈", "🥉", "💎", "👑", "🌙", "☀️", "⚡", "🌈", "🎨", "🎵",
  "📚", "✏️", "🧠", "🎓", "📖", "🔬", "💡", "🔧", "🛠️", "⚙️",
  "🚀", "💯", "🎉", "🎊", "🏁", "🎸", "🎮", "🏀", "⚽", "🏈",
  "🦅", "🦁", "🐉", "🦋", "🌺", "🍀", "💫", "🎪", "🎭", "🎯",
];

// ─── Emoji Picker Component ──────────────────────────────────────

function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-lg border border-input bg-background text-2xl flex items-center justify-center hover:bg-accent transition-colors"
      >
        {value}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-popover border rounded-xl shadow-xl p-3 w-72">
          <div className="grid grid-cols-10 gap-1">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onChange(emoji); setOpen(false); }}
                className={`w-6 h-6 text-sm flex items-center justify-center rounded hover:bg-accent transition-colors ${
                  value === emoji ? "bg-accent ring-1 ring-ring" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

interface BadgesClientProps {
  initialBadges: BadgeDefinition[];
  initialThresholds: LevelThreshold[];
  initialXpRules: XpRule[];
}

export function BadgesClient({ initialBadges, initialThresholds, initialXpRules }: BadgesClientProps) {
  const { toast } = useToast();
  // ── Active section tab ──
  const [section, setSection] = useState<"badges" | "levels" | "rules">("badges");

  // ── Badges state ──
  const [badges, setBadges] = useState<BadgeDefinition[]>(initialBadges);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [badgeModal, setBadgeModal] = useState<{ mode: "add" | "edit"; data: Partial<BadgeDefinition> } | null>(null);
  const [savingBadge, setSavingBadge] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // ── Level thresholds state ──
  const [thresholds, setThresholds] = useState<LevelThreshold[]>(initialThresholds);
  const [editingThreshold, setEditingThreshold] = useState<number | null>(null);
  const [thresholdForm, setThresholdForm] = useState<Partial<LevelThreshold>>({});
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [levelsPreview, setLevelsPreview] = useState<string>("");

  // ── XP rules state ──
  const [xpRules, setXpRules] = useState<XpRule[]>(initialXpRules);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleEditValue, setRuleEditValue] = useState<number>(0);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesChanged, setRulesChanged] = useState(false);
  const [localRuleAmounts, setLocalRuleAmounts] = useState<Record<string, number>>({});
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);

  // ── Data fetching ──
  const fetchBadges = useCallback(async () => {
    setLoadingBadges(true);
    try {
      const res = await fetch("/api/admin/badges/definitions");
      if (res.ok) setBadges(await res.json());
    } finally { setLoadingBadges(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/badges/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchThresholds = useCallback(async () => {
    setLoadingLevels(true);
    try {
      const res = await fetch("/api/admin/xp/thresholds");
      if (res.ok) setThresholds(await res.json());
    } finally { setLoadingLevels(false); }
  }, []);

  const fetchXpRules = useCallback(async () => {
    setLoadingRules(true);
    try {
      const res = await fetch("/api/admin/xp-rules");
      if (res.ok) {
        const data = await res.json();
        setXpRules(data);
        const amounts: Record<string, number> = {};
        data.forEach((r: XpRule) => { amounts[r.id] = r.amount; });
        setLocalRuleAmounts(amounts);
      }
    } finally { setLoadingRules(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Level preview calculation ──
  useEffect(() => {
    async function calcPreview() {
      try {
        const [xpRes, usersRes] = await Promise.all([
          fetch("/api/xp/level"),
          fetch("/api/admin/users?limit=1"),
        ]);
        // Use the thresholds to make a simple estimate
        const avgXpPerUser = 0;
        if (thresholds.length > 2) {
          const l2 = thresholds[2]; // Level 2 (index 2 = AEE)
          const l3 = thresholds[3]; // Level 3 (Senior AEE)
          if (l2 && l3) {
            const gap = l3.xp_required - l2.xp_required;
            // Rough estimate: if avg user earns ~25 XP/day (1 daily question + some tests)
            const estDays = Math.ceil(gap / 35);
            setLevelsPreview(`At ~35 XP/day average, a user reaches ${l3.name} (Level ${l3.level}) in ~${estDays} days after ${l2.name} (Level ${l2.level})`);
          } else {
            setLevelsPreview("");
          }
        }
      } catch { setLevelsPreview(""); }
    }
    calcPreview();
  }, [thresholds]);

  // ── Badge CRUD handlers ──

  const openAddBadge = () => {
    setBadgeModal({
      mode: "add",
      data: {
        name: "",
        description: "",
        icon_emoji: "🏆",
        condition_type: "streak_days",
        condition_value: 0,
        xp_reward: 0,
        slug: "",
        is_active: true,
      },
    });
  };

  const openEditBadge = (badge: BadgeDefinition) => {
    setBadgeModal({ mode: "edit", data: { ...badge } });
  };

  const handleSaveBadge = async () => {
    if (!badgeModal) return;
    setSavingBadge(true);
    try {
      const { data } = badgeModal;
      if (badgeModal.mode === "add") {
        const res = await fetch("/api/admin/badges/definitions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setBadgeModal(null);
          fetchBadges();
          fetchStats();
        } else {
          const err = await res.json();
          toast(err.error || "Failed to create badge", "error");
        }
      } else {
        const res = await fetch(`/api/admin/badges/definitions/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            icon_emoji: data.icon_emoji,
            condition_type: data.condition_type,
            condition_value: data.condition_value,
            xp_reward: data.xp_reward,
            is_active: data.is_active,
          }),
        });
        if (res.ok) {
          setBadgeModal(null);
          fetchBadges();
          fetchStats();
        } else {
          const err = await res.json();
          toast(err.error || "Failed to update badge", "error");
        }
      }
    } finally { setSavingBadge(false); }
  };

  const handleToggleActive = async (badge: BadgeDefinition) => {
    const res = await fetch(`/api/admin/badges/definitions/${badge.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !badge.is_active }),
    });
    if (res.ok) fetchBadges();
  };

  const handleDeleteBadge = async (id: string) => {
    const res = await fetch(`/api/admin/badges/definitions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeleteConfirmId(null);
      fetchBadges();
      fetchStats();
    }
  };

  // ── Level threshold handlers ──

  const startEditThreshold = (t: LevelThreshold) => {
    setEditingThreshold(t.level);
    setThresholdForm({ ...t });
  };

  const handleThresholdFieldChange = (field: string, value: string | number) => {
    setThresholdForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveThreshold = async () => {
    if (thresholdForm.level === undefined) return;
    setSavingThresholds(true);
    try {
      const res = await fetch("/api/admin/xp/thresholds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds: [thresholdForm] }),
      });
      if (res.ok) {
        setEditingThreshold(null);
        fetchThresholds();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to save threshold", "error");
      }
    } finally { setSavingThresholds(false); }
  };

  // ── XP rule handlers ──

  const startEditRule = (rule: XpRule) => {
    setEditingRule(rule.id);
    setRuleEditValue(localRuleAmounts[rule.id] ?? rule.amount);
  };

  const handleRuleAmountChange = (id: string, amount: number) => {
    setLocalRuleAmounts((prev) => ({ ...prev, [id]: amount }));
    setRulesChanged(true);
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const rules = Object.entries(localRuleAmounts).map(([id, amount]) => ({ id, amount }));
      const res = await fetch("/api/admin/xp-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      if (res.ok) {
        setRulesChanged(false);
        setEditingRule(null);
        fetchXpRules();
      } else {
        const err = await res.json();
        toast(err.error || "Failed to save XP rules", "error");
      }
    } finally { setSavingRules(false); }
  };

  // ── Condition type display ──
  const formatCondition = (badge: BadgeDefinition) => {
    const label = CONDITION_LABELS[badge.condition_type] || badge.condition_type;
    return `${badge.condition_value} ${label}`;
  };

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Badges &amp; XP</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage badges, level thresholds, and XP reward rules</p>
      </div>

      {/* ─── Section Tabs ─── */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {[
          { key: "badges" as const, label: "Badges", icon: Award },
          { key: "levels" as const, label: "Level Thresholds", icon: BarChart3 },
          { key: "rules" as const, label: "XP Rules", icon: Gauge },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSection(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1: BADGES
          ════════════════════════════════════════════════════════════ */}
      {section === "badges" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Most Earned</span>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xl font-bold mt-1">{stats?.mostEarned?.name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats?.mostEarned?.count || 0} earned</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Rarest Badge</span>
                <Award className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold mt-1">{stats?.rarest?.name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats?.rarest?.count || 0} earned</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total XP via Badges</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xl font-bold mt-1">{(stats?.totalXpViaBadges || 0).toLocaleString()}</p>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active Badges</span>
                <Zap className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xl font-bold mt-1">{badges.filter((b) => b.is_active).length}/{badges.length}</p>
            </div>
          </div>

          {/* Add Badge Button */}
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddBadge}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add New Badge
            </Button>
          </div>

          {/* Badge Definitions Table */}
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-10">Icon</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden md:table-cell">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Condition</th>
                    <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">XP Reward</th>
                    <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Earned</th>
                    <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Active</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBadges ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
                  ) : badges.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No badges defined yet. <button onClick={openAddBadge} className="text-primary underline underline-offset-2">Add your first badge</button>
                    </td></tr>
                  ) : (
                    badges.map((badge) => (
                      <tr key={badge.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xl">{badge.icon_emoji}</td>
                        <td className="px-4 py-3 font-medium">{badge.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-[200px]">
                          <span className="line-clamp-1">{badge.description}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{formatCondition(badge)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 text-xs font-medium">
                            +{badge.xp_reward}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <span className="text-sm">{badge.earned_count}</span>
                        </td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <button
                            onClick={() => handleToggleActive(badge)}
                            className={`p-1.5 rounded-md transition-colors ${
                              badge.is_active ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20" : "text-muted-foreground hover:bg-muted"
                            }`}
                            title={badge.is_active ? "Deactivate" : "Activate"}
                          >
                            {badge.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditBadge(badge)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(badge.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add/Edit Badge Modal */}
          {badgeModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-16">
              <div className="fixed inset-0 bg-black/60" onClick={() => setBadgeModal(null)} />
              <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                  <h2 className="font-semibold">{badgeModal.mode === "add" ? "Add New Badge" : "Edit Badge"}</h2>
                  <button onClick={() => setBadgeModal(null)} className="p-1 rounded-md hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-6 space-y-5">
                  {/* Icon */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Icon</label>
                    <EmojiPicker
                      value={badgeModal.data.icon_emoji || "🏆"}
                      onChange={(emoji) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, icon_emoji: emoji } })}
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Name</label>
                    <Input
                      value={badgeModal.data.name || ""}
                      onChange={(e) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, name: e.target.value } })}
                      placeholder="e.g. Quiz Master"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Description</label>
                    <textarea
                      value={badgeModal.data.description || ""}
                      onChange={(e) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, description: e.target.value } })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
                      placeholder="Describe how to earn this badge"
                    />
                  </div>

                  {/* XP Reward */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">XP Reward</label>
                    <Input
                      type="number"
                      min={0}
                      value={badgeModal.data.xp_reward ?? 0}
                      onChange={(e) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, xp_reward: parseInt(e.target.value) || 0 } })}
                    />
                  </div>

                  {/* Condition Type */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Condition Type</label>
                    <select
                      value={badgeModal.data.condition_type || "streak_days"}
                      onChange={(e) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, condition_type: e.target.value } })}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition Value */}
                  <div>
                    <label className="text-xs font-medium mb-1.5 block">Condition Value</label>
                    <Input
                      type="number"
                      min={0}
                      value={badgeModal.data.condition_value ?? 0}
                      onChange={(e) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, condition_value: parseInt(e.target.value) || 0 } })}
                      placeholder="e.g. 7 for 7-day streak"
                    />
                  </div>

                  {/* Slug (only for new badges) */}
                  {badgeModal.mode === "add" && (
                    <div>
                      <label className="text-xs font-medium mb-1.5 block">Slug (identifier)</label>
                      <Input
                        value={badgeModal.data.slug || ""}
                        onChange={(e) => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") } })}
                        placeholder="e.g. quiz_master"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Used internally. Lowercase letters, numbers, underscores only.</p>
                    </div>
                  )}

                  {/* Active Toggle */}
                  {badgeModal.mode === "edit" && (
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium">Active</label>
                      <button
                        onClick={() => setBadgeModal({ ...badgeModal, data: { ...badgeModal.data, is_active: !badgeModal.data.is_active } })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          badgeModal.data.is_active ? "bg-green-500" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                          badgeModal.data.is_active ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button onClick={handleSaveBadge} disabled={savingBadge || !badgeModal.data.name}>
                      {savingBadge && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      {badgeModal.mode === "add" ? "Create Badge" : "Save Changes"}
                    </Button>
                    <Button variant="ghost" onClick={() => setBadgeModal(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/60" onClick={() => setDeleteConfirmId(null)} />
              <div className="relative bg-background rounded-xl shadow-2xl border w-full max-w-sm mx-4 p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold">Delete Badge</h3>
                  <p className="text-sm text-muted-foreground mt-1">This will remove the badge definition. Existing user badges are not affected.</p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => handleDeleteBadge(deleteConfirmId)}>Delete</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 2: LEVEL THRESHOLDS
          ════════════════════════════════════════════════════════════ */}
      {section === "levels" && (
        <div className="space-y-6">
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold text-sm">XP Level Thresholds</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground w-16">Level</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">XP Required</th>
                    <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLevels ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
                  ) : thresholds.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No thresholds configured</td></tr>
                  ) : (
                    thresholds.map((t) => (
                      <tr key={t.level} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">Level {t.level}</td>
                        {editingThreshold === t.level ? (
                          <>
                            <td className="px-4 py-3">
                              <Input
                                value={thresholdForm.name || ""}
                                onChange={(e) => handleThresholdFieldChange("name", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min={0}
                                value={thresholdForm.xp_required ?? 0}
                                onChange={(e) => handleThresholdFieldChange("xp_required", parseInt(e.target.value) || 0)}
                                className="h-8 text-sm w-28"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={saveThreshold} disabled={savingThresholds} className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-950/20 text-green-600">
                                  {savingThresholds ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </button>
                                <button onClick={() => setEditingThreshold(null)} className="p-1.5 rounded-md hover:bg-muted">
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-medium">{t.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <span className="font-mono">{t.xp_required.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => startEditThreshold(t)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Edit">
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Level Preview Card */}
          {levelsPreview && (
            <div className="border rounded-xl p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progression Preview</span>
              </div>
              <p className="text-sm text-muted-foreground">{levelsPreview}</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 3: XP RULES
          ════════════════════════════════════════════════════════════ */}
      {section === "rules" && (
        <div className="space-y-6">
          <div className="border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold text-sm">XP Reward Rules</h2>
              {rulesChanged && (
                <Button size="sm" onClick={saveRules} disabled={savingRules}>
                  {savingRules && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Save Changes
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground hidden sm:table-cell">Description</th>
                    <th className="text-center px-4 py-3 font-medium text-xs text-muted-foreground">XP Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRules ? (
                    <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
                  ) : xpRules.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">No XP rules configured</td></tr>
                  ) : (
                    xpRules.map((rule) => (
                      <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.label}</span>
                            <span className="text-[10px] text-muted-foreground font-mono hidden lg:inline">({rule.event_key})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{rule.description || "—"}</td>
                        {editingRule === rule.id ? (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={ruleEditValue}
                                onChange={(e) => setRuleEditValue(parseInt(e.target.value) || 0)}
                                className="h-8 text-sm w-20 text-center"
                              />
                              <button
                                onClick={() => { handleRuleAmountChange(rule.id, ruleEditValue); setEditingRule(null); }}
                                className="p-1 rounded-md hover:bg-green-50 dark:hover:bg-green-950/20 text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={() => setEditingRule(null)} className="p-1 rounded-md hover:bg-muted">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </div>
                          </td>
                        ) : (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => startEditRule(rule)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-md hover:bg-accent transition-colors group"
                            >
                              <span className="font-mono font-medium">{localRuleAmounts[rule.id] ?? rule.amount}</span>
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">XP</span>
                              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
