# Lumen — Netlify deployment

## Deploy from GitHub
1. Extract this ZIP locally. Upload the extracted files and folders to the root of your GitHub repository (not the ZIP archive alone).
2. In Netlify, import that GitHub repository and select branch `main`.
3. Build settings are defined in `netlify.toml`: publish directory `public`, functions directory `netlify/functions`. No build command is needed.
4. In Netlify: Site configuration → Environment variables, add `ANTHROPIC_API_KEY` with your Anthropic API key. Keep it private; never put it in frontend code or commit it to GitHub.
5. Trigger a new deploy after setting the variable.

Optional environment variables: `LUMEN_MODEL` (default `claude-sonnet-4-5-20250929`) and `LUMEN_HOURLY_LIMIT` (default 30 requests per IP per hour; in-memory best-effort limit).

The existing frontend calls `/api/chat`; `netlify.toml` rewrites that path to the Netlify Function. Anthropic web search is enabled for non-casual requests.
