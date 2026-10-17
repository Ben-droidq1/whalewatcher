import { spawn } from 'node:child_process'

// Runs the backend API (port 5174) and the Vite dev server (port 5173) together.
// Vite proxies /api requests to the backend, so the frontend keeps using
// same-origin /api paths during local development.

const children = []

function run(name, command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: true })
  children.push(child)
  child.on('exit', (code) => {
    console.log(`[dev] ${name} exited with code ${code ?? 'signal'}`)
    stopAll()
  })
}

function stopAll() {
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill()
  }
}

run('api', 'node', ['--watch', 'backend/server.js'])
run('web', 'npx', ['vite'])

process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)
