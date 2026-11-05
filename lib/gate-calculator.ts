export type AngleMode = "deg" | "rad";
export type Calculation = { expression: string; result: string };
export type CalculatorState = {
  tokens: string[];
  entry: string;
  display: string;
  equation: string;
  fresh: boolean;
  memory: number;
  angle: AngleMode;
  history: Calculation[];
};

export function initialCalculatorState(): CalculatorState {
  return { tokens: [], entry: "0", display: "0", equation: "", fresh: true, memory: 0, angle: "deg", history: [] };
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Result is undefined or out of range");
  return String(Number(value.toPrecision(14)));
}

const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, mod: 2, "^": 3, root: 3, logbase: 3 };

// Parse calculator tokens directly; never execute user input as JavaScript.
export function evaluateTokens(tokens: string[]): number {
  let position = 0;
  const expression = (minimum = 0): number => {
    const token = tokens[position++];
    let left: number;
    if (token === "(") {
      left = expression();
      if (tokens[position++] !== ")") throw new Error("Close the parentheses");
    } else {
      if (token === undefined || token.trim() === "") throw new Error("Enter a value");
      left = Number(token);
      if (!Number.isFinite(left)) throw new Error("Invalid number");
    }
    while (position < tokens.length) {
      const op = tokens[position];
      const priority = precedence[op];
      if (priority === undefined || priority < minimum) break;
      position++;
      const right = expression(priority + (op === "^" ? 0 : 1));
      switch (op) {
        case "+": left += right; break;
        case "-": left -= right; break;
        case "*": left *= right; break;
        case "/": left /= right; break;
        case "mod": left %= right; break;
        case "^": left = left ** right; break;
        case "root": left = left < 0 && Number.isInteger(right) && Math.abs(right % 2) === 1 ? -((-left) ** (1 / right)) : left ** (1 / right); break;
        case "logbase": left = Math.log(left) / Math.log(right); break;
      }
      if (!Number.isFinite(left)) throw new Error("Result is undefined or out of range");
    }
    return left;
  };
  const result = expression();
  if (position !== tokens.length) throw new Error("Invalid expression");
  return result;
}

function pretty(tokens: string[]) {
  const labels: Record<string, string> = { "*": "×", "/": "÷", "-": "−", root: "ʸ√", logbase: "log base" };
  return tokens.map(t => labels[t] ?? t).join(" ");
}

function unary(action: string, value: number, angle: AngleMode): number {
  const radians = angle === "deg" ? value * Math.PI / 180 : value;
  const inverse = angle === "deg" ? 180 / Math.PI : 1;
  switch (action) {
    case "sin": return Math.sin(radians);
    case "cos": return Math.cos(radians);
    case "tan": return Math.abs(Math.cos(radians)) < 1e-15 ? NaN : Math.tan(radians);
    case "asin": return Math.asin(value) * inverse;
    case "acos": return Math.acos(value) * inverse;
    case "atan": return Math.atan(value) * inverse;
    case "sinh": return Math.sinh(value);
    case "cosh": return Math.cosh(value);
    case "tanh": return Math.tanh(value);
    case "asinh": return Math.asinh(value);
    case "acosh": return Math.acosh(value);
    case "atanh": return Math.atanh(value);
    case "sqrt": return Math.sqrt(value);
    case "cbrt": return Math.cbrt(value);
    case "square": return value ** 2;
    case "cube": return value ** 3;
    case "abs": return Math.abs(value);
    case "ln": return Math.log(value);
    case "log": return Math.log10(value);
    case "log2": return Math.log2(value);
    case "exp-e": return Math.exp(value);
    case "pow10": return 10 ** value;
    case "reciprocal": return 1 / value;
    case "percent": return value / 100;
    case "negate": return -value;
    case "factorial": {
      if (!Number.isInteger(value) || value < 0 || value > 170) return NaN;
      let result = 1;
      for (let i = 2; i <= value; i++) result *= i;
      return result;
    }
    default: throw new Error("Unknown function");
  }
}

export function calculatorReducer(state: CalculatorState, action: string): CalculatorState {
  if (action === "deg" || action === "rad") return { ...state, angle: action };
  if (action === "clear-history") return { ...state, history: [] };
  if (action === "clear") return { ...initialCalculatorState(), memory: state.memory, angle: state.angle, history: state.history };
  if (action === "mc") return { ...state, memory: 0 };
  const s = { ...state, tokens: [...state.tokens] };
  if (s.display === "Error") {
    Object.assign(s, initialCalculatorState(), { memory: state.memory, angle: state.angle, history: state.history });
  }
  const allTokens = () => [...s.tokens, ...(s.entry ? [s.entry] : [])];
  const operand = (): { value: number; label: string } => {
    if (s.entry) return { value: Number(s.entry), label: s.entry };
    if (s.tokens.at(-1) === ")") {
      let depth = 0;
      let start = s.tokens.length;
      do {
        start--;
        if (s.tokens[start] === ")") depth++;
        if (s.tokens[start] === "(") depth--;
      } while (start > 0 && depth > 0);
      const group = s.tokens.splice(start);
      return { value: evaluateTokens(group), label: pretty(group) };
    }
    throw new Error("Enter a value first");
  };
  const record = (expression: string, result: string) => {
    s.history = [{ expression, result }, ...s.history].slice(0, 100);
  };
  try {
    if (/^[0-9.]$/.test(action)) {
      if (!s.entry && s.tokens.at(-1) === ")") s.tokens.push("*");
      if (s.fresh || s.entry === "0") s.entry = action === "." ? "0." : action;
      else if (action !== "." || (!s.entry.includes(".") && !s.entry.includes("e"))) s.entry += action;
      s.fresh = false;
      s.display = s.entry;
      s.equation = pretty(s.tokens);
    } else if (action === "backspace") {
      if (s.entry) {
        s.entry = s.entry.slice(0, -1) || "0";
        s.display = s.entry;
      } else if (s.tokens.length) {
        const last = s.tokens.pop()!;
        if (Number.isFinite(Number(last))) s.entry = last;
        s.display = s.entry || "0";
      }
      s.fresh = false;
      s.equation = pretty(s.tokens);
    } else if (action === "pi" || action === "euler" || action === "mr") {
      if (!s.entry && s.tokens.at(-1) === ")") s.tokens.push("*");
      s.entry = formatNumber(action === "pi" ? Math.PI : action === "euler" ? Math.E : s.memory);
      s.display = s.entry;
      s.equation = pretty(s.tokens);
      s.fresh = true;
    } else if (["ms", "m+", "m-"].includes(action)) {
      const value = s.entry ? Number(s.entry) : evaluateTokens(s.tokens);
      s.memory = Number(formatNumber(action === "ms" ? value : s.memory + (action === "m+" ? value : -value)));
    } else if (action === "exp-notation") {
      if (s.entry && !s.entry.includes("e")) s.entry += "e";
      s.display = s.entry || s.display;
      s.fresh = false;
    } else if (action === "negate" && /e[+-]?$/.test(s.entry)) {
      s.entry = s.entry.endsWith("-") ? s.entry.slice(0, -1) : s.entry.replace(/\+$/, "") + "-";
      s.display = s.entry;
    } else if (action in precedence) {
      if (s.entry) s.tokens.push(s.entry);
      else if (s.tokens.length && s.tokens.at(-1) !== ")" && s.tokens.at(-1) !== "(") s.tokens.pop();
      if (!s.tokens.length || s.tokens.at(-1) === "(") {
        if (action !== "-") return state;
        s.entry = "-";
        s.fresh = false;
        return s;
      }
      s.tokens.push(action);
      s.entry = "";
      s.fresh = true;
      s.equation = pretty(s.tokens);
    } else if (action === "(") {
      if (s.entry && !(s.fresh && s.entry === "0" && !s.tokens.length)) s.tokens.push(s.entry, "*");
      else if (s.tokens.at(-1) === ")") s.tokens.push("*");
      s.tokens.push("(");
      s.entry = "";
      s.fresh = true;
      s.equation = pretty(s.tokens);
    } else if (action === ")") {
      if (s.tokens.filter(t => t === "(").length <= s.tokens.filter(t => t === ")").length) return state;
      if (s.entry) s.tokens.push(s.entry);
      if (s.tokens.at(-1) !== ")" && !Number.isFinite(Number(s.tokens.at(-1)))) return state;
      s.tokens.push(")");
      s.entry = "";
      s.fresh = true;
      s.equation = pretty(s.tokens);
    } else if (action === "equals") {
      const tokens = allTokens();
      const result = formatNumber(evaluateTokens(tokens));
      const expression = pretty(tokens);
      record(expression, result);
      s.equation = `${expression} = ${result}`;
      s.tokens = [];
      s.entry = result;
      s.display = result;
      s.fresh = true;
    } else {
      const { value, label } = operand();
      const result = formatNumber(unary(action, value, s.angle));
      const expression = `${action}(${label})`;
      s.entry = result;
      s.display = result;
      s.equation = `${pretty(s.tokens)} ${expression} = ${result}`.trim();
      s.fresh = true;
      record(expression, result);
    }
    return s;
  } catch (error) {
    return { ...state, display: "Error", equation: error instanceof Error ? error.message : "Invalid calculation", fresh: true };
  }
}
