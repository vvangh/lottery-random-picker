import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');

const css = readFileSync(join(srcDir, 'css/app.css'), 'utf8');
let html = readFileSync(join(srcDir, 'index.html'), 'utf8');

const jsResult = await esbuild.build({
  entryPoints: [join(srcDir, 'js/app.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  write: false,
});

const js = jsResult.outputFiles[0].text;

html = html.replace(
  /<link rel="stylesheet" href="css\/app\.css">\s*/i,
  `<style>\n${css}\n</style>\n`,
);
html = html.replace(
  /<script type="module" src="js\/app\.js"><\/script>\s*/i,
  `<script>\n${js}\n</script>\n`,
);

const releaseDir = join(root, 'release');
mkdirSync(releaseDir, { recursive: true });

const outRelease = join(releaseDir, 'index.html');
const outRoot = join(root, 'index.html');

writeFileSync(outRelease, html, 'utf8');
writeFileSync(outRoot, html, 'utf8');

console.log(`已生成单文件 HTML：\n  ${outRelease}\n  ${outRoot}`);
