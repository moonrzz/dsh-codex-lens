// The four model-facing tools. They are registered globally but only become
// visible for a DSH session that has a Codex thread bound to it (options.when),
// and every call re-reads the binding for the calling agent so a rebind never
// leaks another thread's transcript.
import { statusText, overviewText, turnText, searchText } from './render.js'

function sessionOf(exec) {
  return exec?.agent?.id ?? null
}

function boundThreadId(bindings, exec) {
  const sessionId = sessionOf(exec)
  if (!sessionId) throw new Error('This tool needs a DSH session; no calling agent was provided.')
  const binding = bindings.get(sessionId)
  if (!binding) {
    throw new Error('This DSH session is not bound to a Codex thread yet. Open the Codex tab in the right sidebar and click a thread to bind it.')
  }
  return binding.threadId
}

const output = {
  schema: { type: 'string' },
  render: (_args, value) => [{ type: 'text', text: value }],
}

export function registerTools(ctx, { codex, bindings }) {
  const when = ({ agent }) => Boolean(agent?.id && bindings.get(agent.id))

  ctx.tools.register(
    {
      name: 'codex_status',
      description:
        'Read the current state of the Codex thread bound to this DSH session: whether Codex is working right now, the latest turn, the latest Codex message, and the most recent steps. Call this first when the user asks what Codex is doing, how far it got, or whether it is stuck.',
      parameters: { type: 'object', properties: {}, required: [] },
      output,
      async execute(_args, exec) {
        const threadId = boundThreadId(bindings, exec)
        const status = codex.status(threadId)
        if (!status) throw new Error(`Codex thread ${threadId} was not found in the local Codex history. It may have been deleted or archived.`)
        return statusText(status)
      },
    },
    { when },
  )

  ctx.tools.register(
    {
      name: 'codex_overview',
      description:
        'List the turns of the bound Codex thread, newest first, with each turn\'s user request and Codex summary. Use it to reconstruct what the Codex session did over time, or to find the turn worth reading next. Supports paging with offset/limit.',
      parameters: {
        type: 'object',
        properties: {
          offset: { type: 'integer', description: 'Number of turns to skip, counted from the newest turn. Default 0.' },
          limit: { type: 'integer', description: 'How many turns to return, 1-50. Default 15.' },
        },
        required: [],
      },
      output,
      async execute(args, exec) {
        const threadId = boundThreadId(bindings, exec)
        const limit = Math.max(1, Math.min(50, Number(args.limit) || 15))
        const offset = Math.max(0, Number(args.offset) || 0)
        const data = codex.overview(threadId, { limit, offset })
        if (!data) throw new Error(`Codex thread ${threadId} was not found in the local Codex history.`)
        return overviewText(data, { offset, limit })
      },
    },
    { when },
  )

  ctx.tools.register(
    {
      name: 'codex_turn',
      description:
        'Read one turn of the bound Codex thread in detail: user request, Codex messages, reasoning summaries, plans, commands with trimmed output, changed files, web/MCP calls. Without arguments it reads the latest turn; pass turnId from codex_overview or a turn ordinal. Output is trimmed to a context budget, so use codex_search to look up anything that was cut.',
      parameters: {
        type: 'object',
        properties: {
          turnId: { type: 'string', description: 'Turn id from codex_overview.' },
          ordinal: { type: 'integer', description: 'Turn ordinal (the # number shown by codex_overview) when the id is not known.' },
        },
        required: [],
      },
      output,
      async execute(args, exec) {
        const threadId = boundThreadId(bindings, exec)
        const detail = codex.turnDetail(threadId, {
          turnId: typeof args.turnId === 'string' && args.turnId.trim() ? args.turnId.trim() : null,
          ordinal: Number.isInteger(args.ordinal) ? args.ordinal : null,
        })
        if (!detail) throw new Error(`Codex thread ${threadId} was not found in the local Codex history.`)
        if (!detail.turn) throw new Error('No turn is recorded for this Codex thread yet.')
        return turnText(detail)
      },
    },
    { when },
  )

  ctx.tools.register(
    {
      name: 'codex_search',
      description:
        'Search the full transcript of the bound Codex thread for a literal string (file name, symbol, error, path, phrase) and return matching snippets with their turn. Snippets can contain code and file paths; prefer this over guessing when the user asks about a detail that is not in codex_status/codex_overview/codex_turn.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Literal text to look for. Case-insensitive.' },
          limit: { type: 'integer', description: 'Maximum hits, 1-30. Default 8.' },
        },
        required: ['query'],
      },
      output,
      async execute(args, exec) {
        const threadId = boundThreadId(bindings, exec)
        const query = String(args.query ?? '').trim()
        if (!query) throw new Error('query must not be empty')
        const limit = Math.max(1, Math.min(30, Number(args.limit) || 8))
        const thread = codex.threadBrief(threadId)
        if (!thread) throw new Error(`Codex thread ${threadId} was not found in the local Codex history.`)
        return searchText(thread, query, codex.search(threadId, query, { limit }))
      },
    },
    { when },
  )
}
