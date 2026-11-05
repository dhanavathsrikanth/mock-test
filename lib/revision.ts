import type { QuestionImage } from "@/components/QuestionFigure";
import type { NumericAnswerRange } from "@/lib/question-response";

export const REVISION_INTERVALS = [1, 3, 7, 14, 30] as const;
export const DAILY_REVISION_CAP = 20;

export interface RevisionQuestion {
  id: string;
  stage: number;
  question: {
    id: string; question_text: string; question_type: "MCQ" | "MSQ" | "NAT";
    option_1: string | null; option_2: string | null; option_3: string | null; option_4: string | null;
    correct_option: number | null; correct_options: number[] | null; correct_option_sets: number[][] | null;
    answer_min: number | null; answer_max: number | null; answer_ranges: NumericAnswerRange[] | null;
    explanation: string | null; year: number | null;
    image_url: string | null; image_width?: number; image_height?: number; option_images?: QuestionImage[];
  };
}

export interface RevisionSummary {
  dueCount: number; deferredCount: number; completedCount: number; dailyCap: number;
  totalCount: number; xpEarned: number; queueComplete: boolean;
}

export interface RevisionQueue {
  reviewDate: string;
  questions: RevisionQuestion[];
  summary: RevisionSummary;
}
