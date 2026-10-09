# Lumen — deploy on Vercel
1. Put this folder in a GitHub repo (or use the Vercel CLI: `npx vercel`).
2. On vercel.com: Add New > Project > import the repo. Leave all build settings empty. Deploy.
3. Project Settings > Environment Variables: add ANTHROPIC_API_KEY = your key. Redeploy.
Optional env vars: LUMEN_MODEL (default claude-sonnet-5-5), LUMEN_HOURLY_LIMIT (default 30 requests per IP per hour).
Your site is then live at https://<project>.vercel.app and installable as an app.
