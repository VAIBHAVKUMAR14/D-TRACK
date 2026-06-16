import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Shield, Search, Network, Brain, AlertTriangle, ArrowRight,
  Fingerprint, Wallet, Globe, Zap, Eye, Lock, ChevronDown
} from "lucide-react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}{suffix}</>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const pipelineSteps = [
    { icon: Search, label: "Ingest", desc: "Public OSINT data from social platforms", color: "#60a5fa" },
    { icon: Brain, label: "NLP Analysis", desc: "BERT-based semantic intent scoring", color: "#a78bfa" },
    { icon: Fingerprint, label: "Identity Resolution", desc: "Cross-platform persona stitching", color: "#f472b6" },
    { icon: Network, label: "Shadow Graph", desc: "Network topology & community detection", color: "#818cf8" },
    { icon: AlertTriangle, label: "Risk Scoring", desc: "Composite threat assessment", color: "#f87171" },
  ];

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: 'hsl(222 47% 3%)' }}>

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(262 83% 58%) 1px, transparent 1px), linear-gradient(90deg, hsl(262 83% 58%) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsla(262, 83%, 58%, 0.3), transparent 70%)' }} />

        <div className={`relative z-10 text-center max-w-4xl transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-medium"
            style={{ background: 'hsla(262,83%,58%,0.1)', color: '#a78bfa', border: '1px solid hsla(262,83%,58%,0.2)' }}>
            <Shield className="w-3.5 h-3.5" />
            Cross-Platform OSINT Intelligence
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight"
            style={{
              background: 'linear-gradient(135deg, hsl(210 40% 95%), hsl(262 83% 75%), hsl(210 40% 95%))',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}>
            D-TRACK
          </h1>

          <p className="text-lg md:text-xl mb-4 leading-relaxed max-w-2xl mx-auto" style={{ color: 'hsl(215 20% 65%)' }}>
            De-anonymize drug trafficking networks by linking <span style={{ color: '#a78bfa' }}>fragmented social personas</span> through{' '}
            <span style={{ color: '#fbbf24' }}>crypto wallet fingerprints</span>.
          </p>
          <p className="text-sm mb-10 max-w-xl mx-auto" style={{ color: 'hsl(215 20% 45%)' }}>
            Traffickers must advertise publicly to find customers. That's their vulnerability. D-TRACK exploits it.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => navigate("/dashboard")}
              className="group px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105 flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, hsl(262 83% 55%), hsl(245 58% 55%))',
                color: 'white',
                boxShadow: '0 8px 32px hsla(262, 83%, 58%, 0.3)',
              }}>
              Enter Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/investigate")}
              className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{
                background: 'transparent',
                color: 'hsl(215 20% 65%)',
                border: '1px solid hsl(217 33% 17%)',
              }}>
              Try Live Investigation
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
            {[
              { value: 38, suffix: "+", label: "Profiles Tracked" },
              { value: 46, suffix: "", label: "Graph Nodes" },
              { value: 91, suffix: "", label: "Flagged Posts" },
              { value: 20, suffix: "", label: "Identities Resolved" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl md:text-3xl font-black" style={{ color: '#a78bfa' }}>
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'hsl(215 20% 40%)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6" style={{ color: 'hsl(215 20% 30%)' }} />
        </div>
      </section>

      {/* ── Problem Statement ────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'hsl(210 40% 90%)' }}>
            The Intelligence Gap
          </h2>
          <p className="text-center text-sm mb-12 max-w-2xl mx-auto" style={{ color: 'hsl(215 20% 50%)' }}>
            Modern drug trafficking operates across fragmented digital platforms. Current tools fail at three critical junctions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Globe, title: "The Silo Problem",
                desc: "A trafficker uses Instagram for marketing, Telegram for dealing, and crypto for payments. Current tools analyze each platform in isolation — they never connect the dots.",
                color: "#60a5fa", gradient: "hsla(217, 91%, 60%, 0.06)",
              },
              {
                icon: Eye, title: "The Language Problem",
                desc: "\"❄️ Fresh batch landed, 2500/g DM\" — no keyword match catches this. Traffickers use emojis, slang, and coded language that evade traditional detection.",
                color: "#fb923c", gradient: "hsla(30, 80%, 55%, 0.06)",
              },
              {
                icon: Lock, title: "The Scale Problem",
                desc: "Manual OSINT investigation takes weeks per case. A cybercrime unit scrolling through social media profiles cannot scale to the thousands of active traffickers.",
                color: "#f87171", gradient: "hsla(0, 80%, 55%, 0.06)",
              },
            ].map(card => (
              <div key={card.title} className="p-6 rounded-2xl transition-all hover:scale-[1.02]"
                style={{
                  background: card.gradient,
                  border: `1px solid ${card.color}15`,
                }}>
                <card.icon className="w-8 h-8 mb-4" style={{ color: card.color }} />
                <h3 className="text-sm font-bold mb-2" style={{ color: card.color }}>{card.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'hsl(215 20% 55%)' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline Flow ────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: 'hsl(222 47% 4%)' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ color: 'hsl(210 40% 90%)' }}>
            How D-TRACK Works
          </h2>
          <p className="text-center text-sm mb-12 max-w-2xl mx-auto" style={{ color: 'hsl(215 20% 50%)' }}>
            A 7-stage autonomous pipeline — from raw OSINT data to actionable intelligence in seconds.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-3">
            {pipelineSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex-1 md:flex-none p-4 rounded-xl text-center min-w-[140px]"
                  style={{
                    background: `${step.color}08`,
                    border: `1px solid ${step.color}20`,
                  }}>
                  <step.icon className="w-6 h-6 mx-auto mb-2" style={{ color: step.color }} />
                  <p className="text-xs font-bold mb-1" style={{ color: step.color }}>{step.label}</p>
                  <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>{step.desc}</p>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 hidden md:block flex-none" style={{ color: 'hsl(215 20% 25%)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Capabilities ─────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: 'hsl(210 40% 90%)' }}>
            Core Capabilities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: Brain, title: "Semantic NLP Engine",
                desc: "Distilled BERT model (MiniLM-L6-v2) converts posts into 384-dimensional vector embeddings. Detects drug intent through slang, emojis, and coded language — not keywords.",
                color: "#a78bfa",
              },
              {
                icon: Wallet, title: "Crypto Wallet Fingerprinting",
                desc: "Extracts wallet addresses from unstructured text. Links accounts that share the same financial fingerprint — the one identifier traffickers rarely change.",
                color: "#fbbf24",
              },
              {
                icon: Fingerprint, title: "Identity Resolution",
                desc: "Union-Find algorithm stitches fragmented personas across Instagram, Telegram, and Twitter into unified identities using wallets, phone numbers, and @mentions.",
                color: "#f472b6",
              },
              {
                icon: Network, title: "Shadow Graph Analytics",
                desc: "NetworkX-powered graph with Louvain community detection, PageRank centrality, and betweenness scoring to identify hub operators, brokers, and runners.",
                color: "#818cf8",
              },
              {
                icon: Zap, title: "Bot & Burner Detection",
                desc: "3-signal bot classifier (temporal regularity, content repetition, metadata anomalies) + stylometric fingerprinting to detect accounts operated by the same human.",
                color: "#4ade80",
              },
              {
                icon: Shield, title: "Dual-Corroboration Safeguard",
                desc: "No profile escalated to Critical on language alone. Requires NLP intent >80% AND a structural signal (shared wallet, network edge) to prevent false positives.",
                color: "#f87171",
              },
            ].map(cap => (
              <div key={cap.title} className="p-5 rounded-xl flex gap-4 transition-all hover:scale-[1.01]"
                style={{
                  background: `${cap.color}05`,
                  border: `1px solid ${cap.color}12`,
                }}>
                <cap.icon className="w-8 h-8 flex-none mt-1" style={{ color: cap.color }} />
                <div>
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: cap.color }}>{cap.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'hsl(215 20% 55%)' }}>{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: 'hsl(222 47% 4%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8" style={{ color: 'hsl(210 40% 90%)' }}>
            Built With
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "Python 3.11", "FastAPI", "React 18", "TypeScript", "NetworkX",
              "Sentence-Transformers (BERT)", "PyVis", "TailwindCSS", "shadcn/ui", "TanStack Query",
            ].map(tech => (
              <span key={tech} className="px-4 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: 'hsla(262, 83%, 58%, 0.06)',
                  color: '#a78bfa',
                  border: '1px solid hsla(262, 83%, 58%, 0.12)',
                }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'hsl(210 40% 90%)' }}>
            Ready to Investigate?
          </h2>
          <p className="text-sm mb-8" style={{ color: 'hsl(215 20% 50%)' }}>
            Enter the D-TRACK dashboard and explore the full intelligence pipeline.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="group px-10 py-4 rounded-xl font-bold text-sm transition-all hover:scale-105 inline-flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, hsl(262 83% 55%), hsl(245 58% 55%))',
              color: 'white',
              boxShadow: '0 8px 32px hsla(262, 83%, 58%, 0.3)',
            }}>
            Launch Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Gradient shift animation */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
