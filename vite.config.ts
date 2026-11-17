import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import { createHash } from "node:crypto";
import { patchCssModules } from "vite-css-modules";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [
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
