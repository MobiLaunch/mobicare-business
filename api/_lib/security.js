import crypto from 'node:crypto'

const memoryLimits = new Map()

function getTokenSecret() {
  const secret = process.env.ORDER_LOOKUP_TOKEN_SECRET
  if (!secret) throw new Error('Missing ORDER_LOOKUP_TOKEN_SECRET configuration')
  return secret
}

function getClientIp(req) {
  const candidate = req.headers['x-vercel-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown'
  return String(candidate).trim().slice(0, 128) || 'unknown'
}

async function sharedLimit(key, limit, windowSeconds) {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds],
    ]),
  })
  if (!response.ok) throw new Error(`Upstash rate limiter returned ${response.status}`)
  const [countResult] = await response.json()
  const count = Number(countResult?.result)
  if (!Number.isFinite(count)) throw new Error('Invalid Upstash rate limiter response')
  return { success: count <= limit, remaining: Math.max(0, limit - count) }
}

export async function limitRequest(req, scope, { limit = 5, windowSeconds = 60, identifier = '', requireShared = false } = {}) {
  const identifierHash = identifier
    ? crypto.createHash('sha256').update(String(identifier).trim().toLowerCase()).digest('hex').slice(0, 24)
    : 'none'
  const key = `mobicare-api:${scope}:${getClientIp(req)}:${identifierHash}`
  try {
    const sharedResult = await sharedLimit(key, limit, windowSeconds)
    if (sharedResult) return sharedResult
    const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    if (requireShared && hasUpstash) return { success: false, unavailable: true }
  } catch (error) {
    console.error('shared rate limiter unavailable:', error.message)
    const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    if (requireShared && hasUpstash) return { success: false, unavailable: true }
  }

  const now = Date.now()
  const current = memoryLimits.get(key)
  const entry = !current || now - current.startedAt >= windowSeconds * 1000
    ? { startedAt: now, count: 0 }
    : current
  entry.count += 1
  memoryLimits.set(key, entry)

  if (memoryLimits.size > 10000) {
    for (const [storedKey, storedEntry] of memoryLimits) {
      if (now - storedEntry.startedAt >= windowSeconds * 1000) memoryLimits.delete(storedKey)
    }
  }

  return { success: entry.count <= limit, remaining: Math.max(0, limit - entry.count) }
}

export function parseJsonBody(req, maxBytes = 32_000) {
  const contentType = req.headers['content-type']
  if (contentType && !contentType.toLowerCase().startsWith('application/json')) throw new Error('Invalid request body')
  const contentLength = Number(req.headers['content-length'] || 0)
  if (contentLength > maxBytes) throw new Error('Request too large')
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body)) > maxBytes) throw new Error('Request too large')
    return req.body
  }
  if (typeof req.body !== 'string' || Buffer.byteLength(req.body) > maxBytes) throw new Error('Invalid request body')
  return JSON.parse(req.body)
}

export function createLookupToken(ttlSeconds = 15 * 60) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${expiresAt}.${crypto.randomBytes(32).toString('base64url')}`
  const signature = crypto.createHmac('sha256', getTokenSecret()).update(payload).digest('base64url')
  const token = `${payload}.${signature}`
  return {
    token,
    hash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  }
}

export function verifyLookupToken(token) {
  if (typeof token !== 'string' || token.length < 80 || token.length > 300) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [expiresAt, randomPart, signature] = parts
  const payload = `${expiresAt}.${randomPart}`
  const expiry = Number(expiresAt)
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) return false

  const expected = crypto.createHmac('sha256', getTokenSecret()).update(payload).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

export function hashLookupToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, private')
}
