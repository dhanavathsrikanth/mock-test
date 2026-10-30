"use client";

import { hasNumericPrecision, numericKeypress, numericResponse } from "@/lib/question-response";

export function NumericAnswerInput({ value, onChange, decimalPlaces }: {
  value: string;
  onChange: (value: string) => void;
  decimalPlaces?: number | null;
}) {
  const invalidNumber = value.length > 0 && numericResponse(value) == null;
  const invalidPrecision = !hasNumericPrecision(value, decimalPlaces);
  const invalid = invalidNumber || invalidPrecision;
  return (
    <div className="max-w-sm space-y-3 rounded-xl border bg-card p-4">
      <label htmlFor="nat-answer" className="block text-sm font-semibold">Numerical answer</label>
      <input
        id="nat-answer"
        aria-describedby="nat-guidance"
        aria-invalid={invalid}
        value={value}
        placeholder="Enter your answer"
        readOnly
        inputMode="none"
        className="h-12 w-full rounded-lg border bg-background px-3 font-mono text-lg tabular-nums"
      />
      <p id="nat-guidance" className="text-xs text-muted-foreground">
        Use the on-screen keypad. {decimalPlaces === 0 ? 'Enter an integer.' : decimalPlaces != null ? `Enter up to ${decimalPlaces} decimal places.` : ''} Follow the rounding instruction in the question.
      </p>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Numeric keypad">
        {['7','8','9','4','5','6','1','2','3','sign','0','.'].map(key => (
          <button key={key} type="button" aria-label={key === 'sign' ? 'Toggle sign' : key === '.' ? 'Decimal point' : `Digit ${key}`}
            disabled={key === '.' ? decimalPlaces === 0 || value.includes('.') : /^\d$/.test(key) && decimalPlaces != null && value.includes('.') && (value.split('.')[1]?.length || 0) >= decimalPlaces}
            onClick={() => onChange(numericKeypress(value, key, decimalPlaces))}
            className="rounded-lg border bg-muted/40 py-3 text-base font-semibold hover:bg-accent active:bg-accent disabled:cursor-not-allowed disabled:opacity-40">
            {key === 'sign' ? '±' : key}
          </button>
        ))}
        <button type="button" onClick={() => onChange(numericKeypress(value, 'backspace'))} className="col-span-2 rounded-lg border py-2 text-sm hover:bg-accent">Backspace</button>
        <button type="button" onClick={() => onChange('')} className="rounded-lg border py-2 text-sm hover:bg-accent">Clear answer</button>
      </div>
      {invalid && <p role="status" className="text-xs text-amber-700 dark:text-amber-400">{invalidPrecision ? decimalPlaces === 0 ? 'Enter an integer. Use Backspace or Clear answer to edit.' : `Use at most ${decimalPlaces} decimal places. Use Backspace or Clear answer to edit.` : 'Complete the number to save an answer.'}</p>}
      <p className="text-xs text-muted-foreground">No negative marking. Full marks only when the answer is within the official key range.</p>
    </div>
  );
}
