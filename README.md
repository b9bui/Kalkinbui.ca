# Kalkin Bui — Engineering Portfolio

A lightweight, responsive static portfolio with a charcoal technical-grid aesthetic. The site is designed for Cloudflare Pages and keeps content separate from layout.

## What's included
- `public/index.html` — homepage
- `public/about/index.html` — About page
- `public/projects/index.html` — project listing
- `public/content/` — project and profile content files
- `public/admin/` — Decap CMS interface and configuration starter
- `public/assets/` — CSS, JavaScript, and image placeholders

## Deploy to Cloudflare Pages
In Cloudflare Pages, connect this GitHub repository:
- **Build command:** leave blank
- **Build output directory:** `public`
- **Root directory:** leave blank
- **Production branch:** `main`

Then deploy. Once the first deployment succeeds, add `kalkinbui.ca` in **Workers & Pages → your Pages project → Custom domains**.

## Important: CMS sign-in setup
The visual CMS page is included at `/admin/`, but editing requires a GitHub authentication method. The included `public/admin/config.yml` uses Decap CMS's GitHub backend and identifies the repository as `YOUR_GITHUB_USERNAME/kalkinbui-portfolio`.
1. Replace `YOUR_GITHUB_USERNAME` with your exact GitHub username in `public/admin/config.yml`.
2. Deploy the site.
3. Before using `/admin/` to edit, configure the GitHub OAuth/authentication method supported by your chosen CMS hosting setup. The admin page alone does not grant permission to write to GitHub. Don't publish any OAuth client secret in this repository.

Until CMS authentication is configured, you can still update the site by editing files in GitHub; Cloudflare Pages will redeploy automatically after each commit.

## Editing content manually
- Projects: add/edit Markdown files in `public/content/projects/`.
- About/profile: edit `public/content/about.md` and `public/content/settings.yml`.
- Images: put images in `public/media/uploads/` and reference them in project Markdown using `/media/uploads/your-image.jpg`.

## Replace the sample content
The project entries are clearly marked as examples. Replace their text, tags, links, and images with your real engineering projects. Don't add personal contact information you don't want public.
