import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TOPIC_MAP: Record<string, { topicId: string; subjectId: string }> = {
  hydraulics: { topicId: 'ec71764c-6040-47e0-bbc1-9777aafbeec7', subjectId: 'a8556419-0986-4502-80b2-78b7defb8990' },
  hydrology: { topicId: '9b40396e-3ed0-47ab-b981-52f6a8e6cdd3', subjectId: '64289b52-861b-4a49-9286-4c4196691af7' },
  rcc: { topicId: '1bba627d-75a7-47e9-8413-f09905572b33', subjectId: 'e7eaeaa0-d839-4490-abed-c71027b61424' },
  transportation: { topicId: '29d611e8-8d9c-48f0-85c3-621cccd58722', subjectId: '637bf719-8dde-4035-946c-4242372328e2' },
  'soil-mechanics': { topicId: '4c395c9a-2cad-4ea6-ac3d-b0b7bd1a4dee', subjectId: 'c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1' },
  surveying: { topicId: 'f28c858a-cf0c-482e-a112-8845927e82f4', subjectId: '3f275622-18e3-40ce-a134-ec660b48190c' },
  'building-materials': { topicId: '880c7ee1-0204-4a42-979f-338ca32f84be', subjectId: 'a3efd61d-542a-4076-8ffe-631b227f0239' },
  som: { topicId: '4002ff85-6eee-4cd3-8c35-1d7039df2745', subjectId: 'dd2eab18-a6c2-4636-a005-1f9ea9aef419' },
  steel: { topicId: '63b1aa41-9022-4bff-b5b8-0aa71ec874fd', subjectId: 'cd7b170d-eba3-4a13-8b23-3c318071b538' },
  environmental: { topicId: '5005286a-c8a9-4f38-a12f-46a61fd65689', subjectId: 'c542f294-548d-4129-8d45-b3f75629dc1b' },
  estimation: { topicId: '4cf00bbd-c0d6-49dd-88a5-505bae0ef9ab', subjectId: 'aee3c24f-8b41-461f-8e64-e9544a04c1b6' },
  foundation: { topicId: '8dd2ff2a-1e16-4faf-9d4e-2144ed7bc3bd', subjectId: 'c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1' },
  geology: { topicId: '82ee8eac-79fd-487b-8070-753f9ce2ecae', subjectId: 'c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1' },
};

const EXAM_ID = 'e33338c9-740c-48c4-914b-2cca3e9c1668';

function escapeSql(val: string): string {
  return val.replace(/'/g, "''");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

const content = readFileSync(join(import.meta.dirname, '..', 'deepseek_csv_20260627_887c91.txt'), 'utf-8');
const lines = content.trim().split('\n').slice(1); // skip header

const BATCH_SIZE = 25;
let batchNum = 1;
let totalCount = 0;
let skippedCount = 0;

for (let i = 0; i < lines.length; i += BATCH_SIZE) {
  const batch = lines.slice(i, i + BATCH_SIZE);
  const values: string[] = [];

  for (const line of batch) {
    const fields = parseCSVLine(line);
    if (fields.length < 11) { skippedCount++; continue; }

    const [year, paper, subjectSlug, questionText, o1, o2, o3, o4, correctOpt, explanation, difficulty] = fields;

    const mapping = TOPIC_MAP[subjectSlug];
    if (!mapping) {
      console.error(`Unknown subject_slug: ${subjectSlug}`);
      skippedCount++;
      continue;
    }

    const q = escapeSql(questionText);
    const e1 = escapeSql(o1);
    const e2 = escapeSql(o2);
    const e3 = escapeSql(o3);
    const e4 = escapeSql(o4);
    const exp = escapeSql(explanation);

    values.push(
      `('${EXAM_ID}'::uuid, '${mapping.subjectId}'::uuid, '${mapping.topicId}'::uuid, ${year}, '${paper}', '${q}', '${e1}', '${e2}', '${e3}', '${e4}', ${correctOpt}, '${exp}', '${difficulty}')`
    );
    totalCount++;
  }

  if (values.length > 0) {
    const sql = `INSERT INTO public.questions (exam_id, subject_id, topic_id, year, paper, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty) VALUES\n${values.join(',\n')}\nON CONFLICT DO NOTHING;`;
    const filePath = join(import.meta.dirname, `insert_engg_batch_${batchNum}.sql`);
    writeFileSync(filePath, sql, 'utf-8');
    batchNum++;
  }
}

console.log(`Generated ${batchNum - 1} batch files with ${totalCount} questions (${skippedCount} skipped)`);
