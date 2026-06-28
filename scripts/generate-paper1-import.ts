import { readFileSync, writeFileSync } from 'fs';

const EXAM_ID = 'e33338c9-740c-48c4-914b-2cca3e9c1668';

// All general-studies subject
const SUBJECT_ID = 'aa8d32e0-c642-49ea-934c-af0f7fd9986a';

// Topic mappings for Paper-I subjects
const TOPIC_MAP: Record<string, string> = {
  'current-affairs': '5c486b4c-2cbe-48b1-86ea-e596a5ae2a5b',       // Current Affairs
  'general-science': '7edb952a-3e62-4418-a9ca-56c0d12d7cf7',       // General Science & Technology
  'environmental': '77c5bae1-6709-42b9-b4db-a4e079fc6640',         // Environment & Disaster Management
  'disaster-management': '77c5bae1-6709-42b9-b4db-a4e079fc6640',   // Environment & Disaster Management
  'geography': 'e587b482-1005-40dc-b6dd-3d9c2119a753',             // Geography of India
  'polity': 'cee34a01-cf1d-4a36-8c58-9f3bc9960035',                // Indian Constitution & Polity
  'history': '13bcf297-a2d4-4044-adfe-c24a66531e41',               // Modern Indian History
  'economy': '3e74357f-d7ad-4652-8435-eaa0f7cdfef6',               // Economic & Social Development
  'logical-reasoning': '49d95aaf-8616-4a23-8440-a9f57bc710c9',     // Logical Reasoning & DI
  'basic-english': '66a94591-334c-4e5c-b867-b27aef0c72ec',         // Basic English
};

// Telangana sub-topic classification
const TELANGANA_TOPICS = {
  geography: 'fece8020-1cd0-4cd3-ab7d-23d1da0243f9',  // Geography of Telangana
  history: '385bbfda-8fa8-4d58-98a8-7b26d3a3c13b',    // History of Telangana
  policies: '63f54208-07b4-4014-b501-f8691de5e2c1',    // Policies of Telangana State
  culture: 'c14a6349-1631-4eb0-8302-f2c798195166',     // Telangana Culture & Heritage
};

function classifyTelangana(questionText: string): string {
  const q = questionText.toLowerCase();

  // History keywords
  const historyKeywords = ['operation polo', 'operation vijay', 'praja samithi', 'chief minister', 'hyderabad state', '1948', '1952', '1969', 'telangana movement'];
  if (historyKeywords.some(kw => q.includes(kw))) {
    return TELANGANA_TOPICS.history;
  }

  // Policies keywords
  const policyKeywords = ['mana ooru', 'mana badi', 'programme', 'export preparedness', 'government scheme', 'budget'];
  if (policyKeywords.some(kw => q.includes(kw))) {
    return TELANGANA_TOPICS.policies;
  }

  // Culture keywords
  const cultureKeywords = ['bathukamma', 'temple', 'oggu', 'banjara', 'cathedral', 'state symbol', 'tangedu', 'jammi', 'festival', 'art form', 'needle craft', 'medak'];
  if (cultureKeywords.some(kw => q.includes(kw))) {
    return TELANGANA_TOPICS.culture;
  }

  // Default: Geography of Telangana
  return TELANGANA_TOPICS.geography;
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const content = readFileSync('deepseek_csv_20260627_3a5901.txt', 'utf-8');
const lines = content.trim().split('\n').slice(1); // skip header

const inserts: string[] = [];

for (const line of lines) {
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);
  if (cols.length < 11) continue;

  const [year, paper, subjectSlug, questionText, opt1, opt2, opt3, opt4, correctOption, explanation, difficulty] = cols;

  let topicId: string;
  if (subjectSlug === 'telangana') {
    topicId = classifyTelangana(questionText);
  } else {
    topicId = TOPIC_MAP[subjectSlug] || '';
  }

  if (!topicId) {
    console.error(`No topic for: ${subjectSlug} - ${questionText.substring(0, 50)}`);
    continue;
  }

  const q = escapeSql(questionText);
  const e1 = escapeSql(opt1);
  const e2 = escapeSql(opt2);
  const e3 = escapeSql(opt3);
  const e4 = escapeSql(opt4);
  const exp = escapeSql(explanation);

  inserts.push(
    `INSERT INTO public.questions (exam_id, subject_id, topic_id, year, paper, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty) VALUES ('${EXAM_ID}'::uuid, '${SUBJECT_ID}'::uuid, '${topicId}'::uuid, ${year}, '${paper}', '${q}', '${e1}', '${e2}', '${e3}', '${e4}', ${correctOption}, '${exp}', '${difficulty}');`
  );
}

// Write batched SQL files
const batchSize = 50;
for (let i = 0; i < inserts.length; i += batchSize) {
  const batch = inserts.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  writeFileSync(`scripts/insert_paper1_batch_${batchNum}.sql`, batch.join('\n') + '\n');
  console.log(`Written batch ${batchNum} (${batch.length} inserts)`);
}

console.log(`Total: ${inserts.length} inserts`);
