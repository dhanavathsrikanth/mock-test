import { defineConfig, loadEnv, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import { createHash } from "node:crypto";
import { patchCssModules } from "vite-css-modules";
import path from "node:path";

/**
 * Injects the `__name` helper that oxc/esbuild keepNames transforms emit.
 * Without this the browser throws `ReferenceError: __name is not defined`.
 */
function injectNameHelper(): Plugin {
  const helper = `var __name = (typeof globalThis !== "undefined" && globalThis.__name) || ((target, value) => Object.defineProperty(target, "name", { value, configurable: true }));\n`;
  return {
    name: "inject-__name-helper",
    renderChunk(code) {
      if (code.includes("__name") && !code.includes("var __name") && !code.includes("function __name")) {
        return { code: helper + code, map: null };
      }
      return null;
    },
    transform(code) {
      if (code.includes("__name") && !code.includes("var __name") && !code.includes("function __name")) {
        return { code: helper + code, map: null };
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kygptxzyiyucpigzasat.supabase.co";
  const supabaseKey =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== "[SENSITIVE]"
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : null) ||
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "[SENSITIVE]"
      ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      : null) ||
    "sb_publishable_AJtA5_tmfYZabR_NI9uUVA_Bhrm_TWX";

  return {
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(supabaseKey),
    },
    plugins: [
      injectNameHelper(),
      patchCssModules({ exportMode: "default" }),
      vinext({
        images: { optimizer: imagesOptimizer() },
      }),
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
    css: {
      modules: {
        generateScopedName(name: string, filename: string) {
          const relativePath = path.relative(import.meta.dirname, filename.replace(/\?.*$/, "")).replaceAll("\\", "/");
          return `_${name}_${createHash("sha256").update(relativePath).digest("hex").slice(0, 7)}`;
        },
      },
    },
  };
});
