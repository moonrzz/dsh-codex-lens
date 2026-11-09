// Read-only access to the local Codex data directory.
//
// Codex Desktop keeps the durable conversation history in SQLite:
//   state_5.sqlite          threads / projects / project_roots
//   thread_history_1.sqlite thread_turns / thread_items
// and the live rollout JSONL under sessions/YYYY/MM/DD/.  We never write to
// any of these files; the only mutable state of this plugin is its binding
// table under ~/.dsh/dsh-codex-bridge/.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { readLive } from './live.js'

const RECENT_RUN_MS = 2 * 60 * 60 * 1000
const TAIL_BYTES = 200 * 1024

export function resolveCodexHome(home) {
  if (home && String(home).trim()) return path.resolve(String(home).trim())
  const env = process.env.CODEX_HOME
  if (env && env.trim()) return path.resolve(env.trim())
  return path.join(os.homedir(), '.codex')
}

function resolveDbFile(dir, base) {
  const pattern = new RegExp(`^${base}_(\\d+)\\.sqlite$`)
  let best = null
  let bestVersion = -1
  try {
    for (const name of fs.readdirSync(dir)) {
      const match = pattern.exec(name)
      if (!match) continue
      const version = Number(match[1])
      if (version > bestVersion) {
        bestVersion = version
        best = name
      }
    }
  } catch {}
  if (best) return path.join(dir, best)
  const legacy = path.join(dir, `${base}.sqlite`)
  return fs.existsSync(legacy) ? legacy : null
}

function withDb(file, fn) {
  if (!file || !fs.existsSync(file)) return undefined
  const db = new DatabaseSync(file, { readOnly: true })
  try {
    // Codex may be writing the same WAL database while we read it. Wait briefly
    // for the writer instead of surfacing SQLITE_BUSY as a panel error.
    try {
      db.exec('PRAGMA busy_timeout = 2000')
    } catch {}
    return fn(db)
  } finally {
    try {
      db.close()
    } catch {}
  }
}

function stripPathPrefix(value) {
  if (typeof value !== 'string') return value
  return value.startsWith('\\\\?\\') ? value.slice(4) : value
}

function cleanText(value, max) {
  if (typeof value !== 'string') return ''
  let text = value.replace(/\r\n/g, '\n').trim()
  // Codex prepends a boundary preamble to side conversations; keep the useful part.
  text = text.replace(/^Side conversation boundary[\s\S]*?\n\n/i, '')
  text = text.replace(/\n{3,}/g, '\n\n')
  if (text.length > max) text = `${text.slice(0, max - 1).trimEnd()}…`
  return text
}

function firstLine(value, max) {
  const text = cleanText(value, max * 4)
  const line = text.split('\n').find((entry) => entry.trim()) ?? ''
  return cleanText(line, max)
}

function unixToMs(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback
  return value > 10_000_000_000 ? value : value * 1000
}

function tsOf(row) {
  return (
    unixToMs(row?.updated_at_ms, undefined) ??
    unixToMs(row?.recency_at_ms, undefined) ??
    unixToMs(row?.updated_at, undefined) ??
    unixToMs(row?.created_at_ms, undefined) ??
    unixToMs(row?.created_at, 0)
  )
}

export function ago(ms, now = Date.now()) {
  if (!ms) return 'unknown'
  const diff = Math.max(0, now - ms)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return `${Math.round(diff / 86_400_000)}d ago`
}

export function isoOf(ms) {
  if (!ms) return null
  try {
    return new Date(ms).toISOString()
  } catch {
    return null
  }
}

export function normalizeStatus(status, startedAt, now = Date.now()) {
  if (!status) return 'idle'
  if (status === 'inProgress') {
    const started = unixToMs(startedAt, 0)
    return started > 0 && now - started < RECENT_RUN_MS ? 'running' : 'idle'
  }
  return status
}

function threadKindOf(row) {
  if (row.attached_thread_parent_id) return 'side'
  const source = row.thread_source || 'user'
  if (source === 'subagent' || source === 'guardian_review') return 'subagent'
  return 'main'
}

function briefThread(row, project, turns, now) {
  const updatedAt = tsOf(row)
  return {
    id: row.id,
    title: firstLine(row.name || row.title, 160) || 'Untitled Codex thread',
    preview: cleanText(row.preview || row.first_user_message || '', 220),
    cwd: stripPathPrefix(row.cwd || ''),
    projectId: row.project_id ?? null,
    projectName: project?.name ?? null,
    kind: threadKindOf(row),
    parentId: row.attached_thread_parent_id ?? null,
    parentTitle: null,
    threadSource: row.thread_source ?? null,
    status: turns?.status ? normalizeStatus(turns.status, turns.started_at, now) : 'idle',
    updatedAt,
    updatedAtIso: isoOf(updatedAt),
    createdAt: unixToMs(row.created_at, 0),
    createdAtIso: isoOf(unixToMs(row.created_at, 0)),
    turnCount: turns?.count ?? 0,
    tokensUsed: row.tokens_used ?? null,
    branch: row.git_branch ?? null,
    gitSha: row.git_sha ?? null,
    model: row.model ?? null,
    originator: row.originator ?? null,
    source: row.source ?? null,
    archived: Boolean(row.archived),
    rolloutPath: row.rollout_path ?? null,
  }
}

function readTail(file, bytes = TAIL_BYTES) {
  try {
    const stat = fs.statSync(file)
    const length = Math.min(stat.size, bytes)
    if (length <= 0) return null
    const fd = fs.openSync(file, 'r')
    const buffer = Buffer.alloc(length)
    try {
      fs.readSync(fd, buffer, 0, length, Math.max(0, stat.size - length))
    } finally {
      fs.closeSync(fd)
    }
    return { text: buffer.toString('utf8'), mtimeMs: stat.mtimeMs }
  } catch {
    return null
  }
}

export function liveFromRollout(rolloutPath) {
  if (!rolloutPath || !fs.existsSync(rolloutPath)) return null
  const tail = readTail(rolloutPath)
  if (!tail) return null
  let lastTimestamp = null
  let lastTaskStart = null
  let lastTaskComplete = null
  let lastEvent = null
  for (const raw of tail.text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (typeof entry.timestamp === 'string') lastTimestamp = entry.timestamp
    if (entry.type === 'event_msg') {
      const kind = entry.payload?.type
      if (kind === 'task_started') lastTaskStart = entry.timestamp ?? lastTaskStart
      else if (kind === 'task_complete') lastTaskComplete = entry.timestamp ?? lastTaskComplete
      if (typeof kind === 'string') lastEvent = kind
    } else if (typeof entry.type === 'string') {
      lastEvent = entry.type
    }
  }
  const running =
    typeof lastTaskStart === 'string' &&
    (typeof lastTaskComplete !== 'string' || lastTaskStart > lastTaskComplete)
  const lastAt = lastTimestamp ? Date.parse(lastTimestamp) : tail.mtimeMs
  return {
    running,
    lastEvent,
    lastActivityAt: Number.isFinite(lastAt) ? lastAt : tail.mtimeMs,
    fileMtimeMs: tail.mtimeMs,
  }
}

export function createCodex({ home } = {}) {
  const codexHome = resolveCodexHome(home)
  const stateDb = () => resolveDbFile(codexHome, 'state')
  const historyDb = () => resolveDbFile(codexHome, 'thread_history')

  function hasData() {
    return Boolean(stateDb()) || Boolean(historyDb())
  }

  function loadProjects() {
    return withDb(stateDb(), (db) => {
      const projects = new Map()
      const rows = db.prepare('SELECT * FROM projects').all()
      for (const row of rows) {
        projects.set(row.id, {
          id: row.id,
          name: cleanText(row.name, 120) || 'Project',
          position: row.position ?? 0,
          roots: [],
        })
      }
      try {
        for (const root of db.prepare('SELECT * FROM project_roots').all()) {
          const project = projects.get(root.project_id)
          if (project) project.roots.push(stripPathPrefix(root.path))
        }
      } catch {}
      return projects
    }) ?? new Map()
  }

  function loadThreads() {
    return withDb(stateDb(), (db) => db.prepare('SELECT * FROM threads').all()) ?? []
  }

  function loadTurnIndex() {
    const index = new Map()
    withDb(historyDb(), (db) => {
      for (const row of db.prepare('SELECT thread_id, turn_id, status, started_at, completed_at, duration_ms, rollout_ordinal FROM thread_turns ORDER BY thread_id, rollout_ordinal').all()) {
        const current = index.get(row.thread_id)
        index.set(row.thread_id, {
          last: row,
          status: row.status,
          started_at: row.started_at,
          count: (current?.count ?? 0) + 1,
        })
      }
    })
    return index
  }

  function threadRow(threadId) {
    return withDb(stateDb(), (db) => db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId)) ?? null
  }

  function latestTurn(threadId) {
    return (
      withDb(historyDb(), (db) =>
        db.prepare('SELECT * FROM thread_turns WHERE thread_id = ? ORDER BY rollout_ordinal DESC LIMIT 1').get(threadId),
      ) ?? null
    )
  }

  function threadBrief(threadId) {
    const row = threadRow(threadId)
    if (!row) return null
    const project = row.project_id ? loadProjects().get(row.project_id) : null
    const turns = loadTurnIndex().get(threadId) ?? null
    const brief = briefThread(row, project, turns, Date.now())
    if (brief.parentId) {
      const parent = threadRow(brief.parentId)
      if (parent) brief.parentTitle = firstLine(parent.name || parent.title, 120) || null
    }
    return brief
  }

  function roster() {
    const projects = loadProjects()
    const threads = loadThreads()
    const index = loadTurnIndex()
    const now = Date.now()
    const groups = new Map()
    const synthetic = new Map()

    const groupOf = (row) => {
      if (row.project_id && projects.has(row.project_id)) {
        const project = projects.get(row.project_id)
        if (!groups.has(project.id)) groups.set(project.id, { id: project.id, name: project.name, roots: project.roots, synthetic: false, threads: [] })
        return groups.get(project.id)
      }
      const cwd = stripPathPrefix(row.cwd || '')
      if (cwd) {
        const key = `cwd:${cwd.toLowerCase()}`
        if (!synthetic.has(key)) {
          const name = cwd.split(/[\\/]/).filter(Boolean).pop() || cwd
          synthetic.set(key, { id: key, name, roots: [cwd], synthetic: true, threads: [] })
        }
        return synthetic.get(key)
      }
      const key = 'untracked'
      if (!synthetic.has(key)) synthetic.set(key, { id: key, name: '未归类 / Untracked', roots: [], synthetic: true, threads: [] })
      return synthetic.get(key)
    }

    for (const row of threads) {
      if (row.archived) continue
      const group = groupOf(row)
      const turns = index.get(row.id) ?? null
      group.threads.push(briefThread(row, { name: group.name }, turns, now))
    }

    const all = [...groups.values(), ...synthetic.values()]
    const byId = new Map(threads.map((row) => [row.id, row]))
    for (const group of all) {
      group.threads.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      for (const thread of group.threads) {
        if (!thread.parentId) continue
        const parent = byId.get(thread.parentId)
        if (parent) thread.parentTitle = firstLine(parent.name || parent.title, 120) || null
      }
      group.latestAt = group.threads[0]?.updatedAt ?? 0
      group.threadCount = group.threads.length
      group.sideCount = group.threads.filter((thread) => thread.kind === 'side').length
      group.subagentCount = group.threads.filter((thread) => thread.kind === 'subagent').length
    }
    all.sort((a, b) => (b.latestAt ?? 0) - (a.latestAt ?? 0))

    return {
      codexHome,
      generatedAt: now,
      recentCutoff: now - 7 * 86_400_000,
      projectCount: groups.size,
      threadCount: all.reduce((sum, group) => sum + group.threads.length, 0),
      projects: all.map(({ threads: list, ...rest }) => ({ ...rest, threads: list })),
    }
  }

  function overview(threadId, { limit = 20, offset = 0 } = {}) {
    const row = threadRow(threadId)
    if (!row) return null
    const project = row.project_id ? loadProjects().get(row.project_id) : null
    const index = loadTurnIndex().get(threadId) ?? null
    const thread = briefThread(row, project, index, Date.now())

    const turns = withDb(historyDb(), (db) =>
      db.prepare(
        'SELECT turn_id, rollout_ordinal, status, started_at, completed_at, duration_ms, error_json FROM thread_turns WHERE thread_id = ? ORDER BY rollout_ordinal DESC LIMIT ? OFFSET ?',
      ).all(threadId, limit, offset),
    ) ?? []

    if (turns.length === 0) return { thread, turns: [], total: thread.turnCount }

    const placeholders = turns.map(() => '?').join(',')
    const users = withDb(historyDb(), (db) =>
      db.prepare(
        `SELECT turn_id, json_extract(item_json, '$.content[0].text') AS text, rollout_ordinal FROM thread_items WHERE thread_id = ? AND item_type = 'userMessage' AND turn_id IN (${placeholders}) ORDER BY rollout_ordinal`,
      ).all(threadId, ...turns.map((turn) => turn.turn_id)),
    ) ?? []
    const assistants = withDb(historyDb(), (db) =>
      db.prepare(
        `SELECT turn_id, substr(json_extract(item_json, '$.text'), 1, 900) AS text, rollout_ordinal FROM thread_items WHERE thread_id = ? AND item_type = 'agentMessage' AND turn_id IN (${placeholders}) ORDER BY rollout_ordinal`,
      ).all(threadId, ...turns.map((turn) => turn.turn_id)),
    ) ?? []

    const userByTurn = new Map()
    for (const item of users) if (!userByTurn.has(item.turn_id)) userByTurn.set(item.turn_id, item.text)
    const assistantByTurn = new Map()
    for (const item of assistants) assistantByTurn.set(item.turn_id, item.text)

    return {
      thread,
      total: thread.turnCount,
      turns: turns.map((turn) => ({
        turnId: turn.turn_id,
        ordinal: turn.rollout_ordinal,
        status: normalizeStatus(turn.status, turn.started_at),
        startedAt: unixToMs(turn.started_at, 0),
        startedAtIso: isoOf(unixToMs(turn.started_at, 0)),
        durationMs: turn.duration_ms ?? null,
        user: cleanText(userByTurn.get(turn.turn_id) ?? '', 320),
        assistant: cleanText(assistantByTurn.get(turn.turn_id) ?? '', 700),
        error: cleanText(turn.error_json ?? '', 300) || null,
      })),
    }
  }

  const ITEM_PROJECTION = `CASE item_type
      WHEN 'userMessage' THEN substr(json_extract(item_json, '$.content[0].text'), 1, 6000)
      WHEN 'agentMessage' THEN substr(json_extract(item_json, '$.text'), 1, 8000)
      WHEN 'reasoning' THEN substr(json_extract(item_json, '$.summary[0]'), 1, 700)
      WHEN 'plan' THEN substr(json_extract(item_json, '$.text'), 1, 4000)
      WHEN 'commandExecution' THEN json_extract(item_json, '$.command')
      WHEN 'fileChange' THEN (SELECT group_concat(json_extract(c.value, '$.path'), ' | ') FROM json_each(json_extract(item_json, '$.changes')) AS c)
      WHEN 'webSearch' THEN json_extract(item_json, '$.query')
      WHEN 'mcpToolCall' THEN COALESCE(json_extract(item_json, '$.server'), '') || '/' || COALESCE(json_extract(item_json, '$.tool'), '')
      WHEN 'subAgentActivity' THEN COALESCE(json_extract(item_json, '$.agentPath'), json_extract(item_json, '$.agentThreadId'))
      WHEN 'imageView' THEN json_extract(item_json, '$.path')
      ELSE NULL
    END`

  const ITEM_EXTRA = `json_extract(item_json, '$.status') AS status,
    json_extract(item_json, '$.cwd') AS cwd,
    substr(json_extract(item_json, '$.aggregated_output'), 1, 900) AS out_head,
    substr(json_extract(item_json, '$.aggregated_output'), -300) AS out_tail,
    json_array_length(json_extract(item_json, '$.changes')) AS change_count,
    json_array_length(json_extract(item_json, '$.results')) AS result_count`

  function turnDetail(threadId, { turnId = null, ordinal = null, limit = 400 } = {}) {
    const row = threadRow(threadId)
    if (!row) return null
    let turn = null
    if (turnId) {
      turn = withDb(historyDb(), (db) => db.prepare('SELECT * FROM thread_turns WHERE thread_id = ? AND turn_id = ?').get(threadId, turnId)) ?? null
    } else if (ordinal != null) {
      turn = withDb(historyDb(), (db) => db.prepare('SELECT * FROM thread_turns WHERE thread_id = ? AND rollout_ordinal = ?').get(threadId, ordinal)) ?? null
    } else {
      turn = latestTurn(threadId)
    }
    if (!turn) return { thread: threadBrief(threadId), turn: null, steps: [] }

    const items = withDb(historyDb(), (db) =>
      db.prepare(
        `SELECT item_type AS type, rollout_ordinal AS ord, created_at_ms AS at, ${ITEM_PROJECTION} AS text, ${ITEM_EXTRA}
         FROM thread_items WHERE thread_id = ? AND turn_id = ? ORDER BY rollout_ordinal LIMIT ?`,
      ).all(threadId, turn.turn_id, limit),
    ) ?? []

    return {
      thread: threadBrief(threadId),
      turn: {
        turnId: turn.turn_id,
        ordinal: turn.rollout_ordinal,
        status: normalizeStatus(turn.status, turn.started_at),
        startedAt: unixToMs(turn.started_at, 0),
        completedAt: unixToMs(turn.completed_at, 0),
        durationMs: turn.duration_ms ?? null,
        error: cleanText(turn.error_json ?? '', 400) || null,
      },
      steps: items.map((item) => ({
        type: item.type,
        ordinal: item.ord,
        at: item.at ?? null,
        text: item.text == null ? null : String(item.text),
        status: item.status ?? null,
        cwd: stripPathPrefix(item.cwd ?? ''),
        head: item.out_head == null ? null : String(item.out_head),
        tail: item.out_tail == null ? null : String(item.out_tail),
        fileCount: item.change_count ?? null,
        resultCount: item.result_count ?? null,
      })),
    }
  }

  function lastAssistant(threadId, max = 1600) {
    return (
      withDb(historyDb(), (db) =>
        db.prepare(
          "SELECT substr(json_extract(item_json, '$.text'), 1, ?) AS text, rollout_ordinal AS ord, created_at_ms AS at FROM thread_items WHERE thread_id = ? AND item_type = 'agentMessage' ORDER BY rollout_ordinal DESC LIMIT 1",
        ).get(max, threadId),
      ) ?? null
    )
  }

  function recentItems(threadId, limit = 8) {
    return (
      withDb(historyDb(), (db) =>
        db.prepare(
          `SELECT item_type AS type, rollout_ordinal AS ord, ${ITEM_PROJECTION} AS text, ${ITEM_EXTRA} FROM thread_items WHERE thread_id = ? ORDER BY rollout_ordinal DESC LIMIT ?`,
        ).all(threadId, limit),
      ) ?? []
    )
  }

  // Live view for the dedicated thread page: latest turn plus the display
  // items Codex has appended to the rollout so far.
  function liveView(threadId, { maxItems = 80 } = {}) {
    const brief = threadBrief(threadId)
    if (!brief) return null
    const turn = latestTurn(threadId)
    const startedAt = turn ? unixToMs(turn.started_at, 0) : 0
    const startMs = startedAt ? startedAt - 3000 : 0
    const feed = readLive(brief.rolloutPath, { sinceMs: startMs, maxItems })
    const turnStatus = turn ? normalizeStatus(turn.status, turn.started_at) : 'idle'
    const running = feed.running || turnStatus === 'running'
    return {
      thread: brief,
      turn: turn
        ? {
            turnId: turn.turn_id,
            ordinal: turn.rollout_ordinal,
            status: normalizeStatus(turn.status, turn.started_at),
            startedAt: unixToMs(turn.started_at, 0),
            startedAtIso: isoOf(unixToMs(turn.started_at, 0)),
            durationMs: turn.duration_ms ?? null,
            error: cleanText(turn.error_json ?? '', 300) || null,
          }
        : null,
      running,
      status: running ? 'running' : turnStatus,
      lastEvent: feed.lastEvent,
      lastActivityAt: feed.lastActivityAt,
      items: feed.items,
    }
  }

  // Aggregate numbers for the thread page: turn outcomes, durations, item
  // composition, touched files and tool usage.
  function stats(threadId) {
    const brief = threadBrief(threadId)
    if (!brief) return null
    const now = Date.now()
    const data = withDb(historyDb(), (db) => {
      const turnRows = db
        .prepare(
          'SELECT turn_id, rollout_ordinal, status, started_at, completed_at, duration_ms FROM thread_turns WHERE thread_id = ? ORDER BY rollout_ordinal',
        )
        .all(threadId)
      const itemRows = db
        .prepare('SELECT item_type AS type, COUNT(*) AS n FROM thread_items WHERE thread_id = ? GROUP BY item_type')
        .all(threadId)
      const perTurnRows = db
        .prepare('SELECT turn_id, COUNT(*) AS n FROM thread_items WHERE thread_id = ? GROUP BY turn_id')
        .all(threadId)
      const fileRows = db
        .prepare(
          `SELECT json_extract(j.value, '$.path') AS path, json_extract(j.value, '$.kind.type') AS kind, COUNT(*) AS n
             FROM thread_items i, json_each(json_extract(i.item_json, '$.changes')) j
            WHERE i.thread_id = ? AND i.item_type = 'fileChange'
            GROUP BY path, kind`,
        )
        .all(threadId)
      const commandRow = db
        .prepare(
          `SELECT COUNT(*) AS n,
                  COALESCE(SUM(CASE WHEN json_extract(item_json, '$.status') = 'failed' THEN 1 ELSE 0 END), 0) AS failed
             FROM thread_items WHERE thread_id = ? AND item_type = 'commandExecution'`,
        )
        .get(threadId)
      const mcpRows = db
        .prepare(
          `SELECT json_extract(item_json, '$.server') AS server, json_extract(item_json, '$.tool') AS tool, COUNT(*) AS n
             FROM thread_items WHERE thread_id = ? AND item_type = 'mcpToolCall'
            GROUP BY server, tool ORDER BY n DESC LIMIT 8`,
        )
        .all(threadId)
      const firstUserRow = db
        .prepare(
          `SELECT substr(json_extract(item_json, '$.content[0].text'), 1, 400) AS text
             FROM thread_items WHERE thread_id = ? AND item_type = 'userMessage'
            ORDER BY rollout_ordinal LIMIT 1`,
        )
        .get(threadId)
      return { turnRows, itemRows, perTurnRows, fileRows, commandRow, mcpRows, firstUserRow }
    })
    if (!data) return null

    const counts = { completed: 0, failed: 0, interrupted: 0, running: 0 }
    const durations = []
    for (const turn of data.turnRows) {
      const status = normalizeStatus(turn.status, turn.started_at, now)
      const bucket = status === 'completed' || status === 'failed' || status === 'running' ? status : 'interrupted'
      counts[bucket] += 1
      if (Number.isFinite(turn.duration_ms) && turn.duration_ms > 0) durations.push(turn.duration_ms)
    }
    durations.sort((a, b) => a - b)
    const totalMs = durations.reduce((sum, value) => sum + value, 0)
    const pick = (p) => (durations.length ? durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * p))] : null)

    const perTurn = new Map(data.perTurnRows.map((row) => [row.turn_id, row.n]))
    const recentTurns = data.turnRows.slice(-24).map((turn) => ({
      turnId: turn.turn_id,
      ordinal: turn.rollout_ordinal,
      status: normalizeStatus(turn.status, turn.started_at, now),
      startedAt: unixToMs(turn.started_at, 0),
      durationMs: turn.duration_ms ?? null,
      itemCount: perTurn.get(turn.turn_id) ?? 0,
    }))

    const byType = data.itemRows.map((row) => ({ type: row.type, count: row.n }))
    const countOf = (type) => byType.find((row) => row.type === type)?.count ?? 0

    const byKind = { add: 0, update: 0, delete: 0, other: 0 }
    const fileMap = new Map()
    for (const row of data.fileRows) {
      const filePath = stripPathPrefix(row.path || '') || '(unknown)'
      const kind = row.kind === 'add' || row.kind === 'update' || row.kind === 'delete' ? row.kind : 'other'
      byKind[kind] += row.n
      const entry = fileMap.get(filePath) ?? { path: filePath, count: 0, kinds: new Set() }
      entry.count += row.n
      entry.kinds.add(kind)
      fileMap.set(filePath, entry)
    }
    const files = [...fileMap.values()].sort((a, b) => b.count - a.count)

    return {
      thread: brief,
      computedAt: now,
      turns: {
        total: data.turnRows.length,
        completed: counts.completed,
        failed: counts.failed,
        interrupted: counts.interrupted,
        running: counts.running,
        successRate: data.turnRows.length ? counts.completed / data.turnRows.length : 0,
        durationsMs: {
          avg: durations.length ? Math.round(totalMs / durations.length) : null,
          median: pick(0.5),
          p95: pick(0.95),
          longest: durations.length ? durations[durations.length - 1] : null,
          total: durations.length ? totalMs : null,
        },
      },
      items: {
        total: data.itemRows.reduce((sum, row) => sum + row.n, 0),
        byType,
        reasoning: countOf('reasoning'),
        commands: countOf('commandExecution'),
        commandFailures: data.commandRow?.failed ?? 0,
        assistantMessages: countOf('agentMessage'),
        userMessages: countOf('userMessage'),
        fileChanges: countOf('fileChange'),
        webSearches: countOf('webSearch'),
        mcpCalls: countOf('mcpToolCall'),
        subagentCalls: countOf('subAgentActivity'),
        compactions: countOf('contextCompaction'),
        images: countOf('imageView'),
      },
      files: {
        touched: fileMap.size,
        byKind,
        top: files.slice(0, 16).map((entry) => ({ path: entry.path, count: entry.count, kinds: [...entry.kinds] })),
      },
      mcp: data.mcpRows.map((row) => ({ server: row.server || '', tool: row.tool || '', count: row.n })),
      recentTurns,
      firstUser: cleanText(data.firstUserRow?.text ?? '', 400) || null,
    }
  }

  function status(threadId) {
    const brief = threadBrief(threadId)
    if (!brief) return null
    const turn = latestTurn(threadId)
    const live = liveFromRollout(brief.rolloutPath)
    const last = lastAssistant(threadId)
    const feed = readLive(brief.rolloutPath, {
      sinceMs: turn ? unixToMs(turn.started_at, 0) - 3000 : 0,
      maxItems: 12,
    })
    const running = (live ? live.running : brief.status === 'running') || feed.running
    return {
      thread: brief,
      running,
      status: running ? 'running' : brief.status,
      live,
      liveFeed: running ? feed.items.slice(-8) : [],
      turn: turn
        ? {
            turnId: turn.turn_id,
            ordinal: turn.rollout_ordinal,
            status: normalizeStatus(turn.status, turn.started_at),
            startedAt: unixToMs(turn.started_at, 0),
            startedAtIso: isoOf(unixToMs(turn.started_at, 0)),
            durationMs: turn.duration_ms ?? null,
            error: cleanText(turn.error_json ?? '', 300) || null,
          }
        : null,
      lastMessage: last
        ? {
            text: cleanText(last.text ?? '', 1600),
            ordinal: last.ord,
            at: last.at ?? null,
          }
        : null,
      recent: recentItems(threadId, 8).reverse().map((item) => ({
        type: item.type,
        text: item.text == null ? null : cleanText(String(item.text), 400),
        status: item.status ?? null,
      })),
    }
  }

  function search(threadId, query, { limit = 10 } = {}) {
    const needle = String(query ?? '').trim()
    if (!needle) return []
    const escaped = needle.replace(/[\\%_]/g, (char) => `\\${char}`)
    const pattern = `%${escaped}%`
    const rows = withDb(historyDb(), (db) =>
      db.prepare(
        `SELECT turn_id, type, ord, at, text FROM (
           SELECT turn_id, item_type AS type, rollout_ordinal AS ord, created_at_ms AS at, ${ITEM_PROJECTION} AS text
           FROM thread_items WHERE thread_id = ?
         ) WHERE text LIKE ? ESCAPE '\\' ORDER BY ord DESC LIMIT ?`,
      ).all(threadId, pattern, Math.max(1, Math.min(30, limit))),
    ) ?? []
    const lowerNeedle = needle.toLowerCase()
    return rows.map((row) => {
      const text = String(row.text ?? '')
      const index = text.toLowerCase().indexOf(lowerNeedle)
      const start = Math.max(0, index - 90)
      const end = Math.min(text.length, index + needle.length + 220)
      return {
        turnId: row.turn_id,
        type: row.type,
        ordinal: row.ord,
        at: row.at ?? null,
        snippet: cleanText(`${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`, 340),
      }
    })
  }

  return {
    codexHome,
    hasData,
    roster,
    overview,
    turnDetail,
    status,
    liveView,
    stats,
    search,
    threadBrief,
    latestTurn,
  }
}
