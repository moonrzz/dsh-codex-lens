// Live tail reader for a Codex rollout JSONL.
//
// Codex appends response items to sessions/YYYY/MM/DD/rollout-*.jsonl while a
// turn is running: user/assistant messages, reasoning summaries, tool calls
// and task_started/task_complete markers. Reading the tail of that file is the
// only "real time" view we get without the Codex app-server protocol, so the
// dedicated thread page polls this reader every couple of seconds.
import fs from 'node:fs'

const DEFAULT_TAIL = 512 * 1024
const ENV_RE = /^<(environment_context|user_instructions|permissions|collaboration_mode|world_state)[\s>]/

function clamp(value, max) {
  const text = String(value ?? '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function firstCommand(input) {
  const text = String(input ?? '')
  const backtick = text.match(/cmd:\s*`([^`]{1,500})/)
  if (backtick) return backtick[1]
  const quoted = text.match(/cmd:\s*["']([^"']{1,500})/)
  if (quoted) return quoted[1]
  const line = text.split('\n').map((part) => part.trim()).find(Boolean)
  return line ? clamp(line, 300) : ''
}

function toItem(payload, ts) {
  const type = payload?.type
  if (type === 'message') {
    const role = payload.role
    if (role !== 'assistant' && role !== 'user') return null
    const text = (payload.content ?? [])
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim()
    if (!text || ENV_RE.test(text)) return null
    return {
      id: payload.id || `msg-${ts ?? 'x'}`,
      ts: ts ?? null,
      type: role === 'user' ? 'user' : 'assistant',
      text: clamp(text, 2200),
    }
  }
  if (type === 'reasoning') {
    const summary = (payload.summary ?? [])
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join(' ')
    const content = (payload.content ?? [])
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join(' ')
    const text = (summary || content).trim()
    if (!text) return null
    return { id: payload.id || `rs-${ts ?? 'x'}`, ts: ts ?? null, type: 'reasoning', text: clamp(text, 700) }
  }
  if (type === 'custom_tool_call') {
    const name = payload.name || 'tool'
    return {
      id: payload.id || payload.call_id || `call-${ts ?? 'x'}`,
      ts: ts ?? null,
      type: 'tool',
      name,
      text: name === 'exec' ? firstCommand(payload.input) : clamp(payload.input, 300),
    }
  }
  if (type === 'function_call') {
    return {
      id: payload.id || payload.call_id || `fn-${ts ?? 'x'}`,
      ts: ts ?? null,
      type: 'tool',
      name: payload.name || 'tool',
      text: clamp(payload.arguments, 300),
    }
  }
  if (type === 'local_shell_call') {
    const cmd = Array.isArray(payload.action?.command) ? payload.action.command.join(' ') : payload.action?.command
    return { id: payload.id || `shell-${ts ?? 'x'}`, ts: ts ?? null, type: 'tool', name: 'shell', text: clamp(cmd, 400) }
  }
  return null
}

// Parse the tail of a rollout file into a chronological list of display items.
// `sinceMs` drops items older than the current turn so the feed does not replay
// the whole conversation.
export function readLive(rolloutPath, { sinceMs = 0, maxItems = 80, tailBytes = DEFAULT_TAIL } = {}) {
  if (!rolloutPath) return { items: [], running: false, lastEvent: null, lastActivityAt: null }
  let stat
  try {
    stat = fs.statSync(rolloutPath)
  } catch {
    return { items: [], running: false, lastEvent: null, lastActivityAt: null }
  }
  if (stat.size <= 0) return { items: [], running: false, lastEvent: null, lastActivityAt: null }
  const length = Math.min(stat.size, tailBytes)
  const start = stat.size - length
  const buffer = Buffer.alloc(length)
  let fd
  try {
    fd = fs.openSync(rolloutPath, 'r')
    fs.readSync(fd, buffer, 0, length, start)
  } finally {
    if (fd !== undefined) fs.closeSync(fd)
  }
  let lines = buffer.toString('utf8').split('\n')
  if (start > 0) lines = lines.slice(1) // first line is probably cut mid-JSON

  const byId = new Map()
  let running = false
  let lastEvent = null
  let lastActivityAt = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    const ts = typeof entry.timestamp === 'string' ? Date.parse(entry.timestamp) : NaN
    if (Number.isFinite(ts)) lastActivityAt = ts
    if (entry.type === 'event_msg') {
      const kind = entry.payload?.type
      if (kind === 'task_started') {
        running = true
        lastEvent = kind
        if (!Number.isFinite(sinceMs) || sinceMs <= 0) {
          // keep the marker visible when the client asked for everything
        }
      } else if (kind === 'task_complete' || kind === 'turn_aborted' || kind === 'error') {
        running = false
        lastEvent = kind
      }
      if (kind === 'task_started' || kind === 'task_complete') {
        byId.set(`evt-${kind}-${entry.timestamp ?? ts}`, {
          id: `evt-${kind}-${entry.timestamp ?? ts}`,
          ts: Number.isFinite(ts) ? ts : null,
          type: 'event',
          name: kind,
          text: kind === 'task_started' ? 'Codex started working' : 'Codex finished this turn',
        })
      }
      continue
    }
    if (entry.type !== 'response_item') continue
    const item = toItem(entry.payload, Number.isFinite(ts) ? ts : null)
    if (!item) continue
    byId.set(item.id, item)
  }

  let items = [...byId.values()]
  if (Number.isFinite(sinceMs) && sinceMs > 0) {
    items = items.filter((item) => !item.ts || item.ts >= sinceMs)
  }
  items.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0))
  if (items.length > maxItems) items = items.slice(-maxItems)
  return { items, running, lastEvent, lastActivityAt }
}
