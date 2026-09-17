# HQ Construction Website — Start Here

This is the production source package for `hqconstructionllc.com`.

## What changes after this version

Normal website updates no longer require editing HTML or making a new ZIP. After the one-time GitHub + Netlify connection, use:

`https://hqconstructionllc.com/admin/`

From there you can add a project, upload/reorder photos, choose a category, add a city, feature work on the home page, hide/archive entries, and publish. The build updates the gallery, related service pages, matching city pages, dedicated project pages, and sitemap automatically.

## One-time launch sequence

1. Keep using the **existing Netlify project** that owns `hqconstructionllc.com`.
2. Create/link the dedicated GitHub repository **`Uniidens/HQ-Construction-Website`** on branch `main`. Make this website repository public so the CMS does not need broad private-repository OAuth permissions.
3. Do **not** overwrite `Uniidens/HQ-Construction`; that is a different application.
4. Confirm Netlify reads `netlify.toml` and builds with `npm run build`, publishing `dist`.
5. Configure the GitHub OAuth provider in Netlify using callback `https://api.netlify.com/auth/done`.
6. Open `/admin/`, sign in, and publish a harmless test edit.

Full screenshots/field guidance is available at `/admin/help.html` after deployment and detailed setup instructions are in `ADMIN_SETUP.md`.

## Photos

JPG, PNG and WebP uploads through the admin are automatically resized to 1800 px wide, converted to WebP, compressed, and stripped of embedded metadata while preserving their aspect ratio. Convert HEIC/HEIF images to JPG or WebP before uploading.

The seeded gallery contains real HQ project photography, including the completed retail Barber Shop build-out. Commercial bid-pack/reference folders such as unawarded scopes are not included.

## Validation

Before packaging, this source passed:

- CMS/project validation
- full static build
- internal link and image existence checks
- canonical/noindex checks
- XML/image sitemap parsing
- Netlify Function module smoke tests
- stale hostname and secret-pattern scans
- bid-pack reference leakage checks
