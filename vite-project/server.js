import 'dotenv/config'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const app = express()
const port = Number(process.env.PORT || 5173)
const dexscreenerBaseUrl = 'https://api.dexscreener.com'
const solscanBaseUrl = 'https://pro-api.solscan.io/v2.0'

function isSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
}

async function dexscreener(path) {
  const url = new URL(`${dexscreenerBaseUrl}${path}`)
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Dexscreener returned ${response.status}.`)
  return payload
}

async function solscan(path) {
  const apiKey = process.env.SOLSCAN_API_KEY || process.env.TOKEN_API_KEY
  if (!apiKey) return null
  const url = new URL(`${solscanBaseUrl}${path}`)
  const response = await fetch(url, {
    headers: { accept: 'application/json', token: apiKey },
    signal: AbortSignal.timeout(10000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Solscan returned ${response.status}.`)
  return payload
}

async function getSolscanData(address) {
  if (!(process.env.SOLSCAN_API_KEY || process.env.TOKEN_API_KEY)) return null
  const [metaResult] = await Promise.allSettled([
    solscan(`/token/meta?address=${encodeURIComponent(address)}`),
  ])
  const meta = metaResult.status === 'fulfilled' ? metaResult.value?.data || metaResult.value : null
  return meta ? { meta } : null
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function getSolscanSupply(meta) {
  if (!meta?.supply) return null
  const decimals = toNumber(meta.decimals)
  const supply = toNumber(meta.supply)
  return supply / (10 ** decimals)
}

function normalizeTimestamp(value) {
  const timestamp = toNumber(value, 0)
  if (!timestamp) return null
  return new Date(timestamp < 100000000000 ? timestamp * 1000 : timestamp)
}

async function getDexscreenerData(address) {
  const [profiles, pairs] = await Promise.all([
    dexscreener('/token-profiles/latest/v1'),
    dexscreener(`/token-pairs/v1/solana/${address}`),
  ])
  const matchingProfile = (Array.isArray(profiles) ? profiles : []).find((profile) => profile.tokenAddress?.toLowerCase() === address.toLowerCase()) || null
  const matchingPairs = Array.isArray(pairs) ? pairs.filter((pair) => pair.chainId === 'solana') : []
  const market = matchingPairs.sort((left, right) => Number(right.liquidity?.usd || 0) - Number(left.liquidity?.usd || 0))[0] || null
  if (!market) throw new Error('Dexscreener has no market data for this Solana token.')
  return { profile: matchingProfile, market }
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function riskForScore(score) {
  if (score >= 60) return { label: 'High Risk', color: 'red' }
  if (score >= 30) return { label: 'Medium Risk', color: 'yellow' }
  return { label: 'Low Risk', color: 'green' }
}

function calculateSafetyScore(report) {
  let score = 0
  const flags = []

  const addFlag = (riskPoints, label, detail) => {
    score += riskPoints
    flags.push({
      severity: riskPoints >= 30 ? 'critical' : riskPoints >= 15 ? 'major' : 'minor',
      label,
      detail,
    })
  }

  const totalLiquidity = Number(report.liquidity?.totalLiquidity || 0)
  const volume24h = Number(report.liquidity?.volume24h || 0)
  const poolAgeDays = Number(report.liquidity?.poolAgeDays || 0)
  const holderShare = Number(report.holders?.top10Percent || report.marketStats?.holdersTop10Percent || 0)
  const hasHoneypot = Boolean(report.sellability?.honeypotDetected)

  if (report.authority?.mintAuthority) {
    addFlag(60, 'Mint authority not revoked', 'The token issuer can mint additional supply and inflate the market at any time.')
  }
  if (report.authority?.freezeAuthority) {
    addFlag(60, 'Freeze authority not revoked', 'The issuer can freeze holders\' wallets and stop transfers.')
  }
  if (hasHoneypot) {
    addFlag(100, 'Honeypot detected', 'The token cannot be sold after purchase, which is an automatic high-risk condition.')
  }
  if (totalLiquidity <= 0) {
    addFlag(25, 'No liquidity data found', 'No usable liquidity data was found, so this token should be treated as risky or unknown rather than safe.')
  } else if (totalLiquidity < 5000) {
    addFlag(30, 'Liquidity under $5k', 'The pool is under $5,000, which is a high-risk trading setup.')
  } else if (totalLiquidity < 25000) {
    addFlag(15, 'Liquidity under $25k', 'The token has low liquidity and could be easy to manipulate.')
  }
  if (holderShare > 70) {
    addFlag(35, 'Top 10 holders control more than 70%', 'A small set of wallets controls most of the supply, increasing concentration risk.')
  } else if (holderShare > 40) {
    addFlag(15, 'Top 10 holders control more than 40%', 'The distribution is concentrated enough to warrant caution.')
  }
  if (poolAgeDays > 0 && poolAgeDays < 1) {
    addFlag(15, 'Pair younger than 24 hours', 'The pair is too new to trust patterns or depth yet.')
  }
  if (totalLiquidity > 0 && volume24h > 0 && volume24h / totalLiquidity > 20) {
    addFlag(20, '24h volume exceeds liquidity by 20x', 'This pattern can indicate wash trading or artificial activity.')
  }

  const severeOverride = Boolean(report.authority?.mintAuthority || report.authority?.freezeAuthority || hasHoneypot)
  if (severeOverride && score < 60) score = 60
  if (score > 100) score = 100

  const authorityScore = report.authority?.mintAuthority || report.authority?.freezeAuthority ? 0 : 100
  const liquidityScore = totalLiquidity <= 0 ? 0 : totalLiquidity < 5000 ? 10 : totalLiquidity < 25000 ? 45 : 80
  const holderScore = holderShare > 70 ? 0 : holderShare > 40 ? 45 : 80
  const marketScore = totalLiquidity > 0 && volume24h > 0 && volume24h / totalLiquidity > 20 ? 25 : poolAgeDays > 0 && poolAgeDays < 1 ? 55 : 80

  return {
    score,
    ...riskForScore(score),
    overridden: severeOverride || flags.length > 0,
    flags,
    components: [
      { key: 'authority', label: 'Authority Risk', weight: 35, score: authorityScore, available: true },
      { key: 'liquidity', label: 'Liquidity Risk', weight: 25, score: liquidityScore, available: totalLiquidity > 0 || true },
      { key: 'holders', label: 'Holder Concentration', weight: 20, score: holderScore, available: holderShare > 0 || true },
      { key: 'market', label: 'Market Signals', weight: 20, score: marketScore, available: true },
    ],
  }
}

async function generateAiSummary(report, safetyScore) {
  const apiKey = process.env.CHAT_B_AI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const apiUrl = process.env.CHAT_B_AI_API_URL || process.env.OPENAI_API_URL || (process.env.OPENAI_API_KEY ? 'https://api.openai.com/v1/chat/completions' : null)
  if (!apiUrl) return null
  const requestBody = {
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You explain deterministic crypto scam-risk checks. Use only the supplied facts and flags; never invent holder data, honeypot results, or missing metrics. Explain active mint/freeze authority, low liquidity, new pairs, and suspicious volume/liquidity ratios plainly. Never give financial advice. Reply in two concise sentences.' },
      { role: 'user', content: JSON.stringify({ token: report.tokenSymbol, safetyScore, authority: report.authority, liquidity: report.liquidity, marketStats: report.marketStats }) },
    ],
  }
  if (process.env.CHAT_B_AI_MODEL || process.env.OPENAI_MODEL) requestBody.model = process.env.CHAT_B_AI_MODEL || process.env.OPENAI_MODEL

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(10000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error?.message || `AI provider returned ${response.status}.`)
  return payload.choices?.[0]?.message?.content || null
}

app.get('/api/analyze', async (req, res) => {
  const address = String(req.query.address || '').trim()
  if (!isSolanaAddress(address)) {
    return res.status(400).json({ error: 'Enter a valid Solana token mint address.' })
  }

  try {
    const [{ profile, market }, solscanData] = await Promise.all([
      getDexscreenerData(address),
      getSolscanData(address),
    ])
    const solscanMeta = solscanData?.meta || {}
    const now = Date.now()
    const pairCreatedAt = normalizeTimestamp(market.pairCreatedAt)
    const poolAgeDays = pairCreatedAt ? Math.max(0, Math.floor((now - pairCreatedAt.getTime()) / 86400000)) : null
    const token = market.baseToken?.address?.toLowerCase() === address.toLowerCase() ? market.baseToken : market.quoteToken
    const priceChange24h = Number(market.priceChange?.h24 || 0)
    const totalLiquidity = Number(market.liquidity?.usd || 0)
    const marketCap = Number(market.marketCap || market.fdv || 0)
    const volume24h = Number(market.volume?.h24 || 0)
    const txns24h = Number((market.txns?.h24?.buys || 0) + (market.txns?.h24?.sells || 0))
    const solscanVerified = typeof solscanMeta.verified === 'boolean' ? solscanMeta.verified : null
    const holderShare = Number(solscanMeta.top10_holder_share ?? solscanMeta.top_10_holder_share ?? solscanMeta.holders_top10_share ?? solscanMeta.holder_top_10_share ?? 0)
    const honeypotDetected = Boolean(solscanMeta.honeypot || solscanMeta.is_honeypot || solscanMeta.honeypot_detected)

    const report = {
      tokenName: token?.name || solscanMeta.name || profile?.description?.split(' / ')[0] || 'Unknown token',
      tokenSymbol: token?.symbol || solscanMeta.symbol || '—',
      authority: {
        mintAuthority: solscanMeta.mint_authority || null,
        freezeAuthority: solscanMeta.freeze_authority || null,
        creator: solscanMeta.creator || null,
        verified: solscanVerified,
      },
      liquidity: {
        totalLiquidity,
        volume24h,
        txns24h,
        dexscreenerUrl: market.url,
        poolAgeDays,
        poolCreatedAt: pairCreatedAt ? pairCreatedAt.toISOString() : null,
        mcap: marketCap,
        price: Number(market.priceUsd || 0),
        priceChange24h,
        liquidityLocked: null,
      },
      holders: {
        top10Percent: Number.isFinite(holderShare) && holderShare > 0 ? holderShare : null,
      },
      marketStats: {
        holdersChange24h: null,
        holdersTop10Percent: Number.isFinite(holderShare) && holderShare > 0 ? holderShare : null,
        liquidityToMcapRatio: marketCap ? Number(((totalLiquidity / marketCap) * 100).toFixed(1)) : null,
      },
      sellability: { honeypotDetected, available: honeypotDetected },
      dataSources: {
        dexscreener: true,
        solscan: Boolean(solscanData),
      },
    }
    const safetyScore = calculateSafetyScore(report)
    let aiSummary = null
    try {
      aiSummary = await generateAiSummary(report, safetyScore)
    } catch (aiError) {
      console.warn(`AI summary unavailable: ${aiError.message}`)
    }
    res.json({ ...report, safetyScore, aiSummary })
  } catch (error) {
    res.status(502).json({ error: error.message || 'Could not retrieve this token from Dexscreener.' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'))
  app.get('{*splat}', (_req, res) => res.sendFile(new URL('./dist/index.html', import.meta.url).pathname))
} else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

app.listen(port, () => console.log(`TokenGuard running at http://localhost:${port}`))
