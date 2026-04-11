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
              <Card key={card.label} className="border border-stone-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{card.label}</p>
                    <div className={`p-2 rounded-full bg-opacity-10 bg-stone-100 ${card.color}`}>
                      <Icon className={`h-5 w-5`} />
                    </div>
                  </div>
                  <p className="text-4xl font-extrabold text-stone-900 tracking-tight">
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
          <Card className="border border-stone-200 bg-gradient-to-br from-white to-stone-50 shadow-sm rounded-xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Detection Rate</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold text-stone-900">
                {stats.total_posts > 0 ? ((stats.flagged_posts / stats.total_posts) * 100).toFixed(1) : 0}%
              </p>
              <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 mb-1">
                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${stats.total_posts > 0 ? ((stats.flagged_posts / stats.total_posts) * 100) : 0}%` }}></div>
              </div>
              <p className="text-xs text-stone-500 font-medium">{stats.flagged_posts} of {stats.total_posts} posts flagged</p>
            </CardContent>
          </Card>
          <Card className="border border-stone-200 bg-gradient-to-br from-white to-stone-50 shadow-sm rounded-xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Identity Compression</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold text-stone-900">
                {stats.total_profiles > 0 ? ((1 - stats.unified_identities / stats.total_profiles) * 100).toFixed(0) : 0}%
              </p>
              <div className="w-full bg-stone-200 rounded-full h-1.5 mt-2 mb-1">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${stats.total_profiles > 0 ? ((1 - stats.unified_identities / stats.total_profiles) * 100) : 0}%` }}></div>
              </div>
              <p className="text-xs text-stone-500 font-medium">{stats.total_profiles} profiles → {stats.unified_identities} identities</p>
            </CardContent>
          </Card>
          <Card className="border border-stone-200 bg-gradient-to-br from-white to-stone-50 shadow-sm rounded-xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Organized Networks</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold text-stone-900">{stats.organized_networks}</p>
              <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 mb-1"></div>
              <p className="text-xs text-stone-500 font-medium mt-1">Networks with 3+ linked profiles</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
