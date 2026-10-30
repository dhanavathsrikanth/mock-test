const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function loadHook(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, URLSearchParams, setInterval, clearInterval, ...globals,
    require: name => name in dependencies ? dependencies[name] : require(name),
  });
  return exports;
}

test("notification fetches settle instead of restarting on state updates or equivalent filters", async () => {
  const requests = [];
  const { useNotifications } = loadHook("hooks/use-notifications.ts", {
    "@/lib/notifications/constants": { NOTIFICATION_POLL_INTERVAL_MS: 30000 },
  }, {
    fetch: async url => {
      requests.push(url);
      // Bound this test if the original request loop returns.
      if (requests.length > 8) return { ok: false };
      return { ok: true, json: async () => url.includes("unread-count")
        ? { unread: 0 }
        : { notifications: [], total: 0, unread_count: 0, has_more: false } };
    },
  });
  function Probe({ search }) {
    useNotifications({ autoRefresh: false, filters: { search, type: ["info"] } });
    return null;
  }
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Probe, { search: "" })); });
    assert.equal(requests.length, 2, "only the initial list and count requests run");
    await act(async () => { renderer.update(React.createElement(Probe, { search: "" })); });
    assert.equal(requests.length, 2, "new filter object with the same values doesn't refetch");
    await act(async () => { renderer.update(React.createElement(Probe, { search: "exam" })); });
    assert.equal(requests.length, 4, "an actual filter change refreshes once");
    assert.ok(requests.some(url => url.includes("search=exam")));
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});

test("sign-out shows pending state immediately, prevents duplicate requests and leaves after success", async () => {
  let complete;
  const request = new Promise(resolve => { complete = resolve; });
  const calls = [];
  const redirects = [];
  const { useSignOut } = loadHook("hooks/use-sign-out.ts", {
    "@/lib/supabase/client": { createClient: () => ({ auth: {
      signOut: options => { calls.push(options); return request; },
    } }) },
  }, { window: { location: { replace: path => redirects.push(path) } } });
  let state;
  function Probe() { state = useSignOut(); return null; }
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Probe)); });
    let result;
    await act(async () => { result = state.signOut(); });
    assert.equal(state.signingOut, true);
    assert.equal(redirects.length, 0, "wait for confirmed logout before leaving");
    await act(async () => { await state.signOut(); });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].scope, "local");
    await act(async () => { complete({ error: null }); await result; });
    assert.deepEqual(redirects, ["/auth/login"]);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});

test("failed sign-out keeps the session view and enables a retry", async () => {
  const { useSignOut } = loadHook("hooks/use-sign-out.ts", {
    "@/lib/supabase/client": { createClient: () => ({ auth: {
      signOut: async () => ({ error: new Error("offline") }),
    } }) },
  }, { window: { location: { replace: () => assert.fail("must not redirect after failure") } } });
  let state;
  function Probe() { state = useSignOut(); return null; }
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Probe)); });
    await act(async () => { await state.signOut(); });
    assert.equal(state.signingOut, false);
    assert.match(state.signOutError, /try again/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
});
