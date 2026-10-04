// SPDX-License-Identifier: GPL-3.0-or-later
// Node 24+; uses an installed TypeScript package or DevEco's bundled compiler.
import { createRequire, registerHooks } from 'node:module';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const testRoot = dirname(fileURLToPath(import.meta.url));
const coreRoot = join(testRoot, '../harmony/entry/src/main/ets/core');
const coreUrl = pathToFileURL(coreRoot).href;
let compilerPath = process.env.TYPESCRIPT_PATH;
if (!compilerPath) {
  try {
    compilerPath = require.resolve('typescript');
  } catch {
    const devEcoRoot = process.env.DEVECO_HOME || join(process.env.ProgramFiles || 'C:/Program Files', 'Huawei/DevEco Studio');
    const candidates = [
      join(devEcoRoot, 'tools/ohpm/node_modules/typescript/lib/typescript.js'),
      join(devEcoRoot, 'tools/hvigor/hvigor-ohos-plugin/node_modules/typescript/lib/typescript.js')
    ];
    compilerPath = candidates.find(candidate => existsSync(candidate));
  }
}
if (!compilerPath) {
  throw new Error('Install TypeScript locally or set TYPESCRIPT_PATH to typescript.js. DevEco Studio supplies it on Windows.');
}
const ts = require(compilerPath);
const files = readdirSync(coreRoot).filter(name => name.endsWith('.ts')).map(name => join(coreRoot, name));
const program = ts.createProgram(files, {
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noEmit: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  skipLibCheck: true
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length > 0) {
  const host = {
    getCanonicalFileName: file => file,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n'
  };
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
  process.exitCode = 1;
} else {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL?.startsWith(coreUrl) && specifier.startsWith('.') && extname(specifier) === '') {
        return nextResolve(specifier + '.ts', context);
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith(coreUrl) && url.endsWith('.ts')) {
        const source = readFileSync(fileURLToPath(url), 'utf8');
        const result = ts.transpileModule(source, {
          compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2022 },
          fileName: fileURLToPath(url)
        });
        return { format: 'module', source: result.outputText, shortCircuit: true };
      }
      return nextLoad(url, context);
    }
  });
  await import('./core.test.mjs');
}
