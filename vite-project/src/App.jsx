import { useEffect, useState } from 'react';
import {
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
  ExternalLink,
  Sparkles,
  Ghost,
  ShieldCheck,
} from 'lucide-react';

const scoringRules = [
  { label: 'Mint authority not revoked', points: 60, detail: 'If the token issuer can still mint supply, the supply can be inflated at any time.' },
  { label: 'Freeze authority not revoked', points: 60, detail: 'If the issuer can freeze wallets, holders can be blocked from moving funds.' },
  { label: 'No liquidity data found', points: 25, detail: 'No reliable liquidity data means the token should be treated as risky or unknown, not safe.' },
  { label: 'Liquidity under $5k', points: 30, detail: 'Very thin liquidity means the market can be manipulated more easily.' },
  { label: 'Liquidity under $25k', points: 15, detail: 'Low liquidity is a caution signal, even if it is not yet a severe problem.' },
  { label: 'Top 10 holders own more than 70%', points: 35, detail: 'A tiny set of wallets controls most of the supply, increasing concentration risk.' },
  { label: 'Top 10 holders own more than 40%', points: 15, detail: 'Concentration is high enough to warrant caution.' },
  { label: 'Pair younger than 24 hours', points: 15, detail: 'A brand-new pair has no trusted pattern to rely on yet.' },
  { label: '24h volume is more than 20x liquidity', points: 20, detail: 'This can be a sign of wash trading or artificial volume.' },
  { label: 'Honeypot detected', points: 100, detail: 'If the token cannot be sold after purchase, this is automatically a high-risk condition.' },
];

function App() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [state, setState] = useState('idle');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState('home');
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('ghostcheck-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('ghostcheck-history', JSON.stringify(history));
  }, [history]);

  const formatPairDate = (value) => {
    if (!value) return 'Unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setShowHistory(false);
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

      const cleaned = tokenAddress.trim();
      setHistory((previous) => [cleaned, ...previous.filter((item) => item !== cleaned)].slice(0, 3));
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
    setPage('home');
  };

  if (page === 'scoring') {
    return (
      <div className="app-shell min-h-screen bg-[#0a0e14] text-gray-100 overflow-x-hidden">
        <div className="fixed inset-0 grid-bg pointer-events-none" />
        <div className="fixed inset-0 glow-radial pointer-events-none" />

        <nav className="relative z-10 border-b border-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setPage('home')} className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Ghost className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-bold tracking-tight">GhostCheck <em>beta</em></span>
            </button>
            <button
              onClick={() => setPage('home')}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
            >
              Back to analyzer
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>

        <section className="relative z-10 px-6 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
                <Ghost className="w-3.5 h-3.5" />
                Risk model
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How scoring works</h1>
              <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Each triggered rule adds points. Higher totals mean higher risk. Severe conditions such as an active mint authority, freeze authority, or honeypot can force a high-risk outcome even if the rest of the signal set looks mixed.
              </p>
            </div>

            <div className="space-y-4">
              {scoringRules.map((rule) => (
                <div key={rule.label} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h2 className="text-base font-semibold text-white">{rule.label}</h2>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-medium">+{rule.points} pts</span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{rule.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <h2 className="text-xl font-bold text-white mb-4">Risk bands</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-semibold text-emerald-400 mb-1">0–30</p>
                  <p>Low risk</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-semibold text-amber-400 mb-1">30–60</p>
                  <p>Medium risk</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-semibold text-red-400 mb-1">60+</p>
                  <p>High risk</p>
                </div>
              </div>
            </div>

            <div id="features" className="mt-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3">Features</h2>
                <p className="text-gray-400">A clean risk snapshot built for everyday token checks.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FeatureCard icon={<Ghost className="w-6 h-6" />} title="Authority checks" description="Flag active mint or freeze authority immediately." color="emerald" />
                <FeatureCard icon={<Droplets className="w-6 h-6" />} title="Liquidity checks" description="Spot thin markets and suspicious volume-to-liquidity spikes." color="cyan" />
                <FeatureCard icon={<Users className="w-6 h-6" />} title="Holder concentration" description="See when a small number of wallets control a large share of supply." color="purple" />
              </div>
            </div>

            <div id="how" className="mt-14">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3">How it works</h2>
                <p className="text-gray-400">Three simple steps from address to risk verdict.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StepCard step="01" icon={<Search className="w-6 h-6" />} title="Paste address" description="Drop in any Solana token contract address you want to check." />
                <StepCard step="02" icon={<Ghost className="w-6 h-6" />} title="Run the checks" description="The app reviews authority, liquidity, holder concentration, and trade activity." />
                <StepCard step="03" icon={<CheckCircle2 className="w-6 h-6" />} title="Review the score" description="A clear numeric risk score and red flags show the most important signals." />
              </div>
            </div>

            <div id="faq" className="mt-14">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-3">FAQ</h2>
              </div>
              <div className="space-y-4">
                <FaqItem question="What counts as a severe risk?" answer="Active mint authority, active freeze authority, or a honeypot are treated as automatic high-risk conditions." />
                <FaqItem question="Why is low liquidity risky?" answer="Small liquidity pools can be manipulated, drained, or moved sharply by a few trades." />
                <FaqItem question="What if the data is missing?" answer="Missing liquidity data is treated as risky or unknown rather than safe because we cannot verify enough signal." />
                <FaqItem question="Is this financial advice?" answer="No. This is a risk-assessment tool based on observed signals and automated checks, not a recommendation to buy or sell." />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

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
              <Ghost className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">GhostCheck <em>beta</em></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how" className="hover:text-emerald-400 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </div>
          <button
            type="button"
            onClick={() => setPage('scoring')}
            className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
          >
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
            Ghosted risk checks, without the noise
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
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => {
                    setTimeout(() => setShowHistory(false), 150);
                  }}
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
            {showHistory && history.length > 0 && (
              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-left shadow-2xl shadow-black/20 backdrop-blur-sm animate-[fadeInUp_0.18s_ease-out]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mb-2">Recent searches</p>
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setTokenAddress(item);
                        setShowHistory(false);
                      }}
                      className="block w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-left text-sm text-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 truncate"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  <Ghost className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Analyzing token...</p>
                <p className="text-sm text-gray-500 mt-1">Running 25+ security checks</p>
              </div>
              <div className="w-full max-w-md space-y-2 mt-4">
                {['Checking contract authorities', 'Checking liquidity depth', 'Reviewing pair age', 'Analyzing market data'].map((step, i) => (
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
              <div className="flex items-center gap-2">
                {report.liquidity.dexscreenerUrl && (
                  <a
                    href={report.liquidity.dexscreenerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-emerald-500/10"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Dexscreener
                  </a>
                )}
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-white/5"
                >
                  <Search className="w-4 h-4" />
                  New Search
                </button>
              </div>
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
                    <p className="text-sm text-gray-400">{report.safetyScore.overridden ? 'A red-flag override determined this risk level.' : 'Weighted across liquidity, contract permissions, developer signals, and market activity.'}</p>
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
                  {report.safetyScore.components.filter((component) => component.available).map((component) => (
                    <div key={component.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-300">{component.label} <span className="text-gray-600">{component.weight}%</span></span>
                        <span className="text-gray-300">{component.score}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${component.score}%` }} />
                      </div>
                    </div>
                  ))}
                  {report.safetyScore.components.every((component) => !component.available) && (
                    <p className="text-sm text-gray-400">No verified score components are available for this token yet.</p>
                  )}
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
              </div>
            </div>

            {report.aiSummary || report.safetyScore ? (
              <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI overview</h3>
                    <p className="text-xs text-gray-500">Quick read on the token</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">
                  {report.aiSummary || `This ${report.tokenSymbol || 'token'} appears to have ${report.safetyScore?.label?.toLowerCase() || 'mixed'} risk characteristics. The main signals are ${report.safetyScore?.flags?.length ? report.safetyScore.flags.map((flag) => flag.label.toLowerCase()).slice(0, 2).join(' and ') : 'the absence of strong positive signals'}, so it should be treated as a high-variance asset that needs continued monitoring and a cautious approach.`}
                </p>
              </div>
            ) : null}

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
                <StatCard label="Pool Age" value={report.liquidity.poolAgeDays === null ? 'Unavailable' : `${report.liquidity.poolAgeDays} days`} subValue={`Created ${formatPairDate(report.liquidity.poolCreatedAt)}`} icon={<Clock className="w-4 h-4" />} />
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
                  <p className="text-xs text-gray-500">Price and liquidity signal checks</p>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <StatCard label="Token Price" value={`$${report.liquidity.price.toFixed(6)}`} icon={<TrendingUp className="w-4 h-4" />} />
                <StatCard label="24h Change" value={`${report.liquidity.priceChange24h > 0 ? '+' : ''}${report.liquidity.priceChange24h}%`} icon={<Activity className="w-4 h-4" />} positive={report.liquidity.priceChange24h > 0} negative={report.liquidity.priceChange24h < 0} />
                <StatCard label="Liq / MCap Ratio" value={report.marketStats.liquidityToMcapRatio === null ? 'Unavailable' : `${report.marketStats.liquidityToMcapRatio}%`} icon={<Droplets className="w-4 h-4" />} />
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Disclaimer: this report is generated from on-chain data and automated checks. It is not financial advice and should not be treated as a recommendation to buy, sell, or hold any token. Always do your own research (DYOR) before investing, and verify the latest liquidity, contract, and market conditions before making decisions.
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
                title="Market Analysis"
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
                description="Real-time price, market cap, FDV, supply metrics, transaction volume, and pair-age signals."
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
              <StepCard step="02" icon={<ShieldCheck className="w-6 h-6" />} title="Automated Analysis" description="We evaluate contract permissions, liquidity, pair age, and market activity." />
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
                answer="No. GhostCheck never asks you to connect a wallet. Simply paste a token contract address and we'll analyze it — no sign-up, no connection, no tracking."
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
                answer="Absolutely not. GhostCheck provides on-chain data and automated analysis to help you make informed decisions. It is not a recommendation to buy or sell any token."
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
            <span className="font-bold">GhostCheck</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 GhostCheck. Not financial advice. Always DYOR.</p>
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
