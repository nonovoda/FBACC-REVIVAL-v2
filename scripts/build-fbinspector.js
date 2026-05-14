import { build, context } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const isWatch = process.argv.includes('--watch');
const rootDir = resolve(process.cwd());
const outDir = resolve(rootDir, 'dist');
const outfile = resolve(outDir, 'FBInspector.js');
const bookmarkletFile = resolve(outDir, 'FBInspector.bookmarklet.txt');

const buildOptions = {
  entryPoints: [resolve(rootDir, 'src/FBInspector/index.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: false,
  outfile,
  logLevel: 'info',
  legalComments: 'none'
};

const makeBookmarklet = async () => {
  const scriptSource = await readFile(outfile, 'utf8');
  const normalized = scriptSource.replace(/\s+/g, ' ').trim();
  const bookmarklet = `javascript:${encodeURIComponent(normalized)}`;
  await writeFile(bookmarkletFile, `${bookmarklet}\n`, 'utf8');
};

const ensureDist = async () => {
  await mkdir(outDir, { recursive: true });
};

const runBuild = async () => {
  await ensureDist();

  if (isWatch) {
    const ctx = await context({
      ...buildOptions,
      plugins: [
        {
          name: 'bookmarklet-writer',
          setup(pluginBuild) {
            pluginBuild.onEnd(async (result) => {
              if (result.errors.length === 0) {
                await makeBookmarklet();
                console.log('[FBInspector] bookmarklet updated');
              }
            });
          }
        }
      ]
    });

    await ctx.watch();
    console.log('[FBInspector] watching for changes...');
    return;
  }

  await build(buildOptions);
  await makeBookmarklet();
  console.log('[FBInspector] build completed');
};

runBuild().catch((error) => {
  console.error('[FBInspector] build failed', error);
  process.exit(1);
});
