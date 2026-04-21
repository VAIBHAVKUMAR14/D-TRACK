import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, NLPResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Loader2, Shield } from "lucide-react";

const EXAMPLES = [
  { label: "🚨 Explicit coded", text: "❄️ Fresh batch just landed! Premium quality, 2500/g. DM for full menu 🔌" },
  { label: "🟡 Subtle coded", text: "Got the freshest supply in NCR 🔌 DM if you know what I mean" },
  { label: "✅ Benign", text: "Snow capped peaks of Himachal 🏔️❄️ Nothing beats fresh mountain air" },
  { label: "🧊 Same emoji, different intent", text: "❄️ Winter is coming! Best time for hot chocolate and cozy sweaters 🧣" },
];

function ScoreGauge({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#f87171' : pct >= 40 ? '#fbbf24' : '#4ade80';

  useEffect(() => {
    let frame = 0;
    const total = 35;
    const timer = setInterval(() => {
      frame++;
      setDisplayed(Math.round((frame / total) * pct));
      if (frame >= total) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [pct]);

  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsla(217, 33%, 15%, 0.5)" strokeWidth="8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(displayed / 100) * 264} 264`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.3s ease', filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{displayed}%</span>
        <span className="text-[9px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 45%)' }}>Intent</span>
      </div>
    </div>
  );
}

export default function NLPInspector() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<NLPResult | null>(null);

  const analyze = useMutation({
    mutationFn: (t: string) => api.analyzeText(t),
    onSuccess: setResult,
  });

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Input */}
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter any message to analyze for drug trafficking intent..."
          className="w-full min-h-28 rounded-xl p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/30"
          style={{ background: 'hsl(222 47% 5%)', color: 'hsl(210 40% 85%)', border: '1px solid hsl(217 33% 15%)' }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => analyze.mutate(text)}
            disabled={!text.trim() || analyze.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
            style={{
              background: analyze.isPending ? 'hsl(217 33% 15%)' : 'linear-gradient(135deg, hsl(245 58% 55%), hsl(262 83% 58%))',
              color: 'white',
              boxShadow: !analyze.isPending ? '0 4px 20px hsla(245, 58%, 50%, 0.3)' : 'none',
            }}
          >
            {analyze.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</> : <><FlaskConical className="h-4 w-4" />Analyze Intent</>}
          </button>
          <div className="h-5 w-px mx-1" style={{ background: 'hsl(217 33% 20%)' }} />
          {EXAMPLES.map(ex => (
            <button key={ex.label} onClick={() => { setText(ex.text); analyze.mutate(ex.text); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
              style={{ background: 'hsl(217 33% 12%)', color: 'hsl(215 20% 65%)', border: '1px solid hsl(217 33% 18%)' }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* False Positive Safeguards Info */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(142, 76%, 60%)' }}>False Positive Safeguards Active</span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'hsl(215 20% 50%)' }}>
          <span>• Intent threshold: <b className="text-purple-400">0.40</b></span>
          <span>• Emoji boost gated above <b className="text-purple-400">0.25</b></span>
          <span>• Price boost: <b className="text-purple-400">+0.10 max</b></span>
          <span>• Model: <b className="font-mono text-purple-400">all-MiniLM-L6-v2</b></span>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
          {/* Score Gauge */}
          <div className="glass-card p-6 flex flex-col items-center justify-center">
            <ScoreGauge score={result.intent_score} />
            <Badge className={`mt-4 text-xs px-4 py-1 ${result.flagged ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}
              style={{ border: `1px solid ${result.flagged ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
              {result.flagged ? "⚠️ FLAGGED — Suspicious content detected" : "✅ CLEAN — No threat indicators"}
            </Badge>
          </div>

          {/* Breakdown */}
          <div className="glass-card p-6 space-y-3">
            <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Analysis Breakdown</h3>
            {[
              { label: "Drug Emojis", value: result.has_drug_emojis ? `Detected (+${result.emoji_boost.toFixed(2)})` : "None detected", active: result.has_drug_emojis, color: "#fb923c" },
              { label: "Price Pattern", value: result.has_price_pattern ? `Detected (+${result.price_boost.toFixed(2)})` : "None detected", active: result.has_price_pattern, color: "#f87171" },
              { label: "Wallet Detected", value: result.has_wallet ? "Yes (+0.05)" : "No", active: result.has_wallet, color: "#fbbf24" },
              { label: "Anchor Similarity", value: result.anchor_similarity.toFixed(4), active: result.anchor_similarity > 0.3, color: "#a78bfa" },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm py-2 px-3 rounded-lg"
                style={{ background: row.active ? `${row.color}08` : 'transparent', border: `1px solid ${row.active ? `${row.color}20` : 'transparent'}` }}
              >
                <span style={{ color: 'hsl(215 20% 55%)' }}>{row.label}</span>
                <span className="font-medium font-mono text-sm" style={{ color: row.active ? row.color : 'hsl(215 20% 45%)' }}>{row.value}</span>
              </div>
            ))}
            {result.matched_anchor && (
              <div className="mt-3 p-3 rounded-lg" style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(215 20% 45%)' }}>Closest Anchor Sentence</p>
                <p className="text-sm italic" style={{ color: 'hsl(215 20% 65%)' }}>"{result.matched_anchor}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
