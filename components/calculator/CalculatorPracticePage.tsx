import Link from "next/link";
import { ArrowLeft, ArrowRight, Calculator, ChevronRight, GraduationCap, MousePointer2, BookOpen, Lightbulb } from "lucide-react";
import { GateCalculator } from "@/components/calculator/GateCalculator";
import { ThemeSwitcher } from "@/components/theme-switcher";
import styles from "@/app/calculator/practice-page.module.css";

export function CalculatorPracticePage({ dashboard = false }: { dashboard?: boolean }) {
  const Container = dashboard ? "section" : "main";
  return (
    <Container className={`${styles.page} ${dashboard ? styles.dashboard : ""}`}>
      {!dashboard && <nav className={styles.navigation} aria-label="Calculator navigation">
        <Link href="/dashboard" className={styles.brand}><GraduationCap size={23} />Exam Prep</Link>
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.breadcrumb}>Practice tools <ChevronRight size={13} /><span>GATE Calculator</span></span>
        <div className={styles.navActions}><ThemeSwitcher /><Link href="/dashboard" className={styles.back}><ArrowLeft size={14} />Dashboard</Link></div>
      </nav>}

      <div className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}><Calculator size={13} />YOUR EXAM TOOLKIT</p>
            <h1>GATE Calculator</h1>
            <p className={styles.description}>A little practice here. More confidence in the exam.</p>
          </div>
          <div className={styles.headerActions}>{dashboard && <Link href="/calculator" className={styles.publicLink}>Public calculator <ArrowRight size={13} /></Link>}<Link href="/test/select" className={styles.primaryAction}>Practice in a test <ArrowRight size={15} /></Link></div>
        </header>

        <div className={styles.workspace}>
          <section className={styles.calculatorCard} aria-labelledby="practice-title">
            <div className={styles.cardHeading}>
              <div><h2 id="practice-title">Practice workspace</h2><p>The same calculator layout you’ll find in your tests.</p></div>
              <span className={styles.tag}>Scientific</span>
            </div>
            <div className={styles.calculatorStage}><GateCalculator /></div>
            <div className={styles.practiceNote}><MousePointer2 size={15} /><span>Preparing for exam day? Turn keyboard input <strong>OFF</strong> for mouse-only practice.</span></div>
          </section>

          <aside className={styles.guide} aria-label="Calculator guide">
            <section className={styles.inputGuide}>
              <p className={styles.guideLabel}><BookOpen size={14} />START HERE</p>
              <h2>Value first.<br />Function second.</h2>
              <p>Scientific functions work on the number already in the display. Try finding sin(30°):</p>
              <div className={styles.sequence} aria-label="Enter 30, then press sin, to get 0.5"><kbd>30</kbd><ArrowRight size={14} /><kbd>sin</kbd><span>=</span><strong>0.5</strong></div>
              <span className={styles.guideFootnote}>Set the angle mode to Deg for this example.</span>
            </section>

            <section className={styles.tips} aria-labelledby="before-start">
              <h2 id="before-start">Before you start</h2>
              <div className={styles.tip}><span>Deg / Rad</span><p>Check the angle mode before using trigonometric functions.</p></div>
              <div className={styles.tip}><span>MS → MR</span><p>Store a result with MS. Bring it back with MR when you need it.</p></div>
              <div className={styles.tip}><span>C / MC</span><p>C clears the calculation. MC clears the stored memory.</p></div>
            </section>
            <p className={styles.examTip}><Lightbulb size={17} /><span>In a test, open the calculator beside the bookmark and report controls.</span></p>
          </aside>
        </div>

        <section className={styles.examples} aria-labelledby="examples-title">
          <div className={styles.sectionHeading}><div><h2 id="examples-title">Get a feel for the keys</h2><p>Try these on the calculator, then check your answer.</p></div><span>6 quick exercises</span></div>
          <div className={styles.exerciseGrid}>
            <article className={styles.exercise}><span className={styles.exerciseType}>ROOTS</span><h3>Find the square root of 144</h3><details><summary>Check answer <ChevronRight size={14} /></summary><p><strong>12</strong><span>144 → √</span></p></details></article>
            <article className={styles.exercise}><span className={styles.exerciseType}>LOGARITHMS</span><h3>Calculate log₁₀(1000)</h3><details><summary>Check answer <ChevronRight size={14} /></summary><p><strong>3</strong><span>1000 → log</span></p></details></article>
            <article className={styles.exercise}><span className={styles.exerciseType}>POWERS</span><h3>Raise 2 to the power of 10</h3><details><summary>Check answer <ChevronRight size={14} /></summary><p><strong>1024</strong><span>2 → xʸ → 10 → =</span></p></details></article>
            <article className={styles.exercise}>
              <span className={styles.exerciseType}>COSECANT · DEG</span>
              <h3>Calculate cosec(30°)</h3>
              <p className={styles.exerciseHelp}>cosec(x), also written csc(x), is 1/sin(x). Calculate sin first, then press 1/x.</p>
              <details><summary>Check answer <ChevronRight size={14} /></summary><p><strong>2</strong><span>30 → sin → 1/x</span></p></details>
            </article>
            <article className={styles.exercise}>
              <span className={styles.exerciseType}>SECANT · DEG</span>
              <h3>Calculate sec(60°)</h3>
              <p className={styles.exerciseHelp}>sec(x) is 1/cos(x). Calculate cos first, then press 1/x.</p>
              <details><summary>Check answer <ChevronRight size={14} /></summary><p><strong>2</strong><span>60 → cos → 1/x</span></p></details>
            </article>
            <article className={styles.exercise}>
              <span className={styles.exerciseType}>TANGENT · DEG</span>
              <h3>Calculate tan(45°)</h3>
              <p className={styles.exerciseHelp}>tan(x) is sin(x)/cos(x). Use the tan button directly after entering the angle.</p>
              <details><summary>Check answer <ChevronRight size={14} /></summary><p><strong>1</strong><span>45 → tan</span></p></details>
            </article>
          </div>
          <p className={styles.exampleNote}>Select <strong>Deg</strong> for the angle examples above. Use <strong>1/x</strong> for reciprocals; sin⁻¹ and cos⁻¹ calculate inverse angles. Cosec is undefined when sin(x) = 0; sec and tan are undefined when cos(x) = 0.</p>
        </section>

        <footer className={styles.footer}><span>Built for your GATE preparation.</span><span>Practice tool · Not affiliated with IIT or TCS iON.</span></footer>
      </div>
    </Container>
  );
}
