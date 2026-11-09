import Link from "next/link";
import { requireExamContext } from "@/lib/exam-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ArrowRight, GraduationCap, Settings2 } from "lucide-react";
import { PageHeading } from '@/components/workspace/PageHeading';

export const metadata = { title: "Settings | Exam Prep" };

export default async function SettingsPage() {
  const { exam, stream } = await requireExamContext();
  return <div className="mx-auto w-full max-w-3xl space-y-6 px-2 py-6 sm:px-5">
    <PageHeading title="Settings" icon={<Settings2 />} description="Manage your exam, study stream, and preferences." />
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap size={20} />Exam and stream</CardTitle><CardDescription>Your dashboard and practice content follow this selection.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-xl bg-muted/50 p-4"><p className="font-semibold">{exam.name}</p>{stream && <p className="mt-1 text-sm text-muted-foreground">{stream.name} ({stream.code})</p>}</div><Button asChild><Link href="/onboarding">Switch exam / stream<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Appearance</CardTitle></CardHeader><CardContent className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Choose light, dark, or system appearance.</p><ThemeSwitcher /></CardContent></Card>
    <Card><CardHeader><CardTitle>Account and notifications</CardTitle><CardDescription>Update your profile, notification preferences, and account details.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/profile">Manage profile<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent></Card>
  </div>;
}
