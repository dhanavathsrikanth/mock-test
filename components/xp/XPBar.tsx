"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Sparkles, Trophy, ArrowUpRight } from "lucide-react";
import styles from "./xp-profile.module.css";

interface XPBarData {
  totalXP: number;
  currentLevel: number;
  levelName: string;
  xpForNextLevel: number;
  xpProgress: number;
  nextLevelName: string | null;
}

export function XPBar() {
  const [data, setData] = useState<XPBarData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function fetchLevel() {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/xp/level", { signal: controller.signal });
        if (!res.ok) throw new Error("Unable to load XP");
        const json = await res.json();
        if (!controller.signal.aborted) { setData(json); setFailed(false); }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally { inFlight = false; }
    }
    fetchLevel();
    const interval = setInterval(fetchLevel, 10000);
    document.addEventListener("visibilitychange", fetchLevel);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", fetchLevel); };
  }, []);

  if (!data) return <div className={styles.status} role="status">{failed ? "Level progress temporarily unavailable" : "Loading your level…"}</div>;
  const progress = Math.max(0, Math.min(100, data.xpProgress));
  return <div className={styles.level}>
    <button type="button" className={styles.toggle} onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls={expanded ? "xp-level-details" : undefined}>
      <span className={styles.levelRing} role="progressbar" aria-label="Progress to next XP level" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" className={styles.track} /><motion.circle cx="32" cy="32" r="27" pathLength={1} initial={false} animate={{ pathLength: progress / 100 }} transition={{ duration: reduceMotion ? 0 : 0.8 }} className={styles.fill} /></svg><Trophy size={19} />
      </span>
      <span className={styles.levelCopy}><span className={styles.overline}>Level {data.currentLevel} · Your journey</span><strong>{data.levelName}</strong><span><motion.span key={data.totalXP} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>{data.totalXP.toLocaleString()}</motion.span> total XP</span></span>
      <ChevronDown size={15} className={expanded ? styles.chevronOpen : styles.chevron} />
    </button>
    <p className={styles.next}>{data.nextLevelName ? <><strong>{data.xpForNextLevel.toLocaleString()} XP</strong> to {data.nextLevelName}</> : "Highest level reached. Keep growing!"}</p>
    <AnimatePresence initial={false}>{expanded && <motion.div id="xp-level-details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.25 }} className={styles.details}><div><Sparkles size={14} /><p>Earn XP by answering questions, completing tests, and building your study streak.</p></div><Link href="/profile#level-roadmap">Explore your level roadmap<ArrowUpRight size={13} /></Link></motion.div>}</AnimatePresence>
  </div>;
}
