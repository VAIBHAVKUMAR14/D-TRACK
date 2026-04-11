import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, AlertTriangle, Link, Wallet, Target, 
  Network, UserX, Zap, CheckCircle, XCircle, Loader2
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: health } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 5000, // poll every 5s
  });

  const ingest = useMutation({
    mutationFn: api.ingest,
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const statCards = stats ? [
    { label: "Profiles Tracked",   value: stats.total_profiles,      icon: Users,         color: "text-blue-600" },
    { label: "Flagged Posts",       value: stats.flagged_posts,        icon: AlertTriangle, color: "text-red-600" },
    { label: "Unified Identities", value: stats.unified_identities,   icon: Link,          color: "text-purple-600" },
    { label: "Wallets Tracked",    value: stats.wallets_tracked,      icon: Wallet,        color: "text-yellow-600" },
    { label: "High Risk Targets",  value: stats.high_risk_count,      icon: Target,        color: "text-orange-600" },
    { label: "Communities",        value: stats.total_communities,    icon: Network,       color: "text-indigo-600" },
    { label: "Burner Leads",       value: stats.burner_leads_count,   icon: UserX,         color: "text-amber-600" },
    { label: "Avg Risk Score",     value: stats.avg_risk_score,       icon: Zap,           color: "text-stone-600" },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      {/* Pipeline status + run button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {health?.loaded ? (
            <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm text-stone-600">Pipeline ready</span></>
          ) : health?.error ? (
            <><XCircle className="h-4 w-4 text-red-500" /><span className="text-sm text-red-600">{health.error}</span></>
          ) : (
            <><Loader2 className="h-4 w-4 animate-spin text-stone-400" /><span className="text-sm text-stone-500">Loading...</span></>
          )}
        </div>
        <Button
          onClick={() => ingest.mutate()}
          disabled={ingest.isPending}
          className="bg-stone-800 hover:bg-stone-700 text-white"
        >
          {ingest.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</> : <><Zap className="h-4 w-4 mr-2" />Run Pipeline</>}
        </Button>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24 p-6 bg-stone-100 rounded-lg" /></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border border-stone-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{card.label}</p>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                  <p className="text-3xl font-bold text-stone-900">
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick stats row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border border-stone-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-stone-600">Detection Rate</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">
                {stats.total_posts > 0 ? ((stats.flagged_posts / stats.total_posts) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-stone-500 mt-1">{stats.flagged_posts} of {stats.total_posts} posts flagged</p>
            </CardContent>
          </Card>
          <Card className="border border-stone-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-stone-600">Identity Compression</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">
                {stats.total_profiles > 0 ? ((1 - stats.unified_identities / stats.total_profiles) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-stone-500 mt-1">{stats.total_profiles} profiles → {stats.unified_identities} identities</p>
            </CardContent>
          </Card>
          <Card className="border border-stone-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-stone-600">Organized Networks</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-stone-900">{stats.organized_networks}</p>
              <p className="text-xs text-stone-500 mt-1">Networks with 3+ linked profiles</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
