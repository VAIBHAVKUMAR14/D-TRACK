import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield, FlaskConical, Link, Bot, UserX, AlertTriangle,
  Network, MessageSquare, Sparkles, ArrowRight, CheckCircle2,
} from "lucide-react";

export default function Pipeline() {
  const { data: info, isLoading } = useQuery({ queryKey: ["/api/pipeline-info"] });

  if (isLoading) return <div className="p-6 text-stone-500">Loading pipeline info...</div>;
  if (!info) return <div className="p-6 text-stone-500">Pipeline not ready. Run the pipeline first.</div>;

  const sections = [
    {
      key: "identity_resolution",
      icon: Link,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      data: info.identity_resolution,
      hero: true,
      heroStats: [
        { label: "Profiles Ingested", value: info.identity_resolution?.total_profiles },
        { label: "Unified Identities", value: info.identity_resolution?.unified_identities },
        { label: "Compression", value: `${info.identity_resolution?.compression_pct}%` },
        { label: "Wallet-Linked", value: info.identity_resolution?.multi_profile_wallets },
      ],
    },
    {
      key: "data_sanitization",
      icon: Shield,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      data: info.data_sanitization,
    },
    {
      key: "nlp_engine",
      icon: FlaskConical,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      data: info.nlp_engine,
    },
    {
      key: "bot_detection",
      icon: Bot,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      data: info.bot_detection,
    },
    {
      key: "burner_detection",
      icon: UserX,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      data: info.burner_detection,
    },
    {
      key: "false_positive_safeguards",
      icon: AlertTriangle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      data: info.false_positive_safeguards,
    },
    {
      key: "graph_engine",
      icon: Network,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      data: info.graph_engine,
    },
    {
      key: "chat_ingestion",
      icon: MessageSquare,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-200",
      data: info.chat_ingestion,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Hero: Pipeline Flow Diagram */}
      <Card className="border border-stone-200 bg-gradient-to-r from-stone-50 to-white">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            D-TRACK Analysis Pipeline — 7-Stage Architecture
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {[
              { label: "1. Ingest", color: "bg-blue-100 text-blue-800" },
              { label: "2. Clean", color: "bg-sky-100 text-sky-800" },
              { label: "3. NLP Score", color: "bg-green-100 text-green-800" },
              { label: "4. Stitch IDs", color: "bg-purple-100 text-purple-800" },
              { label: "5. Build Graph", color: "bg-indigo-100 text-indigo-800" },
              { label: "6. Risk Score", color: "bg-orange-100 text-orange-800" },
              { label: "7. Detect Burners", color: "bg-red-100 text-red-800" },
            ].map((step, i) => (
              <span key={i} className="flex items-center gap-1">
                <Badge className={`${step.color} px-3 py-1`}>{step.label}</Badge>
                {i < 6 && <ArrowRight className="h-3 w-3 text-stone-400" />}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hero Stats: Identity Compression */}
      {info.identity_resolution && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Profiles Ingested", value: info.identity_resolution.total_profiles, icon: "👤" },
            { label: "Unified Identities", value: info.identity_resolution.unified_identities, icon: "🔗" },
            { label: "Identity Compression", value: `${info.identity_resolution.compression_pct}%`, icon: "📊", highlight: true },
            { label: "Detection Rate", value: `${info.nlp_engine?.detection_rate_pct}%`, icon: "🎯" },
          ].map((stat) => (
            <Card key={stat.label} className={`border ${stat.highlight ? "border-purple-300 bg-purple-50" : "border-stone-200"}`}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl mb-1">{stat.icon}</p>
                <p className={`text-2xl font-black ${stat.highlight ? "text-purple-700" : "text-stone-900"}`}>{stat.value}</p>
                <p className="text-xs text-stone-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Sections */}
      <Accordion type="multiple" defaultValue={["identity_resolution", "data_sanitization", "nlp_engine"]} className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const d = section.data;
          if (!d) return null;

          return (
            <AccordionItem key={section.key} value={section.key} className={`border ${section.border} rounded-lg overflow-hidden`}>
              <AccordionTrigger className={`px-4 py-3 ${section.bg} hover:no-underline`}>
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${section.color}`} />
                  <span className="font-bold text-stone-900 text-sm">{d.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-4 space-y-4 bg-white">
                {/* Data Sanitization */}
                {section.key === "data_sanitization" && d.stages && (
                  <div className="space-y-3">
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">6-Stage Cleaning Pipeline</p>
                    {d.stages.map((stage: any, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="flex-none w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-stone-800">{stage.name}</p>
                          <p className="text-xs text-stone-600">{stage.description}</p>
                          <code className="text-xs bg-stone-100 rounded px-2 py-0.5 mt-1 inline-block text-stone-700 font-mono">{stage.example}</code>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500 font-semibold mb-1">Hard Limits</p>
                      <div className="flex gap-4 text-xs text-stone-600">
                        <span>Text: {d.hard_limits.max_text_length} chars</span>
                        <span>Bio: {d.hard_limits.max_bio_length} chars</span>
                        <span>Username: {d.hard_limits.max_username_length} chars</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* NLP Engine */}
                {section.key === "nlp_engine" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-stone-50 rounded-lg">
                        <p className="text-xs text-stone-500 mb-1">Model</p>
                        <p className="text-sm font-mono font-semibold text-stone-800">{d.model}</p>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-lg">
                        <p className="text-xs text-stone-500 mb-1">Embedding</p>
                        <p className="text-sm font-semibold text-stone-800">{d.model_type}</p>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-lg">
                        <p className="text-xs text-stone-500 mb-1">Method</p>
                        <p className="text-sm font-semibold text-stone-800">{d.method}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-2">Score Boosts</p>
                      {d.boosts?.map((boost: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0 text-sm">
                          <div>
                            <span className="font-medium text-stone-800">{boost.name}</span>
                            <span className="text-stone-500 ml-2 text-xs">{boost.condition}</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">{boost.value}</Badge>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-stone-600">Posts analyzed: <b className="text-stone-900">{d.total_posts_analyzed}</b></span>
                      <span className="text-stone-600">Flagged: <b className="text-red-700">{d.flagged_posts}</b></span>
                      <span className="text-stone-600">Detection rate: <b className="text-green-700">{d.detection_rate_pct}%</b></span>
                    </div>
                  </div>
                )}

                {/* Identity Resolution */}
                {section.key === "identity_resolution" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="text-center">
                        <p className="text-3xl font-black text-purple-700">{d.total_profiles}</p>
                        <p className="text-xs text-purple-600">Profiles</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-purple-400" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-purple-700">{d.unified_identities}</p>
                        <p className="text-xs text-purple-600">Identities</p>
                      </div>
                      <div className="ml-auto text-center">
                        <p className="text-3xl font-black text-purple-700">{d.compression_pct}%</p>
                        <p className="text-xs text-purple-600">Compression</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-2">Stitching Primary Keys</p>
                      {d.primary_keys?.map((pk: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
                          <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-none" />
                          <div>
                            <p className="text-sm font-semibold text-stone-800">{pk.name}</p>
                            <p className="text-xs text-stone-600">{pk.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-stone-500">
                      Algorithm: <span className="font-mono font-medium text-stone-700">{d.algorithm}</span> · 
                      ID method: <span className="font-mono font-medium text-stone-700">{d.identity_id_method}</span>
                    </div>
                    {d.platform_breakdown && (
                      <div className="flex gap-3">
                        {Object.entries(d.platform_breakdown).map(([platform, count]) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform === "instagram" ? "📸" : platform === "telegram" ? "✈️" : "🐦"} {platform}: {String(count)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bot Detection */}
                {section.key === "bot_detection" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 mb-3">
                      <Badge className="bg-amber-100 text-amber-800 text-lg px-4 py-1">
                        {d.total_bots_detected} bots detected
                      </Badge>
                      <span className="text-xs text-stone-500">{d.bot_risk_discount}</span>
                    </div>
                    {d.signals?.map((signal: any, i: number) => (
                      <div key={i} className="p-3 bg-stone-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-stone-800">{signal.name}</p>
                          <Badge variant="outline" className="text-xs">{signal.threshold}</Badge>
                        </div>
                        <p className="text-xs text-stone-600 mt-1">Metric: {signal.metric}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Burner Detection */}
                {section.key === "burner_detection" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 mb-3">
                      <Badge className="bg-red-100 text-red-800 px-4 py-1">
                        {d.total_leads} leads detected
                      </Badge>
                      <Badge className="bg-green-100 text-green-800 px-4 py-1">
                        ⚠️ Analyst Leads Only — Never Auto-Merged
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-2">6 Stylometric Dimensions</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {d.features?.map((feature: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-stone-50 rounded-lg">
                          <span className="text-sm font-bold text-red-500 mt-0.5">{i + 1}</span>
                          <div>
                            <p className="text-sm font-semibold text-stone-800">{feature.name}</p>
                            <p className="text-xs text-stone-600">{feature.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-stone-500 mt-2">
                      Threshold: <span className="font-mono font-medium">{d.similarity_threshold}</span> · 
                      High confidence: {d.confidence_levels?.high} · 
                      Medium: {d.confidence_levels?.medium}
                    </div>
                  </div>
                )}

                {/* False Positive Safeguards */}
                {section.key === "false_positive_safeguards" && d.safeguards && (
                  <div className="space-y-2">
                    {d.safeguards.map((sg: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <Shield className="h-4 w-4 text-emerald-600 mt-0.5 flex-none" />
                        <div>
                          <p className="text-sm font-semibold text-stone-800">{sg.name}</p>
                          <p className="text-xs text-stone-600">{sg.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Graph Engine */}
                {section.key === "graph_engine" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500">Graph Library</p>
                      <p className="text-sm font-semibold">{d.graph_library}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500">Nodes</p>
                      <p className="text-sm font-semibold">{d.total_nodes}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500">Edges</p>
                      <p className="text-sm font-semibold">{d.total_edges}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500">Risk Formula</p>
                      <p className="text-sm font-semibold">{d.risk_formula}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500">Community Detection</p>
                      <p className="text-sm font-semibold">{d.community_detection}</p>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-lg">
                      <p className="text-xs text-stone-500">Centrality Metrics</p>
                      <p className="text-sm font-semibold">{d.centrality_metrics?.join(", ")}</p>
                    </div>
                  </div>
                )}

                {/* Chat Ingestion */}
                {section.key === "chat_ingestion" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {d.supported_formats?.map((fmt: any, i: number) => (
                        <div key={i} className="p-3 bg-stone-50 rounded-lg">
                          <p className="text-sm font-semibold text-stone-800">{fmt.name}</p>
                          <p className="text-xs text-stone-500">{fmt.parser}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-2">Entity Extraction</p>
                      <div className="flex flex-wrap gap-2">
                        {d.entity_extraction?.map((entity: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{entity}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 italic">{d.status}</p>
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
