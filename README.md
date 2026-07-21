# FN Leagues

A soft pink and purple Fortnite racing league schedule and directory website.

## The only file you normally edit

Open:

`data.js`

That file contains:

- Empty league names
- Empty Discord links
- Empty schedule entries

The website automatically hides completely empty league and race blocks.

---

## Add a league

Open `data.js`.

Find:

```js
{
  name: "",
  abbreviation: "",
  category: "",
  description: "",
  discord: ""
}
```

Fill it in like this:

```js
{
  name: "FES Formula 1",
  abbreviation: "FES",
  category: "Formula Racing",
  description: "Weekly Fortnite formula racing league.",
  discord: "https://discord.gg/example"
}
```

---

## Add a race

Find an empty race block:

```js
{
  league: "",
  date: "",
  time: "",
  timezone: "GMT+4",
  event: "",
  category: "",
  circuit: "",
  link: ""
}
```

Fill it in:

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

Date format:

`YYYY-MM-DD`

Time format:

`20:00` means 8:00 PM.

---

## Upload to GitHub

1. Open your `league-grid` repository.
2. Click **uploading an existing file**.
3. Unzip this download.
4. Drag all five files into GitHub.
5. Scroll down.
6. Click **Commit changes**.

If GitHub asks whether to replace older files, replace them.

---

## Files included

- `index.html`
- `styles.css`
- `data.js`
- `script.js`
- `README.md`
