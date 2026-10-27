# MITR AI inside One Finance

One Finance (the accounting console) frames the chat widget beside its own assistant and as a desk widget. MITR AI
stays a separate deployment; the console only frames `/widget` and shares its look.

## Settings

| Side | Setting | Value |
|---|---|---|
| MITR AI (build) | `NEXT_PUBLIC_ONEFINUX_ORIGIN` | `https://onefinance.your-company.com` |
| MITR AI (nginx / IIS) | `location /widget` → `frame-ancestors` | the same origin (see `nginx.conf`, `web.config`) |
| One Finance hub | `ONEFINUX_CHATBOT_URL` | `https://mitr.your-company.com/widget?group=<group>` |
| One Finance hub | `ONEFINUX_CHATBOT_ORIGIN` | `https://mitr.your-company.com` |
| One Finance hub | `ONEFINUX_CHATBOT_TITLE` | `MITR AI` |

Keep both apps on the same parent domain so the widget's sign-in cookies are first-party inside the frame.

## What happens when framed

The console opens `/widget?group=…&ofx-embed=1&theme=light|dark&skin=steps|ofx&groupUnit=…&cobDate=…`.

- `OfxEmbedBridge` (in `app/widget/layout.tsx`) sets `<html data-ofx-vars="mitr" data-skin data-theme>`, loads
  `<origin>/theme/onefinux-tokens.css` and applies the theme without saving it as the user's preference.
- That stylesheet maps `--brand`, `--bg-*`, `--text-*`, `--border`, shadows, radii and fonts onto the One Finance
  palette, so every component that paints with these variables matches the console in all its themes.
- The widget's own title bar and the app sidebar are hidden; the console's panel names the bot.
- It posts `ofx.chat.ready`; the console answers with `ofx.theme` on every theme change and `ofx.context`
  (group unit, COB date, region, page). Messages are accepted only from `NEXT_PUBLIC_ONEFINUX_ORIGIN` and the
  parent window (`lib/ofx-embed.ts`).

Opened on its own, or without `NEXT_PUBLIC_ONEFINUX_ORIGIN`, the widget behaves as before.

## Limits

- Components with fixed Tailwind palette classes (`bg-white`, `text-gray-500`, `bg-blue-600`) keep those colours;
  moving them to the variables above brings them in line.
- `ofx.context` is read but not yet used to pick a group or filter; MITR groups and One Finance group units are
  different lists. A mapping can be added when the groups are agreed.
- The bot can ask the console to open a screen with `{ type: 'ofx.chat.open', route: '/instance/…' }`
  (`postToOfx`); no answer card does this yet.
