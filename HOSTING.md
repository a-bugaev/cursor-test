# Hosting Classic Tetris as a Telegram Mini App

Telegram Mini Apps must be served over **HTTPS**. Any static host works.

## 1. Create a Telegram bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` and follow the prompts.
3. Save the bot token (you need it only if you add a backend later).

## 2. Register the Mini App

In BotFather:

```
/newapp
```

Select your bot, then provide:

| Field | Example |
|-------|---------|
| Title | Classic Tetris |
| Description | Play Tetris inside Telegram |
| Photo | Optional icon (512×512 PNG) |
| Demo GIF | Optional |
| **Web App URL** | `https://YOUR-DOMAIN/` |

Alternatively, set a menu button that opens the app:

```
/setmenubutton
```

Pick your bot, choose **Web App**, set title and URL.

You can also attach the app to an inline keyboard or bot command — see [Telegram Mini Apps docs](https://core.telegram.org/bots/webapps).

## 3. Deploy the static files

Upload everything in this folder:

- `index.html`
- `style.css`
- `script.js`
- `telegram.js`

### Option A — GitHub Pages (free)

```bash
# From this directory
git init
git add .
git commit -m "Add Tetris Telegram Mini App"
git branch -M main
git remote add origin git@github.com:YOUR_USER/tetris-miniapp.git
git push -u origin main
```

On GitHub: **Settings → Pages → Source: Deploy from branch → main / (root)**.

Your URL will be `https://YOUR_USER.github.io/tetris-miniapp/`.

### Option B — Cloudflare Pages (free)

1. Push the repo to GitHub/GitLab.
2. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build command: *(leave empty)*  
   Output directory: `/`
4. Deploy. URL: `https://tetris-miniapp.pages.dev`.

### Option C — Netlify (free)

```bash
npx netlify deploy --prod --dir=.
```

Or drag the folder into [app.netlify.com/drop](https://app.netlify.com/drop).

### Option D — Vercel (free)

```bash
npx vercel --prod
```

## 4. Point BotFather to your live URL

Update the Web App URL in BotFather (`/myapps` → edit app) to your deployed HTTPS URL.

Open your bot in Telegram and tap the menu button (or the app link you configured).

## 5. Test locally (optional)

ES modules require a local server, and Telegram requires HTTPS for Mini Apps.

```bash
# Serve locally
python3 -m http.server 8080
```

Expose with a tunnel:

```bash
npx localtunnel --port 8080
# or: ngrok http 8080
```

Use the `https://…` tunnel URL temporarily in BotFather for testing.

## Checklist

- [ ] Site loads over HTTPS
- [ ] `index.html` is at the root of the URL (or update BotFather path)
- [ ] BotFather Web App URL matches exactly (trailing slash matters on some hosts)
- [ ] Game opens inside Telegram with touch controls and theme colors

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank screen in Telegram | Open DevTools via Telegram Desktop → Settings → Advanced → enable webview inspection, or test URL in Chrome first |
| "Module not found" | Host must serve files with correct MIME types; use GitHub/Cloudflare/Netlify, not raw file paths |
| App doesn't expand | Already handled in `telegram.js` via `tg.expand()` |
| Theme looks wrong | Telegram passes theme via `themeParams`; reload the Mini App after changing Telegram theme |
