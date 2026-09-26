import { parse } from '@babel/parser'

type AstNode = Record<string, unknown> & { type?: string }

export type ReactCodeValidationResult =
  | { approved: true }
  | { approved: false; error: string }

const allowedImports = new Set(['react', 'react/jsx-runtime'])
const blockedIdentifiers = new Set([
  'alert',
  'Bun',
  'Buffer',
  'caches',
  'confirm',
  'Deno',
  'document',
  'EventSource',
  'eval',
  'fetch',
  'Function',
  'global',
  'globalThis',
  'indexedDB',
  'importScripts',
  'localStorage',
  'location',
  'module',
  'navigator',
  'performance',
  'process',
  'prompt',
  'Proxy',
  'queueMicrotask',
  'Reflect',
  'require',
  'sessionStorage',
  'setInterval',
  'setTimeout',
  'SharedArrayBuffer',
  'SharedWorker',
  'ServiceWorker',
  'Atomics',
  'WebAssembly',
  'WebSocket',
  'window',
  'Worker',
  'XMLHttpRequest',
])
const blockedJsxElements = new Set(['embed', 'iframe', 'object', 'script'])
const blockedJsxAttributes = new Set(['action', 'dangerouslySetInnerHTML', 'formAction', 'srcDoc'])

function staticPropertyName(member: AstNode): string | null {
  const property = member.property as AstNode | undefined
  if (!property) return null
  if (property.type === 'Identifier' && typeof property.name === 'string') return property.name
  if (property.type === 'StringLiteral' && typeof property.value === 'string') return property.value
  return null
}

function inspectNode(root: unknown): { error: string | null; containsJsx: boolean } {
  const pending: unknown[] = [root]
  let containsJsx = false

  while (pending.length > 0) {
    const value = pending.pop()
    if (Array.isArray(value)) {
      pending.push(...value)
      continue
    }
    if (!value || typeof value !== 'object') continue

    const node = value as AstNode
    if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') {
      const source = node.source as AstNode | null | undefined
      if (source && typeof source.value === 'string' && !allowedImports.has(source.value)) {
        return { error: `Import from "${source.value}" is not allowed.`, containsJsx }
      }
    }

    if (node.type === 'ImportExpression' || node.type === 'WithStatement' || node.type === 'ThisExpression' || node.type === 'MetaProperty') {
      return { error: 'Dynamic imports, with-statements, this, and import.meta are not allowed.', containsJsx }
    }

    if (node.type === 'NewExpression') {
      return { error: 'Constructor calls are not allowed.', containsJsx }
    }

    if (node.type === 'Identifier' && typeof node.name === 'string' && blockedIdentifiers.has(node.name)) {
      return { error: `Use of "${node.name}" is not allowed.`, containsJsx }
    }

    if (node.type === 'MemberExpression') {
      const propertyName = staticPropertyName(node)
      if (propertyName === 'constructor' || propertyName === 'eval') {
        return { error: `Access to "${propertyName}" is not allowed.`, containsJsx }
      }
    }

    if (node.type === 'CallExpression') {
      const callee = node.callee as AstNode | undefined
      if (callee?.type === 'Import') return { error: 'Dynamic imports are not allowed.', containsJsx }
      if (callee?.type === 'Identifier' && typeof callee.name === 'string' && blockedIdentifiers.has(callee.name)) {
        return { error: `Calls to "${callee.name}" are not allowed.`, containsJsx }
      }
    }

    if (node.type === 'JSXElement' || node.type === 'JSXFragment') containsJsx = true

    if (node.type === 'JSXElement') {
      const openingElement = node.openingElement as AstNode | undefined
      const name = openingElement?.name as AstNode | undefined
      if (name?.type === 'JSXIdentifier' && typeof name.name === 'string' && blockedJsxElements.has(name.name.toLowerCase())) {
        return { error: `The <${name.name}> element is not allowed.`, containsJsx }
      }
    }

    if (node.type === 'JSXAttribute') {
      const name = node.name as AstNode | undefined
      if (name?.type === 'JSXIdentifier' && typeof name.name === 'string' && blockedJsxAttributes.has(name.name)) {
        return { error: `The "${name.name}" JSX attribute is not allowed.`, containsJsx }
      }
    }

    pending.push(...Object.values(node))
  }

  return { error: null, containsJsx }
}

export function validateGeneratedReactCode(source: string): ReactCodeValidationResult {
  if (source.length > 100_000) {
    return { approved: false, error: 'Generated React code exceeds the 100 KB size limit.' }
  }

  let ast: AstNode
  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
    }) as unknown as AstNode
  } catch {
    return { approved: false, error: 'Generated React code has invalid JavaScript/JSX syntax.' }
  }

  const result = inspectNode(ast)
  if (result.error) return { approved: false, error: result.error }
  if (!result.containsJsx) return { approved: false, error: 'Generated React code must contain JSX.' }
  return { approved: true }
}