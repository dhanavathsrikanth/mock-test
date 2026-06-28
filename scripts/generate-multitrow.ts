import { readFileSync, writeFileSync } from 'fs';

const EXAM_ID = 'e33338c9-740c-48c4-914b-2cca3e9c1668';
const SUBJECT_ID = 'aa8d32e0-c642-49ea-934c-af0f7fd9986a';

const TOPIC_MAP: Record<string, string> = {
  'current-affairs': '5c486b4c-2cbe-48b1-86ea-e596a5ae2a5b',
  'general-science': '7edb952a-3e62-4418-a9ca-56c0d12d7cf7',
  'environmental': '77c5bae1-6709-42b9-b4db-a4e079fc6640',
  'disaster-management': '77c5bae1-6709-42b9-b4db-a4e079fc6640',
  'geography': 'e587b482-1005-40dc-b6dd-3d9c2119a753',
  'polity': 'cee34a01-cf1d-4a36-8c58-9f3bc9960035',
  'history': '13bcf297-a2d4-4044-adfe-c24a66531e41',
  'economy': '3e74357f-d7ad-4652-8435-eaa0f7cdfef6',
  'logical-reasoning': '49d95aaf-8616-4a23-8440-a9f57bc710c9',
  'basic-english': '66a94591-334c-4e5c-b867-b27aef0c72ec',
};

const TELANGANA_TOPICS: Record<string, string> = {
  geography: 'fece8020-1cd0-4cd3-ab7d-23d1da0243f9',
  history: '385bbfda-8fa8-4d58-98a8-7b26d3a3c13b',
  policies: '63f54208-07b4-4014-b501-f8691de5e2c1',
  culture: 'c14a6349-1631-4eb0-8302-f2c798195166',
};

function classifyTelangana(q: string): string {
  const lower = q.toLowerCase();
  const hist = ['operation polo','praja samithi','chief minister','hyderabad state','1948','1952','1969','telangana movement'];
  if (hist.some(k => lower.includes(k))) return TELANGANA_TOPICS.history;
  const pol = ['mana ooru','mana badi','programme','export preparedness','government scheme','budget'];
  if (pol.some(k => lower.includes(k))) return TELANGANA_TOPICS.policies;
  const cult = ['bathukamma','temple','oggu','banjara','cathedral','state symbol','tangedu','jammi','festival','art form','needle craft','medak'];
  if (cult.some(k => lower.includes(k))) return TELANGANA_TOPICS.culture;
  return TELANGANA_TOPICS.geography;
}

function esc(s: string): string { return s.replace(/'/g, "''"); }

function parseCSV(line: string): string[] {
  const r: string[] = []; let c = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && i+1 < line.length && line[i+1] === '"') { c += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else c += ch;
  }
  r.push(c);
  return r;
}

const content = readFileSync('deepseek_csv_20260627_3a5901.txt', 'utf-8');
const lines = content.trim().split('\n').slice(1);

const values: string[] = [];
for (const line of lines) {
  if (!line.trim()) continue;
  const cols = parseCSV(line);
  if (cols.length < 11) continue;
  const [year, paper, slug, qt, o1, o2, o3, o4, co, exp, diff] = cols;
  const topicId = slug === 'telangana' ? classifyTelangana(qt) : (TOPIC_MAP[slug] || '');
  if (!topicId) continue;
  values.push(`('${EXAM_ID}'::uuid, '${SUBJECT_ID}'::uuid, '${topicId}'::uuid, ${year}, '${paper}', '${esc(qt)}', '${esc(o1)}', '${esc(o2)}', '${esc(o3)}', '${esc(o4)}', ${co}, '${esc(exp)}', '${diff}')`);
}

// Generate multi-row INSERT statements in batches of 25
const batchSize = 25;
const header = `INSERT INTO public.questions (exam_id, subject_id, topic_id, year, paper, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty) VALUES\n`;

for (let i = 0; i < values.length; i += batchSize) {
  const batch = values.slice(i, i + batchSize);
  const sql = header + batch.join(',\n') + '\nON CONFLICT DO NOTHING;';
  const batchNum = Math.floor(i / batchSize) + 1;
  writeFileSync(`scripts/insert_multitrow_batch_${batchNum}.sql`, sql);
  console.log(`Batch ${batchNum}: ${batch.length} rows, ${sql.length} chars`);
}
console.log(`Total: ${values.length} rows`);
