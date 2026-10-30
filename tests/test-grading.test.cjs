const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

function loadGrader({ expired = false, userId = "student", saved = [], multiple = false, numeric = false, marksToAll = false, alternatives = false, multipleAlternatives = false, mcqAlternatives = false } = {}) {
  let graded;
  let completed = false;
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
    from(table) {
      let operation = "select";
      let body;
      const response = () => {
        if (table === "test_sessions" && operation === "select") return { data: {
          id: "session", user_id: "student", exam_id: "gate", question_ids: ["q1", "q2", "q3"],
          status: "in_progress", duration_minutes: 1,
          started_at: new Date(Date.now() - (expired ? 180000 : 0)).toISOString(),
        } };
        if (table === "test_answers" && operation === "select") return { data: saved };
        if (table === "questions" && multipleAlternatives) return { data: [{id:'q1',question_type:'MSQ',correct_option:null,correct_options:[1,3,4],correct_option_sets:[[1,3,4],[1,3]]},{id:'q2',correct_option:1},{id:'q3',correct_option:1}] };
        if (table === "questions" && mcqAlternatives) return { data: [{id:'q1',question_type:'MCQ',correct_option:1,correct_option_sets:[[1],[2]]},{id:'q2',correct_option:1},{id:'q3',correct_option:1}] };
        if (table === "questions" && alternatives) return { data: [{id:'q1',question_type:'NAT',correct_option:null,answer_min:-5,answer_max:-5,answer_ranges:[{min:-5,max:-5},{min:5,max:5}],answer_decimal_places:0},{id:'q2',correct_option:1},{id:'q3',correct_option:1}] };
        if (table === "questions") return { data: [
          marksToAll ? { id: "q1", question_type: "MCQ", correct_option: null, marks_to_all: true } : numeric ? { id: "q1", question_type: "NAT", correct_option: null, answer_min: "1.00", answer_max: "1.15", answer_decimal_places: 2 } : multiple ? { id: "q1", question_type: "MSQ", correct_option: null, correct_options: [1, 3] } : { id: "q1", correct_option: 3 }, { id: "q2", correct_option: 1 }, { id: "q3", correct_option: 1 },
        ] };
        if (operation === "upsert") graded = body;
        if (table === "test_sessions" && operation === "update") completed = true;
        return { error: null };
      };
      return {
        select() { return this; }, eq() { return this; }, in() { return this; },
        update(value) { operation = "update"; body = value; return this; },
        upsert(value) { operation = "upsert"; body = value; return this; },
        single: async () => response(), then(resolve, reject) { return Promise.resolve(response()).then(resolve, reject); },
      };
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("app/(dashboard)/test/[sessionId]/actions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: (name) => name === "@/lib/question-response" ? loadResponses() : ({ createClient: async () => supabase }) });
  return { submit: exports.submitTest, graded: () => graded, completed: () => completed };
}

test("submission grades every selected question, with unanswered questions explicitly skipped", async () => {
  const grader = loadGrader();
  assert.equal((await grader.submit("session", "student", { q1: 3, q2: 4 })).success, true);
  const graded = grader.graded();
  assert.equal(graded.length, 3);
  assert.equal(graded[0].is_correct, true);
  assert.equal(graded[1].is_correct, false);
  assert.equal(graded[2].selected_option, null);
  assert.equal(graded[2].is_correct, null);
  assert.equal(grader.completed(), true);
});

test('server preserves either accepted MCQ choice during submission and expiry without allowing multiple selection',async()=>{
 for(const [value,correct] of [[1,true],[2,true],[3,false],[4,false],[null,null],[[1,2],null]]){
  const grader=loadGrader({mcqAlternatives:true});await grader.submit('session','student',{q1:value});assert.equal(grader.graded()[0].is_correct,correct);assert.equal(grader.graded()[0].selected_options,null);
 }
 const grader=loadGrader({mcqAlternatives:true,expired:true,saved:[{question_id:'q1',selected_option:2}]});await grader.submit('session','student',{q1:3});assert.equal(grader.graded()[0].selected_option,2);assert.equal(grader.graded()[0].is_correct,true);
});

test('server grades disjoint NAT answers and restores saved signed values on expiry',async()=>{
  for(const [value,correct] of [['-5',true],['5',true],['0',false],['4',false]]){
    const grader=loadGrader({alternatives:true});
    await grader.submit('session','student',{q1:value});
    assert.equal(grader.graded()[0].numeric_answer,value);
    assert.equal(grader.graded()[0].is_correct,correct);
  }
  const grader=loadGrader({alternatives:true,expired:true,saved:[{question_id:'q1',numeric_answer:'5',selected_option:null}]});
  await grader.submit('session','student',{q1:'0'});
  assert.equal(grader.graded()[0].numeric_answer,'5');
  assert.equal(grader.graded()[0].is_correct,true);
});

test("official Marks To All receives full credit when skipped, answered or expired", async () => {
  for(const value of [null,1,2,3,4]){
    const grader=loadGrader({marksToAll:true});
    await grader.submit('session','student',{q1:value});
    assert.equal(grader.graded()[0].is_correct,true);
    assert.equal(grader.graded()[0].selected_option,value);
  }
  const grader=loadGrader({marksToAll:true,expired:true});
  await grader.submit('session','student',{});
  assert.equal(grader.graded()[0].is_correct,true);
  assert.equal(grader.graded()[0].selected_option,null);
});

function loadResponses() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/question-response.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports });
  return exports;
}

test("multiple-select requires the exact answer set; toggling can clear all selections", () => {
  const { gradeResponse, toggleResponse, hasResponse } = loadResponses();
  const q = { question_type: "MSQ", correct_option: null, correct_options: [1, 3] };
  assert.equal(gradeResponse(q, [3, 1]), true);
  assert.equal(gradeResponse(q, [1]), false);
  assert.equal(gradeResponse(q, [1, 2, 3]), false);
  assert.equal(gradeResponse(q, null), null);
  const both = toggleResponse(toggleResponse(null, 1, true), 3, true);
  assert.equal(gradeResponse(q, both), true);
  assert.equal(hasResponse(toggleResponse(toggleResponse(both, 1, true), 3, true)), false);
});

test("server saves and grades all MSQ choices, including restored and expired responses", async () => {
  for (const [response, expected] of [[[1,3],true],[[1],false],[[1,2,3],false],[null,null]]) {
    const grader = loadGrader({ multiple: true });
    await grader.submit("session", "student", { q1: response });
    assert.equal(grader.graded()[0].selected_option, null);
    assert.equal(grader.graded()[0].is_correct, expected);
    assert.equal(JSON.stringify(grader.graded()[0].selected_options), JSON.stringify(response));
  }
  const expired = loadGrader({ multiple: true, expired: true, saved: [{question_id:"q1",selected_option:null,selected_options:[1,3]}] });
  await expired.submit("session", "student", {q1:[2]});
  assert.equal(expired.graded()[0].is_correct,true);
});

test("server persists NAT decimal text, grades inclusively and restores expired saved answers", async () => {
  for (const [response, expected] of [["1.00",true],["1.15",true],["1.08",true],["1.081",false],["1.0800",true],["1.150000000000000001",false],["0",false],[null,null]]) {
    const grader = loadGrader({ numeric: true });
    await grader.submit("session","student",{q1:response});
    const answer=grader.graded()[0];
    assert.equal(answer.is_correct,expected);
    assert.equal(answer.numeric_answer,response);
    assert.equal(answer.selected_option,null);
    assert.equal(answer.selected_options,null);
  }
  const expired=loadGrader({numeric:true,expired:true,saved:[{question_id:"q1",selected_option:null,numeric_answer:"1.08"}]});
  await expired.submit("session","student",{q1:"9"});
  assert.equal(expired.graded()[0].numeric_answer,"1.08");
  assert.equal(expired.graded()[0].is_correct,true);
});

test("an expired test is finalized from saved responses and cannot accept new late answers", async () => {
  const grader = loadGrader({ expired: true, saved: [{ question_id: "q1", selected_option: 4 }] });
  assert.equal((await grader.submit("session", "student", { q1: 3, q2: 1 })).success, true);
  assert.equal(grader.graded()[0].selected_option, 4);
  assert.equal(grader.graded()[1].selected_option, null);
});

test("submission uses the authenticated user rather than trusting a supplied user id", async () => {
  const grader = loadGrader({ userId: "another-student" });
  assert.equal((await grader.submit("session", "student", {})).error, "Unauthorized");
  assert.equal(grader.completed(), false);
});

 test('server accepts both official MSQ sets including saved answers at expiry',async()=>{
 for(const [value,correct] of [[[1,3],true],[[1,3,4],true],[[1,2,3,4],false]]){const g=loadGrader({multipleAlternatives:true});await g.submit('session','student',{q1:value});assert.equal(g.graded()[0].is_correct,correct);}
 const g=loadGrader({multipleAlternatives:true,expired:true,saved:[{question_id:'q1',selected_options:[1,3],selected_option:null}]});await g.submit('session','student',{q1:[1,2]});assert.equal(g.graded()[0].is_correct,true);
 });
