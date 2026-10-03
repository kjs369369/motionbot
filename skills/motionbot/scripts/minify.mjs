#!/usr/bin/env node
// 위젯·kb JS 압축 (/*! 저작권 주석 유지)
// 사용: node minify.mjs <입력.js> [출력.js]     (출력 생략 시 <입력>.min.js)
// terser 가 없으면 npx 로 임시 실행한다.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const [, , input, outArg] = process.argv;
if (!input) { console.error('사용: node minify.mjs <입력.js> [출력.js]'); process.exit(1); }
const output = outArg || input.replace(/\.js$/, '.min.js');

let terser;
try { terser = (await import('terser')).minify; } catch { terser = null; }

if (terser) {
  const r = await terser(await readFile(input, 'utf8'), { compress: true, mangle: true, format: { comments: /^!/ } });
  await writeFile(output, r.code);
} else {
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['-y', 'terser', input, '-c', '-m', '--comments', 'some', '-o', output], { stdio: 'inherit', shell: process.platform === 'win32' });
}
const a = (await readFile(input)).length, b = (await readFile(output)).length;
console.log(`${input} ${(a / 1024).toFixed(1)}KB → ${output} ${(b / 1024).toFixed(1)}KB`);
