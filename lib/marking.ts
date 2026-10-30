export interface MarkedQuestion {
  id: string;
  marks?: number | string | null;
  negative_marks?: number | string | null;
  correct_option?: number | null;
  marks_to_all?: boolean;
}

export function questionMarks(question: MarkedQuestion) {
  return { positive: Number(question.marks ?? 1), negative: Number(question.negative_marks ?? 0) };
}

export function formatMarks(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function negativeMarkLabel(question: MarkedQuestion) {
  const { positive, negative } = questionMarks(question);
  if (!negative) return "0";
  if (Math.abs(negative * 3 - positive) < 1e-8) return `${positive}/3`;
  return formatMarks(negative);
}

export function calculateMarks(
  questions: MarkedQuestion[],
  answers: { question_id: string; selected_option: number | null; selected_options?: number[] | null; is_correct: boolean | null }[],
) {
  const answerMap = new Map(answers.map(answer => [answer.question_id, answer]));
  let earned = 0;
  let deducted = 0;
  let maximum = 0;
  for (const question of questions) {
    const marking = questionMarks(question);
    maximum += marking.positive;
    if (question.marks_to_all) { earned += marking.positive; continue; }
    const answer = answerMap.get(question.id);
    if (!answer || answer.is_correct == null) continue;
    if (answer.is_correct === true) earned += marking.positive;
    if (answer.is_correct === false) deducted += marking.negative;
  }
  // Sum fractions before rounding. Three wrong 1-mark MCQs deduct exactly 1 mark.
  return { earned, deducted, maximum, net: Number((earned - deducted).toFixed(2)) };
}
