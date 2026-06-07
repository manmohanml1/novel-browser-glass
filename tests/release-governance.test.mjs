import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { release } from '../novel-browser/src/config/release.js';

const qualityWorkflow = await readFile(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8');
const releaseWorkflow = await readFile(new URL('../.github/workflows/release-candidate.yml', import.meta.url), 'utf8');
const pullRequestTemplate = await readFile(new URL('../.github/PULL_REQUEST_TEMPLATE.md', import.meta.url), 'utf8');
const deployment = await readFile(new URL('../DEPLOYMENT.md', import.meta.url), 'utf8');
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');

test('current release identifies the deployed minor version', function() {
  assert.match(release.version, /^v\d+\.\d+\.\d+$/);
  assert.equal(release.version, 'v0.2.0');
  assert.equal(release.type, 'feat');
  assert.equal(release.label, 'Minor release');
});

test('pull request quality workflow enforces portfolio-style title prefixes', function() {
  assert.match(qualityWorkflow, /Validate PR title convention/);
  assert.match(qualityWorkflow, /\^\(feat\|fix\):/);
});

test('quality workflow validates all deployment environments and packages artifacts', function() {
  for (const environment of ['development', 'staging', 'production']) {
    assert.match(qualityWorkflow, new RegExp('- ' + environment));
  }

  assert.match(qualityWorkflow, /NOVEL_BROWSER_ENV/);
  assert.match(qualityWorkflow, /Package deployable app/);
  assert.match(releaseWorkflow, /target_environment/);
});

test('release checklists protect previews, versioning, and GitHub release tagging', function() {
  assert.match(pullRequestTemplate, /Updated `novel-browser\/src\/config\/release\.js`/);
  assert.match(pullRequestTemplate, /Reviewed the Vercel Preview/);
  assert.match(deployment, /Create the matching GitHub release tag/);
  assert.match(deployment, /public release badge/);
});

test('README and changelog document the active version policy', function() {
  assert.match(readme, /Release Versioning/);
  assert.match(readme, /Pull request titles are checked automatically/);
  assert.match(changelog, /## 0\.2\.0/);
});
