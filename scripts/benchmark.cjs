const { readFile, stat } = require('node:fs/promises');

const budgets = [
  ['novel-browser/app.js', 90_000],
  ['novel-browser/styles.css', 40_000],
  ['novel-browser/index.html', 24_000],
  ['novel-browser/src/features/chapter-jump.js', 8_000],
  ['novel-browser/src/features/reader-settings.js', 10_000],
  ['novel-browser/src/utils/text.js', 8_000],
  ['novel-browser/src/server/readnovelfull.mjs', 32_000],
  ['work/dev-server.mjs', 8_000]
];

async function main() {
  const failures = [];
  const results = [];

  for (const [file, maxBytes] of budgets) {
    const info = await stat(file);
    results.push({ file, bytes: info.size, maxBytes });
    if (info.size > maxBytes) {
      failures.push(`${file} is ${info.size} bytes, above ${maxBytes} byte budget.`);
    }
  }

  const html = await readFile('novel-browser/index.html', 'utf8');
  const css = await readFile('novel-browser/styles.css', 'utf8');
  const app = await readFile('novel-browser/app.js', 'utf8');

  const focusableCount = (html.match(/class="[^"]*focusable/g) || []).length;
  const screenCount = (html.match(/class="screen/g) || []).length;
  const networkOnLoad = (app.match(/fetch\(/g) || []).length;

  if (focusableCount < 40) failures.push('Expected at least 40 focusable controls for D-pad navigation.');
  if (screenCount < 5) failures.push('Expected home, detail, picker, reader, and settings screens.');
  if (!css.includes('background: #000000')) failures.push('Additive-display black canvas is missing.');
  if (!css.includes('overflow: hidden')) failures.push('Viewport overflow contract is missing.');
  if (networkOnLoad > 4) failures.push('Too many fetch call sites for a lightweight glasses app.');

  console.table(results);
  console.log(`Focusable controls: ${focusableCount}`);
  console.log(`Screens: ${screenCount}`);
  console.log(`Fetch call sites: ${networkOnLoad}`);

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log('Benchmarks passed for Novel Browser Glass.');
}

main().catch(function(error) {
  console.error(error);
  process.exit(1);
});
