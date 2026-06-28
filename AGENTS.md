# AGENTS.md

- Use `pnpm` scripts here. The repo scripts are defined in `package.json`.
- Main app code lives under `src/app`, `src/components`, and `src/lib`; ingest/regen scripts live under `scripts`.
- Treat `src/lib/data/**` as generated output. Do not hand-edit `external-feed.json`, `wikiart_artworks.json`, or `books/koreader-generated/*.json`.
- Regenerate data with the matching script: `pnpm run ingest` updates `src/lib/data/external-feed.json`; `pnpm run ingest-koreader` rebuilds KOReader highlight JSON under `src/lib/data/books/koreader-generated/`; `npm run ingest:wikiart` rewrites `src/lib/data/wikiart_artworks.json` and needs `BLOB_READ_WRITE_TOKEN`, `WIKIART_ACCESS_KEY`, and `WIKIART_SECRET_KEY`.
- For focused checks, use `pnpm test -- <file>` for one test file, `pnpm lint`, and `pnpm exec tsc --noEmit`.
- Do not run `pnpm build` unless the user explicitly asks.
- Do not start a local dev server unless the user asks; UI changes should be reviewed in the already-running app via `agent-browser`.
- `src/app/page.tsx` is `force-dynamic`, so homepage changes can depend on fresh data on every request.
- The feed is assembled from server-loaded sources plus client-side infinite scroll; if you touch feed ordering or item insertion, check both `src/app/actions.ts` and `src/components/feed.tsx`.
- Prefer React Query for client-side auth and other server-state: use `useQuery` for reads, `useMutation` for writes, and add shared query key objects in `src/lib/consts.ts`.
