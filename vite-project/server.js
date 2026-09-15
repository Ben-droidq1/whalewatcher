import 'dotenv/config'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const app = express()
const port = Number(process.env.PORT || 5173)
const dexscreenerBaseUrl = 'https://api.dexscreener.com'

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
  if (score >= 90) return { label: 'Very Safe', color: 'green' }
  if (score >= 75) return { label: 'Low Risk', color: 'green' }
  if (score >= 60) return { label: 'Moderate Risk', color: 'yellow' }
  if (score >= 40) return { label: 'High Risk', color: 'orange' }
  return { label: 'Critical Risk', color: 'red' }
}

function calculateSafetyScore(report) {
  const flags = []
  const liquidityRatio = report.marketStats.liquidityToMcapRatio || 0
  const liquidityScore = clamp((report.liquidity.totalLiquidity > 0 ? 45 : 0) + Math.min(liquidityRatio, 35) + (report.liquidity.poolAgeDays >= 30 ? 20 : report.liquidity.poolAgeDays >= 7 ? 10 : 0))
  const holderScore = clamp(100 - (report.holders.top10Pct * 1.4) - (report.holders.topHolderPct > 20 ? 20 : 0))
  const contractScore = report.marketStats.contractVerified === null ? 50 : clamp(100 - (report.authority.mintAuthority ? 45 : 0) - (report.authority.freezeAuthority ? 35 : 0) - (report.marketStats.contractVerified ? 0 : 20))
  const sellabilityScore = 50
  const developerScore = report.authority.creator ? 60 : 20
  const marketScore = clamp((report.liquidity.volume24h > 0 ? 45 : 0) + (report.liquidity.txns24h > 0 ? 25 : 0) + Math.min(report.holders.totalHolders / 100, 30))

  if (report.authority.mintAuthority) flags.push({ severity: 'major', label: 'Developer controls minting', detail: 'The mint authority is still active.' })
  if (report.holders.top10Pct > 50) flags.push({ severity: 'major', label: 'Top 10 wallets hold more than 50%', detail: `${report.holders.top10Pct.toFixed(2)}% of reported supply is concentrated in the top 10 wallets.` })
  if (report.liquidity.totalLiquidity <= 0) flags.push({ severity: 'critical', label: 'No liquidity detected', detail: 'No active market liquidity was returned by the data provider.' })
  if (report.liquidity.liquidityLocked === false) flags.push({ severity: 'major', label: 'Liquidity unlocked', detail: 'The available data indicates that liquidity is not locked.' })
  if (report.sellability.honeypotDetected) flags.push({ severity: 'critical', label: 'Honeypot detected', detail: 'The token may prevent holders from selling.' })

  const weightedScore = Math.round(liquidityScore * 0.25 + holderScore * 0.20 + contractScore * 0.20 + sellabilityScore * 0.15 + developerScore * 0.10 + marketScore * 0.10)
  const hasCriticalOverride = flags.some((flag) => flag.severity === 'critical')
  const hasMajorOverride = flags.some((flag) => flag.severity === 'major')
  const score = hasCriticalOverride ? 0 : hasMajorOverride ? Math.min(weightedScore, 39) : weightedScore

  return {
    score,
    ...riskForScore(score),
    overridden: hasCriticalOverride || hasMajorOverride,
    flags,
    components: [
      { key: 'liquidity', label: 'Liquidity Safety', weight: 25, score: Math.round(liquidityScore), available: report.liquidity.totalLiquidity > 0 },
      { key: 'holders', label: 'Holder Distribution', weight: 20, score: Math.round(holderScore), available: report.holders.totalHolders > 0 },
      { key: 'contract', label: 'Contract Safety', weight: 20, score: Math.round(contractScore), available: report.marketStats.contractVerified !== null },
      { key: 'sellability', label: 'Sellability', weight: 15, score: sellabilityScore, available: false },
      { key: 'developer', label: 'Developer Reputation', weight: 10, score: developerScore, available: Boolean(report.authority.creator) },
      { key: 'market', label: 'Market Activity', weight: 10, score: Math.round(marketScore), available: report.liquidity.volume24h > 0 || report.liquidity.txns24h > 0 },
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
      { role: 'system', content: 'You explain token safety reports. Never invent facts, never give financial advice, and defer to critical or major red flags. Reply in two concise sentences.' },
      { role: 'user', content: JSON.stringify({ token: report.tokenSymbol, safetyScore, authority: report.authority, holders: report.holders, liquidity: report.liquidity }) },
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
    const { profile, market } = await getDexscreenerData(address)
    const now = Date.now()
    const poolAgeDays = market.pairCreatedAt ? Math.max(0, Math.floor((now - market.pairCreatedAt) / 86400000)) : null
    const token = market.baseToken?.address?.toLowerCase() === address.toLowerCase() ? market.baseToken : market.quoteToken
    const priceChange24h = Number(market.priceChange?.h24 || 0)
    const totalLiquidity = Number(market.liquidity?.usd || 0)
    const marketCap = Number(market.marketCap || market.fdv || 0)
    const volume24h = Number(market.volume?.h24 || 0)
    const txns24h = Number((market.txns?.h24?.buys || 0) + (market.txns?.h24?.sells || 0))

    const report = {
      tokenName: token?.name || profile?.description?.split(' / ')[0] || 'Unknown token',
      tokenSymbol: token?.symbol || '—',
      authority: {
        mintAuthority: null,
        freezeAuthority: null,
        creator: null,
        verified: null,
      },
      holders: {
        totalHolders: 0,
        topHolderPct: 0,
        topHolderAddress: 'Unavailable from Dexscreener',
        top5Pct: 0,
        top10Pct: 0,
        items: [],
      },
      liquidity: {
        totalLiquidity,
        volume24h,
        txns24h,
        poolAgeDays,
        poolCreatedAt: market.pairCreatedAt ? new Date(market.pairCreatedAt).toISOString().slice(0, 10) : 'Unavailable',
        mcap: marketCap,
        price: Number(market.priceUsd || 0),
        priceChange24h,
        liquidityLocked: null,
      },
      marketStats: {
        circulatingSupply: 'Unavailable from Dexscreener',
        totalSupply: 'Unavailable from Dexscreener',
        holdersChange24h: null,
        liquidityToMcapRatio: marketCap ? Number(((totalLiquidity / marketCap) * 100).toFixed(1)) : null,
        contractVerified: null,
        deployerAddress: 'Unavailable from Dexscreener',
        deployerCreatedAt: 'Unavailable',
      },
      sellability: { honeypotDetected: false, available: false },
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
