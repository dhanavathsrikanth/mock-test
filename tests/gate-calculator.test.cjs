const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/gate-calculator.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject });
const { calculatorReducer: reduce, initialCalculatorState: initial } = exportsObject;
const run = (...actions) => actions.reduce(reduce, initial());
const close = (actual, expected) => assert.ok(Math.abs(Number(actual) - expected) < 1e-10, `${actual} ≠ ${expected}`);

test("reference postfix examples and chained functions", () => {
  assert.equal(run("3", "0", "sin").display, "0.5");
  assert.equal(run("1", "0", "0", "0", "log").display, "3");
  assert.equal(run("2", "^", "1", "0", "equals").display, "1024");
  assert.equal(run("1", "4", "4", "sqrt").display, "12");
  assert.equal(run("3", "0", "sin", "reciprocal").display, "2");
});

test("precedence, parentheses, unary on groups, and right-associative powers", () => {
  assert.equal(run("2", "+", "3", "*", "4", "equals").display, "14");
  assert.equal(run("(", "2", "+", "3", ")", "*", "4", "equals").display, "20");
  assert.equal(run("2", "+", "(", "3", "+", "1", ")", "square", "equals").display, "18");
  assert.equal(run("2", "^", "3", "^", "2", "equals").display, "512");
  assert.equal(run("2", "+", "3", "square", "equals").display, "11");
});

test("angle modes and inverse trigonometry", () => {
  close(run("0", ".", "5", "asin").display, 30);
  close(run("rad", "pi", "/", "2", "equals", "sin").display, 1);
  assert.equal(run("rad", "clear").angle, "rad");
});

test("scientific notation, negative exponents, roots, and logarithm bases", () => {
  assert.equal(run("2", "exp-notation", "3", "equals").display, "2000");
  assert.equal(run("2", "exp-notation", "negate", "3", "equals").display, "0.002");
  assert.equal(run("2", "7", "negate", "root", "3", "equals").display, "-3");
  assert.equal(run("8", "logbase", "2", "equals").display, "3");
  assert.equal(run("1", "7", "mod", "5", "equals").display, "2");
});

test("memory persists through clear and supports recall and accumulation", () => {
  assert.equal(run("4", "ms", "clear", "2", "m+", "clear", "mr").display, "6");
  assert.equal(run("4", "ms", "2", "m-", "mc", "mr").display, "0");
});

test("errors recover, invalid factorials and singularities stay finite", () => {
  for (const actions of [["1", "/", "0", "equals"], ["1", "negate", "sqrt"], ["0", "log"], ["1", ".", "5", "factorial"], ["9", "0", "tan"], ["(", "2", "equals"]]) {
    const state = run(...actions);
    assert.equal(state.display, "Error");
    assert.equal(reduce(state, "7").display, "7");
  }
  assert.equal(run("1", "7", "0", "factorial").display.includes("e+306"), true);
});

test("remaining scientific functions", () => {
  for (const [actions, expected] of [
    [["2", "cube"], 8], [["2", "negate", "abs"], 2], [["8", "cbrt"], 2],
    [["5", "factorial"], 120], [["2", "pow10"], 100], [["8", "log2"], 3],
    [["euler", "ln"], 1], [["1", "exp-e"], Math.E], [["5", "0", "percent"], .5],
    [["1", "sinh", "asinh"], 1], [["1", "cosh", "acosh"], 1], [["1", "tanh", "atanh"], 1],
    [["6", "0", "cos"], .5], [["4", "5", "tan"], 1], [["0", "acos"], 90], [["1", "atan"], 45],
  ]) close(run(...actions).display, expected);
});

test("editing, operation replacement, fresh entry, and history clearing", () => {
  assert.equal(run("1", "2", "3", "backspace", "equals").display, "12");
  assert.equal(run("2", "+", "*", "3", "equals").display, "6");
  assert.equal(run("2", "square", "5").display, "5");
  const state = run("2", "+", "3", "equals", "clear-history");
  assert.equal(state.display, "5");
  assert.equal(state.history.length, 0);
});
