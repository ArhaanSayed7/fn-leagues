# FN Leagues V4

This version includes:

- Custom league logos
- Featured league section
- 30 league slots
- 20 race slots
- League search
- Schedule filters
- Next-race countdown
- Automatic league and race totals
- Soft pink and purple design
- Mobile-friendly layout

## Main file to edit

Edit:

`data.js`

## Adding a custom logo

1. Put your logo inside:

`images/leagues/`

2. Use a simple filename, for example:

`fes.png`

3. Edit the league in `data.js`:

```js
{
  name: "FES Formula 1",
  abbreviation: "FES",
  category: "Formula Racing",
  description: "Weekly Fortnite formula racing league.",
  discord: "https://discord.gg/example",
  logo: "images/leagues/fes.png",
  featured: true
}
```

Use PNG images with transparent backgrounds where possible.

## Featured leagues

Change:

```js
featured: false
```

to:

```js
featured: true
```

## Updating GitHub

1. Open your GitHub repository.
2. Click **Add file**.
3. Click **Upload files**.
4. Drag in the new V4 files.
5. Also upload the `images` folder and its contents.
6. Click **Commit changes**.

Files with matching names will be replaced automatically.

## Adding logos later

1. Open the GitHub repository.
2. Click **Add file → Upload files**.
3. Drag the logo into the correct path.

GitHub’s browser uploader may not place a file inside a folder automatically. The easiest method is to upload the full `images` folder from Finder when first installing V4.

Later, you can open `images`, then `leagues`, choose **Add file → Upload files**, and upload new logos there.

## Cloudflare

Cloudflare is already connected to the GitHub repository.

After each GitHub commit:

1. Cloudflare automatically starts a new deployment.
2. Wait roughly one minute.
3. Refresh your `.pages.dev` website.

You do not need to upload anything manually to Cloudflare.
