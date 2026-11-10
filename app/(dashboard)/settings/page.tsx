import Link from "next/link";
import { requireExamContext } from "@/lib/exam-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Settings2 } from "lucide-react";
import { PageHeading } from "@/components/workspace/PageHeading";
import { SettingsPreferences } from "./settings-preferences";

export const metadata = { title: "Settings | Exam Prep" };

export default async function SettingsPage() {
  const { user, exam, stream } = await requireExamContext();
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-2 py-6 sm:px-5">
      <PageHeading title="Settings" icon={<Settings2 />} description="Manage your study setup, preferences, and account." />
      <nav aria-label="Settings sections" className="flex flex-wrap gap-2 border-b pb-5">
        {[
          ["study-setup-heading", "Study setup"],
          ["appearance-heading", "Appearance"],
          ["notifications-heading", "Notifications"],
          ["account-heading", "Account"],
          ["achievements-heading", "Achievements"],
          ["data-heading", "Study data"],
        ].map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</a>)}
      </nav>
      <section aria-labelledby="study-setup-heading" className="space-y-3">
        <div>
          <h2 id="study-setup-heading" className="text-lg font-semibold">Study setup</h2>
          <p className="text-sm text-muted-foreground">Your dashboard and practice content follow this selection.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap size={20} />Exam and stream</CardTitle>
            <CardDescription>Change the exam or branch you are preparing for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-semibold">{exam.name}</p>
              {stream && <p className="mt-1 text-sm text-muted-foreground">{stream.name} ({stream.code})</p>}
            </div>
            <Button asChild><Link href="/onboarding">Switch exam / stream<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      </section>
      <SettingsPreferences userId={user.id} examId={exam.id} streamId={stream?.id ?? null} email={user.email} />
    </div>
  );
}
