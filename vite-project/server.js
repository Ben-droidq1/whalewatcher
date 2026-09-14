import 'dotenv/config'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const app = express()
const port = Number(process.env.PORT || 5173)
const solscanBaseUrl = 'https://pro-api.solscan.io/v2.0'

function requireToken(req, res, next) {
  if (!process.env.TOKEN_API_KEY) {
    return res.status(500).json({ error: 'TOKEN_API_KEY is missing from .env.' })
  }
  next()
}

function isSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
}

async function solscan(path, params) {
  const url = new URL(`${solscanBaseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    headers: { accept: 'application/json', token: process.env.TOKEN_API_KEY },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.message || `Solscan returned ${response.status}.`)
  }
  return payload.data
}

async function solscanPlayground(path, params) {
  const url = new URL(`https://pro-api.solscan.io/playground${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    headers: { accept: 'application/json', token: process.env.TOKEN_API_KEY },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.success === false) {
    throw new Error(payload.errors?.message || `Solscan returned ${response.status}.`)
  }
  return payload.data
}

function sum(items, predicate = () => true) {
  return items.filter(predicate).reduce((total, item) => total + Number(item.percentage || 0), 0)
}

function formatDate(timestamp) {
  return timestamp ? new Date(timestamp * 1000).toISOString().slice(0, 10) : 'Unknown'
}

app.get('/api/analyze', requireToken, async (req, res) => {
  const address = String(req.query.address || '').trim()
  if (!isSolanaAddress(address)) {
    return res.status(400).json({ error: 'Enter a valid Solana token mint address.' })
  }

  try {
    let meta
    try {
      meta = await solscan('/token/meta', { address })
    } catch {
      meta = await solscanPlayground('/token/meta', { address })
    }
    const [holderResult, marketResult] = await Promise.allSettled([
      solscan('/token/holders', { address, page: 1, page_size: 10 }),
      solscan('/token/markets', { token: address, page: 1, page_size: 1, sort_by: 'tvl' }),
    ])
    const holderResponse = holderResult.status === 'fulfilled' ? holderResult.value : null
    const markets = marketResult.status === 'fulfilled' ? marketResult.value : null
    const holders = holderResponse?.items || []
    const market = markets?.[0] || {}
    const now = Date.now()
    const poolAgeDays = market.created_at ? Math.max(0, Math.floor((now - market.created_at * 1000) / 86400000)) : null

    res.json({
      tokenName: meta.name || 'Unknown token',
      tokenSymbol: meta.symbol || '—',
      authority: {
        mintAuthority: Boolean(meta.mint_authority),
        freezeAuthority: Boolean(meta.freeze_authority),
        creator: meta.creator || null,
        verified: Boolean(meta.metadata?.verified),
      },
      holders: {
        totalHolders: Number(holderResponse?.total ?? meta.holder ?? 0),
        topHolderPct: Number(holders[0]?.percentage || 0),
        topHolderAddress: holders[0]?.owner || holders[0]?.address || 'Unavailable',
        top5Pct: sum(holders.slice(0, 5)),
        top10Pct: sum(holders),
        items: holders,
      },
      liquidity: {
        totalLiquidity: Number(market.total_tvl || 0),
        volume24h: Number(market.total_volume_24h || meta.total_dex_vol_24h || 0),
        txns24h: Number(market.total_trades_24h || 0),
        poolAgeDays,
        poolCreatedAt: market.created_at ? formatDate(market.created_at) : 'Unavailable',
        mcap: Number(meta.market_cap || 0),
        price: Number(meta.price || 0),
        priceChange24h: Number(meta.price_change_24h || 0),
      },
      marketStats: {
        circulatingSupply: meta.supply || 'Unavailable',
        totalSupply: meta.supply || 'Unavailable',
        holdersChange24h: null,
        liquidityToMcapRatio: meta.market_cap ? Number(((Number(market.total_tvl || 0) / meta.market_cap) * 100).toFixed(1)) : null,
        contractVerified: Boolean(meta.metadata?.verified),
        deployerAddress: meta.creator || 'Unavailable',
        deployerCreatedAt: formatDate(meta.created_time),
      },
    })
  } catch (error) {
    res.status(502).json({ error: error.message || 'Could not retrieve this token from Solscan.' })
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
