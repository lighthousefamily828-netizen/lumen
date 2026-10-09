# Lumen — Netlify deployment

## Deploy from GitHub
1. Extract this ZIP locally. Upload the extracted files and folders to the root of your GitHub repository (not the ZIP archive alone).
2. In Netlify, import that GitHub repository and select branch `main`.
3. Build settings are defined in `netlify.toml`: publish directory `public`, functions directory `netlify/functions`. No build command is needed.
4. No API key is needed: Netlify AI Gateway injects Anthropic credentials into the function automatically.

Optional environment variables: `LUMEN_MODEL` (default `claude-sonnet-5-5`) and `LUMEN_HOURLY_LIMIT` (default 30 requests per IP per hour; in-memory best-effort limit).

The existing frontend calls `/api/chat`; the Netlify Function at `netlify/functions/chat.mjs` is mounted directly on that path. Anthropic web search is enabled for non-casual requests.
