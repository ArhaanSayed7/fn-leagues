# FN Leagues V3

This version includes:

- Soft pink and purple gradient theme
- 30 empty league slots
- 20 empty race slots
- League search
- Schedule filters
- Automatic league and race counts
- Countdown to the next race
- Mobile-friendly layout

## Only edit data.js

You normally only need to change:

`data.js`

Empty league and race slots are hidden automatically.

## Add a league

Fill in one of the 30 league slots:

```js
{
  name: "FES Formula 1",
  abbreviation: "FES",
  category: "Formula Racing",
  description: "Weekly Fortnite formula racing league.",
  discord: "https://discord.gg/example"
}
```

## Add a race

Fill in one of the race slots:

```js
{
  league: "FES Formula 1",
  date: "2026-07-25",
  time: "20:00",
  timezone: "GMT+4",
  event: "Round 5",
  category: "Formula Racing",
  circuit: "Monaco",
  link: "https://discord.gg/example"
}
```

Date format: `YYYY-MM-DD`

Time format: `20:00` means 8:00 PM.

## Uploading to GitHub

1. Unzip this download.
2. Open your GitHub repository.
3. Click **Add file** and then **Upload files**.
4. Drag in all five files.
5. Choose to replace the older versions.
6. Click **Commit changes**.
