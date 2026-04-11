import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { api, Identity, Profile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, RiskScoreBar } from "@/components/dtrack/risk-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, Bot, Clock, Network, Shield, User } from "lucide-react";

export default function IdentityDive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get("id");
  const [selectedId, setSelectedId] = useState<string>(preselectedId || "");

  const { data: idData, isLoading: listLoading } = useQuery({
    queryKey: ["/api/identities"],
  });

  const identities = idData?.identities ?? [];

  // Auto-select first identity or preselected
  useEffect(() => {
    if (!selectedId && identities.length > 0) {
      setSelectedId(preselectedId || identities[0].identity_id);
    }
  }, [identities, preselectedId]);

  const { data: identity, isLoading: detailLoading } = useQuery({
    queryKey: [`/api/identity/${selectedId}`],
    enabled: !!selectedId,
  });

  if (listLoading) return <div className="p-6 text-stone-500">Loading identities...</div>;
  if (!identities.length) return <div className="p-6 text-stone-500">No identities resolved yet. Run the pipeline first.</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Selector */}
      <Select value={selectedId} onValueChange={(val) => { setSelectedId(val); setSearchParams({ id: val }); }}>
        <SelectTrigger className="w-full max-w-lg">
          <SelectValue placeholder="Select an identity..." />
        </SelectTrigger>
        <SelectContent>
          {identities.map((id: any) => (
            <SelectItem key={id.identity_id} value={id.identity_id}>
              {id.identity_id} — {(id.profiles_summary || id.all_usernames || []).slice(0,3).map((p: any) => p.username || p).join(", ")} [{id.risk_score?.toFixed(0)}/100]
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {detailLoading && <div className="text-stone-500">Loading identity details...</div>}

      {identity && (
        <>
          {/* Identity header */}
          <Card className="border border-stone-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">{identity.identity_id}</h2>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {identity.platforms?.map((p: string) => (
                      <Badge key={p} variant="outline" className="text-xs">
                        {p === "instagram" ? "📸" : p === "telegram" ? "✈️" : "🐦"} {p}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-stone-900">{identity.risk_score?.toFixed(0)}</p>
                  <p className="text-xs text-stone-500">RISK SCORE</p>
                  <div className="mt-2"><RiskBadge level={identity.risk_level || "Low"} /></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-stone-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-stone-900">{identity.profiles?.length ?? 0}</p>
                <p className="text-xs text-stone-500">Linked Profiles</p>
              </CardContent>
            </Card>
            <Card className="border border-stone-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-stone-900">{identity.total_flagged_posts ?? 0}</p>
                <p className="text-xs text-stone-500">Flagged Posts</p>
              </CardContent>
            </Card>
            <Card className="border border-stone-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-stone-900">{identity.max_intent_score?.toFixed(2) ?? "0.00"}</p>
                <p className="text-xs text-stone-500">Max Intent</p>
              </CardContent>
            </Card>
            <Card className="border border-stone-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-stone-900">{identity.all_wallets?.length ?? 0}</p>
                <p className="text-xs text-stone-500">Wallets</p>
              </CardContent>
            </Card>
          </div>

          {/* Score breakdown */}
          {identity.score_breakdown && (
            <Card className="border border-stone-200">
              <CardHeader><CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2"><Shield className="h-4 w-4" /> Score Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "🎯 Centrality", value: identity.score_breakdown.centrality_component },
                    { label: "🧪 Intent", value: identity.score_breakdown.intent_component },
                    { label: "🔗 Connection", value: identity.score_breakdown.connection_component },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className="text-2xl font-bold text-stone-900">{(item.value ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-stone-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Behavioral / Temporal / Network profiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {identity.behavioral_profile && (
              <Card className="border border-stone-200">
                <CardHeader><CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2"><User className="h-4 w-4" /> Behavioral Profile</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-stone-500">Inferred Role</span><span className="font-medium capitalize">{identity.behavioral_profile.inferred_role}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Role Confidence</span><span className="font-medium">{(identity.behavioral_profile.role_confidence * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Flag Rate</span><span className="font-medium">{(identity.behavioral_profile.flag_rate * 100).toFixed(0)}%</span></div>
                </CardContent>
              </Card>
            )}
            {identity.temporal_profile && (
              <Card className="border border-stone-200">
                <CardHeader><CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2"><Clock className="h-4 w-4" /> Temporal Profile</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-stone-500">Peak Hour (UTC)</span><span className="font-medium">{identity.temporal_profile.peak_hour_utc}:00</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Timezone</span><span className="font-medium">{identity.temporal_profile.likely_timezone}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Active Days</span><span className="font-medium">{identity.temporal_profile.active_days}</span></div>
                  <div className="flex justify-between"><span className="text-stone-500">Weekday/Weekend</span><span className="font-medium">{identity.temporal_profile.weekday_posts}/{identity.temporal_profile.weekend_posts}</span></div>
                </CardContent>
              </Card>
            )}
            {identity.network_profile && (
              <Card className="border border-stone-200">
                <CardHeader><CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2"><Network className="h-4 w-4" /> Network Profile</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-stone-500">Network Role</span><span className="font-medium capitalize">{identity.network_profile.network_role}</span></div>
                  <p className="text-stone-600 text-xs mt-2">{identity.network_profile.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Bot assessment warning */}
          {identity.bot_assessment?.is_likely_bot && (
            <Card className="border border-amber-300 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-amber-600" />
                  <span className="font-bold text-amber-800">
                    ⚠️ BOT DETECTED — {((identity.bot_assessment.bot_probability ?? 0) * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-amber-700 mt-1">Recommendation: {identity.bot_assessment.recommendation}</p>
              </CardContent>
            </Card>
          )}

          {/* Wallets */}
          {identity.all_wallets?.length > 0 && (
            <Card className="border border-stone-200">
              <CardHeader><CardTitle className="text-sm font-medium text-stone-600">💰 Linked Wallets</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {identity.all_wallets.map((w: string) => (
                  <code key={w} className="block text-xs bg-stone-100 p-2 rounded font-mono text-stone-700 break-all">{w}</code>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Linked profiles + posts */}
          <Card className="border border-stone-200">
            <CardHeader><CardTitle className="text-sm font-medium text-stone-600">👤 Linked Profiles & Posts</CardTitle></CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {identity.profiles?.map((profile: Profile) => (
                  <AccordionItem key={profile.profile_id} value={profile.profile_id}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {profile.platform === "instagram" ? "📸" : profile.platform === "telegram" ? "✈️" : "🐦"} {profile.platform}
                        </Badge>
                        <span className="font-medium">{profile.username}</span>
                        <span className="text-stone-400">• Intent: {profile.max_intent_score?.toFixed(2)} • Flagged: {profile.flagged_posts}/{profile.total_posts}</span>
                        {profile.is_likely_bot && <Badge className="bg-amber-100 text-amber-800 text-xs ml-2">BOT</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-2">
                        <p className="text-sm text-stone-600">
                          <span className="font-medium">{profile.display_name}</span> | Followers: {profile.followers?.toLocaleString()} | Bio: {profile.bio || "—"}
                        </p>

                        {/* Bot assessment for this profile */}
                        {profile.bot_assessment?.is_likely_bot && (
                          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                            <p className="text-sm font-bold text-amber-800">
                              ⚠️ BOT DETECTED — {((profile.bot_assessment.bot_probability ?? 0) * 100).toFixed(0)}% confidence
                            </p>
                            <p className="text-xs text-amber-700 mt-1">Recommendation: {profile.bot_assessment.recommendation}</p>
                            <p className="text-xs text-amber-600 mt-1">
                              Temporal: CV={profile.bot_assessment.temporal_signals?.posting_regularity_cv ?? "N/A"} · 
                              Burst: {profile.bot_assessment.temporal_signals?.burst_ratio ?? "N/A"} · 
                              Duplicate: {profile.bot_assessment.content_signals?.duplicate_ratio ?? "N/A"}
                            </p>
                          </div>
                        )}

                        {/* Posts */}
                        {profile.post_analyses?.map(post => (
                          <div
                            key={post.post_id}
                            className={`border rounded-lg p-3 text-sm ${post.flagged ? "border-l-4 border-l-red-400 border-stone-200" : "border-l-4 border-l-green-400 border-stone-200"}`}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-stone-400 font-mono">{post.flagged ? "🚨" : "✅"} {post.post_id}</span>
                              <Badge className={post.flagged ? "bg-red-100 text-red-800 text-xs" : "bg-green-100 text-green-800 text-xs"}>
                                {(post.intent_score * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <p className="text-stone-700 text-sm leading-relaxed">{post.text}</p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
