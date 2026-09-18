# HQ Construction & Remodeling Website

Production website source for **hqconstructionllc.com**.

## What this package includes

- Search-indexable static pages and local-service SEO pages
- Real HQ project photography
- CMS-managed project/gallery content in `content/projects/`
- `/admin/` website manager powered by Decap CMS using the direct GitHub backend
- Automatic gallery, home-page featured work, service-page recent work, project-detail pages and sitemap generation
- Image-aware XML sitemap for Google image discovery
- Netlify Functions already used by the existing site
- Build validation that stops a deploy when required project metadata or image files are missing
- Automatic WebP conversion, resizing and metadata stripping for JPG/PNG/WebP photos uploaded through the manager
- City-page project sections that populate automatically when a project is tagged with Johns Creek, Alpharetta, Roswell, Cumming or Canton

## Normal workflow after first-time setup

1. Visit `https://hqconstructionllc.com/admin/`.
2. Sign in with the GitHub account that has write access to `Uniidens/HQ-Construction-Website`.
3. Open **Projects & Gallery**.
4. Add/edit a project, upload photos, add image descriptions when practical, and publish.
5. Netlify rebuilds automatically. No ZIP deployment is needed for ordinary content updates.

## Build locally

Requires Node.js 20+.

```bash
npm run check
npm run build
npm run preview
```

Build output is written to `dist/`.

### Photo uploads

The CMS automatically converts supported JPG/PNG/WebP uploads to optimized WebP (1800 px wide, quality 82) and strips embedded metadata before committing the image. HEIC is not used on the public web because browser support is inconsistent; convert HEIC to JPG/WebP before uploading. Existing seeded HEIC source photos were converted during this build.

## Content model

Each JSON file in `content/projects/` represents either a completed project or a curated photo set. The build process uses those files to generate public portfolio content.

- `published`: hides/shows the item everywhere
- `featured`: allows the item to appear on the home page
- `detail_page`: generates a dedicated project page under `/projects/`
- `display_order`: lower values appear first
- `category`: routes the project into the correct gallery filter and service-page recent-work section

## Commercial portfolio rule

Only completed HQ Construction & Remodeling work belongs in the public CMS. Bid-pack reference imagery, inspiration folders, unawarded scopes, and third-party reference material should not be published.

A VS Code workspace file, `HQ-Construction-Website.code-workspace`, is included for optional code-level maintenance. Normal project/photo updates should use `/admin/` instead.

The dedicated website repository is intended to be public so the CMS does not need broad private-repository OAuth permissions; Netlify environment variables continue to hold API keys and mail credentials.

See `ADMIN_SETUP.md` for the one-time GitHub/Netlify connection.

<!-- deploy-trigger: 2026-09-18 point-1-production-sync -->
