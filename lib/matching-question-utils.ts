export interface MatchingListItem {
  key: string;
  value: string;
}

export interface ParsedMatchingQuestion {
  preamble: string;
  list1: MatchingListItem[];
  list2: MatchingListItem[];
  list1Label: string;
  list2Label: string;
}

export interface MatchPair {
  from: string;
  to: string;
}

const LIST_ITEM_PATTERN = /(?:^|\s)([A-Z])[.)]\s*(.+?)(?=(?:\s+[A-Z][.)]\s)|$)/g;
const MATCH_CODE_PATTERN = /([A-Z])\s*[-–→]\s*(\d+)/g;

export function isMatchingQuestion(text: string): boolean {
  const hasList1 = /list\s*[1I]/i.test(text);
  const hasList2 = /list\s*[2II]/i.test(text);
  const hasListItems = /\b[P-Q-R-S][.)]\s/.test(text) || /\b[P-Q-R-S]\)\s/.test(text);
  const hasNumberedItems = /\b[1-4][.)]\s/.test(text);
  const hasTable = /\|.*\|.*\|/.test(text);
  return hasList1 && hasList2 && (hasListItems || hasNumberedItems || hasTable);
}

export function parseMatchingQuestion(text: string): ParsedMatchingQuestion | null {
  if (!isMatchingQuestion(text)) return null;

  const list1Match = text.match(/list\s*[1I]\s*\(([^)]+)\)/i);
  const list2Match = text.match(/list\s*[2II]\s*\(([^)]+)\)/i);

  const list1Label = list1Match ? list1Match[1].trim() : "List I";
  const list2Label = list2Match ? list2Match[1].trim() : "List II";

  if (/\|.*\|.*\|/.test(text)) {
    return parseTableFormat(text, list1Label, list2Label);
  }

  const preambleMatch = text.match(/^(.+?)(?=\b[P]\s*[.)])/i);
  const preamble = preambleMatch ? preambleMatch[1].trim() : text;

  const list1Items = extractListItems(text, ["P", "Q", "R", "S"]);

  const list2Pattern = /(?:list\s*2[^.]*\.?\s*)(.+?)(?=$)/i;
  const list2Section = text.match(list2Pattern);
  let list2Items: MatchingListItem[] = [];

  if (list2Section) {
    const list2Text = list2Section[1];
    const numItems = extractNumberedItems(list2Text);
    if (numItems.length > 0) {
      list2Items = numItems;
    }
  }

  if (list1Items.length === 0) return null;

  return {
    preamble,
    list1: list1Items,
    list2: list2Items,
    list1Label,
    list2Label,
  };
}

function parseTableFormat(text: string, list1Label: string, list2Label: string): ParsedMatchingQuestion | null {
  const lines = text.split('\n');
  const list1: MatchingListItem[] = [];
  const list2: MatchingListItem[] = [];
  let preamble = '';
  let foundTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('|') && trimmed.includes('List')) {
      foundTable = true;
      continue;
    }

    if (trimmed.startsWith('|') && !trimmed.includes('---')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 2) {
        for (let i = 0; i < cells.length; i++) {
          const raw = cells[i].replace(/\*\*/g, '').trim();

          const numMatch = raw.match(/^(\d+)\.\s*(.+)$/);
          if (numMatch) {
            list1.push({ key: numMatch[1], value: numMatch[2].trim() });
            continue;
          }

          const letterMatch = raw.match(/^([a-d])\.\s*(.+)$/i);
          if (letterMatch) {
            list2.push({ key: letterMatch[1].toLowerCase(), value: letterMatch[2].trim() });
          }
        }
      }
    }
  }

  if (!foundTable) {
    preamble = text;
  } else {
    const tableStart = text.indexOf('|');
    preamble = text.substring(0, tableStart).trim();
  }

  if (list1.length === 0) return null;

  return {
    preamble,
    list1,
    list2,
    list1Label,
    list2Label,
  };
}

function extractListItems(text: string, keys: string[]): MatchingListItem[] {
  const items: MatchingListItem[] = [];

  for (const key of keys) {
    const patterns = [
      new RegExp(`\\b${key}\\s*[.)]\\s*(.+?)(?=\\s+[A-Z][.)]\\s|$)`, "i"),
      new RegExp(`\\b${key}\\)\\s*(.+?)(?=\\s+[A-Z]\\)|$)`, "i"),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1].trim()) {
        const value = match[1].trim().replace(/[.,;]$/, "");
        if (!items.find((i) => i.key === key)) {
          items.push({ key, value });
        }
        break;
      }
    }
  }

  return items;
}

function extractNumberedItems(text: string): MatchingListItem[] {
  const items: MatchingListItem[] = [];
  const pattern = /(\d+)\s*[.)]\s*(.+?)(?=\s+\d+[.)]\s|$)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const value = match[2].trim().replace(/[.,;]$/, "");
    if (value) {
      items.push({ key: match[1], value });
    }
  }

  return items;
}

export function parseMatchCode(optionText: string): MatchPair[] {
  const pairs: MatchPair[] = [];

  const arrowPattern = /(\d+|[P-Q-R-S])\s*→\s*([a-d]|\d+)/gi;
  let match;
  while ((match = arrowPattern.exec(optionText)) !== null) {
    pairs.push({ from: match[1], to: match[2].toLowerCase() });
  }

  if (pairs.length >= 2) return pairs;

  const pqrPattern = /([A-Z])\s*[-–→]\s*(\d+)/g;
  while ((match = pqrPattern.exec(optionText)) !== null) {
    pairs.push({ from: match[1], to: match[2] });
  }

  if (pairs.length >= 2) return pairs;

  const numberedPattern = /(\d+)\.\s*([a-d])\s*\)/gi;
  while ((match = numberedPattern.exec(optionText)) !== null) {
    pairs.push({ from: match[1], to: match[2].toLowerCase() });
  }

  return pairs;
}

export function isMatchCodeOption(text: string): boolean {
  const pairs = parseMatchCode(text);
  return pairs.length >= 2;
}

export function formatMatchPair(pair: MatchPair): string {
  return `${pair.from} → ${pair.to}`;
}
