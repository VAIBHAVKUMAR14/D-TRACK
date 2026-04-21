import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield, FlaskConical, Link, Bot, UserX, AlertTriangle,
  Network, MessageSquare, Sparkles, ArrowRight, CheckCircle2,
} from "lucide-react";

export default function Pipeline() {
  const { data: info, isLoading } = useQuery({ queryKey: ["/api/pipeline-info"] });

  if (isLoading) return <div className="p-6" style={{ color: 'hsl(215 20% 50%)' }}>Loading pipeline info...</div>;
  if (!info) return <div className="p-6" style={{ color: 'hsl(215 20% 50%)' }}>Pipeline not ready.</div>;

  const sections = [
    { key: "identity_resolution", icon: Link, color: "#a78bfa", data: info.identity_resolution },
    { key: "data_sanitization", icon: Shield, color: "#38bdf8", data: info.data_sanitization },
    { key: "nlp_engine", icon: FlaskConical, color: "#4ade80", data: info.nlp_engine },
    { key: "bot_detection", icon: Bot, color: "#fbbf24", data: info.bot_detection },
    { key: "burner_detection", icon: UserX, color: "#f87171", data: info.burner_detection },
    { key: "false_positive_safeguards", icon: AlertTriangle, color: "#34d399", data: info.false_positive_safeguards },
    { key: "graph_engine", icon: Network, color: "#818cf8", data: info.graph_engine },
    { key: "chat_ingestion", icon: MessageSquare, color: "#38bdf8", data: info.chat_ingestion },
  ];

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Pipeline Flow */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'hsl(210 40% 85%)' }}>
          <Sparkles className="h-4 w-4 text-purple-400" />
          7-Stage Analysis Pipeline
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {[
            { label: "1. Ingest", color: "#60a5fa" },
            { label: "2. Clean", color: "#38bdf8" },
            { label: "3. NLP Score", color: "#4ade80" },
            { label: "4. Stitch IDs", color: "#a78bfa" },
            { label: "5. Build Graph", color: "#818cf8" },
            { label: "6. Risk Score", color: "#fb923c" },
            { label: "7. Detect Burners", color: "#f87171" },
          ].map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: `${step.color}12`, color: step.color, border: `1px solid ${step.color}25` }}>
                {step.label}
              </span>
              {i < 6 && <ArrowRight className="h-3 w-3" style={{ color: 'hsl(215 20% 25%)' }} />}
            </span>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      {info.identity_resolution && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
          {[
            { label: "Profiles Ingested", value: info.identity_resolution.total_profiles, icon: "👤", color: "#60a5fa" },
            { label: "Unified Identities", value: info.identity_resolution.unified_identities, icon: "🔗", color: "#a78bfa" },
            { label: "Identity Compression", value: `${info.identity_resolution.compression_pct}%`, icon: "📊", color: "#c084fc", highlight: true },
            { label: "Detection Rate", value: `${info.nlp_engine?.detection_rate_pct}%`, icon: "🎯", color: "#4ade80" },
          ].map(stat => (
            <div key={stat.label} className={`glass-card p-4 text-center ${stat.highlight ? '' : ''}`}
              style={stat.highlight ? { border: '1px solid hsla(262, 83%, 65%, 0.2)', background: 'linear-gradient(135deg, hsla(262, 83%, 65%, 0.06), transparent)' } : undefined}>
              <p className="text-xl mb-1">{stat.icon}</p>
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'hsl(215 20% 42%)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      <Accordion type="multiple" defaultValue={["identity_resolution", "data_sanitization", "nlp_engine"]} className="space-y-2">
        {sections.map(section => {
          const Icon = section.icon;
          const d = section.data;
          if (!d) return null;

          return (
            <AccordionItem key={section.key} value={section.key}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${section.color}15`, background: `${section.color}03` }}>
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" style={{ color: section.color }} />
                  <span className="font-bold text-sm" style={{ color: 'hsl(210 40% 85%)' }}>{d.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 space-y-3">

                {/* Data Sanitization */}
                {section.key === "data_sanitization" && d.stages && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(215 20% 42%)' }}>6-Stage Cleaning Pipeline</p>
                    {d.stages.map((stage: any, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-none mt-0.5"
                          style={{ background: 'hsla(200, 80%, 50%, 0.1)', color: '#38bdf8', border: '1px solid hsla(200, 80%, 50%, 0.2)' }}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{stage.name}</p>
                          <p className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>{stage.description}</p>
                          <code className="text-[11px] px-2 py-0.5 rounded mt-1 inline-block font-mono"
                            style={{ background: 'hsl(222 47% 5%)', color: 'hsl(215 20% 60%)', border: '1px solid hsl(217 33% 13%)' }}>
                            {stage.example}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* NLP Engine */}
                {section.key === "nlp_engine" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { label: "Model", value: d.model },
                        { label: "Embedding", value: d.model_type },
                        { label: "Method", value: d.method },
                      ].map(item => (
                        <div key={item.label} className="p-3 rounded-lg"
                          style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 40%)' }}>{item.label}</p>
                          <p className="text-xs font-mono mt-1 font-semibold" style={{ color: '#4ade80' }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {d.boosts?.map((boost: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-2 text-sm"
                        style={{ borderBottom: '1px solid hsl(217 33% 10%)' }}>
                        <div>
                          <span className="font-medium" style={{ color: 'hsl(210 40% 80%)' }}>{boost.name}</span>
                          <span className="text-xs ml-2" style={{ color: 'hsl(215 20% 45%)' }}>{boost.condition}</span>
                        </div>
                        <span className="font-mono text-xs px-2 py-0.5 rounded"
                          style={{ background: 'hsla(142, 76%, 36%, 0.1)', color: '#4ade80' }}>{boost.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Identity Resolution */}
                {section.key === "identity_resolution" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ background: 'hsla(262, 83%, 65%, 0.04)', border: '1px solid hsla(262, 83%, 65%, 0.12)' }}>
                      <div className="text-center">
                        <p className="text-3xl font-black" style={{ color: '#a78bfa' }}>{d.total_profiles}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>Profiles</p>
                      </div>
                      <ArrowRight className="h-6 w-6" style={{ color: 'hsl(262 83% 45%)' }} />
                      <div className="text-center">
                        <p className="text-3xl font-black" style={{ color: '#a78bfa' }}>{d.unified_identities}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>Identities</p>
                      </div>
                      <div className="ml-auto text-center">
                        <p className="text-3xl font-black" style={{ color: '#c084fc' }}>{d.compression_pct}%</p>
                        <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>Compression</p>
                      </div>
                    </div>
                    {d.primary_keys?.map((pk: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid hsl(217 33% 10%)' }}>
                        <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 flex-none" />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{pk.name}</p>
                          <p className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>{pk.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bot Detection */}
                {section.key === "bot_detection" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold px-3 py-1 rounded-lg"
                        style={{ background: 'hsla(45, 93%, 47%, 0.1)', color: '#fbbf24', border: '1px solid hsla(45, 93%, 47%, 0.2)' }}>
                        {d.total_bots_detected} bots detected
                      </span>
                      <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>{d.bot_risk_discount}</span>
                    </div>
                    {d.signals?.map((signal: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg" style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{signal.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono"
                            style={{ background: 'hsla(45, 93%, 47%, 0.08)', color: '#fbbf24' }}>{signal.threshold}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'hsl(215 20% 50%)' }}>{signal.metric}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Burner Detection */}
                {section.key === "burner_detection" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold px-3 py-1 rounded-lg"
                        style={{ background: 'hsla(0, 80%, 50%, 0.1)', color: '#f87171', border: '1px solid hsla(0, 80%, 50%, 0.2)' }}>
                        {d.total_leads} leads
                      </span>
                      <span className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'hsla(142, 76%, 36%, 0.08)', color: '#34d399', border: '1px solid hsla(142, 76%, 36%, 0.15)' }}>
                        ⚠️ Analyst Leads Only
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {d.features?.map((f: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
                          style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                          <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-none"
                            style={{ background: 'hsla(0, 80%, 50%, 0.1)', color: '#f87171' }}>{i + 1}</span>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{f.name}</p>
                            <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>{f.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safeguards */}
                {section.key === "false_positive_safeguards" && d.safeguards && (
                  <div className="space-y-2">
                    {d.safeguards.map((sg: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ background: 'hsla(142, 76%, 36%, 0.04)', border: '1px solid hsla(142, 76%, 36%, 0.1)' }}>
                        <Shield className="h-4 w-4 text-emerald-400 mt-0.5 flex-none" />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{sg.name}</p>
                          <p className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>{sg.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Graph Engine */}
                {section.key === "graph_engine" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { label: "Library", value: d.graph_library },
                      { label: "Nodes", value: d.total_nodes },
                      { label: "Edges", value: d.total_edges },
                      { label: "Risk Formula", value: d.risk_formula },
                      { label: "Community Detection", value: d.community_detection },
                      { label: "Centrality", value: d.centrality_metrics?.join(", ") },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-lg"
                        style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 40%)' }}>{item.label}</p>
                        <p className="text-xs font-semibold mt-1" style={{ color: '#818cf8' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat Ingestion */}
                {section.key === "chat_ingestion" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {d.supported_formats?.map((fmt: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg"
                          style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{fmt.name}</p>
                          <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>{fmt.parser}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.entity_extraction?.map((entity: string, i: number) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'hsla(200, 80%, 50%, 0.08)', color: '#38bdf8', border: '1px solid hsla(200, 80%, 50%, 0.15)' }}>
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
