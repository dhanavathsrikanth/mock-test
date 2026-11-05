"use client";

import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Keyboard, Maximize, Minimize, Trash2 } from "lucide-react";
import { calculatorReducer, initialCalculatorState } from "@/lib/gate-calculator";
import styles from "@/app/calculator/calculator.module.css";

type Key = { action: string; label: ReactNode; kind?: "memory" | "number" | "operator" | "equals"; wide?: boolean; title?: string };
const inv = (name: string) => <>{name}<sup>−1</sup></>;
const rows: Key[][] = [
  [
    { action: "sinh", label: "sinh" }, { action: "cosh", label: "cosh" }, { action: "tanh", label: "tanh" },
    { action: "exp-notation", label: "Exp", title: "Scientific notation: 2 → Exp → 3 = 2000" },
    { action: "(", label: "(" }, { action: ")", label: ")" },
    { action: "backspace", label: "←", kind: "memory", wide: true, title: "Backspace" },
    { action: "clear", label: "C", kind: "memory", title: "Clear calculation" },
    { action: "negate", label: "+/-", kind: "memory", title: "Change sign" }, { action: "sqrt", label: "√", title: "Square root" },
  ],
  [
    { action: "asinh", label: inv("sinh") }, { action: "acosh", label: inv("cosh") }, { action: "atanh", label: inv("tanh") },
    { action: "log2", label: <>log<sub>2</sub>x</> }, { action: "ln", label: "ln" }, { action: "log", label: "log" },
    ...["7", "8", "9"].map(action => ({ action, label: action, kind: "number" as const })),
    { action: "/", label: "÷", kind: "operator" }, { action: "percent", label: "%", kind: "operator" },
  ],
  [
    { action: "pi", label: "π" }, { action: "euler", label: "e" }, { action: "factorial", label: "n!" },
    { action: "logbase", label: <>log<sub>y</sub>x</>, title: "Logarithm: value → logᵧx → base → =" },
    { action: "exp-e", label: <>e<sup>x</sup></> }, { action: "pow10", label: <>10<sup>x</sup></> },
    ...["4", "5", "6"].map(action => ({ action, label: action, kind: "number" as const })),
    { action: "*", label: "×", kind: "operator" }, { action: "reciprocal", label: "1/x", kind: "operator" },
  ],
  [
    { action: "sin", label: "sin" }, { action: "cos", label: "cos" }, { action: "tan", label: "tan" },
    { action: "^", label: <>x<sup>y</sup></> }, { action: "cube", label: <>x<sup>3</sup></> }, { action: "square", label: <>x<sup>2</sup></> },
    ...["1", "2", "3"].map(action => ({ action, label: action, kind: "number" as const })),
    { action: "-", label: "−", kind: "operator" },
  ],
  [
    { action: "asin", label: inv("sin") }, { action: "acos", label: inv("cos") }, { action: "atan", label: inv("tan") },
    { action: "root", label: <><sup>y</sup>√x</>, title: "Nth root: value → ʸ√x → root → =" },
    { action: "cbrt", label: <><sup>3</sup>√</> }, { action: "abs", label: "|x|" },
    { action: "0", label: "0", kind: "number", wide: true }, { action: ".", label: ".", kind: "number" },
    { action: "+", label: "+", kind: "operator" }, { action: "equals", label: "=", kind: "equals" },
  ],
];

export function GateCalculator({ examMode = false }: { examMode?: boolean }) {
  const [state, dispatch] = useReducer(calculatorReducer, undefined, initialCalculatorState);
  const [keyboard, setKeyboard] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The exam calculator is mouse-only and must never intercept answer input.
    if (examMode) return;
    const handleKey = (event: KeyboardEvent) => {
      if (!keyboard || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select, [contenteditable=true]")) return;
      // Keep normal button activation and radio navigation accessible.
      if (target.closest("button") && ["Enter", " "].includes(event.key)) return;
      const keys: Record<string, string> = { Enter: "equals", "=": "equals", Escape: "clear", Backspace: "backspace", Delete: "clear", "%": "percent", e: "exp-notation" };
      const action = /^[0-9.()+\-*/^]$/.test(event.key) ? event.key : keys[event.key];
      if (!action) return;
      event.preventDefault();
      dispatch(action);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [keyboard, examMode]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === wrapper.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggleFullscreen = async () => {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapper.current?.requestFullscreen();
    } catch {
      setFullscreenError("Fullscreen is unavailable in this browser. You can enlarge the browser panel to practice.");
    }
  };

  const keyButton = ({ action, label, kind, wide, title }: Key) => (
    <button key={action} type="button" data-action={action} title={title}
      className={`${styles.key} ${styles[kind ?? "function"]} ${wide ? styles.wide : ""}`}
      onClick={() => dispatch(action)}>{label}</button>
  );

  return (
    <section className={`${styles.calculatorSection} ${examMode ? styles.embedded : ""}`} aria-label="GATE scientific calculator">
      {!examMode && <p className={styles.caption}>GATE-style scientific calculator · Postfix input</p>}
      <div ref={wrapper} className={styles.wrapper}>
        <div className={styles.calculatorContents}>
          {!examMode && <div className={styles.toolbar}>
            <span>GATE Virtual Scientific Calculator</span>
            <div className={styles.tools}>
              <button type="button" onClick={() => setKeyboard(v => !v)} aria-pressed={keyboard} title="Toggle keyboard input (use OFF for exam-style practice)" aria-label={`Keyboard input ${keyboard ? "ON" : "OFF"}`}><Keyboard size={13} /><span>{keyboard ? "ON" : "OFF"}</span></button>
              <button type="button" onClick={toggleFullscreen}>{fullscreen ? <Minimize size={13} /> : <Maximize size={13} />}<span>{fullscreen ? "Exit Full Screen" : "Full Screen"}</span></button>
              <button type="button" title="Clear calculation history" onClick={() => dispatch("clear-history")}><Trash2 size={13} /><span>Clear</span></button>
            </div>
          </div>}
          {fullscreenError && <p role="status" className={styles.fullscreenError}>{fullscreenError}</p>}
          <div className={styles.body}>
            <div className={styles.display}>
              <div className={styles.indicators}><span style={{ visibility: state.memory !== 0 ? "visible" : "hidden" }}>M</span><span>{state.angle.toUpperCase()}</span></div>
              <div className={styles.equation}>{state.equation || "\u00a0"}</div>
              <output className={styles.result} aria-label="Calculator result" aria-live="polite" aria-atomic="true">{state.display}</output>
            </div>
            <div className={styles.buttons}>
              <div className={`${styles.row} ${styles.memoryRow}`}>
                {keyButton({ action: "mod", label: "mod" })}
                <fieldset className={styles.angle} aria-label="Angle mode">
                  <label><input type="radio" name="calculator-angle" checked={state.angle === "deg"} onChange={() => dispatch("deg")} />Deg</label>
                  <label><input type="radio" name="calculator-angle" checked={state.angle === "rad"} onChange={() => dispatch("rad")} />Rad</label>
                </fieldset>
                {["mc", "mr", "ms", "m+", "m-"].map(action => keyButton({ action, label: action.toUpperCase(), kind: "memory" }))}
              </div>
              {rows.map((row, index) => <div key={index} className={styles.row}>{row.map(keyButton)}</div>)}
            </div>
          </div>
          {!examMode && <p className={styles.mobileHint}>Rotate your phone to landscape for a larger keypad.</p>}
          {!examMode && <details className={styles.history}>
            <summary>Calculation History <ChevronDown size={14} /></summary>
            <div className={styles.historyContent}>
              {state.history.length === 0 ? <p>No calculations yet.</p> : <ol>{state.history.map((item, index) => <li key={index}><span>{item.expression}</span><strong>= {item.result}</strong></li>)}</ol>}
            </div>
          </details>}
        </div>
      </div>
    </section>
  );
}
