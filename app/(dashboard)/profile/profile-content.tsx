"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { NotificationPreferencesPanel } from "@/components/notifications/NotificationPreferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  User,
  Mail,
  Save,
  Trash2,
  AlertTriangle,
  LogOut,
  Shield,
  Target,
  Camera,
  X,
  Upload,
  Zap,
  Trophy,
  Star,
  Flame,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  xp: number;
  target_exam_id?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
}

interface Exam {
  id: string;
  name: string;
}

interface ProfileContentProps {
  profile: Profile | null;
  exams: Exam[];
  levelData: { total_xp: number; current_level: number; level_name: string } | null;
  xpTransactions: { id: string; amount: number; reason: string; created_at: string }[];
  badges: { id: string; badge_type: string; unlocked_at: string | null; streak_at_unlock: number | null }[];
  totalTests: number;
  totalBookmarks: number;
}

const XP_LEVELS = [
  { level: 0, name: "Trainee", xp: 0, icon: "🎓" },
  { level: 1, name: "Junior AEE", xp: 500, icon: "📘" },
  { level: 2, name: "AEE", xp: 1500, icon: "🔧" },
  { level: 3, name: "Senior AEE", xp: 3500, icon: "🏛️" },
  { level: 4, name: "Assistant Executive", xp: 7000, icon: "⚡" },
  { level: 5, name: "Executive Engineer", xp: 12000, icon: "🌟" },
  { level: 6, name: "Chief Engineer", xp: 20000, icon: "👑" },
];

const BADGE_DEFS: Record<string, { label: string; icon: string; description: string }> = {
  week_warrior: { label: "Week Warrior", icon: "🔥", description: "7-day practice streak" },
  iron_will: { label: "Iron Will", icon: "💪", description: "30-day practice streak" },
  first_test: { label: "First Steps", icon: "🎯", description: "Completed your first test" },
  perfect_score: { label: "Perfectionist", icon: "💯", description: "Scored 100% on a test" },
  bookworm: { label: "Bookworm", icon: "📚", description: "Bookmarked 10 questions" },
  centurion: { label: "Centurion", icon: "⚔️", description: "Answered 100 questions correctly" },
};

function UserAvatar({ userName, avatarUrl, className }: { userName: string; avatarUrl?: string | null; className?: string }) {
  const [imgError, setImgError] = useState(false);
  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={userName}
        className={`${className} object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${className} bg-primary/10 flex items-center justify-center text-2xl font-bold`}>
      {userName.charAt(0).toUpperCase()}
    </div>
  );
}

export function ProfileContent({ profile: serverProfile, exams, levelData, xpTransactions, badges, totalTests, totalBookmarks }: ProfileContentProps) {
  const router = useRouter();
  const getSupabase = () => createClient();
  const [profile, setProfile] = useState(serverProfile);
  const [fullName, setFullName] = useState(serverProfile?.full_name || "");
  const [targetExamId, setTargetExamId] = useState(serverProfile?.target_exam_id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Avatar states
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropSize, setCropSize] = useState(200);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const userId = profile?.id;

  useEffect(() => {
    if (!profile) {
      getSupabase().auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        getSupabase().from("profiles").upsert(
          { id: user.id, full_name: user.email?.split("@")[0] || "User", email: user.email || "" }
        ).select().single().then(({ data }) => {
          if (data) {
            setProfile(data);
            setFullName(data.full_name || "");
            setTargetExamId(data.target_exam_id || "");
          }
        });
      });
    }
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const supabase = getSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        target_exam_id: targetExamId || null,
      })
      .eq("id", userId);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const handleClearHistory = async () => {
    setClearing(true);
    const supabase = getSupabase();
    await supabase
      .from("test_answers")
      .delete()
      .in(
        "session_id",
        (
          await supabase
            .from("test_sessions")
            .select("id")
            .eq("user_id", userId)
        ).data?.map((s) => s.id) || []
      );

    await supabase
      .from("test_sessions")
      .delete()
      .eq("user_id", userId);

    await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", userId);

    setClearing(false);
    setShowConfirm(false);
    router.refresh();
  };

  // ---- Avatar upload with crop ----
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropOffset({ x: 0, y: 0 });
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  }, [cropOffset]);

  const handleCropTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - cropOffset.x, y: touch.clientY - cropOffset.y });
  }, [cropOffset]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (clientX: number, clientY: number) => {
      setCropOffset({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onEnd = () => setIsDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, dragStart]);

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !imgRef.current || !userId) return;
    setAvatarUploading(true);

    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setAvatarUploading(false); return; }

    // Calculate the crop area from the displayed image
    const displayW = img.clientWidth;
    const displayH = img.clientHeight;
    const scaleX = img.naturalWidth / displayW;
    const scaleY = img.naturalHeight / displayH;

    const cx = (displayW / 2 + cropOffset.x) * scaleX;
    const cy = (displayH / 2 + cropOffset.y) * scaleY;
    const cr = (cropSize / 2) * Math.max(scaleX, scaleY);

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - cr, cy - cr, cr * 2, cr * 2, 0, 0, size, size);

    canvas.toBlob(async (blob) => {
      if (!blob) { setAvatarUploading(false); return; }
      const supabase = getSupabase();
      const filePath = `${userId}/avatar.png`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { contentType: "image/png", upsert: true });

      if (uploadError) {
        setAvatarUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
      setProfile((p) => p ? { ...p, avatar_url: avatarUrl } : p);
      setShowCropModal(false);
      setCropImageSrc(null);
      setAvatarUploading(false);
      router.refresh();
    }, "image/png");
  };

  const handleAvatarDelete = async () => {
    if (!userId) return;
    setAvatarUploading(true);
    const supabase = getSupabase();
    const filePath = `${userId}/avatar.png`;
    await supabase.storage.from("avatars").remove([filePath]);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    setProfile((p) => p ? { ...p, avatar_url: null } : p);
    setAvatarUploading(false);
    router.refresh();
  };

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings
          </p>
        </div>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved!</span>
        )}
      </div>

      {/* Avatar Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <UserAvatar
                userName={profile.full_name || "U"}
                avatarUrl={profile.avatar_url}
                className="w-24 h-24 rounded-full border-2 border-border"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-muted-foreground">Profile Photo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click the photo to change. JPG, PNG or WebP. Max 5MB.
              </p>
              <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {avatarUploading ? "Uploading..." : "Upload"}
                </Button>
                {profile.avatar_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarDelete}
                    disabled={avatarUploading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{profile.email}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-exam">Target Exam</Label>
            <select
              id="target-exam"
              suppressHydrationWarning
              value={targetExamId}
              onChange={(e) => setTargetExamId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select an exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* XP & Level Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{XP_LEVELS[levelData?.current_level || 0].icon}</div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Current Level</p>
              <h2 className="text-2xl font-bold">{levelData?.level_name || "Trainee"}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {levelData?.total_xp || 0} XP earned
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{levelData?.total_xp || 0}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>
          {/* Level Progress Bar */}
          {(() => {
            const currentLevel = levelData?.current_level || 0;
            const totalXp = levelData?.total_xp || 0;
            const current = XP_LEVELS[currentLevel];
            const next = XP_LEVELS[currentLevel + 1];
            if (!next) return null;
            const xpInLevel = totalXp - current.xp;
            const xpRequired = next.xp - current.xp;
            const progress = Math.min((xpInLevel / xpRequired) * 100, 100);
            return (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{current.name}</span>
                  <span>{next.name} ({next.xp - totalXp} XP to go)</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Zap className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
          <p className="text-2xl font-bold">{levelData?.total_xp || 0}</p>
          <p className="text-[10px] text-muted-foreground">Total XP</p>
        </Card>
        <Card className="p-4 text-center">
          <Trophy className="h-5 w-5 mx-auto text-purple-500 mb-1" />
          <p className="text-2xl font-bold">{totalTests}</p>
          <p className="text-[10px] text-muted-foreground">Tests Done</p>
        </Card>
        <Card className="p-4 text-center">
          <BookOpen className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{totalBookmarks}</p>
          <p className="text-[10px] text-muted-foreground">Bookmarks</p>
        </Card>
      </div>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-muted-foreground" />
            Badges ({badges.length}/{Object.keys(BADGE_DEFS).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.entries(BADGE_DEFS).map(([type, def]) => {
              const earned = badges.find((b) => b.badge_type === type);
              return (
                <div
                  key={type}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    earned
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                      : "border-muted bg-muted/20 opacity-40"
                  }`}
                >
                  <span className="text-2xl">{def.icon}</span>
                  <span className="text-[10px] font-semibold text-center leading-tight">{def.label}</span>
                  {earned ? (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Earned</span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground">🔒</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* XP History */}
      {xpTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              XP History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {xpTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${tx.amount > 0 ? "bg-green-100 dark:bg-green-950/30" : "bg-red-100 dark:bg-red-950/30"}`}>
                      {tx.amount > 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> : <TrendingUp className="h-3.5 w-3.5 text-red-600 rotate-180" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.reason}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Level Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-muted-foreground" />
            Level Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {XP_LEVELS.map((lvl) => {
              const isCurrentOrBelow = (levelData?.current_level || 0) >= lvl.level;
              const isCurrent = (levelData?.current_level || 0) === lvl.level;
              return (
                <div key={lvl.level} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrent ? "bg-primary/10 border border-primary/20" : ""}`}>
                  <span className="text-xl">{lvl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCurrentOrBelow ? "" : "text-muted-foreground"}`}>{lvl.name}</p>
                    <p className="text-[10px] text-muted-foreground">{lvl.xp} XP required</p>
                  </div>
                  {isCurrent && <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Current</span>}
                  {isCurrentOrBelow && !isCurrent && <span className="text-[10px] text-green-600">✓</span>}
                  {!isCurrentOrBelow && <span className="text-[10px] text-muted-foreground">🔒</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Account Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium capitalize">{profile.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member Since</span>
            <span className="font-medium">{new Date(profile.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeSwitcher />
          </div>
        </CardContent>
      </Card>

      <NotificationPreferencesPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Signed in as {profile.email}
          </p>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Clear all test history</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <BadgeGrid />

      {/* Clear History Confirm */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold">Clear all test history?</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your test sessions, answers, and
              bookmarks. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={clearing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearHistory}
                disabled={clearing}
              >
                {clearing ? "Deleting..." : "Delete everything"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Crop your photo</h3>
              <button
                onClick={() => { setShowCropModal(false); setCropImageSrc(null); }}
                className="p-1 rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Drag to position your photo within the circle.
            </p>
            <div
              ref={cropContainerRef}
              className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-2 border-primary bg-muted cursor-move select-none"
              onMouseDown={handleCropMouseDown}
              onTouchStart={handleCropTouchStart}
            >
              <img
                ref={imgRef}
                src={cropImageSrc}
                alt="Crop preview"
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              <div className="absolute inset-0 rounded-full border-2 border-white/50 pointer-events-none" />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowCropModal(false); setCropImageSrc(null); }}
                disabled={avatarUploading}
              >
                Cancel
              </Button>
              <Button onClick={handleCropConfirm} disabled={avatarUploading}>
                {avatarUploading ? "Uploading..." : "Save Photo"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
