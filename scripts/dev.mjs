import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const tsxCli = fileURLToPath(new URL('../backend/node_modules/tsx/dist/cli.mjs', import.meta.url))

const processes = [
  { name: 'backend', command: tsxCli, args: ['watch', 'src/server.ts'], cwd: `${root}backend` },
  { name: 'frontend', command: nextCli, args: ['dev', '--webpack'], cwd: root },
].map(({ name, command, args, cwd }) => {
  const child = spawn(process.execPath, [command, ...args], { cwd, env: process.env, stdio: 'inherit' })
  child.on('error', (error) => {
    console.error(`[${name}] Failed to start:`, error)
    stop(1)
  })
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[${name}] Stopped${signal ? ` (${signal})` : ` with exit code ${code ?? 1}`}.`)
      stop(code ?? 1)
    }
  })
  return child
})

let stopping = false

function stop(exitCode) {
  if (stopping) return
  stopping = true
  process.exitCode = exitCode
  for (const child of processes) {
    if (child.exitCode === null && child.signalCode === null) child.kill()
  }
}

process.on('SIGINT', () => stop(130))
process.on('SIGTERM', () => stop(143))
