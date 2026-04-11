import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BurnerLeads() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/burner-leads"] });
  const leads = data?.burner_leads ?? [];

  if (isLoading) return <div className="p-6 text-stone-500">Loading burner leads...</div>;

  if (!leads.length) {
    return (
      <div className="p-6">
        <Card className="border border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <p className="text-green-700 font-medium">✅ No probable burner accounts detected.</p>
            <p className="text-green-600 text-sm mt-1">All profiles have distinct stylometric fingerprints.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      <p className="text-sm text-stone-600 mb-4">
        <span className="font-bold text-stone-900">{leads.length}</span> probable burner match(es) detected via stylometric analysis
      </p>
      {leads.map((lead: any, i: number) => {
        const confColor = lead.confidence === "high" ? "border-l-red-400" : "border-l-amber-400";
        return (
          <Card key={i} className={`border border-stone-200 border-l-4 ${confColor}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="font-bold text-stone-900">{lead.profile_a}</span>
                  <span className="text-stone-400 mx-2">↔</span>
                  <span className="font-bold text-stone-900">{lead.profile_b}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-stone-900">
                    {(lead.stylometric_similarity * 100).toFixed(0)}% match
                  </span>
                  <Badge className={lead.confidence === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
                    {lead.confidence.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-stone-500">
                <span>Identity A: <span className="font-mono font-medium text-stone-700">{lead.identity_a}</span></span>
                <span>Identity B: <span className="font-mono font-medium text-stone-700">{lead.identity_b}</span></span>
              </div>
              <p className="text-sm text-stone-600 mt-2">{lead.note}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
