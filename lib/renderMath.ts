import katex from "katex";

const HTML_ENTITY_MAP: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&le;": "≤",
  "&ge;": "≥",
  "&ne;": "≠",
  "&plus;": "+",
  "&minus;": "−",
  "&times;": "×",
  "&div;": "÷",
  "&sup2;": "²",
  "&sup3;": "³",
  "&sup1;": "¹",
  "&radic;": "√",
  "&infin;": "∞",
  "&pi;": "π",
  "&deg;": "°",
  "&sum;": "∑",
  "&prod;": "∏",
  "&int;": "∫",
  "&alpha;": "α",
  "&beta;": "β",
  "&gamma;": "γ",
  "&delta;": "δ",
  "&theta;": "θ",
  "&lambda;": "λ",
  "&sigma;": "σ",
  "&omega;": "ω",
  "&Delta;": "Δ",
  "&Sigma;": "Σ",
  "&Omega;": "Ω",
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": '\u201c',
  "&ldquo;": '\u201d',
  "&ndash;": "–",
  "&mdash;": "—",
  "&frac12;": "½",
  "&frac14;": "¼",
  "&frac34;": "¾",
};

function decodeHtmlEntities(text: string): string {
  let result = text;
  for (const [entity, char] of Object.entries(HTML_ENTITY_MAP)) {
    result = result.split(entity).join(char);
  }
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  return result;
}

function convertPlainToLatex(text: string): string {
  let result = text;

  result = result.replace(/\^(\d+)/g, "^{$1}");
  result = result.replace(/_(\d+)/g, "_{$1}");

  result = result.replace(/\^\{([^}]+)\}/g, "^{$1}");
  result = result.replace(/_\{([^}]+)\}/g, "_{$1}");

  result = result.replace(/(\d)\/(\d)/g, "\\frac{$1}{$2}");

  result = result.replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}");
  result = result.replace(/√\(([^)]+)\)/g, "\\sqrt{$1}");

  return result;
}

const LATEX_COMMANDS = /\\(frac|sqrt|sum|int|prod|infty|alpha|beta|gamma|delta|theta|lambda|sigma|omega|Delta|Sigma|Omega|leq|geq|neq|pm|mp|times|div|cdot|partial|nabla|forall|exists|in|subset|cup|cap|rightarrow|leftarrow|Rightarrow|Leftarrow|Leftrightarrow|overline|underline|vec|hat|bar|dot|ddot|tilde|\\{[^}]*\\}|[a-zA-Z]+\{)/;

function hasLatex(text: string): boolean {
  return LATEX_COMMANDS.test(text);
}

const MATH_INLINE_REGEX = /\$\$([\s\S]+?)\$\$|\$([^\$]+?)\$/g;

interface TextSegment {
  type: "text" | "math-display" | "math-inline";
  content: string;
}

function splitSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_INLINE_REGEX)) {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, matchStart) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "math-display", content: match[1].trim() });
    } else {
      segments.push({ type: "math-inline", content: match[2].trim() });
    }
    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false,
      macros: {
        "\\implies": "\\Rightarrow",
        "\\iff": "\\Leftrightarrow",
      },
    });
  } catch {
    return `<code class="katex-error" title="${latex}">${latex}</code>`;
  }
}

export function renderMathToHtml(text: string): string {
  if (!text) return "";

  let decoded = decodeHtmlEntities(text);
  const segments = splitSegments(decoded);

  return segments
    .map((seg) => {
      if (seg.type === "math-display") {
        let latex = seg.content;
        if (!hasLatex(latex)) {
          latex = convertPlainToLatex(latex);
        }
        return renderLatex(latex, true);
      }
      if (seg.type === "math-inline") {
        let latex = seg.content;
        if (!hasLatex(latex)) {
          latex = convertPlainToLatex(latex);
        }
        return renderLatex(latex, false);
      }

      let plainText = seg.content;
      if (hasLatex(plainText)) {
        const parts: string[] = [];
        let lastIdx = 0;
        const inlineCmdRegex = /\\(frac|sqrt|sum|int|prod|infty|alpha|beta|gamma|delta|theta|lambda|sigma|omega|Delta|Sigma|Omega|leq|geq|neq|pm|mp|times|div|cdot|partial|nabla|forall|exists|in|subset|cup|cap|rightarrow|leftarrow|Rightarrow|Leftarrow|Leftrightarrow|overline|underline|vec|hat|bar|dot|ddot|tilde)[^a-zA-Z{]|\\[a-zA-Z]+\{/g;
        let cmdMatch;
        while ((cmdMatch = inlineCmdRegex.exec(plainText)) !== null) {
          if (cmdMatch.index > lastIdx) {
            parts.push(escapeHtml(plainText.slice(lastIdx, cmdMatch.index)));
          }
          const mathStart = cmdMatch.index;
          let mathEnd = mathStart;
          let depth = 0;
          for (let i = mathStart; i < plainText.length; i++) {
            if (plainText[i] === "{") depth++;
            if (plainText[i] === "}") depth--;
            if (depth === 0 && i > mathStart) {
              const after = plainText[i + 1] || "";
              if (!/[a-zA-Z]/.test(after)) {
                mathEnd = i + 1;
                break;
              }
            }
          }
          if (mathEnd <= mathStart) mathEnd = Math.min(mathStart + 50, plainText.length);
          const mathStr = convertPlainToLatex(plainText.slice(mathStart, mathEnd));
          parts.push(renderLatex(mathStr, false));
          lastIdx = mathEnd;
          inlineCmdRegex.lastIndex = mathEnd;
        }
        if (lastIdx < plainText.length) {
          parts.push(escapeHtml(plainText.slice(lastIdx)));
        }
        return parts.join("");
      }

      plainText = convertPlainToLatex(plainText);
      if (plainText !== seg.content) {
        return renderLatex(plainText, false);
      }

      return escapeHtml(seg.content);
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
