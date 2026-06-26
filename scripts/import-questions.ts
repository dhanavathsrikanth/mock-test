import { createClient } from "@supabase/supabase-js";
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

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: subjects } = await supabase.from("subjects").select("id, slug");
  if (!subjects) {
    console.error("Failed to fetch subjects");
    process.exit(1);
  }
  const subjectMap = new Map(subjects.map((s: any) => [s.slug, s.id]));

  const { data: exams } = await supabase.from("exams").select("id").eq("is_active", true).limit(1);
  const examId = exams?.[0]?.id;
  if (!examId) {
    console.error("No active exam found");
    process.exit(1);
  }

  const csvPath = path.join(process.cwd(), "questions_dataset.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter((l) => l.trim());

  const header = parseCSVLine(lines[0]);
  const colMap = new Map(header.map((col, i) => [col.trim(), i]));
  const get = (vals: string[], col: string) => vals[colMap.get(col)!]?.trim() || "";

  const questions: any[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const slug = get(vals, "subject_slug");
    const dbSlug = SLUG_MAP[slug];
    const subjectId = dbSlug ? subjectMap.get(dbSlug) : null;

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

    const difficulty = ["easy", "medium", "hard"].includes(get(vals, "difficulty"))
      ? get(vals, "difficulty")
      : null;

    questions.push({
      exam_id: examId,
      subject_id: subjectId,
      year: get(vals, "year") ? parseInt(get(vals, "year")) || null : null,
      paper: get(vals, "paper") || null,
      question_text: get(vals, "question_text"),
      option_1: get(vals, "option_1"),
      option_2: get(vals, "option_2"),
      option_3: get(vals, "option_3"),
      option_4: get(vals, "option_4"),
      correct_option: correctOption,
      explanation: get(vals, "explanation") || null,
      difficulty,
    });
  }

  if (questions.length === 0) {
    console.log("No questions to import");
    return;
  }

  console.log(`Importing ${questions.length} questions (${skipped} skipped)...`);

  const BATCH_SIZE = 50;
  let imported = 0;
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("questions").insert(batch);
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
    } else {
      imported += batch.length;
      console.log(`Batch ${i / BATCH_SIZE + 1}: ${batch.length} imported`);
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);
}

main().catch(console.error);
