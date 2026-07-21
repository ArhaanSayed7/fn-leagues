# FN Leagues — Timezone & Animation Upgrade

This upgrade adds:

- Automatic conversion to each visitor's local timezone
- Original league time shown underneath
- IANA timezone selection in the admin dashboard
- Daylight-saving-aware conversion
- Animated counters
- Scroll reveal animations
- Floating background gradients
- Card hover motion
- Button shimmer effects
- Pulsing live indicators
- Animated league-page logo
- Reduced-motion accessibility support

## Timezone setup

When adding or editing a race, choose the league timezone from the dropdown.

Examples:

- Dubai: Asia/Dubai
- United Kingdom: Europe/London
- Toronto: America/Toronto
- New York: America/New_York
- Sydney: Australia/Sydney

The public website automatically converts the race to the viewer's browser timezone.

## Upload to GitHub

Upload these files:

- index.html
- app.js
- admin.html
- admin.js
- league.html
- league.js
- styles.css
- README.md

Keep your existing `config.js`.

After committing, Cloudflare deploys automatically.

## Existing GMT+4 races

Old races saved as `GMT+4` are automatically treated as `Asia/Dubai`, so they will continue to work.
