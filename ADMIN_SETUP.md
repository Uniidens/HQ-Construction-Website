# HQ Website Manager — One-Time Setup

This setup is performed once. Afterward, normal photo/project updates happen at `/admin/` and deploy automatically.

## 1. Deploy this package once to the existing Netlify project

Use the existing Netlify project that serves `hqconstructionllc.com`. Deploy the contents of this repository ZIP once so the new website and `/admin/` files are live.

The root pages in this package are already generated, so the site works immediately even before continuous deployment is connected.

## 2. Create the website repository from the existing Netlify project

In Netlify:

**Project configuration → Build & deploy → Continuous deployment → Repository → Link to repository → Push to new repository**

Create the GitHub repository with this exact name:

`Uniidens/HQ-Construction-Website`

Use `main` as the production branch and make this dedicated website repository **public**. The website source contains no credentials; API keys remain in Netlify environment variables. Keeping this repo public lets the CMS use GitHub's public-repository OAuth scope instead of requesting broad access to your private repositories. **Do not use or overwrite `Uniidens/HQ-Construction`**; that repository is a separate application.

This exact repository name is already configured in `admin/config.yml`.

## 3. Confirm the Netlify build settings

`netlify.toml` already defines:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node version: 20

Once Netlify is linked to the repo, it should read these automatically.

## 4. Create the GitHub OAuth App used by the admin login

In GitHub:

**Settings → Developer settings → OAuth Apps → New OAuth App**

Use:

- Application name: `HQ Construction Website Manager`
- Homepage URL: `https://hqconstructionllc.com`
- Authorization callback URL: `https://api.netlify.com/auth/done`

Create the app and copy its **Client ID** and **Client Secret**.

## 5. Add the GitHub OAuth provider in Netlify

In the existing HQ Construction Netlify project:

**Project configuration → Security / Access & security → OAuth → Authentication providers → Install provider → GitHub**

Enter the GitHub Client ID and Client Secret from step 4.

The CMS intentionally uses Decap's direct GitHub backend through Netlify OAuth. Git Gateway is intentionally not used.

## 6. Test the admin

Open:

`https://hqconstructionllc.com/admin/`

Sign in with the GitHub account that has write access to `Uniidens/HQ-Construction-Website`.

You should see **Projects & Gallery**.

Make a harmless edit to a project summary and publish. Confirm that:

1. A commit appears in GitHub.
2. Netlify starts a new production deploy.
3. The deploy completes successfully.
4. The edited content appears on the live site.

## Day-to-day use

For every new completed project:

1. **New Project**
2. Choose category
3. Enter project name and short factual summary
4. Add only city/general service area — never a customer street address
5. Upload cover image
6. Add a cover-image description when practical (the build supplies a safe fallback if blank)
7. Add remaining photos and captions; image descriptions are recommended but optional
8. Enable **Featured** only when you want it on the home page
9. Keep **Create Project Detail Page** on for a real completed project
10. Publish

### Photo format and optimization

JPG, PNG and WebP uploads made through `/admin/` are automatically converted to WebP, resized to a maximum width of 1800 px while preserving aspect ratio, compressed at quality 82, and stripped of embedded metadata.

HEIC/HEIF is not a dependable public-web format. Convert an HEIC photo to JPG/WebP before uploading it. The real HEIC photos already seeded in this package were converted to WebP.

The build automatically updates:

- Home-page featured work
- Main gallery and filters
- Relevant service-page recent work
- Dedicated project page when enabled
- Project data feed
- Matching city pages when the project location contains Johns Creek, Alpharetta, Roswell, Cumming or Canton
- XML sitemap and image entries

## Existing seeded content

The initial CMS contains real HQ photography for kitchens, bathrooms/vanities, interior remodeling, additions, and the completed retail barber shop build-out. The Barber Shop is included as completed commercial work; bid-pack commercial reference folders are not included.
