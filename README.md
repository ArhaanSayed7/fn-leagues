# FN Leagues 2.0 — Phase 1

Phase 1 includes:

- Supabase connection
- Public homepage
- Public league directory
- Upcoming schedule
- Live races
- League ranking table
- Admin login
- Authenticated dashboard
- Pink and purple responsive design

## 1. Add your Supabase values

Open `config.js`.

Replace:

```js
const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";
const SUPABASE_PUBLISHABLE_KEY = "PASTE_YOUR_PUBLISHABLE_KEY_HERE";
```

Project URL:

Use your Data API URL without `/rest/v1/`.

Example:

```text
https://abcdefghijkl.supabase.co
```

Publishable key:

Use the key beginning with:

```text
sb_publishable_
```

Never use the secret key.

## 2. Create your admin account

In Supabase:

1. Open Authentication.
2. Open Users.
3. Click Add user.
4. Enter your email and password.
5. Enable Auto confirm user if offered.

## 3. Upload to GitHub

Upload all files in this folder to the root of your FN Leagues repository:

- index.html
- admin.html
- styles.css
- config.js
- app.js
- admin.js
- README.md

Matching files will be replaced automatically.

## 4. Cloudflare

Cloudflare automatically deploys after the GitHub commit.

Public website:

```text
https://fn-leagues.pages.dev
```

Admin page:

```text
https://fn-leagues.pages.dev/admin.html
```

## Important

The database may be empty at first. The public site will display empty-state messages until content is added.

Phase 2 will add:

- Add/edit/delete league forms
- Logo uploads
- Banner uploads
- Dedicated league pages
