// Model-facing text rendering for the codex_* tools. Every helper enforces a
// hard character budget so a single huge Codex turn can never flood the
// DSH context: detail is paged and truncated, never dumped.
import { ago, isoOf } from './codex.js'

const STATUS_LABELS = {
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  interrupted: 'interrupted',
  idle: 'idle',
}

function clamp(value, max) {
  const text = String(value ?? '')
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function indent(text, prefix = '  ') {
  return String(text ?? '')
    .split('\n')
    .map((line) => (line ? prefix + line : line))
    .join('\n')
}

function statusLine(status) {
  return STATUS_LABELS[status] ?? status ?? 'unknown'
}

function timeLine(ms) {
  if (!ms) return 'unknown time'
  return `${ago(ms)} (${isoOf(ms)})`
}

function threadHeader(thread) {
  const lines = [`Codex thread: ${thread.title}`]
  lines.push(`id: ${thread.id}`)
  if (thread.cwd) lines.push(`workspace: ${thread.cwd}`)
  lines.push(`state: ${statusLine(thread.status)}${thread.running ? ' (live rollout says running)' : ''}`)
  if (thread.kind === 'side') lines.push(`kind: side conversation${thread.parentTitle ? ` of "${thread.parentTitle}"` : ''}`)
  if (thread.kind === 'subagent') lines.push('kind: subagent thread')
  if (thread.branch) lines.push(`git branch: ${thread.branch}`)
  if (thread.turnCount) lines.push(`turns: ${thread.turnCount}`)
  return lines
}

export function statusText(status) {
  const lines = threadHeader({ ...status.thread, status: status.status, running: status.running })
  if (status.turn) {
    const turn = status.turn
    lines.push(
      `latest turn: #${turn.ordinal} ${statusLine(turn.status)}, started ${timeLine(turn.startedAt)}${
        turn.durationMs ? `, lasted ${Math.round(turn.durationMs / 1000)}s` : ''
      }`,
    )
    if (turn.error) lines.push(`latest turn error: ${clamp(turn.error, 300)}`)
  } else {
    lines.push('latest turn: none recorded')
  }
  if (status.live) {
    lines.push(
      `rollout tail: last event "${status.live.lastEvent ?? 'unknown'}", last activity ${timeLine(status.live.lastActivityAt)}`,
    )
  }
  if (status.liveFeed?.length) {
    lines.push('current activity (live rollout, newest last):')
    for (const item of status.liveFeed) {
      const label =
        item.type === 'reasoning'
          ? 'thinking'
          : item.type === 'assistant'
            ? 'codex'
            : item.type === 'user'
              ? 'user'
              : item.type === 'event'
                ? 'event'
                : item.name || 'tool'
      const at = item.ts ? ` (${ago(item.ts)})` : ''
      lines.push(`- ${label}${at}: ${clamp(String(item.text ?? '').replace(/\s+/g, ' '), 240)}`)
    }
  }
  if (status.lastMessage?.text) {
    lines.push(`last Codex message${status.lastMessage.ordinal != null ? ` (#${status.lastMessage.ordinal})` : ''}:`)
    lines.push(indent(clamp(status.lastMessage.text, 2000)))
  }
  if (status.recent?.length) {
    lines.push('recent steps (oldest → newest):')
    for (const step of status.recent) {
      lines.push(`- ${step.type}${step.status ? ` [${step.status}]` : ''}: ${clamp((step.text ?? '').replace(/\s+/g, ' '), 220)}`)
    }
  }
  lines.push('')
  lines.push('Use codex_overview for the turn list, codex_turn for one turn, codex_search to find details.')
  return clamp(lines.join('\n'), 7000)
}

export function overviewText(overview, { offset = 0, limit = 20 } = {}) {
  const { thread, turns, total } = overview
  const lines = threadHeader(thread)
  if (!turns.length) {
    lines.push('', 'No turns are recorded for this thread in the local Codex history.')
    return clamp(lines.join('\n'), 7000)
  }
  const lastIndex = offset + turns.length
  lines.push(`turns ${offset + 1}–${lastIndex} of ${total ?? thread.turnCount ?? '?'} (newest first)`)
  for (const turn of turns) {
    lines.push('')
    lines.push(
      `#${turn.ordinal} ${statusLine(turn.status)} · ${timeLine(turn.startedAt)}${turn.durationMs ? ` · ${Math.round(turn.durationMs / 1000)}s` : ''} · id ${turn.turnId}`,
    )
    if (turn.user) lines.push(`user: ${clamp(turn.user.replace(/\s+/g, ' '), 300)}`)
    if (turn.assistant) lines.push(`codex: ${clamp(turn.assistant.replace(/\s*\n+\s*/g, ' '), 700)}`)
    if (turn.error) lines.push(`error: ${clamp(turn.error, 240)}`)
  }
  if (lastIndex < (total ?? 0)) {
    lines.push('', `More turns exist. Call codex_overview with offset=${lastIndex} to page older turns.`)
  }
  return clamp(lines.join('\n'), 11000)
}

export function turnText(detail, { maxChars = 14000 } = {}) {
  if (!detail || !detail.turn) {
    return 'No turn is recorded for this thread in the local Codex history.'
  }
  const { thread, turn, steps } = detail
  const lines = [`Codex turn #${turn.ordinal} (${statusLine(turn.status)}) of "${thread.title}"`]
  lines.push(`thread: ${thread.id}${thread.cwd ? ` · workspace ${thread.cwd}` : ''}`)
  lines.push(
    `started ${timeLine(turn.startedAt)}${turn.completedAt ? `, completed ${timeLine(turn.completedAt)}` : ''}${
      turn.durationMs ? `, lasted ${Math.round(turn.durationMs / 1000)}s` : ''
    }`,
  )
  if (turn.error) lines.push(`error: ${clamp(turn.error, 400)}`)
  lines.push('')
  for (const step of steps) {
    const budgetLeft = maxChars - lines.join('\n').length
    if (budgetLeft <= 0) {
      lines.push('… output truncated to fit the context budget. Use codex_search for details.')
      break
    }
    switch (step.type) {
      case 'userMessage':
        lines.push('USER:', indent(clamp(step.text, 5000)), '')
        break
      case 'agentMessage':
        lines.push('CODEX:', indent(clamp(step.text, 8000)), '')
        break
      case 'reasoning':
        if (step.text) lines.push(`· thinking: ${clamp(step.text.replace(/\s+/g, ' '), 600)}`)
        break
      case 'plan':
        lines.push('PLAN:', indent(clamp(step.text, 4000)), '')
        break
      case 'commandExecution': {
        const command = clamp(String(step.text ?? '').replace(/\s+/g, ' '), 500)
        lines.push(`$ ${command}${step.status ? ` [${step.status}]` : ''}${step.cwd ? ` (cwd ${step.cwd})` : ''}`)
        if (step.head) {
          lines.push(indent(clamp(step.head, 900)))
          if (step.tail && step.tail !== step.head) lines.push('  …', indent(clamp(step.tail, 300)))
        }
        break
      }
      case 'fileChange':
        lines.push(`✎ ${clamp(step.text, 600)}${step.fileCount ? ` (${step.fileCount} file${step.fileCount === 1 ? '' : 's'})` : ''}`)
        break
      case 'webSearch':
        lines.push(`🔎 web search: ${clamp(step.text, 300)}${step.resultCount ? ` (${step.resultCount} results)` : ''}`)
        break
      case 'mcpToolCall':
        lines.push(`⚙ mcp tool: ${clamp(step.text, 300)}${step.status ? ` [${step.status}]` : ''}`)
        break
      case 'subAgentActivity':
        lines.push(`↳ subagent: ${clamp(step.text, 300)}`)
        break
      case 'contextCompaction':
        lines.push('… context compacted by Codex')
        break
      case 'imageView':
        lines.push(`🖼 viewed image: ${clamp(step.text, 300)}`)
        break
      default:
        lines.push(`- ${step.type ?? 'step'}`)
    }
  }
  return clamp(lines.join('\n'), maxChars)
}

export function searchText(thread, query, hits) {
  const lines = [`Search "${query}" in Codex thread "${thread.title}" (${thread.id})`]
  if (!hits.length) {
    lines.push('', 'No matches in the local Codex history. Try a shorter or different term.')
    return clamp(lines.join('\n'), 6000)
  }
  lines.push(`${hits.length} hit${hits.length === 1 ? '' : 's'} (newest first):`)
  for (const hit of hits) {
    lines.push('', `#${hit.ordinal} ${hit.type}${hit.at ? ` · ${timeLine(hit.at)}` : ''}`)
    lines.push(`  turn: ${hit.turnId}`)
    lines.push(indent(clamp(hit.snippet, 400), '  '))
  }
  lines.push('', 'Snippets come from the Codex transcript and may contain code or file paths.')
  return clamp(lines.join('\n'), 7000)
}

export function bindingCard(status) {
  const { thread } = status
  const lines = [
    `[Codex Lens] This DSH session is now linked to a Codex thread.`,
    `thread: ${thread.title}`,
    `id: ${thread.id}`,
    thread.cwd ? `workspace: ${thread.cwd}` : '',
    `state: ${statusLine(status.status)}${status.running ? ' (Codex is working now)' : ''}`,
  ].filter(Boolean)
  if (status.turn) {
    lines.push(`latest turn: #${status.turn.ordinal} ${statusLine(status.turn.status)} · ${timeLine(status.turn.startedAt)}`)
  }
  if (status.lastMessage?.text) {
    lines.push(`latest Codex message: ${clamp(status.lastMessage.text.replace(/\s+/g, ' '), 400)}`)
  }
  lines.push(
    'The link is read-only. Use codex_status, codex_overview, codex_turn, and codex_search to read the Codex thread when the user asks about its work or wants a project-level deliverable.',
  )
  return clamp(lines.join('\n'), 1500)
}
