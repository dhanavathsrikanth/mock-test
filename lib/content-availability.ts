export type AvailabilityRow = {
  year: number | null;
  paper: string | null;
  source_question_number: number | null;
  marks: number | null;
};

export type PaperAvailability = {
  year: number | null;
  paper: string | null;
  questionCount: number;
  marks: number;
  sequentialNumbering: boolean;
};

export type ContentAvailability = {
  questionCount: number;
  paperCount: number;
  years: number[];
  papers: PaperAvailability[];
};

/** Describes records available now; it does not certify source accuracy or reuse rights. */
export function summariseAvailability(rows: AvailabilityRow[]): ContentAvailability {
  const groups = new Map<string, { rows: AvailabilityRow[]; year: number | null; paper: string | null }>();
  for (const row of rows) {
    const key = JSON.stringify([row.year, row.paper]);
    const group = groups.get(key) ?? { rows: [], year: row.year, paper: row.paper };
    group.rows.push(row);
    groups.set(key, group);
  }
  const papers = [...groups.values()].map(group => {
    const numbers = group.rows.map(row => row.source_question_number).sort((a, b) => (a ?? 0) - (b ?? 0));
    return { year: group.year, paper: group.paper, questionCount: group.rows.length,
      marks: group.rows.reduce((total, row) => total + Number(row.marks ?? 0), 0),
      sequentialNumbering: numbers.every((number, index) => number === index + 1) };
  }).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.paper ?? '').localeCompare(b.paper ?? ''));
  return { questionCount: rows.length, paperCount: papers.length,
    years: [...new Set(rows.flatMap(row => row.year == null ? [] : [row.year]))].sort((a, b) => a - b), papers };
}

export function describeYears(years: number[]): string {
  const sorted = [...new Set(years)].sort((a, b) => a - b);
  if (!sorted.length) return 'Year not labelled';
  if (sorted.length === 1) return String(sorted[0]);
  return sorted.every((year, index) => index === 0 || year === sorted[index - 1] + 1)
    ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted.join(', ');
}

export function availabilityScope(examId: string, streamId: string | null): string {
  return JSON.stringify([examId, streamId]);
}
