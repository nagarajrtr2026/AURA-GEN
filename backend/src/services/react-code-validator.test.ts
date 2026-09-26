import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateGeneratedReactCode } from './react-code-validator.js'

test('approves valid React JSX using allowed React imports', () => {
  const result = validateGeneratedReactCode(`
    import React from 'react'
    export default function GeneratedCard({ title }: { title: string }) {
      return <section><h2>{title}</h2><input aria-label="Name" /></section>
    }
  `)

  assert.deepEqual(result, { approved: true })
})

test('rejects invalid JavaScript and JSX syntax', () => {
  const result = validateGeneratedReactCode('export default function Broken() { return <section>')

  assert.equal(result.approved, false)
})

test('rejects source without JSX and oversized source', () => {
  assert.equal(validateGeneratedReactCode('export default function View() { return null }').approved, false)
  assert.equal(validateGeneratedReactCode(' '.repeat(100_001)).approved, false)
})

test('rejects executable code and unsafe imports or browser APIs', () => {
  const maliciousSamples = [
    'eval("process.exit()")',
    'new Function("return globalThis")()',
    'import fs from "node:fs"; export default function View() { return <div /> }',
    'export default function View() { return <div>{window.localStorage}</div> }',
    'export default function View() { return <div>{fetch("https://example.com")}</div> }',
    'export default function View() { return <div>{Reflect.construct(Function, [])}</div> }',
    'export default function View() { return <script /> }',
  ]

  for (const source of maliciousSamples) {
    const result = validateGeneratedReactCode(source)
    assert.equal(result.approved, false, `Expected rejection for: ${source}`)
  }
})