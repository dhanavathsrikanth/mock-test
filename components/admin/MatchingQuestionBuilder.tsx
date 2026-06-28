"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, GripVertical, ArrowDownUp } from "lucide-react";

interface ListItem {
  id: string;
  key: string;
  value: string;
}

interface MatchingQuestionBuilderProps {
  onChange: (questionText: string, options: string[], correctOption: number) => void;
  initialData?: {
    questionText: string;
    options: string[];
    correctOption: number;
  };
}

type FormatType = "numbered" | "lettered";

export function MatchingQuestionBuilder({
  onChange,
  initialData,
}: MatchingQuestionBuilderProps) {
  const [format, setFormat] = useState<FormatType>("numbered");
  const [preamble, setPreamble] = useState(
    initialData?.questionText?.split("|")[0]?.trim() ||
    "Match list I with list II and select the correct answer using the codes below in the lists:"
  );
  const [list1Items, setList1Items] = useState<ListItem[]>(
    initialData
      ? parseExistingList1(initialData.questionText)
      : [
          { id: "1", key: "1", value: "" },
          { id: "2", key: "2", value: "" },
          { id: "3", key: "3", value: "" },
          { id: "4", key: "4", value: "" },
        ]
  );
  const [list2Items, setList2Items] = useState<ListItem[]>(
    initialData
      ? parseExistingList2(initialData.questionText)
      : [
          { id: "a", key: "a", value: "" },
          { id: "b", key: "b", value: "" },
          { id: "c", key: "c", value: "" },
          { id: "d", key: "d", value: "" },
        ]
  );
  const [correctMappings, setCorrectMappings] = useState<Record<string, string>>(
    initialData?.options?.[0]
      ? parseExistingMappings(initialData.options[0])
      : { "1": "a", "2": "b", "3": "c", "4": "d" }
  );
  const [showPreview, setShowPreview] = useState(false);

  const list1Keys = format === "numbered" ? ["1", "2", "3", "4"] : ["P", "Q", "R", "S"];
  const list2Keys = format === "numbered" ? ["a", "b", "c", "d"] : ["1", "2", "3", "4"];

  const addList1Item = () => {
    const newKey = String(list1Items.length + 1);
    setList1Items([...list1Items, { id: newKey, key: newKey, value: "" }]);
  };

  const addList2Item = () => {
    const newKey = String.fromCharCode(97 + list2Items.length); // a, b, c, ...
    setList2Items([...list2Items, { id: newKey, key: newKey, value: "" }]);
  };

  const removeList1Item = (id: string) => {
    if (list1Items.length <= 2) return;
    setList1Items(list1Items.filter((item) => item.id !== id));
  };

  const removeList2Item = (id: string) => {
    if (list2Items.length <= 2) return;
    setList2Items(list2Items.filter((item) => item.id !== id));
  };

  const updateList1Item = (id: string, value: string) => {
    setList1Items(list1Items.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const updateList2Item = (id: string, value: string) => {
    setList2Items(list2Items.map((item) => (item.id === id ? { ...item, value } : item)));
  };

  const updateMapping = (list1Key: string, list2Key: string) => {
    setCorrectMappings({ ...correctMappings, [list1Key]: list2Key });
  };

  const generateQuestionText = (): string => {
    const list1Label = format === "numbered" ? "List I" : "List 1";
    const list2Label = format === "numbered" ? "List II" : "List 2";

    let table = `\n\n| **${list1Label}** | **${list2Label}** |\n| --- | --- |\n`;

    list1Items.forEach((item, idx) => {
      const list2Item = list2Items[idx];
      const list1Key = format === "numbered" ? `${item.key}.` : `${item.key}.`;
      const list2Key = list2Item ? `${list2Item.key}.` : "";
      const list2Value = list2Item?.value || "";
      table += `| **${list1Key}** ${item.value} | **${list2Key}** ${list2Value} |\n`;
    });

    return preamble + table;
  };

  const generateOptions = (): string[] => {
    const options: string[] = [];

    // Generate 4 options, first one is correct
    const correctOption: string[] = [];
    list1Items.forEach((item) => {
      const mapped = correctMappings[item.key] || "";
      correctOption.push(`${item.key}. ${mapped})`);
    });
    options.push(correctOption.join(", "));

    // Generate 3 incorrect options by shuffling
    const allList2Keys = list2Items.map((item) => item.key);
    for (let i = 0; i < 3; i++) {
      const shuffled = [...allList2Keys].sort(() => Math.random() - 0.5);
      const incorrectOption: string[] = [];
      list1Items.forEach((item, idx) => {
        incorrectOption.push(`${item.key}. ${shuffled[idx]})`);
      });
      options.push(incorrectOption.join(", "));
    }

    return options;
  };

  const handleGenerate = () => {
    const questionText = generateQuestionText();
    const options = generateOptions();
    onChange(questionText, options, 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Matching Question Builder</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={showPreview ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!showPreview) {
                handleGenerate();
              }
              setShowPreview(!showPreview);
            }}
          >
            <ArrowDownUp className="h-4 w-4 mr-1.5" />
            {showPreview ? "Edit" : "Preview"}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <PreviewMode
          questionText={generateQuestionText()}
          options={generateOptions()}
          correctOption={1}
        />
      ) : (
        <>
          {/* Format Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Format</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "numbered" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFormat("numbered");
                  setList1Items([
                    { id: "1", key: "1", value: "" },
                    { id: "2", key: "2", value: "" },
                    { id: "3", key: "3", value: "" },
                    { id: "4", key: "4", value: "" },
                  ]);
                  setList2Items([
                    { id: "a", key: "a", value: "" },
                    { id: "b", key: "b", value: "" },
                    { id: "c", key: "c", value: "" },
                    { id: "d", key: "d", value: "" },
                  ]);
                  setCorrectMappings({ "1": "a", "2": "b", "3": "c", "4": "d" });
                }}
              >
                Numbered (1, 2, 3, 4) + (a, b, c, d)
              </Button>
              <Button
                type="button"
                variant={format === "lettered" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFormat("lettered");
                  setList1Items([
                    { id: "P", key: "P", value: "" },
                    { id: "Q", key: "Q", value: "" },
                    { id: "R", key: "R", value: "" },
                    { id: "S", key: "S", value: "" },
                  ]);
                  setList2Items([
                    { id: "1", key: "1", value: "" },
                    { id: "2", key: "2", value: "" },
                    { id: "3", key: "3", value: "" },
                    { id: "4", key: "4", value: "" },
                  ]);
                  setCorrectMappings({ P: "1", Q: "2", R: "3", S: "4" });
                }}
              >
                Lettered (P, Q, R, S) + (1, 2, 3, 4)
              </Button>
            </div>
          </div>

          {/* Preamble */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Question Preamble</label>
            <textarea
              value={preamble}
              onChange={(e) => setPreamble(e.target.value)}
              placeholder="Match list I with list II and select the correct answer..."
              className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Two Column Editor */}
          <div className="grid grid-cols-2 gap-4">
            {/* List 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">
                  {format === "numbered" ? "List I (Items)" : "List 1 (Items)"}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addList1Item}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {list1Items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-1.5 rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {item.key}.
                    </span>
                    <input
                      value={item.value}
                      onChange={(e) => updateList1Item(item.id, e.target.value)}
                      placeholder={`Item ${item.key}`}
                      className="flex-1 h-7 rounded border border-input bg-background px-2 text-xs"
                    />
                    {list1Items.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeList1Item(item.id)}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* List 2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">
                  {format === "numbered" ? "List II (Definitions)" : "List 2 (Definitions)"}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addList2Item}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {list2Items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-bold shrink-0">
                      {item.key}.
                    </span>
                    <input
                      value={item.value}
                      onChange={(e) => updateList2Item(item.id, e.target.value)}
                      placeholder={`Definition ${item.key}`}
                      className="flex-1 h-7 rounded border border-input bg-background px-2 text-xs"
                    />
                    {list2Items.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeList2Item(item.id)}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Correct Answer Mapping */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Correct Answer Mapping</label>
            <div className="flex flex-wrap gap-2">
              {list1Items.map((item) => (
                <div key={item.id} className="flex items-center gap-1">
                  <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-1.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
                    {item.key}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <select
                    value={correctMappings[item.key] || ""}
                    onChange={(e) => updateMapping(item.key, e.target.value)}
                    className="h-7 rounded border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Select</option>
                    {list2Items.map((li) => (
                      <option key={li.id} value={li.key}>
                        {li.key}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button type="button" onClick={handleGenerate} className="w-full">
            Generate Question
          </Button>
        </>
      )}
    </div>
  );
}

function PreviewMode({
  questionText,
  options,
  correctOption,
}: {
  questionText: string;
  options: string[];
  correctOption: number;
}) {
  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="text-sm whitespace-pre-wrap">{questionText}</div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Options:</p>
        {options.map((opt, idx) => (
          <div
            key={idx}
            className={`p-2 rounded text-xs ${
              idx + 1 === correctOption
                ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                : "bg-background border"
            }`}
          >
            <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {opt}
            {idx + 1 === correctOption && (
              <span className="ml-2 text-green-600 text-[10px]">(Correct)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseExistingList1(questionText: string): ListItem[] {
  const items: ListItem[] = [];
  const tableMatch = questionText.match(/\|[\s\S]*\|/);
  if (!tableMatch) return items;

  const lines = tableMatch[0].split("\n").filter((l) => l.includes("|"));
  for (const line of lines) {
    if (line.includes("---")) continue;
    if (line.toLowerCase().includes("list")) continue;

    const cells = line.split("|").map((c) => c.trim()).filter((c) => c);
    if (cells.length >= 1) {
      const keyMatch = cells[0].match(/\*?\*?(\d+|[P-Q-R-S])\*?\*?\.?/);
      if (keyMatch) {
        const key = keyMatch[1];
        const value = cells[0].replace(/\*?\*?\d+\*?\*?\.?\s*/, "").replace(/\*?\*?[P-Q-R-S]\*?\*?\.?\s*/, "").trim();
        items.push({ id: key, key, value });
      }
    }
  }
  return items.length > 0 ? items : [{ id: "1", key: "1", value: "" }, { id: "2", key: "2", value: "" }];
}

function parseExistingList2(questionText: string): ListItem[] {
  const items: ListItem[] = [];
  const tableMatch = questionText.match(/\|[\s\S]*\|/);
  if (!tableMatch) return items;

  const lines = tableMatch[0].split("\n").filter((l) => l.includes("|"));
  for (const line of lines) {
    if (line.includes("---")) continue;
    if (line.toLowerCase().includes("list")) continue;

    const cells = line.split("|").map((c) => c.trim()).filter((c) => c);
    if (cells.length >= 2) {
      const keyMatch = cells[1].match(/\*?\*?([a-d])\*?\*?\.?/);
      if (keyMatch) {
        const key = keyMatch[1];
        const value = cells[1].replace(/\*?\*?[a-d]\*?\*?\.?\s*/, "").trim();
        items.push({ id: key, key, value });
      }
    }
  }
  return items.length > 0 ? items : [{ id: "a", key: "a", value: "" }, { id: "b", key: "b", value: "" }];
}

function parseExistingMappings(optionText: string): Record<string, string> {
  const mappings: Record<string, string> = {};
  const regex = /(\d+)\.\s*([a-d])\)/gi;
  let match;
  while ((match = regex.exec(optionText)) !== null) {
    mappings[match[1]] = match[2].toLowerCase();
  }
  return Object.keys(mappings).length > 0 ? mappings : { "1": "a", "2": "b", "3": "c", "4": "d" };
}
