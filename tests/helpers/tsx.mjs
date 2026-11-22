// Reuse the existing TypeScript dependency for server-rendering component tests.
// Node 24's hooks avoid adding a separate TSX test runtime or browser dependency.
import { registerHooks } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'
import ts from 'typescript'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL && specifier.startsWith('.') && !extname(specifier)) {
      for (const extension of ['.ts', '.tsx']) {
        const url = new URL(specifier + extension, context.parentURL)
        if (existsSync(url)) return nextResolve(url.href, context)
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.tsx')) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
      }).outputText,
    }
    return nextLoad(url, context)
  },
})
