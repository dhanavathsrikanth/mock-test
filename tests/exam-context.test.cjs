const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadContext({ user = { id: "student" }, target = "exam-b", active = true, failure = null, requiresStream = false, targetStream = null, validStream = true } = {}) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const filters = {};
      return {
        select() { return this; },
        eq(key, value) { filters[key] = value; return this; },
        async maybeSingle() {
          calls.push({ table, filters });
          if (table === "profiles") return { data: target ? { target_exam_id: target, target_stream_id:targetStream } : null, error: failure };
          if (table === "exam_streams") return {data:validStream ? {id:targetStream,exam_id:target,code:'CE',name:'Civil Engineering'} : null,error:null};
          return { data: active ? { id: target, name: "Selected exam", requires_stream:requiresStream } : null, error: null };
        },
      };
    },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync("lib/exam-context.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react") return { cache: fn => fn };
      if (name === "next/navigation") return { redirect: path => { throw new Error(`redirect:${path}`); } };
      if (name === "@/lib/supabase/server") return { createClient: async () => client };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { ...exports, calls };
}

test("uses the saved exam even when it is not the first exam", async () => {
  const context = loadContext();
  const { exam } = await context.requireExamContext();
  assert.equal(exam.id, "exam-b");
  assert.equal(context.calls[1].filters.id, "exam-b");
  assert.equal(context.calls[1].filters.is_active, true);
});

test("no selection requires onboarding without querying another exam", async () => {
  const context = loadContext({ target: null });
  await assert.rejects(context.requireExamContext(), /redirect:\/onboarding/);
  assert.equal(context.calls.length, 1);
});

test("inactive or deleted selection requires onboarding", async () => {
  const context = loadContext({ active: false });
  await assert.rejects(context.requireExamContext(), /redirect:\/onboarding/);
});

test("signed out users must log in", async () => {
  const context = loadContext({ user: null });
  await assert.rejects(context.requireExamContext(), /redirect:\/auth\/login/);
  assert.equal(context.calls.length, 0);
});

test("database failures surface instead of choosing a fallback exam", async () => {
  const failure = new Error("database unavailable");
  const context = loadContext({ failure });
  await assert.rejects(context.requireExamContext(), /database unavailable/);
  assert.equal(context.calls.length, 1);
});

test('a stream-required exam redirects to onboarding until an active matching stream is saved',async()=>{
  await assert.rejects(loadContext({requiresStream:true}).requireExamContext(),/redirect:\/onboarding/);
  await assert.rejects(loadContext({requiresStream:true,targetStream:'other',validStream:false}).requireExamContext(),/redirect:\/onboarding/);
  const context=loadContext({requiresStream:true,targetStream:'civil'});
  assert.equal((await context.requireExamContext()).stream.id,'civil');
  assert.equal(context.calls[2].filters.exam_id,'exam-b');
  assert.equal(context.calls[2].filters.is_active,true);
});
