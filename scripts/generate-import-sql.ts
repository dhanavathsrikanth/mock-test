import * as fs from "fs";
import * as path from "path";

const SLUG_MAP: Record<string, string> = {
  "surveying": "surveying",
  "building-materials": "building-materials",
  "som": "solid-mechanics",
  "rcc": "rcc-design",
  "hydraulics": "fluid-mechanics",
  "estimation": "estimation-costing",
  "hydrology": "water-resources-engg",
  "environmental": "environmental-engg",
  "transportation": "transportation-engg",
  "soil-mechanics": "geotechnical-engg",
};

const SUBJECT_IDS: Record<string, string> = {
  "fluid-mechanics": "a8556419-0986-4502-80b2-78b7defb8990",
  "solid-mechanics": "dd2eab18-a6c2-4636-a005-1f9ea9aef419",
  "structural-analysis": "decbbdf0-3513-4574-b4ab-87507e684e56",
  "rcc-design": "e7eaeaa0-d839-4490-abed-c71027b61424",
  "steel-design": "cd7b170d-eba3-4a13-8b23-3c318071b538",
  "geotechnical-engg": "c39bc91d-4a88-42c6-b1f7-ae4fc2b0dba1",
  "environmental-engg": "c542f294-548d-4129-8d45-b3f75629dc1b",
  "water-resources-engg": "64289b52-861b-4a49-9286-4c4196691af7",
  "transportation-engg": "637bf719-8dde-4035-946c-4242372328e2",
  "surveying": "3f275622-18e3-40ce-a134-ec660b48190c",
  "construction-mgmt": "ef2aafdf-55ff-4b21-bbdd-ae20229236be",
  "general-studies": "aa8d32e0-c642-49ea-934c-af0f7fd9986a",
  "building-materials": "a3efd61d-542a-4076-8ffe-631b227f0239",
  "estimation-costing": "aee3c24f-8b41-461f-8e64-e9544a04c1b6",
};

const EXAM_ID = "e33338c9-740c-48c4-914b-2cca3e9c1668";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
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
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

function escapeSql(val: string): string {
  return val.replace(/'/g, "''");
}

const txtPath = path.join(process.cwd(), "deepseek_csv_20260627_7ed5b5.txt");
const txtContent = fs.readFileSync(txtPath, "utf-8");
const lines = txtContent.split("\n").filter((l) => l.trim());

const header = parseCSVLine(lines[0]);
const colMap = new Map(header.map((col, i) => [col.trim(), i]));
const get = (vals: string[], col: string) => vals[colMap.get(col)!]?.trim() || "";

const values: string[] = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const vals = parseCSVLine(lines[i]);
  const slug = get(vals, "subject_slug");
  const dbSlug = SLUG_MAP[slug];
  const subjectId = dbSlug ? SUBJECT_IDS[dbSlug] : null;

  if (!subjectId) {
    console.warn(`Row ${i + 1}: Unknown subject_slug "${slug}", skipping`);
    skipped++;
    continue;
  }

  const correctOption = parseInt(get(vals, "correct_option"));
  if (isNaN(correctOption) || correctOption < 1 || correctOption > 4) {
    console.warn(`Row ${i + 1}: Invalid correct_option, skipping`);
    skipped++;
    continue;
  }

  const difficulty = get(vals, "difficulty");
  const diffVal = ["easy", "medium", "hard"].includes(difficulty) ? `'${difficulty}'` : "NULL";

  const year = get(vals, "year");
  const yearVal = year ? parseInt(year) || "NULL" : "NULL";
  const paper = get(vals, "paper");
  const questionText = escapeSql(get(vals, "question_text"));
  const opt1 = escapeSql(get(vals, "option_1"));
  const opt2 = escapeSql(get(vals, "option_2"));
  const opt3 = escapeSql(get(vals, "option_3"));
  const opt4 = escapeSql(get(vals, "option_4"));
  const explanation = escapeSql(get(vals, "explanation"));

  values.push(
    `('${EXAM_ID}','${subjectId}',${yearVal},'${escapeSql(paper)}','${questionText}','${opt1}','${opt2}','${opt3}','${opt4}',${correctOption},'${explanation}',${diffVal})`
  );
}

console.log(`Generated ${values.length} rows (${skipped} skipped)`);

const BATCH = 50;
const batches: string[][] = [];
for (let i = 0; i < values.length; i += BATCH) {
  batches.push(values.slice(i, i + BATCH));
}

const sqlDir = path.join(process.cwd(), "scripts");
for (let b = 0; b < batches.length; b++) {
  const sql = `INSERT INTO public.questions (exam_id, subject_id, year, paper, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty) VALUES\n${batches[b].join(",\n")};`;
  const sqlPath = path.join(sqlDir, `import_batch_${b + 1}.sql`);
  fs.writeFileSync(sqlPath, sql, "utf-8");
  console.log(`Wrote ${sqlPath} (${batches[b].length} rows)`);
}

console.log(`\nTotal: ${batches.length} SQL files generated`);
