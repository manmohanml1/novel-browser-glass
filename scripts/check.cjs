const { access, readFile, stat } = require('node:fs/promises');
const { spawnSync } = require('node:child_process');

const requiredFiles = [
  'novel-browser/index.html',
  'novel-browser/styles.css',
  'novel-browser/app.js',
  'novel-browser/sw.js',
  'novel-browser/favicon.png',
  'novel-browser/manifest.webmanifest',
  'work/dev-server.mjs',
  'README.md',
  'ARCHITECTURE.md',
  'CHANGELOG.md',
  'ROADMAP.md',
  'SECURITY.md',
  'TESTING.md'
];

const scripts = [
  'novel-browser/app.js',
  'novel-browser/sw.js',
  'work/dev-server.mjs',
  'scripts/check.cjs',
  'scripts/benchmark.cjs'
];

async function main() {
  const failures = [];

  for (const file of requiredFiles) {
    try {
      await access(file);
    } catch {
      failures.push('Missing required file: ' + file);
    }
  }

  const html = await readFile('novel-browser/index.html', 'utf8');
  const css = await readFile('novel-browser/styles.css', 'utf8');
  const app = await readFile('novel-browser/app.js', 'utf8');
  const manifest = JSON.parse(await readFile('novel-browser/manifest.webmanifest', 'utf8'));
  const icon = await stat('novel-browser/favicon.png');

  [
    ['width=600, height=600', html, 'HTML viewport must target the 600 by 600 display.'],
    ['id="reader-settings"', html, 'Reader settings screen must be present.'],
    ['data-action="go-chapter-jump"', html, 'Chapter number jump controls must be present.'],
    ['data-action="toggle-reader-focus"', html, 'Reader focus mode must be exposed.'],
    ['id="recent-list"', html, 'Recent novels shelf must be present.'],
    ['.focusable:focus', css, 'CSS must expose focused D-pad targets.'],
    ['#reader.focus-mode', css, 'Focus mode styling must be present.'],
    ['localStorage', app, 'App must persist local reading state.'],
    ['prefetchAdjacentChapters', app, 'Reader must prefetch adjacent chapters.'],
    ['readerSettings', app, 'Reader preferences must be persisted.'],
    ['recentNovels', app, 'Recent history must be persisted.'],
    ['serviceWorker.register', app, 'Offline app shell must be registered.']
  ].forEach(function(check) {
    if (!check[1].includes(check[0])) failures.push(check[2]);
  });

  if (!manifest.icons || !manifest.icons.some(function(entry) { return entry.src === 'favicon.png'; })) {
    failures.push('Manifest must reference favicon.png.');
  }

  if (icon.size < 100) {
    failures.push('Favicon asset appears empty or invalid.');
  }

  for (const file of scripts) {
    const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (checked.status !== 0) {
      failures.push('Syntax check failed: ' + file + '\n' + checked.stderr);
    }
  }

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('Static checks passed for Novel Browser Glass.');
}

main().catch(function(error) {
  console.error(error);
  process.exit(1);
});
