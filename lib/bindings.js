// Per-DSH-session binding table. The plugin owns this file; Codex data stays read-only.
import fs from 'node:fs'
import path from 'node:path'

const FILE_VERSION = 1

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export function createBindings(dir) {
  const file = path.join(dir, 'bindings.json')
  let entries = {}

  try {
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.sessions && typeof parsed.sessions === 'object') {
      entries = parsed.sessions
    }
  } catch {}

  function persist() {
    try {
      ensureDir(dir)
      const payload = JSON.stringify({ version: FILE_VERSION, sessions: entries }, null, 2)
      const temp = `${file}.${process.pid}.tmp`
      fs.writeFileSync(temp, payload, 'utf8')
      fs.renameSync(temp, file)
    } catch {
      // The in-memory binding still works for this process; the file is only durability.
    }
  }

  return {
    dir,
    file,
    get(sessionId) {
      if (typeof sessionId !== 'string' || !sessionId) return null
      const entry = entries[sessionId]
      if (!entry || typeof entry.threadId !== 'string') return null
      return { threadId: entry.threadId, boundAt: entry.boundAt ?? null }
    },
    set(sessionId, threadId) {
      if (typeof sessionId !== 'string' || !sessionId) throw new Error('sessionId is required')
      if (typeof threadId !== 'string' || !threadId) throw new Error('threadId is required')
      entries = { ...entries, [sessionId]: { threadId, boundAt: new Date().toISOString() } }
      persist()
      return this.get(sessionId)
    },
    remove(sessionId) {
      if (!entries[sessionId]) return false
      const next = { ...entries }
      delete next[sessionId]
      entries = next
      persist()
      return true
    },
    count() {
      return Object.keys(entries).length
    },
  }
}
