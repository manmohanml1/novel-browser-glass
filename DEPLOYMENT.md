# Vercel Deployment

Novel Browser Glass is deployed as a static glasses app plus Vercel serverless API routes. Static files live in `novel-browser/`, and `/api/search`, `/api/novel`, and `/api/chapter` call the shared parser in `novel-browser/src/server/readnovelfull.mjs`.

## Production

- Provider: Vercel Hobby
- Project: `novel-browser-glass`
- Production URL: [novel-browser-glass.vercel.app](https://novel-browser-glass.vercel.app)
- GitHub repository: [manmohanml1/novel-browser-glass](https://github.com/manmohanml1/novel-browser-glass)
- Production branch: `main`

## Git Deployment Connection

The intended release flow mirrors the portfolio website:

1. Develop changes on a short-lived `feat/*` or `fix/*` branch.
2. Run `npm run verify` or the equivalent direct `node` commands locally.
3. Push the branch and open a `feat:` or `fix:` pull request.
4. Let GitHub Actions run static checks, benchmarks, and tests.
5. Review the Vercel Preview URL at the 600 by 600 glasses viewport.
6. Merge to `main` only after CI and preview checks pass.
7. Confirm the production Vercel deployment and update `CHANGELOG.md`.

## Release Candidate Workflow

Run **Prepare Release Candidate** manually from GitHub Actions when you want a packaged staging or production candidate. The workflow validates syntax, benchmarks, and regression tests, then uploads the static app, API routes, Vercel config, and package manifest as an artifact tied to the commit SHA.

## Vercel Routing

`vercel.json` rewrites the root static paths to `novel-browser/`:

- `/` -> `/novel-browser/index.html`
- `/app.js` -> `/novel-browser/app.js`
- `/src/*` -> `/novel-browser/src/*`

Vercel automatically serves serverless functions from `api/`.

## Manual Production Checks

After deployment:

1. Open the production URL and confirm Home renders in the 600 by 600 viewport.
2. Search `Shadow Slave` and open the first result.
3. Confirm the novel detail page loads a chapter count.
4. Open a chapter and confirm readable paragraphs render.
5. Open Reader Settings and change text size.
6. Use Chapters -> Jump to # and verify the picker moves.
7. Reload and confirm Continue, Recent, and Favorites persist.

## Notes

This app fetches third-party novel pages through serverless API routes. If source availability changes, parser tests should be updated before shipping parser changes.
