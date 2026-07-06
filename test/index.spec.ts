import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import app from '../src/index'

const ENV = { UNIRATE_API_KEY: 'test-key' }

function stubFetch(body: unknown, status = 200): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe('GET /rate', () => {
  it('returns rate for a currency pair', async () => {
    const spy = stubFetch({ rate: '0.92' })
    const res = await app.request('/rate?from=USD&to=EUR', {}, ENV)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ rate: '0.92' })
    const url = new URL(spy.mock.calls[0][0] as string)
    expect(url.searchParams.get('from')).toBe('USD')
    expect(url.searchParams.get('to')).toBe('EUR')
    expect(url.searchParams.get('api_key')).toBe('test-key')
  })

  it('defaults from to USD when omitted', async () => {
    const spy = stubFetch({ rate: '0.92' })
    await app.request('/rate?to=EUR', {}, ENV)
    const url = new URL(spy.mock.calls[0][0] as string)
    expect(url.searchParams.get('from')).toBe('USD')
  })

  it('omits to param when not provided (all rates)', async () => {
    stubFetch({ rates: { EUR: '0.92', GBP: '0.79' } })
    const res = await app.request('/rate', {}, ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as Record<string, unknown>
    expect(json).toHaveProperty('rates')
  })

  it('uppercases currency codes', async () => {
    const spy = stubFetch({ rate: '0.92' })
    await app.request('/rate?from=usd&to=eur', {}, ENV)
    const url = new URL(spy.mock.calls[0][0] as string)
    expect(url.searchParams.get('from')).toBe('USD')
    expect(url.searchParams.get('to')).toBe('EUR')
  })

  it('returns 400 on invalid from code', async () => {
    const res = await app.request('/rate?from=INVALID', {}, ENV)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect(typeof json.error).toBe('string')
  })

  it('returns 400 on invalid to code', async () => {
    const res = await app.request('/rate?to=12', {}, ENV)
    expect(res.status).toBe(400)
  })

  it('returns 429 on rate-limit response', async () => {
    stubFetch({ error: 'Too many requests' }, 429)
    const res = await app.request('/rate?to=EUR', {}, ENV)
    expect(res.status).toBe(429)
    const json = await res.json() as Record<string, unknown>
    expect(json.error).toContain('Rate limit')
  })

  it('returns 502 on upstream 5xx', async () => {
    stubFetch({ error: 'Internal error' }, 500)
    const res = await app.request('/rate?to=EUR', {}, ENV)
    expect(res.status).toBe(502)
  })

  it('sends Accept: application/json header', async () => {
    const spy = stubFetch({ rate: '0.92' })
    await app.request('/rate?to=EUR', {}, ENV)
    const init = spy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
  })

  it('does not leak api_key in response body', async () => {
    stubFetch({ rate: '0.92' })
    const res = await app.request('/rate?to=EUR', {}, ENV)
    expect(await res.text()).not.toContain('test-key')
  })
})

describe('GET /convert', () => {
  beforeEach(() => stubFetch({ result: '92.50' }))

  it('converts with explicit params', async () => {
    const spy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: '92.50' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', spy)
    const res = await app.request('/convert?from=USD&to=EUR&amount=100', {}, ENV)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ result: '92.50' })
    const url = new URL(spy.mock.calls[0][0] as string)
    expect(url.searchParams.get('amount')).toBe('100')
    expect(url.searchParams.get('to')).toBe('EUR')
  })

  it('defaults from=USD and amount=1', async () => {
    const spy = stubFetch({ result: '0.92' })
    await app.request('/convert?to=EUR', {}, ENV)
    const url = new URL(spy.mock.calls[0][0] as string)
    expect(url.searchParams.get('from')).toBe('USD')
    expect(url.searchParams.get('amount')).toBe('1')
  })

  it('returns 400 when to is missing', async () => {
    const res = await app.request('/convert?from=USD', {}, ENV)
    expect(res.status).toBe(400)
    const json = await res.json() as Record<string, unknown>
    expect((json.error as string)).toContain('"to"')
  })

  it('returns 400 on non-numeric amount', async () => {
    const res = await app.request('/convert?to=EUR&amount=abc', {}, ENV)
    expect(res.status).toBe(400)
  })

  it('returns 400 on non-positive amount', async () => {
    const res = await app.request('/convert?to=EUR&amount=-5', {}, ENV)
    expect(res.status).toBe(400)
  })

  it('returns 401 on bad API key', async () => {
    stubFetch({ error: 'Unauthorized' }, 401)
    const res = await app.request('/convert?to=EUR', {}, ENV)
    expect(res.status).toBe(401)
  })

  it('returns 403 for Pro-gated endpoints', async () => {
    stubFetch({ error: 'Pro required' }, 403)
    const res = await app.request('/convert?to=EUR', {}, ENV)
    expect(res.status).toBe(403)
    const json = await res.json() as Record<string, unknown>
    expect((json.error as string)).toContain('Pro')
  })

  it('does not leak api_key in response body', async () => {
    const res = await app.request('/convert?to=EUR', {}, ENV)
    expect(await res.text()).not.toContain('test-key')
  })
})

describe('GET /currencies', () => {
  it('returns currency list', async () => {
    stubFetch({ currencies: ['USD', 'EUR', 'GBP'] })
    const res = await app.request('/currencies', {}, ENV)
    expect(res.status).toBe(200)
    const json = await res.json() as Record<string, unknown>
    expect(Array.isArray(json.currencies)).toBe(true)
    expect((json.currencies as string[])).toContain('USD')
  })

  it('sends Accept: application/json header', async () => {
    const spy = stubFetch({ currencies: [] })
    await app.request('/currencies', {}, ENV)
    const init = spy.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
  })

  it('returns 502 on upstream 5xx', async () => {
    stubFetch({ error: 'Service unavailable' }, 503)
    const res = await app.request('/currencies', {}, ENV)
    expect(res.status).toBe(502)
  })
})
