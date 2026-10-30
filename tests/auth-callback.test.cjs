const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { NextRequest } = require("next/server");

function loadRoute(file, exchangeError = null) {
  const exports = {};
  const exchanges = [];
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports, URL, process,
    require(name) {
      if (name === "@supabase/ssr") return {
        createServerClient: (_url, _key, options) => ({ auth: {
          async exchangeCodeForSession(value) {
            exchanges.push(value);
            options.cookies.setAll([{ name: "test-session", value: "session", options: { httpOnly: true } }]);
            return { error: exchangeError };
          },
          async getClaims() { throw new Error("Unexpected claims request"); },
        } }),
      };
      return require(name);
    },
  });
  return { ...exports, exchanges };
}

test("successful code exchange sets session cookies and opens the dashboard", async () => {
  const route = loadRoute("app/auth/callback/route.ts");
  const response = await route.GET(new NextRequest("http://localhost:3000/auth/callback?code=test-code"));
  assert.equal(response.headers.get("location"), "http://localhost:3000/dashboard");
  assert.equal(response.cookies.get("test-session").value, "session");
  assert.deepEqual(route.exchanges, ["test-code"]);
});

test("failed exchange returns to login with a visible error indicator", async () => {
  const route = loadRoute("app/auth/callback/route.ts", { message: "expired" });
  const response = await route.GET(new NextRequest("http://localhost:3000/auth/callback?code=expired"));
  assert.equal(response.headers.get("location"), "http://localhost:3000/auth/login?error=oauth_callback_failed");
});

test("callback without a code returns to login", async () => {
  const route = loadRoute("app/auth/callback/route.ts");
  const response = await route.GET(new NextRequest("http://localhost:3000/auth/callback"));
  assert.equal(response.headers.get("location"), "http://localhost:3000/auth/login");
  assert.equal(route.exchanges.length, 0);
});

test("callback cannot redirect outside the current app or back into authentication", async () => {
  for (const next of ["//other.example/path", "https://other.example", "/\\other.example", "/auth/login"]) {
    const route = loadRoute("app/auth/callback/route.ts");
    const request = new NextRequest(`http://localhost:3000/auth/callback?code=test&next=${encodeURIComponent(next)}`);
    const response = await route.GET(request);
    assert.equal(response.headers.get("location"), "http://localhost:3000/dashboard");
  }
});

test("authorization codes arriving on the homepage go to the callback before session checks", async () => {
  const route = loadRoute("lib/supabase/proxy.ts");
  const response = await route.updateSession(new NextRequest("http://localhost:3000/?code=test-code"));
  assert.equal(response.headers.get("location"), "http://localhost:3000/auth/callback?code=test-code");
});
