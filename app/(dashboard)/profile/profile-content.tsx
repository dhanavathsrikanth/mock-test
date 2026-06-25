"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";
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
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  xp: number;
  target_exam_id?: string | null;
  avatar_url?: string | null;
}

interface Exam {
  id: string;
  name: string;
}

interface ProfileContentProps {
  profile: Profile | null;
  exams: Exam[];
}

export function ProfileContent({ profile: serverProfile, exams }: ProfileContentProps) {
  const router = useRouter();
  const getSupabase = () => createClient();
  const [profile, setProfile] = useState(serverProfile);
  const [fullName, setFullName] = useState(serverProfile?.full_name || "");
  const [targetExamId, setTargetExamId] = useState(serverProfile?.target_exam_id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

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

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
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
            <span className="text-muted-foreground">XP</span>
            <span className="font-medium">{profile.xp}</span>
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

      <NotificationToggle />

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
    </div>
  );
}
