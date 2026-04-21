import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, NLPResult } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Crosshair, Shield, FlaskConical, Search, Network,
  AlertTriangle, CheckCircle2, ArrowRight, Wallet, Phone, Fingerprint,
} from "lucide-react";

/* ── Types ──────────────────────────── */
interface PipelineStage {
  id: string;
  title: string;
  icon: any;
  status: "pending" | "processing" | "done";
  result?: any;
  duration?: number;
}

/* ── Presets ──────────────────────────── */
const PRESETS = [
  { label: "🚨 Drug Trafficker Bio", text: "DM for menu 📋 | Fastest delivery NCR 🚀 | ETH: 0x4E2aF9b823c6a0bF1d5C6e9D8f7A4bC3dE2fA1b | ❄️🔌 Premium quality only | +91-98765-43210" },
  { label: "🟡 Crypto Trader (Benign)", text: "Crypto day trader 📈 | BTC maximalist | ETH: 0xAbCdEf1234567890 | Portfolio +340% this year | Not financial advice 🚀" },
  { label: "✅ Travel Blogger", text: "Wanderlust ✈️ | Exploring Himachal 🏔️❄️ | Fresh mountain air and chai ☕ | Follow my journey 📸" },
  { label: "⚡ Coded Message", text: "Got the freshest supply in town 🔌 Need to re-up? HMU for the menu. 2500/g premium only. No time wasters 💎" },
];

/* ── Helpers ──────────────────────────── */
function extractEntities(text: string) {
  const wallets = text.match(/0x[a-fA-F0-9]{10,}/g) || [];
  const phones = text.match(/\+?\d[\d\s\-()]{8,}\d/g) || [];
  const emojis = text.match(/[\u{1F300}-\u{1FAFF}]/gu) || [];
  const prices = text.match(/[\$₹]\s?\d[\d,]*(?:\/[a-z]+)?|\d+\/[a-z]{1,3}/gi) || [];
  return { wallets, phones, emojis, prices };
}

function cleanTextDemo(text: string) {
  const steps: string[] = [];
  let cleaned = text;
  // NFKC
  const nfkc = cleaned.normalize("NFKC");
  if (nfkc !== cleaned) steps.push("NFKC normalized unicode characters");
  cleaned = nfkc;
  // control chars
  const ctrl = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (ctrl !== cleaned) steps.push("Stripped control characters");
  cleaned = ctrl;
  // whitespace
  const ws = cleaned.replace(/\s+/g, " ").trim();
  if (ws !== cleaned) steps.push("Collapsed whitespace");
  cleaned = ws;
  if (steps.length === 0) steps.push("Text already clean — all checks passed");
  return { cleaned, steps };
}

/* ── AnimatedCounter ──────────────────── */
function AnimatedScore({ score, color }: { score: number; color: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const target = Math.round(score * 100);
    let frame = 0;
    const total = 30;
    const timer = setInterval(() => {
      frame++;
      setCurrent(Math.round((frame / total) * target));
      if (frame >= total) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [score]);
  return <span className={`text-5xl font-black ${color}`}>{current}%</span>;
}

/* ── Main Component ──────────────────── */
export default function Investigate() {
  const [text, setText] = useState("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [entities, setEntities] = useState<ReturnType<typeof extractEntities> | null>(null);
  const [cleanResult, setCleanResult] = useState<{ cleaned: string; steps: string[] } | null>(null);
  const [nlpResult, setNlpResult] = useState<NLPResult | null>(null);
  const [matchedIdentities, setMatchedIdentities] = useState<any[]>([]);

  const { data: identitiesData } = useQuery({ queryKey: ["/api/identities"] });
  const analyzeMutation = useMutation({
    mutationFn: (t: string) => api.analyzeText(t),
  });

  const initStages = (): PipelineStage[] => [
    { id: "sanitize", title: "Data Sanitization", icon: Shield, status: "pending" },
    { id: "extract", title: "Entity Extraction", icon: Search, status: "pending" },
    { id: "nlp", title: "NLP Intent Analysis", icon: FlaskConical, status: "pending" },
    { id: "identity", title: "Identity Graph Search", icon: Network, status: "pending" },
    { id: "risk", title: "Risk Assessment", icon: AlertTriangle, status: "pending" },
  ];

  const updateStage = useCallback((id: string, update: Partial<PipelineStage>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
  }, []);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runInvestigation = async () => {
    if (!text.trim()) return;
    setIsRunning(true);
    setNlpResult(null);
    setEntities(null);
    setCleanResult(null);
    setMatchedIdentities([]);
    const newStages = initStages();
    setStages(newStages);

    // Stage 1: Sanitization
    await sleep(300);
    updateStage("sanitize", { status: "processing" });
    await sleep(800);
    const cr = cleanTextDemo(text);
    setCleanResult(cr);
    updateStage("sanitize", { status: "done", duration: 0.12 });

    // Stage 2: Entity extraction
    await sleep(400);
    updateStage("extract", { status: "processing" });
    await sleep(700);
    const ents = extractEntities(text);
    setEntities(ents);
    updateStage("extract", { status: "done", duration: 0.08 });

    // Stage 3: NLP
    await sleep(400);
    updateStage("nlp", { status: "processing" });
    try {
      const result = await analyzeMutation.mutateAsync(text);
      setNlpResult(result);
      updateStage("nlp", { status: "done", duration: 0.34 });
    } catch {
      updateStage("nlp", { status: "done", duration: 0 });
    }

    // Stage 4: Identity search
    await sleep(400);
    updateStage("identity", { status: "processing" });
    await sleep(600);
    // Search for matching wallets in existing identities
    const idents = identitiesData?.identities ?? [];
    const matched = idents.filter((id: any) => {
      const wallets = id.all_wallets || [];
      return ents.wallets.some(w =>
        wallets.some((iw: string) => iw.toLowerCase() === w.toLowerCase())
      );
    });
    setMatchedIdentities(matched);
    updateStage("identity", { status: "done", duration: 0.15 });

    // Stage 5: Risk assessment
    await sleep(400);
    updateStage("risk", { status: "processing" });
    await sleep(600);
    updateStage("risk", { status: "done", duration: 0.06 });

    setIsRunning(false);
  };

  const allDone = stages.length > 0 && stages.every(s => s.status === "done");
  const scoreColor = nlpResult
    ? nlpResult.intent_score >= 0.7 ? "text-red-400"
    : nlpResult.intent_score >= 0.4 ? "text-amber-400"
    : "text-emerald-400"
    : "";
  const riskLevel = nlpResult
    ? nlpResult.intent_score >= 0.7 ? "CRITICAL" : nlpResult.intent_score >= 0.4 ? "SUSPICIOUS" : "CLEAN"
    : "";
  const riskBorderColor = nlpResult
    ? nlpResult.intent_score >= 0.7 ? "border-red-500/30" : nlpResult.intent_score >= 0.4 ? "border-amber-500/30" : "border-emerald-500/30"
    : "";

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Input Section */}
      <div className="space-y-3">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste any social media bio, post, or message to investigate..."
          className="min-h-28 font-mono text-sm border-none focus:ring-1 focus:ring-purple-500/30"
          style={{
            background: 'hsl(222 47% 5%)',
            color: 'hsl(210 40% 85%)',
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runInvestigation}
            disabled={!text.trim() || isRunning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 disabled:opacity-40"
            style={{
              background: isRunning
                ? 'hsl(217 33% 15%)'
                : 'linear-gradient(135deg, hsl(245 58% 55%), hsl(262 83% 58%))',
              color: 'white',
              boxShadow: !isRunning ? '0 4px 20px hsla(245, 58%, 50%, 0.3)' : 'none',
            }}
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><Crosshair className="h-4 w-4" />Investigate</>
            )}
          </button>
          <div className="h-5 w-px mx-1" style={{ background: 'hsl(217 33% 20%)' }} />
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setText(p.text); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
              style={{ background: 'hsl(217 33% 12%)', color: 'hsl(215 20% 65%)', border: '1px solid hsl(217 33% 18%)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Stages */}
      {stages.length > 0 && (
        <div className="space-y-2">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isPending = stage.status === "pending";
            const isProcessing = stage.status === "processing";
            const isDone = stage.status === "done";

            return (
              <div
                key={stage.id}
                className={`pipeline-step ${stage.status !== "pending" ? "active" : ""} ${isProcessing ? "processing" : ""}`}
                style={{
                  opacity: isPending ? 0.3 : 1,
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
                  style={{
                    background: isProcessing
                      ? 'linear-gradient(135deg, hsla(245, 58%, 64%, 0.08), hsla(262, 83%, 65%, 0.05))'
                      : isDone
                      ? 'hsla(217, 33%, 10%, 0.5)'
                      : 'transparent',
                    border: `1px solid ${isProcessing ? 'hsla(245, 58%, 64%, 0.2)' : isDone ? 'hsla(217, 33%, 18%, 0.5)' : 'transparent'}`,
                  }}
                >
                  {/* Step number */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-none step-indicator"
                    style={{
                      background: isDone ? 'hsla(142, 76%, 36%, 0.15)' : isProcessing ? 'hsla(245, 58%, 64%, 0.15)' : 'hsla(217, 33%, 15%, 0.5)',
                      border: `1px solid ${isDone ? 'hsla(142, 76%, 36%, 0.3)' : isProcessing ? 'hsla(245, 58%, 64%, 0.3)' : 'transparent'}`,
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className="w-4 h-4" style={{ color: 'hsl(215 20% 40%)' }} />
                    )}
                  </div>

                  {/* Title */}
                  <span className="text-sm font-medium flex-1"
                    style={{ color: isDone ? 'hsl(210 40% 85%)' : isProcessing ? 'hsl(262 83% 75%)' : 'hsl(215 20% 40%)' }}
                  >
                    {stage.title}
                  </span>

                  {/* Status */}
                  {isProcessing && (
                    <span className="text-xs font-medium text-purple-400 animate-pulse">Analyzing...</span>
                  )}
                  {isDone && stage.duration !== undefined && (
                    <span className="text-xs font-mono" style={{ color: 'hsl(215 20% 40%)' }}>
                      {stage.duration.toFixed(2)}s
                    </span>
                  )}
                </div>

                {/* Stage Results (inline) */}
                {isDone && stage.id === "sanitize" && cleanResult && (
                  <div className="ml-11 mt-2 mb-1 animate-fade-in">
                    <div className="p-3 rounded-lg" style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                      {cleanResult.steps.map((step, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs py-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-none" />
                          <span style={{ color: 'hsl(215 20% 60%)' }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isDone && stage.id === "extract" && entities && (
                  <div className="ml-11 mt-2 mb-1 animate-fade-in">
                    <div className="flex flex-wrap gap-2">
                      {entities.wallets.map((w, j) => (
                        <Badge key={j} className="text-xs font-mono gap-1" style={{ background: 'hsla(45, 93%, 47%, 0.1)', color: '#fbbf24', border: '1px solid hsla(45, 93%, 47%, 0.2)' }}>
                          <Wallet className="w-3 h-3" />{w.slice(0, 8)}...{w.slice(-4)}
                        </Badge>
                      ))}
                      {entities.phones.map((p, j) => (
                        <Badge key={j} className="text-xs font-mono gap-1" style={{ background: 'hsla(200, 80%, 50%, 0.1)', color: '#38bdf8', border: '1px solid hsla(200, 80%, 50%, 0.2)' }}>
                          <Phone className="w-3 h-3" />{p}
                        </Badge>
                      ))}
                      {entities.emojis.length > 0 && (
                        <Badge className="text-xs gap-1" style={{ background: 'hsla(270, 60%, 50%, 0.1)', color: '#c084fc', border: '1px solid hsla(270, 60%, 50%, 0.2)' }}>
                          {entities.emojis.length} emojis: {entities.emojis.slice(0, 6).join("")}
                        </Badge>
                      )}
                      {entities.prices.map((p, j) => (
                        <Badge key={j} className="text-xs font-mono gap-1" style={{ background: 'hsla(0, 80%, 50%, 0.1)', color: '#f87171', border: '1px solid hsla(0, 80%, 50%, 0.2)' }}>
                          💰 {p}
                        </Badge>
                      ))}
                      {entities.wallets.length === 0 && entities.phones.length === 0 && entities.prices.length === 0 && (
                        <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>No structured entities found in text</span>
                      )}
                    </div>
                  </div>
                )}

                {isDone && stage.id === "nlp" && nlpResult && (
                  <div className="ml-11 mt-2 mb-1 animate-fade-in">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <AnimatedScore score={nlpResult.intent_score} color={scoreColor} />
                        <div>
                          <p className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>Intent Score</p>
                          <Badge className={`mt-1 text-xs ${nlpResult.flagged ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}
                            style={{ border: '1px solid' }}
                          >
                            {nlpResult.flagged ? "⚠️ FLAGGED" : "✅ CLEAN"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5 ml-4">
                        {nlpResult.has_drug_emojis && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            <span style={{ color: 'hsl(215 20% 60%)' }}>Drug emoji detected <span className="font-mono text-orange-400">+{nlpResult.emoji_boost.toFixed(2)}</span></span>
                          </div>
                        )}
                        {nlpResult.has_price_pattern && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            <span style={{ color: 'hsl(215 20% 60%)' }}>Price pattern detected <span className="font-mono text-red-400">+{nlpResult.price_boost.toFixed(2)}</span></span>
                          </div>
                        )}
                        {nlpResult.has_wallet && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-yellow-400" />
                            <span style={{ color: 'hsl(215 20% 60%)' }}>Crypto wallet detected <span className="font-mono text-yellow-400">+0.05</span></span>
                          </div>
                        )}
                        {nlpResult.matched_anchor && (
                          <div className="text-xs mt-1 p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                            <span style={{ color: 'hsl(215 20% 45%)' }}>Closest anchor: </span>
                            <span className="italic" style={{ color: 'hsl(215 20% 65%)' }}>"{nlpResult.matched_anchor}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isDone && stage.id === "identity" && (
                  <div className="ml-11 mt-2 mb-1 animate-fade-in">
                    {matchedIdentities.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-semibold text-purple-400">{matchedIdentities.length} linked identity/ies found!</span>
                        </div>
                        {matchedIdentities.map((id: any) => (
                          <div key={id.identity_id} className="p-3 rounded-lg" style={{ background: 'hsla(262, 83%, 65%, 0.06)', border: '1px solid hsla(262, 83%, 65%, 0.15)' }}>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs text-purple-300">{id.identity_id}</span>
                              <Badge className="text-xs" style={{ background: 'hsla(262, 83%, 65%, 0.15)', color: 'hsl(262 83% 75%)' }}>
                                Risk: {id.risk_score?.toFixed(0)}/100
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(id.all_usernames || []).slice(0, 4).map((u: string) => (
                                <span key={u} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(217 33% 15%)', color: 'hsl(215 20% 60%)' }}>
                                  @{u}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
                        {entities?.wallets?.length ? "No matching identities found for extracted wallets" : "No wallet address to search against identity graph"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Final Verdict */}
      {allDone && nlpResult && (
        <div className={`animate-fade-in-up glass-card p-6 border ${riskBorderColor}`}
          style={{
            background: nlpResult.intent_score >= 0.7
              ? 'linear-gradient(135deg, hsla(0, 60%, 15%, 0.3), hsla(0, 60%, 10%, 0.2))'
              : nlpResult.intent_score >= 0.4
              ? 'linear-gradient(135deg, hsla(35, 60%, 15%, 0.3), hsla(35, 60%, 10%, 0.2))'
              : 'linear-gradient(135deg, hsla(142, 60%, 12%, 0.3), hsla(142, 60%, 8%, 0.2))',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: nlpResult.intent_score >= 0.7 ? 'hsla(0,60%,50%,0.15)' : nlpResult.intent_score >= 0.4 ? 'hsla(35,60%,50%,0.15)' : 'hsla(142,60%,50%,0.15)',
              }}
            >
              <AlertTriangle className={`w-7 h-7 ${scoreColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: 'hsl(210 40% 93%)' }}>
                Verdict: {riskLevel}
              </h3>
              <p className="text-sm" style={{ color: 'hsl(215 20% 50%)' }}>
                {nlpResult.intent_score >= 0.7 
                  ? "High probability of illicit activity. Recommend full investigation."
                  : nlpResult.intent_score >= 0.4
                  ? "Suspicious indicators detected. Manual review recommended."
                  : "No significant threat indicators. Content appears benign."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            {[
              { label: "Intent Score", value: `${(nlpResult.intent_score * 100).toFixed(0)}%` },
              { label: "Wallets Found", value: entities?.wallets?.length ?? 0 },
              { label: "Phones Found", value: entities?.phones?.length ?? 0 },
              { label: "Identity Matches", value: matchedIdentities.length },
              { label: "Drug Emojis", value: nlpResult.has_drug_emojis ? "Yes" : "No" },
            ].map(s => (
              <div key={s.label} className="p-2 rounded-lg" style={{ background: 'hsla(217, 33%, 10%, 0.5)' }}>
                <p className="text-lg font-bold" style={{ color: 'hsl(210 40% 90%)' }}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 45%)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
