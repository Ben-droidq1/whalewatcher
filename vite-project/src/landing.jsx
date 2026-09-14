import { useState } from "react";

/* ============================================================
   Token Facts — Solana token safety checker
   Dark, restrained web3 dashboard: one accent color, geometric
   display type, circular score gauge, plus a fuller due-diligence
   view — token metadata, market stats, top holders, and
   liquidity pool detail.

   Real data plan — two sources, merged into the shape below:

   Solscan Pro API (token metadata + market):
   - GET /v2.0/token/meta   → name, symbol, total supply,
     mint authority, freeze authority
   - GET /v2.0/token/price  → price, market cap
   - Market APIs (listing pool/market, market info) → primary
     DEX, pool size

   Birdeye API (holder analysis):
   - GET /token/v1/holder-profile   → top-10 concentration,
     liquidity cross-check
   - GET /token/v1/holder-positions → ranked top-holder list
     with real bundler/sniper/insider/dev tags (replaces the
     mocked "LP pool / Exchange / Contract" tags below)

   Not reliably available from either source:
   - Liquidity lock status/days remaining — neither API exposes
     this directly. Needs a check against known lock/burn
     program addresses, or a dedicated lock-checker service.
     Treat as best-effort or omit from a first real version.

   Fetch both sources in parallel (Promise.all) and normalize
   into one object; cache by mint address for a few minutes so
   repeat lookups don't burn both APIs' rate limits.
   ============================================================ */

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isValidSolanaAddress(str) {
  return typeof str === "string" && str.length >= 32 && str.length <= 44 && BASE58_RE.test(str);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const NAME_PARTS_A = ["Nova", "Solar", "Terra", "Vault", "Orbit", "Ember", "Drift", "Astro", "Delta", "Pulse"];
const NAME_PARTS_B = ["Finance", "Protocol", "Swap", "Network", "DAO", "Chain", "Labs", "Coin", "Fi", "X"];

async function fetchTokenSafety(mint) {
  await delay(700 + Math.random() * 500);

  const rand = mulberry32(hashSeed(mint));

  // Simulated "not found" — a real backend would 404 here if Solscan
  // has no metadata for this mint.
  if (rand() < 0.06) {
    const err = new Error("No token metadata found for this address.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const nameA = NAME_PARTS_A[Math.floor(rand() * NAME_PARTS_A.length)];
  const nameB = NAME_PARTS_B[Math.floor(rand() * NAME_PARTS_B.length)];
  const symbol = (nameA.slice(0, 3) + nameB.slice(0, 1)).toUpperCase();

  const mintAuthorityRenounced = rand() > 0.4;
  const freezeAuthorityRenounced = rand() > 0.5;
  const liquidityLocked = rand() > 0.45;
  const liquidityLockDays = liquidityLocked ? Math.floor(30 + rand() * 300) : 0;
  const holderCount = 50 + Math.floor(rand() * 40000);
  const ageDays = 1 + Math.floor(rand() * 400);

  const price = rand() < 0.3 ? rand() * 0.001 : rand() * 8;
  const totalSupply = 1_000_000 + rand() * 999_000_000;
  const marketCap = price * totalSupply;
  const volume24h = marketCap * (0.02 + rand() * 0.4);
  const priceChange24h = (rand() - 0.4) * 40;

  const dexes = ["Raydium", "Orca", "Jupiter", "Meteora"];
  const dex = dexes[Math.floor(rand() * dexes.length)];
  const liquidityUsd = marketCap * (0.03 + rand() * 0.15);

  // top holders — first slot skews larger when concentration is high
  const concSkew = rand();
  let remaining = 100;
  const topHolders = [];
  for (let i = 0; i < 5; i++) {
    const share = i === 0
      ? (4 + rand() * 26) * (0.5 + concSkew)
      : remaining * (0.08 + rand() * 0.3) * (0.5 + concSkew * 0.5);
    const pct = Math.min(share, remaining * 0.9);
    remaining -= pct;
    const tagRoll = rand();
    // Mocked tags — the real version replaces these with Birdeye's
    // holder-positions tags (bundler / sniper / insider / dev).
    topHolders.push({
      rank: i + 1,
      address: `${(1000 + Math.floor(rand() * 8999)).toString(36)}...${(1000 + Math.floor(rand() * 8999)).toString(36)}`,
      pct,
      tag: tagRoll > 0.85 ? "LP pool" : tagRoll > 0.7 ? "Exchange" : tagRoll > 0.6 ? "Contract" : null,
    });
  }
  const top10Pct = topHolders.reduce((s, h) => s + h.pct, 0) + remaining * 0.35; // approx top10 from top5+tail

  const checks = [
    {
      key: "mintAuthority",
      label: "Mint authority",
      pass: mintAuthorityRenounced,
      value: mintAuthorityRenounced ? "Renounced" : "Active",
      goodText: "Supply is fixed — the team can't print more tokens",
      badText: "The team can mint unlimited new tokens at any time",
    },
    {
      key: "freezeAuthority",
      label: "Freeze authority",
      pass: freezeAuthorityRenounced,
      value: freezeAuthorityRenounced ? "Renounced" : "Active",
      goodText: "No one can freeze your tokens",
      badText: "The team can freeze holder wallets, blocking transfers or sales",
    },
    {
      key: "concentration",
      label: "Holder concentration",
      pass: top10Pct < 40,
      value: `${top10Pct.toFixed(0)}% in top 10`,
      goodText: "Reasonably distributed across holders",
      badText: "A small group could crash the price by selling at once",
    },
  ];

  // Liquidity lock isn't reliably verifiable from the API alone (see
  // header note), so it's shown as an advisory, not scored pass/fail.
  const liquidityAdvisory = {
    label: "Liquidity lock",
    status: liquidityLocked ? "likely-locked" : "needs-check",
    value: liquidityLocked ? `~${liquidityLockDays}d (best-effort)` : "Unable to verify",
    text: liquidityLocked
      ? "LP tokens appear to sit in a lock program — confirm manually before relying on this."
      : "Could not confirm a lock. Check the pool's LP token holder manually before trading.",
  };

  const score = Math.round(checks[0].pass * 40 + checks[1].pass * 30 + checks[2].pass * 30);

  let verdict = "High risk";
  let tone = "bad";
  if (score >= 80) {
    verdict = "Looks safe";
    tone = "good";
  } else if (score >= 50) {
    verdict = "Use caution";
    tone = "warn";
  }

  return {
    mint, score, verdict, tone, checks, liquidityAdvisory, holderCount, ageDays,
    name: `${nameA} ${nameB}`, symbol,
    price, marketCap, volume24h, priceChange24h, totalSupply,
    dex, liquidityUsd, liquidityLocked, liquidityLockDays,
    topHolders,
  };
}

function shortAddr(a) {
  return a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a;
}

function fmtUsd(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(n < 1 ? 5 : 2)}`;
}

function fmtCompact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

const BG = "#0B0D12";
const SURFACE = "#12151C";
const SURFACE_2 = "#171B24";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#ECEDEF";
const MUTED = "#7C818C";
const ACCENT = "#5B8DEF";
const GOOD = "#34C77B";
const BAD = "#EF5350";
const WARN = "#E8A33D";

const toneColor = { good: GOOD, warn: WARN, bad: BAD };

const display = { fontFamily: "'Space Grotesk', sans-serif" };
const body = { fontFamily: "'Inter', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const EXAMPLES = [
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
];

function ScoreRing({ score, color, size = 132 }) {
  const r = size * 0.41;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const center = size / 2;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={10} fill="none" />
        <circle
          cx={center} cy={center} r={r}
          stroke={color} strokeWidth={10} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold" style={{ ...display, fontSize: size * 0.24, color: TEXT, lineHeight: 1 }}>{score}</span>
        <span className="text-xs mt-0.5" style={{ color: MUTED }}>/ 100</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-semibold mb-2.5" style={{ color: MUTED, letterSpacing: "0.02em" }}>
      {children}
    </div>
  );
}

export default function TokenFacts() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();

    if (!isValidSolanaAddress(trimmed)) {
      setStatus("error");
      setResult(null);
      setErrorMsg("That doesn't look like a valid Solana address (base58, 32–44 characters).");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await fetchTokenSafety(trimmed);
      setResult(data);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setResult(null);
      setErrorMsg(err.code === "NOT_FOUND" ? err.message : "Something went wrong checking this token. Try again.");
    }
  }

  function pick(ex) {
    setInput(ex);
    setStatus("loading");
    setErrorMsg("");
    fetchTokenSafety(ex)
      .then((data) => { setResult(data); setStatus("success"); })
      .catch((err) => { setStatus("error"); setResult(null); setErrorMsg(err.message); });
  }

  return (
    <div className="token-facts-shell" style={{ background: BG, color: TEXT, ...body }}>
      <header className="token-facts-header" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="token-brand" style={display}>
          <span className="token-brand-dot" style={{ background: ACCENT }} />
          Token Facts
        </div>
        <span className="token-badge" style={{ color: MUTED, border: `1px solid ${BORDER}` }}>
          Solana Mainnet
        </span>
      </header>

      <section className={`token-facts-content ${status === "success" ? "is-success" : "is-idle"}`}>
        {status !== "success" && (
          <>
            <h1 className="token-title" style={{ ...display, letterSpacing: "-0.01em" }}>
              Check a token before you buy it
            </h1>
            <p className="token-subtitle" style={{ color: MUTED }}>
              Paste a token address for a full safety report: authority checks, holder concentration, liquidity, and market stats.
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className="token-form">
          <input
            spellCheck={false}
            placeholder="Paste a token mint address"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === "loading"}
            className="token-input"
            style={{ ...mono, background: SURFACE, border: `1px solid ${status === "error" ? BAD : BORDER}`, color: TEXT, opacity: status === "loading" ? 0.6 : 1 }}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="token-submit"
            style={{ background: ACCENT, color: "#0B0D12", opacity: status === "loading" ? 0.7 : 1, cursor: status === "loading" ? "wait" : "pointer" }}
          >
            {status === "loading" ? "Checking…" : "Check"}
          </button>
        </form>

        {status === "error" && (
          <div className="token-error" style={{ color: BAD, background: `${BAD}14`, border: `1px solid ${BAD}44` }}>
            {errorMsg}
          </div>
        )}

        {status !== "success" && status !== "loading" && (
          <div className="token-example-row" style={{ color: MUTED }}>
            <span>Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => pick(ex)}
                className="token-example"
                style={{ ...mono, color: TEXT, background: SURFACE, border: `1px solid ${BORDER}` }}
              >
                {shortAddr(ex)}
              </button>
            ))}
          </div>
        )}

        {status === "loading" && (
          <div className="token-skeleton-grid">
            <div className="token-skeleton large" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} />
            <div className="token-skeleton mid" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} />
            <div className="token-skeleton tall" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} />
          </div>
        )}
      </section>

      {status === "success" && result && (
        <section className="token-results">
          <div className="token-hero-card" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <ScoreRing score={result.score} color={toneColor[result.tone]} size={112} />
            <div className="token-hero-copy">
              <div
                className="token-verdict"
                style={{ color: toneColor[result.tone], background: `${toneColor[result.tone]}1f` }}
              >
                {result.verdict}
              </div>
              <div className="token-name-row">
                <span className="token-name" style={display}>{result.name}</span>
                <span className="token-symbol" style={{ color: MUTED }}>{result.symbol}</span>
              </div>
              <div className="token-mint" style={{ ...mono, color: MUTED }}>{shortAddr(result.mint)}</div>
              <div className="token-meta" style={{ color: MUTED }}>
                {result.holderCount.toLocaleString()} holders · {result.ageDays}d old
              </div>
            </div>
          </div>

          <div>
            <SectionLabel>Market</SectionLabel>
            <div className="token-market-grid">
              <Stat label="Price" value={fmtUsd(result.price)} />
              <Stat label="24h change" value={`${result.priceChange24h >= 0 ? "+" : ""}${result.priceChange24h.toFixed(1)}%`} color={result.priceChange24h >= 0 ? GOOD : BAD} />
              <Stat label="Market cap" value={fmtUsd(result.marketCap)} />
              <Stat label="24h volume" value={fmtUsd(result.volume24h)} />
            </div>
          </div>

          <div>
            <SectionLabel>Safety checks</SectionLabel>
            <div className="token-check-list" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              {result.checks.map((c, i) => (
                <div
                  key={c.key}
                  className="token-check-item"
                  style={{ borderBottom: i === result.checks.length - 1 ? "none" : `1px solid ${BORDER}`, background: i % 2 ? "transparent" : SURFACE_2 }}
                >
                  <div className="token-check-head">
                    <div className="token-check-label-wrap">
                      <span
                        className="token-check-badge"
                        style={{ background: c.pass ? `${GOOD}1f` : `${BAD}1f`, color: c.pass ? GOOD : BAD }}
                      >
                        {c.pass ? "✓" : "✕"}
                      </span>
                      <span className="token-check-label">{c.label}</span>
                    </div>
                    <span className="token-check-value" style={{ ...mono, color: c.pass ? GOOD : BAD }}>{c.value}</span>
                  </div>
                  <div className="token-check-copy" style={{ color: MUTED }}>
                    {c.pass ? c.goodText : c.badText}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Liquidity</SectionLabel>
            <div className="token-liquidity-grid" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <Stat label="Primary DEX" value={result.dex} />
              <Stat label="Pool size" value={fmtUsd(result.liquidityUsd)} />
            </div>
            <div className="token-liquidity-advisory" style={{ background: SURFACE, border: `1px solid ${WARN}33` }}>
              <div className="token-liquidity-head">
                <span className="token-liquidity-title">
                  <span style={{ color: WARN }}>⚠</span> Liquidity lock
                </span>
                <span className="token-liquidity-status" style={{ ...mono, color: WARN }}>{result.liquidityAdvisory.value}</span>
              </div>
              <div className="token-liquidity-copy" style={{ color: MUTED }}>
                {result.liquidityAdvisory.text}
              </div>
            </div>
          </div>

          <div>
            <SectionLabel>Top holders</SectionLabel>
            <div className="token-holder-table" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="token-holder-header" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                <span>Address</span>
                <span className="token-holder-amount">Held</span>
              </div>
              {result.topHolders.map((h, i) => (
                <div
                  key={h.rank}
                  className="token-holder-row"
                  style={{ borderBottom: i === result.topHolders.length - 1 ? "none" : `1px solid ${BORDER}` }}
                >
                  <span className="token-holder-address-wrap">
                    <span style={{ color: MUTED, ...mono, fontSize: 12 }}>{h.rank}</span>
                    <span style={{ ...mono, fontSize: 13 }} className="token-holder-address">{h.address}</span>
                    {h.tag && (
                      <span className="token-tag" style={{ background: `${ACCENT}22`, color: ACCENT }}>
                        {h.tag}
                      </span>
                    )}
                  </span>
                  <span style={{ ...mono, fontSize: 13 }} className="token-holder-amount">{h.pct.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="token-footer" style={{ color: MUTED }}>
            <span>Total supply: {fmtCompact(result.totalSupply)} {result.symbol}</span>
            <span>Automated estimate, not financial advice</span>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="token-stat">
      <div className="token-stat-label" style={{ color: MUTED }}>{label}</div>
      <div className="token-stat-value" style={{ color: color || TEXT, ...mono }}>{value}</div>
    </div>
  );
}