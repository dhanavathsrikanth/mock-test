export type QuestionResponse = number | number[] | string | null;

export function numericResponse(response: QuestionResponse | undefined): string | null {
  if (typeof response !== 'string') return null;
  const value = response.trim();
  return value.length <= 64 && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) ? value : null;
}

/** Compare decimal text exactly; do not round a response into the accepted interval. */
export function withinNumericRange(response: string, minimum: string | number | null | undefined, maximum: string | number | null | undefined) {
  if (minimum == null || maximum == null) return false;
  const values = [response, String(minimum), String(maximum)].map(value => numericResponse(value));
  if (values.some(value => value == null)) return false;
  const parts = values.map(value => {
    const text = value!;
    const decimals = text.split('.')[1]?.length || 0;
    return { value: BigInt(text.replace('.', '').replace(/^\+/, '')), decimals };
  });
  const scale = Math.max(...parts.map(part => part.decimals));
  const [value, low, high] = parts.map(part => part.value * BigInt(10) ** BigInt(scale - part.decimals));
  return value >= low && value <= high;
}

/** Trailing zeros do not change a value's precision (3.00 is exactly 3). */
export function hasNumericPrecision(value: string, decimalPlaces?: number | null) {
  return decimalPlaces == null || (value.split('.')[1]?.replace(/0+$/, '').length || 0) <= decimalPlaces;
}

export type NumericAnswerRange = { min: number; max: number };

function validNumericRanges(ranges: unknown): ranges is NumericAnswerRange[] {
  return Array.isArray(ranges) && ranges.length > 0 && ranges.length <= 20 && ranges.every(range =>
    range != null && typeof range.min === 'number' && Number.isFinite(range.min) &&
    typeof range.max === 'number' && Number.isFinite(range.max) && range.min <= range.max);
}

export function numericAnswerLabel(minimum: string | number | null | undefined, maximum: string | number | null | undefined, ranges?: NumericAnswerRange[] | null): string {
  if (ranges != null) {
    if (!validNumericRanges(ranges)) return 'Answer key unavailable';
    return ranges.map(range => numericAnswerLabel(range.min, range.max)).join(' OR ');
  }
  if (minimum == null || maximum == null) return 'Answer key unavailable';
  if (withinNumericRange(String(minimum), maximum, maximum)) {
    const exact = String(minimum).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return `Exact answer: ${exact}`;
  }
  return `Accepted answer range: ${minimum} to ${maximum} (inclusive)`;
}

export function numericKeypress(value: string, key: string, decimalPlaces?: number | null) {
  if (key === 'clear') return '';
  if (key === 'backspace') return value.slice(0, -1);
  if (key === 'sign') return value.startsWith('-') ? value.slice(1) : `-${value.replace(/^\+/, '')}`;
  if (key === '.') return decimalPlaces === 0 || value.includes('.') ? value : `${value}.`;
  if (decimalPlaces != null && value.includes('.') && (value.split('.')[1]?.length || 0) >= decimalPlaces) return value;
  return /^\d$/.test(key) && value.length < 64 ? value + key : value;
}

export function selection(response: QuestionResponse | undefined): number[] {
  const values = Array.isArray(response) ? response : typeof response === 'number' ? [response] : [];
  return [...new Set(values.filter(value => Number.isInteger(value) && value >= 1 && value <= 4))].sort((a, b) => a - b);
}

export function hasResponse(response: QuestionResponse | undefined) {
  if (typeof response === 'string') return numericResponse(response) != null;
  return selection(response).length > 0;
}

export function toggleResponse(response: QuestionResponse | undefined, option: number, multiple: boolean): QuestionResponse {
  if (!multiple) return response === option ? null : option;
  const values = selection(response);
  const next = values.includes(option) ? values.filter(value => value !== option) : [...values, option].sort((a, b) => a - b);
  return next.length ? next : null;
}

function validOptionSets(sets: unknown): sets is number[][] {
  return Array.isArray(sets) && sets.length > 0 && sets.length <= 20 && sets.every(set =>
    Array.isArray(set) && set.length > 0 && set.length <= 4 && new Set(set).size === set.length &&
    set.every(value => Number.isInteger(value) && value >= 1 && value <= 4));
}

export function multipleAnswerLabel(sets: number[][] | null | undefined) {
  return validOptionSets(sets)
    ? `Accepted answer sets: ${sets.map(set => selection(set).map(value => String.fromCharCode(64 + value)).join(' + ')).join(' OR ')}`
    : 'Answer key unavailable';
}

export function gradeResponse(question: { question_type?: string; marks_to_all?: boolean; correct_option: number | null; correct_options?: number[] | null; correct_option_sets?: number[][] | null; answer_min?: number | string | null; answer_max?: number | string | null; answer_ranges?: NumericAnswerRange[] | null; answer_decimal_places?: number | null }, response: QuestionResponse | undefined) {
  if (question.marks_to_all) return true;
  if (question.question_type === 'NAT') {
    const value = numericResponse(response);
    if (value == null) return null;
    if (!hasNumericPrecision(value, question.answer_decimal_places)) return false;
    return question.answer_ranges == null
      ? withinNumericRange(value, question.answer_min, question.answer_max)
      : validNumericRanges(question.answer_ranges) && question.answer_ranges.some(range => withinNumericRange(value, range.min, range.max));
  }
  const chosen = selection(response);
  if (!chosen.length) return null;
  if ((question.question_type === 'MSQ' || question.question_type === 'MCQ') && question.correct_option_sets != null) {
    return validOptionSets(question.correct_option_sets) &&
      (question.question_type !== 'MCQ' || question.correct_option_sets.every(set => set.length === 1)) && question.correct_option_sets.some(set => {
      const expected = selection(set);
      return chosen.length === expected.length && chosen.every((value, index) => value === expected[index]);
    });
  }
  const expected = question.question_type === 'MSQ' ? selection(question.correct_options) : selection(question.correct_option);
  return chosen.length === expected.length && chosen.every((value, index) => value === expected[index]);
}
