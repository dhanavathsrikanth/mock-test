"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import styles from "./dashboard.module.css";

export function ProgressRing({ value, label, size = 72, children }: { value: number; label: string; size?: number; children?: React.ReactNode }) {
  const progress = Math.max(0, Math.min(100, value));
  return <div className={styles.ring} style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle className={styles.ringTrack} cx="50" cy="50" r="43" /><circle className={styles.ringValue} cx="50" cy="50" r="43" pathLength="100" strokeDasharray={`${progress} 100`} /></svg>
    <div className={styles.ringLabel}>{children ?? <strong>{Math.round(progress)}<small>%</small></strong>}</div>
  </div>;
}

export function ProfileAvatar({ name, url }: { name: string; url?: string | null }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.avatar}>{url && !failed ? <Image src={url} alt={name} width={66} height={66} unoptimized onError={() => setFailed(true)} /> : <span>{name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span>}</div>;
}

export function PerformanceTrend({ data }: { data: { id: string; date: string; score: number }[] }) {
  const [limit, setLimit] = useState(5);
  const reduceMotion = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const points = data.slice(-limit).map((point, index) => ({ ...point, attempt: index + 1 }));
  return <>
    <div className={styles.panelHeading}><div><h2>Performance overview</h2><p>Your correct rate, one test at a time</p></div><select aria-label="Number of recent tests" value={limit} onChange={event => setLimit(Number(event.target.value))}><option value={5}>Last 5 tests</option><option value={10}>Last 10 tests</option></select></div>
    {points.length ? <><div className={styles.trendChart} role="img" aria-label={`Recent test correct rates: ${points.map(p => `${p.date}: ${p.score}%`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={points} margin={{ top: 14, right: 16, left: -20, bottom: 0 }}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8054ed" stopOpacity={0.24} /><stop offset="100%" stopColor="#8054ed" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--dash-border)" strokeDasharray="4 5" /><XAxis dataKey="attempt" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--dash-muted)" }} tickFormatter={value => `Test ${value}`} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--dash-muted)" }} tickFormatter={value => `${value}%`} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? "Test"} formatter={value => [`${value}%`, "Correct rate"]} contentStyle={{ borderRadius: 12, border: "1px solid var(--dash-border)", background: "var(--dash-surface)", color: "var(--dash-text)" }} /><Area type="monotone" dataKey="score" stroke="#8054ed" strokeWidth={3} fill={`url(#${gradientId})`} dot={{ r: 4, fill: "#8054ed", strokeWidth: 3, stroke: "var(--dash-surface)" }} activeDot={{ r: 6 }} isAnimationActive={!reduceMotion} /></AreaChart></ResponsiveContainer></div><div className={styles.chartFoot}><span className={styles.legendDot} /> Correct answers / all questions <LinkHint /></div></> : <div className={styles.emptyChart}><TrendingUp size={32} /><strong>Your progress starts here</strong><p>Complete a test to see your performance take shape.</p></div>}
  </>;
}

function LinkHint() { return <span className={styles.chartHint}>Skipped questions included</span>; }
