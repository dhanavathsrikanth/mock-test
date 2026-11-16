# StudentAce on Cloudflare Workers

Cloudflare's current Next.js guide recommends **vinext on Workers** for new deployments. This repository is prepared for that migration, but the vinext compatibility check and initializer must be run before treating the Worker deployment as verified.

## Migration

From the project root, run the compatibility report and review any critical findings:

```sh
npx vinext check
```

If the report is clear, initialize the existing app for Workers:

```sh
npx vinext init --platform=cloudflare --name=studentace --cdn-cache=response-store --response-store-mode=self-contained --data-cache=none --image-optimization=cloudflare-images
```

These options account for the app's `revalidatePath` use and remote `next/image` sources. Review the generated files, add `.cloudflare/types` to `tsconfig.json`'s `include`, and ignore `.cloudflare/**`, `.vinext/**`, and `dist/**` in ESLint. Keep `next dev` and `next build` available while validating the vinext path.

Run the generated vinext development server and build before deployment. Configure the app's existing environment variables as Worker secrets/vars in Cloudflare; public `NEXT_PUBLIC_*` values must be present at build time. Do not commit `.env*` files. Then authenticate and deploy:

```sh
npx cf auth login
npx @vinext/cloudflare deploy --dry-run
npx @vinext/cloudflare deploy
```

Attach `studentace.in` to the deployed Worker in Cloudflare after the first successful deployment. This repository change does not alter DNS.

## Current limitation

The vinext check could not be run in the current environment because the package is not installed and registry access is unavailable. The project uses Next.js 16.2.9. Confirm the compatibility report before initializing and deploying; this document is a launch runbook, not evidence of a successful Worker build.

## References

- [Cloudflare Next.js on Workers guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare Vercel to Workers migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/nextjs/)
