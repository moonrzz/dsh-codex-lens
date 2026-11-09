// HTTP surface for the right-sidebar tab. Routes are registered through the
// host connection so they share the GUI origin and the standard {ok, value}
// envelope used by every other plugin.
import { listDir, revealPath, workspaceRoot } from './fsbrowse.js'
function jsonResponse(value, status = 200) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } })
}

function ok(value) {
  return jsonResponse({ ok: true, value })
}

function fail(code, message, status = 400) {
  return jsonResponse({ ok: false, error: { code, message } }, status)
}

async function readBody(request) {
  let text = ''
  try {
    text = await request.text()
  } catch {
    return null
  }
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function requireSessionId(body) {
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!sessionId) throw new Error('sessionId is required')
  return sessionId
}

// The dedicated thread page talks about one thread: either an explicit
// threadId, or the thread bound to the calling DSH session.
function threadIdOf(body, bindings) {
  const explicit = typeof body?.threadId === 'string' ? body.threadId.trim() : ''
  if (explicit) return explicit
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''
  if (!sessionId) return ''
  return bindings.get(sessionId)?.threadId ?? ''
}

export function registerRoutes(ctx, { codex, bindings, notifyBind }) {
  ctx.inject(['connection'], (c) => {
    const connection = c.get('connection')
    const register =
      typeof connection?.fetch?.register === 'function' ? connection.fetch.register.bind(connection.fetch) : undefined
    if (!register) return

    const routes = {
      '/api/dsh-codex-bridge/roster': async () => ok(codex.roster()),

      '/api/dsh-codex-bridge/binding': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        let sessionId
        try {
          sessionId = requireSessionId(body)
        } catch (error) {
          return fail('bad-request', error.message)
        }
        const binding = bindings.get(sessionId)
        const thread = binding ? codex.threadBrief(binding.threadId) : null
        return ok({ binding, thread })
      },

      '/api/dsh-codex-bridge/bind': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        let sessionId
        try {
          sessionId = requireSessionId(body)
        } catch (error) {
          return fail('bad-request', error.message)
        }
        const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : ''
        if (!threadId) return fail('bad-request', 'threadId is required.')
        const thread = codex.threadBrief(threadId)
        if (!thread) return fail('not-found', `Codex thread ${threadId} was not found in the local Codex history.`, 404)
        const previous = bindings.get(sessionId)?.threadId ?? null
        const binding = bindings.set(sessionId, threadId)
        if (previous !== threadId) notifyBind(sessionId, threadId)
        return ok({ binding, thread })
      },

      '/api/dsh-codex-bridge/unbind': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        let sessionId
        try {
          sessionId = requireSessionId(body)
        } catch (error) {
          return fail('bad-request', error.message)
        }
        return ok({ removed: bindings.remove(sessionId) })
      },

      '/api/dsh-codex-bridge/status': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        const threadId = typeof body.threadId === 'string' ? body.threadId.trim() : ''
        if (!threadId) return fail('bad-request', 'threadId is required.')
        const status = codex.status(threadId)
        if (!status) return fail('not-found', `Codex thread ${threadId} was not found.`, 404)
        return ok({
          threadId,
          running: status.running,
          status: status.status,
          latestTurn: status.turn,
          lastMessage: status.lastMessage,
          liveFeed: status.liveFeed ?? [],
        })
      },

      // Aggregated numbers for the thread page charts.
      '/api/dsh-codex-bridge/stats': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        const threadId = threadIdOf(body, bindings)
        if (!threadId) return fail('not-bound', 'Bind a Codex thread or pass threadId.', 409)
        const stats = codex.stats(threadId)
        if (!stats) return fail('not-found', `Codex thread ${threadId} was not found.`, 404)
        return ok(stats)
      },

      // Live detail for the dedicated page: thread metadata, latest turn and
      // the response items Codex has appended to the rollout so far.
      '/api/dsh-codex-bridge/live': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        const threadId = threadIdOf(body, bindings)
        if (!threadId) return fail('not-bound', 'Bind a Codex thread or pass threadId.', 409)
        const view = codex.liveView(threadId)
        if (!view) return fail('not-found', `Codex thread ${threadId} was not found.`, 404)
        return ok(view)
      },

      // Directory listing for the workspace file tree.
      '/api/dsh-codex-bridge/tree': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        const threadId = threadIdOf(body, bindings)
        if (!threadId) return fail('not-bound', 'Bind a Codex thread or pass threadId.', 409)
        const thread = codex.threadBrief(threadId)
        if (!thread) return fail('not-found', `Codex thread ${threadId} was not found.`, 404)
        const root = workspaceRoot(thread.cwd)
        if (!root) return fail('no-workspace', 'This thread has no workspace directory.', 409)
        try {
          return ok(await listDir(root, typeof body.dir === 'string' ? body.dir : ''))
        } catch (error) {
          return fail(error?.code === 'outside-root' ? 'outside-root' : 'fs-error', error instanceof Error ? error.message : String(error), 400)
        }
      },

      // Hand one validated path to the OS file manager.
      '/api/dsh-codex-bridge/reveal': async (request) => {
        const body = await readBody(request)
        if (!body) return fail('bad-json', 'Request body must be a JSON object.')
        const threadId = threadIdOf(body, bindings)
        if (!threadId) return fail('not-bound', 'Bind a Codex thread or pass threadId.', 409)
        const thread = codex.threadBrief(threadId)
        if (!thread) return fail('not-found', `Codex thread ${threadId} was not found.`, 404)
        const root = workspaceRoot(thread.cwd)
        if (!root) return fail('no-workspace', 'This thread has no workspace directory.', 409)
        try {
          const resolved = revealPath(root, typeof body.path === 'string' ? body.path : '', { select: Boolean(body.select) })
          return ok({ path: resolved })
        } catch (error) {
          return fail(error?.code === 'outside-root' ? 'outside-root' : 'fs-error', error instanceof Error ? error.message : String(error), 400)
        }
      },
    }

    for (const [path, handler] of Object.entries(routes)) {
      c.effect(
        () =>
          register(
            {
              path,
              methods: ['POST'],
              requestBody: 'buffered',
              fetch: async (request) => {
                try {
                  return await handler(request)
                } catch (error) {
                  return fail('internal', error instanceof Error ? error.message : String(error), 500)
                }
              },
            },
            `codex-bridge: ${path}`,
          ),
        `codex-bridge route ${path}`,
      )
    }
  })
}
