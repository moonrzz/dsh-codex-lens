// Workspace browsing for the dedicated thread page. Listing is read-only and
// confined to the thread's own workspace root; revealing hands one validated
// path to the OS file manager (Explorer on Windows).
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

export function workspaceRoot(cwd) {
  const raw = String(cwd ?? '').trim()
  if (!raw) return null
  return path.resolve(raw)
}

// True when `target` is the root itself or lives underneath it. Uses
// path.relative so `..` segments and drive changes are rejected.
export function isInside(root, target) {
  const rel = path.relative(root, target)
  if (rel === '') return true
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function resolveInside(root, target) {
  const resolved = path.resolve(root, String(target ?? '.') || '.')
  if (!isInside(root, resolved)) {
    const error = new Error('Path escapes the thread workspace.')
    error.code = 'outside-root'
    throw error
  }
  return resolved
}

export async function listDir(root, dir, { limit = 400 } = {}) {
  const resolved = resolveInside(root, dir || '.')
  const dirents = await fs.promises.readdir(resolved, { withFileTypes: true })
  const entries = dirents.slice(0, limit).map((dirent) => ({
    name: dirent.name,
    dir: dirent.isDirectory(),
    link: dirent.isSymbolicLink(),
  }))
  entries.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1))
  return { root, dir: resolved, entries, truncated: dirents.length > limit }
}

export function revealPath(root, target, { select = false } = {}) {
  const resolved = resolveInside(root, target || '.')
  const args = select ? ['/select,', resolved] : [resolved]
  const child = spawn('explorer.exe', args, { detached: true, stdio: 'ignore', windowsHide: false })
  child.unref()
  return resolved
}
