import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  Bookmark,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
            TGPSC Prep
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/auth/sign-up">Sign Up Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <GraduationCap className="h-4 w-4" />
          TSPSC Assistant Executive Engineer (Civil)
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl max-w-3xl mx-auto leading-tight">
          Crack TSPSC AEE Civil with{" "}
          <span className="text-primary">Real PYQs</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-xl mx-auto">
          Practice with previous year questions, track your performance, and ace
          the exam with confidence.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">
              Start Practicing Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/auth/login">
              Sign in
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-card p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Mock Tests</h3>
            <p className="text-sm text-muted-foreground">
              Full-length and subject-wise tests with real exam timers and PYQs
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Detailed Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track scores, subject-wise performance, and study streaks over
              time
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Bookmark & Review</h3>
            <p className="text-sm text-muted-foreground">
              Save tough questions, review answers with explanations, and track
              weak topics
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>TGPSC Prep — Built for TSPSC AEE Civil Engineering aspirants</p>
        </div>
      </footer>
    </main>
  );
}
