import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const digest = (text, algorithm = 'md5') => crypto.createHash(algorithm).update(text).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value ?? null;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const relative = (root, file) => path.relative(root, file).split(path.sep).join('/');
const questionArray = value => Array.isArray(value) && value.length > 0 &&
  value.every(q => q && typeof q.question_text === 'string');

export function normaliseImportRow(row) {
  const classification = row.source_metadata?.classification ?? {};
  const fraction = row.negative_mark_fraction ?? row.source_metadata?.negative_mark_fraction;
  return { ...row,
    subject: row.subject ?? (row.source_metadata?.section === 'GA' ? 'General Aptitude' : undefined),
    topic: row.topic ?? classification.topic ?? classification.area,
    subtopic: row.subtopic ?? classification.subtopic ?? classification.primary_topic,
    negative_marks: row.negative_marks ?? (fraction?.denominator ? fraction.numerator / fraction.denominator : 0),
  };
}

export function selectQuestionRows(candidates, preferredFiles = []) {
  const full = candidates.find(c => c.name === 'questions-1-65.json');
  const preferred = preferredFiles.length ? candidates.filter(c => preferredFiles.includes(c.name)) : [];
  const selected = full ? [full] : preferred.length === preferredFiles.length && preferred.length ? preferred : candidates;
  const byNumber = new Map();
  const conflicts = new Set();
  for (const candidate of selected) for (const row of candidate.rows) {
    const number = row.source_question_number;
    if (byNumber.has(number) && !same(byNumber.get(number), row)) conflicts.add(number);
    else byNumber.set(number, row);
  }
  // Even a merged file must remain consistent with its import batches.
  if (full) for (const candidate of candidates.filter(c => c !== full)) for (const row of candidate.rows) {
    if (!same(byNumber.get(row.source_question_number), row)) conflicts.add(row.source_question_number);
  }
  return { rows: [...byNumber.values()].sort((a, b) => a.source_question_number - b.source_question_number),
    files: selected.map(c => c.name), conflicts: [...conflicts] };
}

export function compareQuestion(local, live) {
  if (!live) return ['missing_live_question'];
  const fields = [];
  for (const key of ['question_type', 'correct_option', 'correct_options', 'correct_option_sets',
    'answer_min', 'answer_max', 'answer_ranges', 'answer_decimal_places']) {
    const a = local[key] ?? null, b = live[key] ?? null;
    if (['answer_min', 'answer_max'].includes(key) && a != null && b != null ? Number(a) !== Number(b) : !same(a, b)) fields.push(key);
  }
  if (Boolean(local.marks_to_all) !== Boolean(live.marks_to_all)) fields.push('marks_to_all');
  for (const key of ['marks', 'negative_marks']) if (Math.abs(Number(local[key] ?? 0) - Number(live[key] ?? 0)) > 1e-8) fields.push(key);
  for (const [key, text] of [['question_hash', local.question_text], ['explanation_hash', local.explanation],
    ...[1, 2, 3, 4].map(n => [`option_${n}_hash`, local.options?.[n - 1] ?? local[`option_${n}`]])]) {
    if (digest(text ?? '') !== live[key] && !(key === 'explanation_hash' && live.explanation_lf_hash &&
      digest((text ?? '').replace(/\r\n?/g, '\n')) === live.explanation_lf_hash)) fields.push(key.replace('_hash', ''));
  }
  if (local.subject && local.subject !== live.subject_name) fields.push('subject');
  const localTopicNames = [local.topic, local.subtopic, local.sub_subtopic].filter(Boolean);
  if (!live.topic_id || !localTopicNames.includes(live.topic_name)) fields.push('topic');
  const figure = local.figure ?? local.source_metadata?.figure;
  if ((figure?.url ?? null) !== (live.image_url ?? null)) fields.push('figure_url');
  for (const key of ['width', 'height']) if (figure && Number(figure[key]) !== Number(live[`image_${key}`])) fields.push(`figure_${key}`);
  const localOptions = local.option_images ?? [], liveOptions = live.option_images ?? [];
  if (!same(localOptions.map(a => a ? [a.url, a.width, a.height] : null), liveOptions.map(a => a ? [a.url, a.width, a.height] : null))) fields.push('option_images');
  return fields;
}

function walk(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = path.join(dir, e.name);
    return e.isDirectory() ? walk(file, predicate) : predicate(file) ? [file] : [];
  });
}

export function auditContent(root, liveDir) {
  const streamsRoot = path.join(root, 'data/gate-2027/streams');
  const pdfFiles = walk(streamsRoot, f => f.toLowerCase().endsWith('.pdf'));
  const fileHashCache = new Map();
  const hashFile = file => {
    if (!fileHashCache.has(file)) fileHashCache.set(file, digest(fs.readFileSync(file), 'sha256'));
    return fileHashCache.get(file);
  };
  const storageFile = path.join(liveDir, 'storage-objects.json');
  const storage = fs.existsSync(storageFile) ? new Set(JSON.parse(fs.readFileSync(storageFile, 'utf8')).map(o => o.name)) : null;
  const manifests = walk(streamsRoot, f => path.basename(f) === 'manifest.json' && /[\\/]papers[\\/]202[1-6][\\/]/.test(f));
  const papers = [];
  for (const manifestFile of manifests) {
    const dir = path.dirname(manifestFile), parts = relative(streamsRoot, dir).split('/');
    const stream = parts[0].split('-')[0], year = Number(parts[2]), paper = parts[3];
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const candidates = fs.readdirSync(dir).filter(f => f.endsWith('.json')).flatMap(name => {
      const value = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      return questionArray(value) ? [{ name, rows: value }] : [];
    });
    const selected = selectQuestionRows(candidates, manifest.question_batches?.filter(x => typeof x === 'string') ?? []);
    const rows = selected.rows.map(normaliseImportRow), issues = [], sources = [], assets = new Map();
    if (selected.conflicts.length) issues.push({ type: 'conflicting_batches', questions: selected.conflicts });
    const numbers = rows.map(q => q.source_question_number);
    if (numbers.length !== 65 || numbers.some((n, i) => n !== i + 1)) issues.push({ type: 'numbering', numbers });
    const marks = rows.reduce((n, q) => n + Number(q.marks), 0);
    if (marks !== 100) issues.push({ type: 'marks', actual: marks });
    const sourceCandidates = [...(manifest.sources ?? []), manifest.question_source, manifest.key_source,
      ...rows.flatMap(q => [q.source_metadata?.question_source, q.source_metadata?.key_source])].filter(s => s && typeof s === 'object');
    const sourceSeen = new Set();
    for (const source of sourceCandidates) {
      const filename = path.basename(source.filename ?? source.path ?? source.relative_path ?? '');
      if (!filename.toLowerCase().endsWith('.pdf')) continue;
      const identity = `${filename}:${source.sha256 ?? ''}`;
      if (sourceSeen.has(identity)) continue;
      sourceSeen.add(identity);
      const direct = [source.path, source.relative_path, path.join('sources', filename), path.join('..', 'sources', filename)]
        .filter(Boolean).map(p => path.resolve(dir, p)).filter(p => p.startsWith(streamsRoot + path.sep) && fs.existsSync(p));
      const matches = [...new Set([...direct, ...pdfFiles.filter(p => path.basename(p) === filename)])];
      const found = source.sha256 ? matches.find(f => hashFile(f) === source.sha256) : matches[0];
      sources.push({ filename, sha256: source.sha256 ?? null, file: found ? relative(root, found) : null,
        hashVerified: Boolean(found && source.sha256), origin: source.url ?? source.official_archive ?? source.origin ?? null,
        reuseStatus: 'unconfirmed' });
      if (!found) issues.push({ type: 'source_file_or_hash', filename });
    }
    const liveFile = path.join(liveDir, `live-${stream}.json`);
    const liveRows = fs.existsSync(liveFile) ? JSON.parse(fs.readFileSync(liveFile, 'utf8')).filter(q => q.year === year && q.paper === paper) : null;
    const liveByNumber = new Map((liveRows ?? []).map(q => [q.source_question_number, q]));
    const mismatches = [], editorial = [], types = { MCQ: 0, MSQ: 0, NAT: 0 }, explanationLengths = [];
    for (const q of rows) {
      const n = q.source_question_number;
      if (q.question_type in types) types[q.question_type]++;
      else issues.push({ type: 'question_type', question: n });
      if (!q.explanation?.trim() || /^(N\/A|NA)$/i.test(q.explanation.trim())) issues.push({ type: 'missing_explanation', question: n });
      explanationLengths.push(q.explanation?.length ?? 0);
      if (!q.subject || !q.topic) issues.push({ type: 'missing_classification', question: n });
      if (!q.source_metadata?.question_source || !q.source_metadata?.key_source) issues.push({ type: 'question_provenance_gap', question: n });
      if (liveRows) { const fields = compareQuestion(q, liveByNumber.get(n)); if (fields.length) mismatches.push({ question: n, fields }); }
      const metadataText = JSON.stringify(q.source_metadata ?? {});
      if (/"[^"]*(?:editorial_revision|editorial_correction|correction_note|practice_grading|source_discrepancy|override)[^"]*"\s*:/i.test(metadataText) || q.marks_to_all || q.correct_option_sets?.length > 1 || q.answer_ranges?.length > 1) {
        editorial.push({ question: n, type: q.question_type, marksToAll: Boolean(q.marks_to_all),
          officialKey: q.source_metadata?.official_answer_key ?? null, localKey: q.answer_key ?? null });
      }
      for (const image of [q.figure ?? q.source_metadata?.figure, ...(q.option_images ?? [])].filter(Boolean)) {
        const localUrl = image.local_url;
        const file = localUrl ? path.resolve(root, 'public', localUrl.replace(/^\//, '')) : path.join(dir, 'images', path.basename(image.url));
        const exists = file.startsWith(root + path.sep) && fs.existsSync(file);
        let objectName = null;
        try { objectName = decodeURIComponent(new URL(image.url).pathname.split('/question-images/')[1] ?? ''); } catch { /* local assets have no Storage object */ }
        const mirror = path.join(dir, 'images', path.basename(image.url));
        const mirrorMatches = exists && fs.existsSync(mirror) ? hashFile(file) === hashFile(mirror) : null;
        assets.set(image.url, { url: image.url, localFile: exists ? relative(root, file) : null,
          width: image.width, height: image.height, mirrorMatches,
          storageObjectPresent: objectName && storage ? storage.has(objectName) : null });
        if (!exists || !(image.width > 0 && image.height > 0) || mirrorMatches === false || (objectName && storage && !storage.has(objectName))) issues.push({ type: 'asset', question: n, url: image.url });
      }
    }
    if (liveRows && (liveRows.length !== rows.length || liveByNumber.size !== liveRows.length)) issues.push({ type: 'live_count_or_duplicate', count: liveRows.length });
    papers.push({ stream, year, paper, folder: relative(root, dir), files: selected.files, questions: rows.length, marks,
      types, liveQuestions: liveRows?.length ?? null, mismatches, issues, sources, assets: [...assets.values()],
      editorialCandidates: editorial, explanationMinimumLength: Math.min(...explanationLengths),
      structuralStatus: issues.length || mismatches.length ? 'needs_review' : liveRows ? 'local_live_match' : 'local_only',
      reuseStatus: 'unconfirmed', manualSolutionReview: 'sample_required' });
  }
  const grouped = Object.fromEntries([...new Set(papers.map(p => p.stream))].sort().map(code => [code, {
    papers: papers.filter(p => p.stream === code).length, questions: papers.filter(p => p.stream === code).reduce((n, p) => n + p.questions, 0) }]));
  return { generatedAt: new Date().toISOString(), liveSnapshotDirectory: relative(root, liveDir),
    papers: papers.sort((a, b) => a.stream.localeCompare(b.stream) || a.year - b.year || a.paper.localeCompare(b.paper)),
    summary: { streams: grouped, papers: papers.length, questions: papers.reduce((n, p) => n + p.questions, 0),
      mismatchedQuestions: papers.reduce((n, p) => n + p.mismatches.length, 0), issueCount: papers.reduce((n, p) => n + p.issues.length, 0),
      sourceReferences: papers.reduce((n, p) => n + p.sources.length, 0), assets: papers.reduce((n, p) => n + p.assets.length, 0) } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.cwd();
  const liveDir = path.resolve(root, process.argv[2] ?? 'output/phase1-content');
  const report = auditContent(root, liveDir);
  fs.mkdirSync(liveDir, { recursive: true });
  fs.writeFileSync(path.join(liveDir, 'audit.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(liveDir, 'coverage.csv'), 'stream,year,paper,questions,marks,live_questions,mismatched_questions,issues,status\n' +
    report.papers.map(p => [p.stream, p.year, p.paper, p.questions, p.marks, p.liveQuestions ?? '', p.mismatches.length, p.issues.length, p.structuralStatus].join(',')).join('\n') + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
}
