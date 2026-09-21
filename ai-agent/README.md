# Pappi Suds & Scents — Facebook Messenger AI Agent

An AI agent that reads messages sent to your Facebook Page and replies
automatically using Claude, grounded in your real business info so it
doesn't make things up.

## What's in this project
- `server.js` — the bot itself (receives messages, asks Claude, replies)
- `knowledge.md` — your products, prices, policies, FAQs (kept up to date)
- `package.json` — dependencies
- `.env.example` — template for your secret keys

---

## Step 1 — Review your business info
`knowledge.md` is already filled in with your real product line, prices,
shipping, payment methods, and policies. Update it any time something
changes (new stock, new prices, new promos) and redeploy.

## Step 2 — Get an Anthropic API key
1. Go to https://console.anthropic.com and sign up / log in.
2. Go to **API Keys** → **Create Key**. Copy it.
3. Note: this is billed separately from a claude.ai subscription — API
   usage is pay-as-you-go (typically small cents per conversation for a
   business this size, but check current pricing on the Anthropic site).

## Step 3 — Create a Meta App and connect your Page
1. Go to https://developers.facebook.com/apps and click **Create App**.
   Choose the "Business" type.
2. In your app's dashboard, add the **Messenger** product.
3. Under Messenger → Settings → **Access Tokens**, connect your
   `pappi.artisan` Page and generate a **Page Access Token**. Copy it —
   this goes in your `.env` file.
4. Under Messenger → Settings → **Webhooks**, you'll set the Callback
   URL and Verify Token in Step 5 (after you deploy).
5. Subscribe the webhook to the `messages` field for your Page.

## Step 4 — Push this folder to GitHub
This folder lives inside your existing `pappiscents-shop` repo at
`ai-agent/`. Commit and push it:

```bash
cd /Users/vgamotan/Documents/GitHub/pappiscents-shop
git add ai-agent
git commit -m "Add Messenger AI agent"
git push
```

## Step 5 — Deploy the bot somewhere that stays online
Pick one free/cheap option (all support Node.js out of the box):
- **Render.com** (free tier, easiest): New → Web Service → connect your
  `pappiscents-shop` GitHub repo → set the **Root Directory** to
  `ai-agent` (important, since the bot lives in a subfolder) → set the
  environment variables from `.env.example` in the dashboard → deploy.
- **Railway.app** — similar flow, generous free tier (also supports a
  root/subfolder setting).
- **Fly.io** — good if you're comfortable with a CLI.

After deploying, you'll get a public URL like `https://pappi-agent.onrender.com`.

## Step 6 — Connect the webhook
1. Back in Meta for Developers → Messenger → Webhooks, set:
   - **Callback URL**: `https://your-deployed-url.com/webhook`
   - **Verify Token**: the same random string you put in `FB_VERIFY_TOKEN`
2. Click **Verify and Save** — if it fails, double check the verify
   token matches exactly and the app is deployed and running.
3. Subscribe to the `messages` webhook field.

## Step 7 — Test it
Send a message to your `pappi.artisan` Facebook Page from a personal
account. You should get an AI reply within a few seconds. Check your
hosting provider's logs if something goes wrong — `server.js` logs
errors for both the Claude call and the Facebook send call.

## Ongoing maintenance
- Update `knowledge.md` whenever prices, stock, or policies change,
  then commit, push, and redeploy (most hosts redeploy automatically
  on a git push).
- Check in on real conversations occasionally — the bot keeps short
  in-memory context per customer but doesn't store full history
  permanently in this version.

## Note on scope
This bot answers questions and takes basic info — it does not process
payments or place orders automatically. Customers still confirm and
pay through your existing process (GCash, PayMaya, Maribank, BPI, or
Shopee checkout), same as now.
