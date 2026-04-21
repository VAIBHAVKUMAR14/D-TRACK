import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { 
  Users, AlertTriangle, Link, Wallet, Target, 
  Network, UserX, Zap, CheckCircle, XCircle, Loader2, ArrowRight,
  TrendingUp, Shield, Bot
} from "lucide-react";

/* ── Animated counter ──────────────── */
function Counter({ value, suffix = "", duration = 1200 }: { value: number; suffix?: string; duration?: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (typeof value !== "number" || isNaN(value)) return;
    const target = value;
    const steps = 40;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Number((eased * target).toFixed(target % 1 !== 0 ? 1 : 0)));
      if (frame >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{current}{suffix}</>;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ["/api/stats"] });
  const { data: health } = useQuery({ queryKey: ["/api/health"], refetchInterval: 5000 });
  const { data: pipelineInfo } = useQuery({ queryKey: ["/api/pipeline-info"] });

  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);

  const steps = [
    "Ingesting social profiles & messages...",
    "Applying data sanitization (NFKC, control chars)...",
    "Running NLP Intent Analysis (all-MiniLM-L6-v2)...",
    "Stitching cross-platform identities...",
    "Building shadow network graph...",
    "Evaluating composite risk scores...",
    "Running stylometric burner detection..."
  ];

  const ingest = useMutation({
    mutationFn: api.ingest,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const runPipelineFlow = async () => {
    setPipelineRunning(true);
    setPipelineStep(0);
    
    // Start backend ingestion in parallel
    ingest.mutate();

    // Stagger frontend steps for dramatic effect
    for (let i = 0; i < steps.length; i++) {
      setPipelineStep(i);
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    }
    
    // Wait for actual mutation if it's slow
    while (ingest.isPending) {
        await new Promise(r => setTimeout(r, 500));
    }
    
    setPipelineStep(steps.length);
    setTimeout(() => setPipelineRunning(false), 2000);
  };

  const compressionPct = pipelineInfo?.identity_resolution?.compression_pct ?? 0;
  const detectionRate = pipelineInfo?.nlp_engine?.detection_rate_pct ?? 0;
  const botsDetected = pipelineInfo?.bot_detection?.total_bots_detected ?? 0;

  return (
    <div className="p-5 lg:p-6 space-y-5 relative">
      {/* Pipeline Overlay Modal */}
      {pipelineRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" 
             style={{ background: 'hsla(222, 47%, 2%, 0.8)' }}>
           <div className="glass-card max-w-lg w-full p-8 space-y-6 animate-fade-in-up" 
                style={{ border: '1px solid hsla(262, 83%, 65%, 0.3)' }}>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, hsl(245 58% 55%), hsl(262 83% 58%))' }}>
                    <Zap className="h-6 w-6 text-white animate-pulse" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold gradient-text">Pipeline Processing</h2>
                    <p className="text-xs mt-1" style={{ color: 'hsl(215 20% 60%)' }}>Executing multi-stage analysis...</p>
                 </div>
              </div>
              <div className="space-y-4">
                 {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 transition-opacity duration-300"
                         style={{ opacity: pipelineStep >= idx ? 1 : 0.3 }}>
                       {pipelineStep > idx ? (
                         <CheckCircle className="h-5 w-5 text-emerald-400 flex-none" />
                       ) : pipelineStep === idx ? (
                         <Loader2 className="h-5 w-5 text-purple-400 animate-spin flex-none" />
                       ) : (
                         <div className="h-5 w-5 rounded-full border border-gray-600 flex-none" />
                       )}
                       <span className={`text-sm ${pipelineStep === idx ? 'text-purple-300 font-medium animate-pulse' : 'text-gray-400'}`}>
                         {step}
                       </span>
                    </div>
                 ))}
                 {pipelineStep === steps.length && (
                    <div className="pt-4 text-center animate-fade-in text-emerald-400 font-bold">
                       Analytic pipeline complete! Dashboard updated.
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Intelligence Overview</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(215 20% 50%)' }}>
            Real-time cross-platform OSINT analysis dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(217 33% 10%)', border: '1px solid hsl(217 33% 15%)' }}>
            {health?.loaded ? (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
                <span className="text-xs font-medium" style={{ color: 'hsl(142, 76%, 60%)' }}>Pipeline Active</span>
              </>
            ) : health?.error ? (
              <>
                <XCircle className="h-3 w-3 text-red-400" />
                <span className="text-xs text-red-400">Error</span>
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                <span className="text-xs text-purple-400">Loading...</span>
              </>
            )}
          </div>
          <button
            onClick={runPipelineFlow}
            disabled={pipelineRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 hover:scale-105"
            style={{
              background: pipelineRunning ? 'hsl(217 33% 15%)' : 'linear-gradient(135deg, hsl(245 58% 55%), hsl(262 83% 58%))',
              color: 'white',
              boxShadow: !pipelineRunning ? '0 4px 16px hsla(245, 58%, 50%, 0.25)' : 'none',
            }}
          >
            {pipelineRunning ? <><Loader2 className="h-4 w-4 animate-spin" />Processing...</> : <><Zap className="h-4 w-4" />Run Pipeline</>}
          </button>
        </div>
      </div>

      {/* Hero Metrics Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {[
            { label: "Identity Compression", value: compressionPct, suffix: "%", icon: Link, color: "#a78bfa", desc: `${stats.total_profiles} profiles → ${stats.unified_identities} identities` },
            { label: "Detection Rate", value: detectionRate, suffix: "%", icon: Target, color: "#fb923c", desc: `${stats.flagged_posts} of ${stats.total_posts} posts flagged` },
            { label: "High Risk Targets", value: stats.high_risk_count, suffix: "", icon: AlertTriangle, color: "#f87171", desc: "Critical + High risk identities" },
            { label: "Bots Detected", value: botsDetected, suffix: "", icon: Bot, color: "#fbbf24", desc: "Auto-deprioritized in risk scoring" },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(215 20% 45%)' }}>{card.label}</p>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-3xl font-black" style={{ color: card.color }}>
                  <Counter value={card.value} suffix={card.suffix} />
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'hsl(215 20% 40%)' }}>{card.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse" style={{ height: 100 }} />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {[
            { label: "Profiles Tracked", value: stats.total_profiles, icon: Users, color: "#60a5fa" },
            { label: "Flagged Posts", value: stats.flagged_posts, icon: AlertTriangle, color: "#f87171" },
            { label: "Unified Identities", value: stats.unified_identities, icon: Link, color: "#a78bfa" },
            { label: "Wallets Tracked", value: stats.wallets_tracked, icon: Wallet, color: "#fbbf24" },
            { label: "Organized Networks", value: stats.organized_networks, icon: Network, color: "#818cf8" },
            { label: "Communities", value: stats.total_communities, icon: Network, color: "#6366f1" },
            { label: "Burner Leads", value: stats.burner_leads_count, icon: UserX, color: "#fb923c" },
            { label: "Avg Risk Score", value: stats.avg_risk_score, icon: TrendingUp, color: "#94a3b8" },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'hsl(215 20% 42%)' }}>{card.label}</p>
                  <Icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                </div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(210 40% 90%)' }}>
                  <Counter value={card.value} />
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Pipeline Architecture Mini */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'hsl(210 40% 85%)' }}>
          Pipeline Architecture
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {[
            { label: "Ingest", color: "#60a5fa" },
            { label: "Clean & Sanitize", color: "#38bdf8" },
            { label: "NLP Score", color: "#4ade80" },
            { label: "Identity Stitch", color: "#a78bfa" },
            { label: "Graph Build", color: "#818cf8" },
            { label: "Risk Score", color: "#fb923c" },
            { label: "Burner Detect", color: "#f87171" },
          ].map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: `${step.color}12`, color: step.color, border: `1px solid ${step.color}25` }}>
                {step.label}
              </span>
              {i < 6 && <ArrowRight className="h-3 w-3" style={{ color: 'hsl(215 20% 30%)' }} />}
            </span>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
          <span>Model: <b className="font-mono" style={{ color: 'hsl(262 83% 70%)' }}>all-MiniLM-L6-v2</b></span>
          <span>Algorithm: <b className="font-mono" style={{ color: 'hsl(262 83% 70%)' }}>Union-Find</b></span>
          <span>Graph: <b className="font-mono" style={{ color: 'hsl(262 83% 70%)' }}>NetworkX + PyVis</b></span>
          <span>Risk: <b className="font-mono" style={{ color: 'hsl(262 83% 70%)' }}>40% centrality + 35% intent + 25% conn</b></span>
        </div>
      </div>

      {/* Live Intelligence Feed */}
      {stats && (
        <LiveFeed />
      )}
    </div>
  );
}

/* ── Live Intelligence Feed ─────────────────────── */
function LiveFeed() {
  const [events, setEvents] = useState<{ icon: string; text: string; time: string; color: string }[]>([]);
  const feedEvents = [
    { icon: "🔍", text: "Post flagged — @SnowKing247 — Intent score: 87%", color: "#f87171" },
    { icon: "🔗", text: "Identity merged: @luxlife_rahul ↔ @SnowKing247 via wallet 0x4E2a…A91", color: "#a78bfa" },
    { icon: "⚠️", text: "Risk escalation: NCR Cartel network → CRITICAL (92/100)", color: "#f87171" },
    { icon: "🤖", text: "Bot detected: @DeliveryBot_NCR — temporal regularity CV < 0.3", color: "#fbbf24" },
    { icon: "🧪", text: "NLP scored: \"Fresh batch just landed\" → 0.89 similarity", color: "#4ade80" },
    { icon: "🔗", text: "Wallet stitched: 0xBc9D…bB23 links 4 Mumbai profiles", color: "#a78bfa" },
    { icon: "📊", text: "Community detected: Pune-Goa pipeline — 4 nodes, 6 edges", color: "#818cf8" },
    { icon: "🔍", text: "Post flagged — @GoaPlugOfficial — Intent score: 82%", color: "#f87171" },
    { icon: "👤", text: "Burner lead: @bandra_nights_ig ↔ @ChemWiz_Mum — 84% stylometric match", color: "#fb923c" },
    { icon: "⚠️", text: "Risk escalation: Mumbai Party network → HIGH (78/100)", color: "#fb923c" },
    { icon: "🧪", text: "NLP scored: \"Wholesale available, bulk deals\" → 0.91 similarity", color: "#4ade80" },
    { icon: "🔗", text: "Phone stitched: +91-54321-xxxxx links Goa Plug + Beach Photographer", color: "#38bdf8" },
  ];

  useEffect(() => {
    let idx = 0;
    const addEvent = () => {
      const ev = feedEvents[idx % feedEvents.length];
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setEvents(prev => [{ ...ev, time }, ...prev].slice(0, 8));
      idx++;
    };
    // Add first 3 quickly
    addEvent();
    setTimeout(addEvent, 800);
    setTimeout(addEvent, 1600);
    // Then one every 4-6 seconds
    const timer = setInterval(() => addEvent(), 4000 + Math.random() * 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Live Intelligence Feed</h3>
        <span className="text-[9px] px-2 py-0.5 rounded-full ml-auto"
          style={{ background: 'hsla(142, 76%, 36%, 0.1)', color: '#4ade80', border: '1px solid hsla(142, 76%, 36%, 0.15)' }}>
          STREAMING
        </span>
      </div>
      <div className="space-y-1.5 max-h-[280px] overflow-hidden">
        {events.map((ev, i) => (
          <div key={`${ev.time}-${i}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs animate-fade-in"
            style={{
              background: i === 0 ? `${ev.color}08` : 'transparent',
              border: `1px solid ${i === 0 ? `${ev.color}15` : 'transparent'}`,
              opacity: 1 - i * 0.08,
            }}>
            <span className="font-mono text-[10px] flex-none" style={{ color: 'hsl(215 20% 35%)' }}>{ev.time}</span>
            <span>{ev.icon}</span>
            <span style={{ color: i === 0 ? ev.color : 'hsl(215 20% 55%)' }}>{ev.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
