const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, console, setInterval, clearInterval, ...globals,
    require: name => name in dependencies ? dependencies[name] : require(name),
  });
  return exports;
}

test("test calculator folds palette, retains calculations, and never captures answer keystrokes", async () => {
  const listeners = new Map();
  const windowMock = {
    innerWidth: 390,
    matchMedia: () => ({ matches: false }),
    addEventListener(name, handler) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(handler); },
    removeEventListener(name, handler) { listeners.get(name)?.delete(handler); },
    setInterval: () => 0,
    clearInterval() {},
  };
  const documentMock = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
  const css = new Proxy({}, { get: (_, key) => key });
  const engine = load("lib/gate-calculator.ts", {});
  const { ExamCalculatorPanel } = load("components/calculator/ExamCalculatorPanel.tsx", {
    "@/app/(dashboard)/test/[sessionId]/exam-tools.module.css": { default: css },
  }, { window: windowMock });
  const { GateCalculator } = load("components/calculator/GateCalculator.tsx", {
    "@/lib/gate-calculator": engine,
    "@/app/calculator/calculator.module.css": { default: css },
  }, { window: windowMock, document: documentMock });
  const noOp = () => null;
  const router = { push() {}, replace() {} };
  const { ExamClient } = load("app/(dashboard)/test/[sessionId]/exam-client.tsx", {
    "next/navigation": { useRouter: () => router },
    "@/lib/supabase/client": { createClient: () => { throw new Error("Calculator must not save an answer"); } },
    "./exam-store": { useExamStore: { setState() {} } },
    "@/components/ui/button": { Button: props => React.createElement("button", props) },
    "@/components/calculator/GateCalculator": { GateCalculator },
    "@/components/calculator/ExamCalculatorPanel": { ExamCalculatorPanel },
    "./exam-tools.module.css": { default: css },
    "@/components/report/ReportButton": { ReportButton: noOp },
    "@/components/QuestionFigure": { QuestionFigure: noOp },
    "@/components/QuestionPrompt": { QuestionPrompt: props => React.createElement("p", null, props.text) },
    "@/components/NumericAnswerInput": { NumericAnswerInput: noOp },
    "@/components/QuestionTypeTag": { QuestionTypeTag: noOp },
    "@/lib/marking": { formatMarks: String, negativeMarkLabel: () => "0", questionMarks: () => ({ positive: 1, negative: 0 }) },
    "@/lib/question-response": { hasResponse: value => value != null, selection: () => [] },
    "@/components/MathText": { MathText: noOp },
    "@/components/MatchingQuestion": { MatchingQuestion: noOp },
    "@/components/MatchOption": { MatchOption: noOp },
    "@/lib/matching-question-utils": { isMatchingQuestion: () => false, isMatchCodeOption: () => false },
    "@/components/ui/toast-provider": { useToast: () => ({ toast() {} }) },
  }, { window: windowMock, document: documentMock });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(ExamClient, {
      userId: "preview", session: { id: "preview", total_questions: 2, duration_minutes: 0, started_at: new Date().toISOString(), mode: "practice" },
      questions: [1, 2].map(i => ({ id: `q${i}`, question_text: `Question ${i}`, question_type: "MCQ" })),
      initialAnswers: {}, initialBookmarks: new Set(),
    })); });
    const root = () => renderer.root;
    const panel = () => root().findByProps({ id: "exam-calculator" });
    const output = () => root().findByType("output").children.join("");
    const click = async props => act(async () => root().findByProps(props).props.onClick());
    assert.equal(panel().props["aria-hidden"], true);
    assert.equal(listeners.get("keydown")?.size || 0, 0);
    await click({ "aria-label": "Open calculator" });
    assert.equal(panel().props["aria-hidden"], false);
    assert.match(root().findByType("aside").props.className, /paletteCollapsed/);
    assert.equal(root().findAllByType("details").length, 0, "no calculation history in tests");
    assert.equal(root().findAllByProps({ "aria-label": "Keyboard input ON" }).length, 0, "no practice toolbar");
    assert.equal(listeners.get("keydown").size, 1, "only the Escape-to-close handler is registered");
    for (const handler of listeners.get("keydown")) handler({ key: "7", preventDefault: () => assert.fail("must not capture answer typing") });
    assert.equal(output(), "0");
    for (const key of ["3", "0", "sin", "ms"]) await click({ "data-action": key });
    assert.equal(output(), "0.5");
    await click({ "aria-label": "Close scientific calculator" });
    assert.equal(panel().props["aria-hidden"], true);
    assert.doesNotMatch(root().findByType("aside").props.className, /paletteCollapsed/);
    await click({ "aria-label": "Open calculator" });
    assert.equal(output(), "0.5");
    for (const key of ["clear", "mr"]) await click({ "data-action": key });
    assert.equal(output(), "0.5", "memory survives close/reopen");
    const nextButton = root().findAllByType("button").find(button => button.children.includes("Save & Next"));
    await act(async () => nextButton.props.onClick());
    assert.equal(output(), "0.5", "question navigation preserves calculator state");
    assert.equal(panel().props["aria-hidden"], false);
    await act(async () => { for (const handler of [...listeners.get("keydown")]) handler({ key: "Escape", preventDefault() {} }); });
    assert.equal(panel().props["aria-hidden"], true);
    assert.equal(listeners.get("keydown").size, 0);
    const edge = () => root().findByProps({ "aria-label": "Pull calculator from right edge" });
    const dragBar = () => root().findByProps({ className: "calculatorDragBar" });
    const pointer = clientX => ({ button: 0, clientX, pointerId: 1, currentTarget: { setPointerCapture() {} } });
    await act(async () => edge().props.onPointerDown(pointer(385)));
    await act(async () => edge().props.onPointerMove(pointer(220)));
    assert.equal(panel().props["data-dragging"], true, "drawer follows the drag before release");
    await act(async () => edge().props.onPointerUp(pointer(180)));
    assert.equal(panel().props["data-open"], true, "dragging left from edge opens the calculator");
    assert.equal(output(), "0.5", "edge opening retains the previous calculation");
    await act(async () => dragBar().props.onPointerDown(pointer(90)));
    await act(async () => dragBar().props.onPointerMove(pointer(260)));
    await act(async () => dragBar().props.onPointerUp(pointer(300)));
    assert.equal(panel().props["aria-hidden"], true, "swiping header right tucks calculator away");
    await act(async () => edge().props.onClick({ detail: 0 }));
    assert.equal(panel().props["data-open"], true, "keyboard activation still works after a swipe");
    await click({ "aria-label": "Close scientific calculator" });
    await act(async () => edge().props.onPointerDown(pointer(380)));
    await act(async () => edge().props.onPointerMove(pointer(355)));
    await act(async () => edge().props.onPointerUp(pointer(355)));
    assert.equal(panel().props["data-open"], false, "short accidental drags do not open the panel");
    await act(async () => edge().props.onPointerDown(pointer(380)));
    await act(async () => edge().props.onPointerMove(pointer(200)));
    await act(async () => edge().props.onPointerCancel());
    assert.equal(panel().props["data-dragging"], false);
    assert.equal(panel().props["data-open"], false, "canceled gestures restore the closed position");
    await act(async () => edge().props.onClick({ detail: 1 }));
    assert.equal(panel().props["data-open"], true, "a simple tap also opens the calculator");
    await click({ "aria-label": "Close scientific calculator" });
    windowMock.matchMedia = () => ({ matches: true });
    await act(async () => edge().props.onPointerDown(pointer(380)));
    await act(async () => edge().props.onPointerMove(pointer(100)));
    await act(async () => edge().props.onPointerUp(pointer(100)));
    assert.equal(panel().props["data-open"], false, "mobile dragging does not change desktop behavior");
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});
