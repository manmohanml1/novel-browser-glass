## Summary

- 

## Release Checklist

- [ ] PR title starts with `feat:` for new functionality or `fix:` for a correction.
- [ ] Updated `novel-browser/src/config/release.js` using the version policy in `README.md`.
- [ ] Updated `CHANGELOG.md` with the visible change.
- [ ] Updated `ROADMAP.md` delivery status when planned or in-review work ships.
- [ ] Ran `node scripts/check.cjs`, `node scripts/benchmark.cjs`, and `node --test tests/*.test.mjs`.
- [ ] Reviewed the Vercel Preview at the 600 by 600 glasses viewport before merge.
- [ ] Confirmed search, chapter opening, resume, favorites, and reader settings still work.
- [ ] Confirmed the production deployment and matching GitHub Release tag plan.
