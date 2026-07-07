# neptune download site

This folder is a static download page for the neptune desktop installer.

## What to change for each release

1. Upload the newest installer to GitHub Releases.
2. Open `index.html`.
3. Replace the `Windows용 다운로드` link with the new GitHub Release asset URL.
4. Update the visible release note text.
5. Deploy this folder to Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

## Recommended hosting layout

- Host the installer file on GitHub Releases.
- Host this small static page on Cloudflare Pages, Vercel, Netlify, or GitHub Pages.
- Do not commit the `.exe` file into the website source.

