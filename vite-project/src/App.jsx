import { useState } from 'react';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Users,
  Droplets,
  BarChart3,
  BadgeCheck,
  Lock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Wallet,
  Clock,
  Activity,
} from 'lucide-react';

function App() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [state, setState] = useState('idle');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!tokenAddress.trim()) {
      setError('Please paste a token address to analyze.');
      return;
    }
    if (tokenAddress.trim().length < 20) {
      setError('That doesn\'t look like a valid token address.');
      return;
    }
    setError('');
    setState('loading');
    setReport(null);

    try {
      const response = await fetch(`/api/analyze?address=${encodeURIComponent(tokenAddress.trim())}`);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      if (!isJson) {
        throw new Error('The analysis service is not running. Restart the app with npm run dev.');
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Analysis failed.');
      setReport(payload);
      setState('results');
    } catch (requestError) {
      setError(requestError.message || 'Could not analyze that token.');
      setState('idle');
    }
  };

  const handleReset = () => {
    setState('idle');
    setReport(null);
    setTokenAddress('');
    setError('');
  };

  return (
    <div className="app-shell min-h-screen bg-[#0a0e14] text-gray-100 overflow-x-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 grid-bg pointer-events-none" />
      <div className="fixed inset-0 glow-radial pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">TokenGuard <em>beta</em></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how" className="hover:text-emerald-400 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </div>
          <button className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5">
            How scoring works
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Token due diligence, without the noise
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-up leading-[1.1]">
            Make the next trade
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              less of a guess
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            A quick, readable view of contract permissions, liquidity, ownership, and concentration risk.
          </p>

          {/* Input form */}
          <form onSubmit={handleAnalyze} className="max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center gap-2 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm group-focus-within:border-emerald-500/40 transition-colors">
                <div className="pl-3">
                  <Search className="w-5 h-5 text-gray-500" />
                </div>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => {
                    setTokenAddress(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="0x... or paste token contract address"
                  className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-gray-500 outline-none py-3 px-1 min-w-0"
                />
                <button
                  type="submit"
                  disabled={state === 'loading'}
                  className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {state === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Check token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-400 animate-fade-in flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            )}
          </form>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-gray-500 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Read-only analysis</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Results in seconds</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> 25 checks, one report</span>
          </div>
        </div>
      </section>

      {/* Loading state */}
      {state === 'loading' && (
        <section className="relative z-10 px-6 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center animate-pulse-glow">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Analyzing token...</p>
                <p className="text-sm text-gray-500 mt-1">Running 25+ security checks</p>
              </div>
              <div className="w-full max-w-md space-y-2 mt-4">
                {['Checking contract authorities', 'Scanning holder distribution', 'Verifying liquidity locks', 'Analyzing market data'].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-400 animate-fade-up" style={{ animationDelay: `${i * 0.3}s` }}>
                    <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {state === 'results' && report && (
        <section className="results-view relative z-10 px-6 pb-24 animate-fade-up">
          <div className="max-w-5xl mx-auto">
            {/* Token header */}
            <div className="flex items-center justify-between mb-8 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-500/20">
                  {report.tokenSymbol[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{report.tokenName}</h2>
                    {report.authority.verified && (
                      <BadgeCheck className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">${report.tokenSymbol} · {tokenAddress.slice(0, 8)}...{tokenAddress.slice(-4)}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-white/5"
              >
                <Search className="w-4 h-4" />
                New Search
              </button>
            </div>

            {/* Safety Score Banner */}
            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke={report.safetyScore.color === 'red' ? '#f87171' : report.safetyScore.color === 'orange' ? '#fb923c' : report.safetyScore.color === 'yellow' ? '#fbbf24' : '#c8db88'} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - report.safetyScore.score / 100)}`} />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{report.safetyScore.score}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{report.safetyScore.label}</p>
                    <p className="text-sm text-gray-400">{report.safetyScore.overridden ? 'A red-flag override determined this risk level.' : 'Weighted across liquidity, holders, contract, sellability, developer, and market checks.'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-center px-5 py-2 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-emerald-400">{report.safetyScore.components.filter((component) => component.available && component.score >= 60).length}</p>
                    <p className="text-xs text-gray-500">clear</p>
                  </div>
                  <div className="text-center px-5 py-2 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-amber-400">{report.safetyScore.components.filter((component) => !component.available || (component.score >= 40 && component.score < 60)).length}</p>
                    <p className="text-xs text-gray-500">unavailable / review</p>
                  </div>
                  <div className="text-center px-5 py-2 rounded-xl bg-white/5">
                    <p className="text-2xl font-bold text-red-400">{report.safetyScore.flags.length}</p>
                    <p className="text-xs text-gray-500">red flags</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Safety score breakdown</h3>
                    <p className="text-xs text-gray-500">Weights follow the Token Safety Score model</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="space-y-3">
                  {report.safetyScore.components.map((component) => (
                    <div key={component.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-300">{component.label} <span className="text-gray-600">{component.weight}%</span></span>
                        <span className={component.available ? 'text-gray-300' : 'text-amber-400'}>{component.available ? `${component.score}/100` : 'Unavailable'}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${component.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Red-flag overrides</h3>
                    <p className="text-xs text-gray-500">One critical condition can override the weighted score</p>
                  </div>
                </div>
                {report.safetyScore.flags.length === 0 ? (
                  <p className="text-sm text-gray-400">No configured override conditions were detected.</p>
                ) : (
                  <div className="space-y-3">
                    {report.safetyScore.flags.map((flag) => (
                      <div key={flag.label} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 ${flag.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                        <div><p className="text-gray-200">{flag.label}</p><p className="text-xs text-gray-500 mt-0.5">{flag.detail}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {report.aiSummary && <p className="mt-5 pt-4 border-t border-white/10 text-sm text-gray-400 leading-relaxed"><span className="text-emerald-400 font-semibold">AI read:</span> {report.aiSummary}</p>}
              </div>
            </div>

            {/* Authority Checks */}
            <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Authority Checks</h3>
                  <p className="text-xs text-gray-500">Contract ownership and permissions</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <CheckRow label="Mint authority disabled" passed={!report.authority.mintAuthority} />
                <CheckRow label="Freeze authority disabled" passed={!report.authority.freezeAuthority} />
                <CheckRow label="Creator indexed" passed={Boolean(report.authority.creator)} />
                <CheckRow label="Token metadata available" passed />
                <CheckRow label="DEX market available" passed={report.liquidity.totalLiquidity > 0} />
                <CheckRow label="Top holder below 20%" passed={report.holders.topHolderPct < 20} value={`${report.holders.topHolderPct.toFixed(2)}%`} />
              </div>
            </div>

            {/* Holder Concentration */}
            <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Holder Concentration</h3>
                  <p className="text-xs text-gray-500">Distribution and whale analysis</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <StatCard label="Total Holders" value={report.holders.totalHolders.toLocaleString()} icon={<Users className="w-4 h-4" />} />
                <StatCard label="Top Holder" value={`${report.holders.topHolderPct}%`} subValue={report.holders.topHolderAddress} icon={<TrendingUp className="w-4 h-4" />} />
                <StatCard label="Top 5 Holders" value={`${report.holders.top5Pct}%`} icon={<Activity className="w-4 h-4" />} />
                <StatCard label="Top 10 Holders" value={`${report.holders.top10Pct}%`} icon={<BarChart3 className="w-4 h-4" />} />
              </div>
              {/* Distribution bar */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Holder distribution</p>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  <div className="bg-emerald-500/70 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${report.holders.topHolderPct}%` }}>
                    Top {report.holders.topHolderPct.toFixed(1)}%
                  </div>
                  <div className="bg-blue-500/70 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${Math.max(0, report.holders.top5Pct - report.holders.topHolderPct)}%` }}>
                    Top 5
                  </div>
                  <div className="bg-gray-600/50 flex items-center justify-center text-xs font-medium text-gray-300" style={{ width: `${100 - report.holders.top5Pct}%` }}>
                    Others
                  </div>
                </div>
              </div>
            </div>

            {/* Liquidity */}
            <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Liquidity</h3>
                  <p className="text-xs text-gray-500">Pool depth and lock status</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Liquidity" value={`$${report.liquidity.totalLiquidity.toLocaleString()}`} icon={<Droplets className="w-4 h-4" />} />
                <StatCard label="Pool Age" value={report.liquidity.poolAgeDays === null ? 'Unavailable' : `${report.liquidity.poolAgeDays} days`} subValue={`Created ${report.liquidity.poolCreatedAt}`} icon={<Clock className="w-4 h-4" />} />
                <StatCard label="24h Volume" value={`$${report.liquidity.volume24h.toLocaleString()}`} icon={<Activity className="w-4 h-4" />} />
                <StatCard label="24h Transactions" value={report.liquidity.txns24h.toLocaleString()} icon={<Zap className="w-4 h-4" />} />
                <StatCard label="Market Cap" value={`$${report.liquidity.mcap.toLocaleString()}`} icon={<TrendingUp className="w-4 h-4" />} />
              </div>
            </div>

            {/* Market Stats */}
            <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Market Stats</h3>
                  <p className="text-xs text-gray-500">Price, supply, and deployer info</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <StatCard label="Token Price" value={`$${report.liquidity.price.toFixed(6)}`} icon={<TrendingUp className="w-4 h-4" />} />
                <StatCard label="24h Change" value={`${report.liquidity.priceChange24h > 0 ? '+' : ''}${report.liquidity.priceChange24h}%`} icon={<Activity className="w-4 h-4" />} positive={report.liquidity.priceChange24h > 0} negative={report.liquidity.priceChange24h < 0} />
                <StatCard label="Total Holders" value={report.holders.totalHolders.toLocaleString()} icon={<Users className="w-4 h-4" />} />
                <StatCard label="Token Supply" value={report.marketStats.totalSupply.toLocaleString()} icon={<BarChart3 className="w-4 h-4" />} />
                <StatCard label="Liq / MCap Ratio" value={report.marketStats.liquidityToMcapRatio === null ? 'Unavailable' : `${report.marketStats.liquidityToMcapRatio}%`} icon={<Droplets className="w-4 h-4" />} />
                <StatCard label="Contract Verified" value={report.marketStats.contractVerified ? 'Yes' : 'No'} icon={<BadgeCheck className="w-4 h-4" />} positive={report.marketStats.contractVerified} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deployer Address</p>
                    <p className="text-sm font-medium text-white">{report.marketStats.deployerAddress}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Deployer Created</p>
                    <p className="text-sm font-medium text-white">{report.marketStats.deployerCreatedAt}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                This report is generated from on-chain data and automated checks. It is not financial advice. Always do your own research (DYOR) before investing. Token metrics can change rapidly.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Features section */}
      {state === 'idle' && (
        <section id="features" className="relative z-10 px-6 py-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> stay safe</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Comprehensive security analysis powered by on-chain data, contract auditing, and real-time market intelligence.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<ShieldCheck className="w-6 h-6" />}
                title="Authority Checks"
                description="Verify mint authority, freeze authority, ownership renunciation, honeypot status, and 20+ contract security flags."
                color="emerald"
              />
              <FeatureCard
                icon={<Users className="w-6 h-6" />}
                title="Holder Analysis"
                description="Detect whale concentration, dev wallet holdings, LP pair ratios, and identify risky distribution patterns."
                color="blue"
              />
              <FeatureCard
                icon={<Droplets className="w-6 h-6" />}
                title="Liquidity Verification"
                description="Check if liquidity is locked, for how long, pool age, volume, and whether a rug pull risk exists."
                color="cyan"
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6" />}
                title="Market Intelligence"
                description="Real-time price, market cap, FDV, supply metrics, transaction volume, and holder growth trends."
                color="purple"
              />
              <FeatureCard
                icon={<Zap className="w-6 h-6" />}
                title="Instant Results"
                description="Get a full safety report in seconds. No waiting, no wallet connection, no sign-up required."
                color="amber"
              />
              <FeatureCard
                icon={<Lock className="w-6 h-6" />}
                title="Privacy First"
                description="We never ask you to connect a wallet. Paste an address and get results — that's it."
                color="rose"
              />
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      {state === 'idle' && (
        <section id="how" className="relative z-10 px-6 py-20 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Three simple steps from address to full safety report.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StepCard step="01" icon={<Search className="w-6 h-6" />} title="Paste Token Address" description="Copy any token contract address and paste it into the search bar above." />
              <StepCard step="02" icon={<ShieldCheck className="w-6 h-6" />} title="Automated Analysis" description="We run 25+ security checks across contract, holders, liquidity, and market data." />
              <StepCard step="03" icon={<CheckCircle2 className="w-6 h-6" />} title="Review Report" description="Get a clear safety score with detailed breakdowns of every check we performed." />
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {state === 'idle' && (
        <section id="faq" className="relative z-10 px-6 py-20 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently asked questions</h2>
            </div>
            <div className="space-y-4">
              <FaqItem
                question="Do I need to connect my wallet?"
                answer="No. TokenGuard never asks you to connect a wallet. Simply paste a token contract address and we'll analyze it — no sign-up, no connection, no tracking."
              />
              <FaqItem
                question="What chains are supported?"
                answer="We currently support Ethereum, BNB Chain, Solana, Polygon, Arbitrum, and Base. More chains are being added regularly."
              />
              <FaqItem
                question="What does the safety score mean?"
                answer="The safety score (0–100) is calculated from 25+ automated checks. A higher score means the token passed more security checks, but it is not a guarantee of safety — always do your own research."
              />
              <FaqItem
                question="Is this financial advice?"
                answer="Absolutely not. TokenGuard provides on-chain data and automated analysis to help you make informed decisions. It is not a recommendation to buy or sell any token."
              />
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold">TokenGuard</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 TokenGuard. Not financial advice. Always DYOR.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function CheckRow({ label, passed, value, warning }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm font-medium text-gray-400">{value}</span>}
        {passed && !warning ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : warning ? (
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon, positive, negative }) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-gray-500">{icon}</span>}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-lg font-bold ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    purple: 'bg-purple-500/10 text-purple-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
  };
  return (
    <div className="group p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ step, icon, title, description }) {
  return (
    <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10">
      <div className="absolute -top-3 -right-3 text-5xl font-bold text-white/5 select-none">{step}</div>
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <span className="font-medium text-white">{question}</span>
        <span className={`text-emerald-400 text-xl transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all ${open ? 'max-h-40' : 'max-h-0'}`}>
        <p className="p-5 pt-0 text-sm text-gray-400 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export default App;
