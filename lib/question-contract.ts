import type { NumericAnswerRange } from './question-response';

export type QuestionType = 'MCQ' | 'MSQ' | 'NAT';
export type PresentationImage = { url: string; width?: number; height?: number; alt?: string };

/** Trusted source shape. Never send this complete record to an active-test client. */
export type QuestionRecord = {
  id: string;
  question_text: string;
  option_1: string | null;
  option_2: string | null;
  option_3: string | null;
  option_4: string | null;
  question_type: QuestionType;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  option_images?: (PresentationImage | null)[] | null;
  source_question_number?: number | null;
  year?: number | null;
  paper?: string | null;
  marks?: number | null;
  negative_marks?: number | null;
  marks_to_all?: boolean | null;
  answer_decimal_places?: number | null;
  source_metadata?: { presentation?: { compact_prompt?: boolean } } | null;
};

export type GradingKey = {
  question_type: QuestionType;
  correct_option: number | null;
  correct_options?: number[] | null;
  correct_option_sets?: number[][] | null;
  marks_to_all?: boolean;
  answer_min?: number | string | null;
  answer_max?: number | string | null;
  answer_ranges?: NumericAnswerRange[] | null;
  answer_decimal_places?: number | null;
};

function presentationImage(image: PresentationImage): PresentationImage {
  return { url: image.url, width: image.width, height: image.height, alt: image.alt };
}

/** Explicit allowlist: keys, solutions, source scans and arbitrary metadata stay on the server. */
export function toQuestionPresentation(record: QuestionRecord) {
  return {
    id: record.id, question_text: record.question_text,
    option_1: record.option_1 ?? '', option_2: record.option_2 ?? '',
    option_3: record.option_3 ?? '', option_4: record.option_4 ?? '',
    question_type: record.question_type,
    image_url: record.image_url ?? undefined,
    image_width: record.image_width ?? undefined, image_height: record.image_height ?? undefined,
    option_images: record.option_images?.map(image => image ? presentationImage(image) : null) ?? [],
    source_question_number: record.source_question_number ?? undefined,
    year: record.year ?? undefined, paper: record.paper ?? undefined,
    marks: record.marks ?? 1, negative_marks: record.negative_marks ?? 0,
    marks_to_all: record.marks_to_all === true,
    answer_decimal_places: record.answer_decimal_places,
    source_metadata: { presentation: { compact_prompt: record.source_metadata?.presentation?.compact_prompt === true } },
  };
}

export type QuestionPresentation = ReturnType<typeof toQuestionPresentation>;
export type ReviewedQuestion = QuestionPresentation & GradingKey & { explanation: string };
