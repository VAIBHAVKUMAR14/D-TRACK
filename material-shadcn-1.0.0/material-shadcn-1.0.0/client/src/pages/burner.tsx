import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function BurnerLeads() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/burner-leads"] });
  const { data: pipelineInfo } = useQuery({ queryKey: ["/api/pipeline-info"] });
  const leads = data?.burner_leads ?? [];
  const features = pipelineInfo?.burner_detection?.features ?? [];

  if (isLoading) return <div className="p-6" style={{ color: 'hsl(215 20% 50%)' }}>Loading burner leads...</div>;

  return (
    <div className="p-5 lg:p-6 space-y-5">
      {/* Stylometric Features Explainer */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>6-Dimension Stylometric Fingerprinting</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {features.map((f: any, i: number) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg"
              style={{ background: 'hsl(222 47% 5%)', border: '1px solid hsl(217 33% 13%)' }}>
              <span className="text-xs font-bold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-none"
                style={{ background: 'hsla(262, 83%, 65%, 0.15)', color: 'hsl(262 83% 75%)' }}>
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{f.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>{f.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-[11px]" style={{ color: 'hsl(215 20% 45%)' }}>
          <span>Threshold: <b className="font-mono text-purple-400">0.80</b></span>
          <span>High: <b className="text-red-400">5-6/6 match</b></span>
          <span>Medium: <b className="text-amber-400">3-4/6 match</b></span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> Analyst leads only — never auto-merged</span>
        </div>
      </div>

      {/* Leads */}
      {!leads.length ? (
        <div className="glass-card p-6 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
          <p className="font-medium" style={{ color: 'hsl(142, 76%, 60%)' }}>No probable burner accounts detected.</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(215 20% 45%)' }}>All profiles have distinct stylometric fingerprints.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>
            <span className="font-bold" style={{ color: 'hsl(210 40% 90%)' }}>{leads.length}</span> probable burner match(es) detected
          </p>
          {leads.map((lead: any, i: number) => {
            const isHigh = lead.confidence === "high";
            const borderColor = isHigh ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)';
            const accentColor = isHigh ? '#f87171' : '#fbbf24';
            const matchPct = Math.round(lead.stylometric_similarity * 100);

            return (
              <div key={i} className="glass-card p-5 transition-all hover:scale-[1.01]"
                style={{ borderLeft: `3px solid ${accentColor}` }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="w-5 h-5 flex-none" style={{ color: accentColor }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{lead.profile_a}</span>
                        <span className="text-lg" style={{ color: accentColor }}>↔</span>
                        <span className="font-mono text-sm font-semibold" style={{ color: 'hsl(210 40% 85%)' }}>{lead.profile_b}</span>
                      </div>
                      <div className="flex gap-3 mt-1 text-[11px]" style={{ color: 'hsl(215 20% 45%)' }}>
                        <span>Identity A: <span className="font-mono" style={{ color: 'hsl(262 83% 70%)' }}>{lead.identity_a}</span></span>
                        <span>Identity B: <span className="font-mono" style={{ color: 'hsl(262 83% 70%)' }}>{lead.identity_b}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Score visualization */}
                    <div className="text-right">
                      <p className="text-2xl font-black" style={{ color: accentColor }}>{matchPct}%</p>
                      <p className="text-[10px]" style={{ color: 'hsl(215 20% 40%)' }}>match</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                      style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
                      {lead.confidence}
                    </span>
                  </div>
                </div>
                <p className="text-xs mt-3 pl-8" style={{ color: 'hsl(215 20% 50%)' }}>{lead.note}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
