import { Hono } from 'hono'

type Env = {
  UNIRATE_API_KEY: string
}

const UNIRATE_BASE = 'https://api.unirateapi.com'

function buildUrl(path: string, params: Record<string, string>): string {
  return `${UNIRATE_BASE}${path}?${new URLSearchParams(params)}`
}

function sanitizeCurrency(code: string): string | null {
  const upper = code.toUpperCase()
  return /^[A-Z]{3}$/.test(upper) ? upper : null
}

async function upstream(url: string): Promise<Response> {
  return fetch(url, { headers: { Accept: 'application/json' } })
}

function upstreamError(c: { json: (body: unknown, status: number) => Response }, status: number): Response {
  const map: Record<number, [string, number]> = {
    400: ['Invalid request parameters', 400],
    401: ['Invalid API key', 401],
    403: ['Endpoint requires a Pro subscription', 403],
    404: ['Currency not found', 404],
    429: ['Rate limit exceeded', 429],
  }
  const [msg, code] = map[status] ?? ['Upstream error', 502]
  return c.json({ error: msg }, code)
}

const app = new Hono<{ Bindings: Env }>()

app.get('/rate', async (c) => {
  const fromRaw = c.req.query('from')
  const from = fromRaw ? sanitizeCurrency(fromRaw) : 'USD'
  if (!from) return c.json({ error: `Invalid currency code: ${fromRaw}` }, 400)

  const toRaw = c.req.query('to')
  const to = toRaw ? sanitizeCurrency(toRaw) : null
  if (toRaw && !to) return c.json({ error: `Invalid currency code: ${toRaw}` }, 400)

  const params: Record<string, string> = { api_key: c.env.UNIRATE_API_KEY, from }
  if (to) params.to = to

  const res = await upstream(buildUrl('/api/rates', params))
  if (!res.ok) return upstreamError(c, res.status)
  return c.json(await res.json())
})

app.get('/convert', async (c) => {
  const fromRaw = c.req.query('from')
  const from = fromRaw ? sanitizeCurrency(fromRaw) : 'USD'
  if (!from) return c.json({ error: `Invalid currency code: ${fromRaw}` }, 400)

  const toRaw = c.req.query('to')
  const to = toRaw ? sanitizeCurrency(toRaw) : null
  if (!to) return c.json({ error: 'Missing or invalid "to" parameter' }, 400)

  const amountStr = c.req.query('amount') ?? '1'
  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) {
    return c.json({ error: 'Invalid "amount" parameter — must be a positive number' }, 400)
  }

  const res = await upstream(buildUrl('/api/convert', {
    api_key: c.env.UNIRATE_API_KEY, from, to, amount: String(amount),
  }))
  if (!res.ok) return upstreamError(c, res.status)
  return c.json(await res.json())
})

app.get('/currencies', async (c) => {
  const res = await upstream(buildUrl('/api/currencies', { api_key: c.env.UNIRATE_API_KEY }))
  if (!res.ok) return upstreamError(c, res.status)
  return c.json(await res.json())
})

export default app
