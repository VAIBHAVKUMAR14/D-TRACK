import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { api, Identity, Profile } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle, Bot, Clock, Network, Shield, User,
  Link as LinkIcon, Wallet, ChevronRight, Eye, Fingerprint,
  ArrowRight, Zap, Globe, MessageSquare, TrendingUp, FileText,
} from "lucide-react";

/* ── Helpers ───────────────────────────────────── */

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Critical: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
    High: { bg: 'rgba(249,115,22,0.12)', color: '#fb923c' },
    Medium: { bg: 'rgba(234,179,8,0.12)', color: '#fbbf24' },
    Low: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  };
  const s = styles[level] || styles.Low;
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}25` }}>
      {level}
    </span>
  );
}

function riskColor(score: number): string {
  if (score >= 80) return '#f87171';
  if (score >= 60) return '#fb923c';
  if (score >= 30) return '#fbbf24';
  return '#4ade80';
}

function platformEmoji(p: string): string {
  if (p === 'instagram') return '📸';
  if (p === 'telegram') return '✈️';
  if (p === 'twitter') return '🐦';
  return '🌐';
}

function platformColor(p: string): string {
  if (p === 'instagram') return '#E1306C';
  if (p === 'telegram') return '#0088cc';
  if (p === 'twitter') return '#1DA1F2';
  return '#9E9E9E';
}

function AnimatedScore({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let frame = 0;
    const total = 30;
    const timer = setInterval(() => {
      frame++;
      const eased = 1 - Math.pow(1 - frame / total, 3);
      setCurrent(Math.round(eased * value));
      if (frame >= total) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <span style={{ color }}>{current}</span>;
}

/* ── Mini Shadow Graph ─────────────────────────── */

function MiniGraph({ identity, graphData }: { identity: any; graphData: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Find relevant nodes (profiles in this identity + their wallets)
  const profileIds = new Set(identity.profiles?.map((p: any) => p.profile_id) || []);
  const walletIds = new Set(identity.all_wallets || []);
  const relevantIds = new Set([...profileIds, ...walletIds]);

  const nodes = (graphData?.nodes || []).filter((n: any) => relevantIds.has(n.id));
  const edges = (graphData?.edges || []).filter((e: any) => {
    const sId = typeof e.source === 'object' ? e.source.id : e.source;
    const tId = typeof e.target === 'object' ? e.target.id : e.target;
    return relevantIds.has(sId) && relevantIds.has(tId);
  });

  // Layout nodes in a nice circle
  useEffect(() => {
    if (nodes.length === 0) return;
    const cx = 200, cy = 120;
    const pos: Record<string, { x: number; y: number }> = {};

    // Wallets in center area, accounts in outer ring
    const walletNodes = nodes.filter((n: any) => n.node_type === 'wallet');
    const accountNodes = nodes.filter((n: any) => n.node_type !== 'wallet');

    walletNodes.forEach((n: any, i: number) => {
      const angle = (i / Math.max(walletNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = walletNodes.length > 1 ? 30 : 0;
      pos[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    });

    accountNodes.forEach((n: any, i: number) => {
      const angle = (i / accountNodes.length) * Math.PI * 2 - Math.PI / 2;
      const r = 85;
      pos[n.id] = { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    });

    setPositions(pos);
  }, [nodes.length]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || Object.keys(positions).length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw edges
    edges.forEach((e: any) => {
      const sId = typeof e.source === 'object' ? e.source.id : e.source;
      const tId = typeof e.target === 'object' ? e.target.id : e.target;
      const a = positions[sId], b = positions[tId];
      if (!a || !b) return;

      // Animated dashed line
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      const isWallet = e.edge_type === 'shared_wallet' || e.edge_type === 'wallet_link';
      ctx.strokeStyle = isWallet ? 'rgba(251,191,36,0.6)' : 'rgba(139,92,246,0.4)';
      ctx.lineWidth = isWallet ? 2 : 1.5;
      ctx.setLineDash(isWallet ? [] : [4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw nodes
    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
    Object.entries(positions).forEach(([id, pos]) => {
      const node = nodeMap.get(id);
      if (!node) return;
      const isWallet = node.node_type === 'wallet';
      const r = isWallet ? 10 : 12;
      const color = isWallet ? '#fbbf24' : platformColor(node.platform);

      // Glow
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = `${color}20`;
      ctx.fill();

      // Node
      ctx.beginPath();
      if (isWallet) {
        ctx.moveTo(pos.x, pos.y - r);
        ctx.lineTo(pos.x + r, pos.y);
        ctx.lineTo(pos.x, pos.y + r);
        ctx.lineTo(pos.x - r, pos.y);
        ctx.closePath();
      } else {
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = `${color}80`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(210, 220, 240, 0.9)';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      const label = node.label?.length > 14 ? node.label.slice(0, 12) + '…' : (node.label || id.slice(0, 8));
      ctx.fillText(label, pos.x, pos.y + r + 14);
    });
  }, [positions, nodes, edges]);

  if (nodes.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={240}
      className="w-full rounded-xl"
      style={{ height: '240px', background: 'hsla(222, 47%, 3%, 0.5)' }}
    />
  );
}

/* ── Profile Cards — "The Reveal" ────────────── */

function ProfileCard({ profile, showReveal }: { profile: Profile; showReveal: boolean }) {
  const pColor = platformColor(profile.platform);
  const isSuspicious = (profile.max_intent_score || 0) >= 0.4;
  const [showAllPosts, setShowAllPosts] = useState(false);

  const allPosts = profile.post_analyses || [];
  const flaggedPosts = allPosts.filter((p: any) => p.flagged);
  const cleanPosts = allPosts.filter((p: any) => !p.flagged);
  const displayPosts = showAllPosts ? allPosts : allPosts.slice(0, 5);

  return (
    <div className={`glass-card p-4 transition-all duration-700 ${showReveal ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      style={{
        borderLeft: `3px solid ${pColor}`,
        background: isSuspicious
          ? 'linear-gradient(135deg, hsla(0, 60%, 15%, 0.15), hsla(222, 47%, 6%, 1))'
          : 'linear-gradient(135deg, hsla(222, 47%, 8%, 1), hsla(222, 47%, 6%, 1))',
      }}>
      {/* Platform header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{platformEmoji(profile.platform)}</span>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: pColor }}>{profile.username}</p>
          <p className="text-[10px]" style={{ color: 'hsl(215 20% 50%)' }}>
            {profile.display_name} • {profile.platform}
          </p>
        </div>
        {profile.is_likely_bot && (
          <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
            <Bot className="w-3 h-3" />BOT
          </span>
        )}
      </div>

      {/* Bio */}
      <p className="text-xs leading-relaxed mb-3 p-2.5 rounded-lg"
        style={{ background: 'hsl(222 47% 5%)', color: 'hsl(215 20% 60%)', border: '1px solid hsl(217 33% 13%)' }}>
        {profile.bio || "No bio available"}
      </p>

      {/* Stats row */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
          <p className="text-sm font-bold" style={{ color: pColor }}>{profile.followers?.toLocaleString()}</p>
          <p className="text-[9px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Followers</p>
        </div>
        <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
          <p className="text-sm font-bold" style={{ color: isSuspicious ? '#f87171' : '#4ade80' }}>
            {((profile.max_intent_score || 0) * 100).toFixed(0)}%
          </p>
          <p className="text-[9px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Max Intent</p>
        </div>
        <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
          <p className="text-sm font-bold" style={{ color: (profile.flagged_posts || 0) > 0 ? '#f87171' : '#4ade80' }}>
            {profile.flagged_posts}/{profile.total_posts}
          </p>
          <p className="text-[9px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Flagged</p>
        </div>
      </div>

      {/* Wallets */}
      {profile.wallet_addresses?.length > 0 && (
        <div className="space-y-1 mb-3">
          {profile.wallet_addresses.map((w: string) => (
            <code key={w} className="block text-[10px] p-1.5 rounded font-mono break-all"
              style={{ background: 'hsla(45,93%,47%,0.05)', color: '#fbbf24', border: '1px solid hsla(45,93%,47%,0.1)' }}>
              <Wallet className="inline w-3 h-3 mr-1" />{w}
            </code>
          ))}
        </div>
      )}

      {/* ALL Posts — full NLP breakdown */}
      {allPosts.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(215 20% 45%)' }}>
              📝 All Posts ({flaggedPosts.length} flagged / {allPosts.length} total)
            </p>
            {allPosts.length > 5 && (
              <button onClick={() => setShowAllPosts(!showAllPosts)}
                className="text-[10px] px-2 py-0.5 rounded"
                style={{ background: 'hsla(262,83%,65%,0.1)', color: '#a78bfa' }}>
                {showAllPosts ? 'Show less' : `Show all ${allPosts.length}`}
              </button>
            )}
          </div>
          {displayPosts.map((post: any, i: number) => {
            const score = (post.intent_score || 0) * 100;
            const scoreColor = post.flagged ? '#f87171' : score > 30 ? '#fbbf24' : '#4ade80';
            return (
              <div key={post.post_id || i} className="p-2.5 rounded-lg text-xs"
                style={{
                  background: post.flagged ? 'hsla(0, 60%, 15%, 0.08)' : 'hsl(222 47% 5%)',
                  borderLeft: `3px solid ${scoreColor}`,
                  border: `1px solid ${post.flagged ? 'hsla(0, 60%, 50%, 0.1)' : 'hsl(217 33% 13%)'}`,
                  borderLeftWidth: '3px',
                  borderLeftColor: scoreColor,
                }}>
                {/* Post header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[9px]" style={{ color: 'hsl(215 20% 40%)' }}>
                    {post.flagged ? '🚨' : '✅'} {post.post_id}
                  </span>
                  <span className="font-bold font-mono text-sm" style={{ color: scoreColor }}>
                    {score.toFixed(0)}%
                  </span>
                </div>
                {/* Intent score bar */}
                <div className="h-1.5 rounded-full mb-2" style={{ background: 'hsl(217 33% 12%)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(score, 2)}%`,
                      background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}80)`,
                    }} />
                </div>
                {/* Post text — FULL, not truncated */}
                <p className="leading-relaxed mb-2" style={{ color: 'hsl(215 20% 65%)' }}>{post.text}</p>
                {/* NLP Detection badges */}
                <div className="flex flex-wrap gap-1.5">
                  {post.has_drug_emojis && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: 'hsla(30,80%,50%,0.1)', color: '#fb923c', border: '1px solid hsla(30,80%,50%,0.15)' }}>
                      💊 Drug Emoji Detected
                    </span>
                  )}
                  {post.has_price_pattern && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: 'hsla(0,80%,50%,0.1)', color: '#f87171', border: '1px solid hsla(0,80%,50%,0.15)' }}>
                      💵 Price Pattern
                    </span>
                  )}
                  {post.matched_anchor && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1"
                      style={{ background: 'hsla(262,83%,65%,0.1)', color: '#a78bfa', border: '1px solid hsla(262,83%,65%,0.15)' }}>
                      🎯 Anchor: {post.anchor_similarity?.toFixed(2)}
                    </span>
                  )}
                  {!post.flagged && !post.has_drug_emojis && !post.has_price_pattern && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{ background: 'hsla(142,76%,36%,0.1)', color: '#4ade80' }}>
                      ✅ Clean — No indicators
                    </span>
                  )}
                </div>
                {/* Matched anchor sentence detail */}
                {post.matched_anchor && post.flagged && (
                  <div className="mt-2 p-2 rounded text-[10px]"
                    style={{ background: 'hsla(262,83%,65%,0.05)', borderLeft: '2px solid #a78bfa' }}>
                    <span style={{ color: '#a78bfa' }}>Closest known pattern:</span>{' '}
                    <span className="italic" style={{ color: 'hsl(215 20% 55%)' }}>"{post.matched_anchor}"</span>
                    <span className="ml-1 font-mono" style={{ color: '#a78bfa' }}>
                      (similarity: {post.anchor_similarity?.toFixed(4)})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Evidence Chain ────────────────────────────── */

function EvidenceChain({ identity }: { identity: any }) {
  const profiles = identity.profiles || [];
  const wallets = identity.all_wallets || [];

  if (profiles.length < 2 && wallets.length === 0) return null;

  // Build evidence items
  const evidence: { type: string; icon: any; label: string; detail: string; color: string }[] = [];

  // Shared wallets
  wallets.forEach((w: string) => {
    const usersWithWallet = profiles.filter((p: any) =>
      p.wallet_addresses?.some((wa: string) => wa.toLowerCase() === w.toLowerCase())
    );
    if (usersWithWallet.length >= 2) {
      evidence.push({
        type: 'wallet',
        icon: Wallet,
        label: 'Shared Crypto Wallet',
        detail: `${usersWithWallet.map((u: any) => u.username).join(' ↔ ')} share wallet ${w.slice(0, 8)}...${w.slice(-4)}`,
        color: '#fbbf24',
      });
    }
  });

  // Shared phone (check via link_evidence if available)
  const phones = new Map<string, string[]>();
  profiles.forEach((p: any) => {
    const raw = (identity as any).profiles_raw || [];
    // Get phone from profile data if available
    if (p.phone) {
      if (!phones.has(p.phone)) phones.set(p.phone, []);
      phones.get(p.phone)!.push(p.username);
    }
  });

  // Link evidence from identity
  if (identity.link_evidence) {
    identity.link_evidence.forEach((link: any) => {
      if (link.link_type === 'shared_phone') {
        evidence.push({
          type: 'phone',
          icon: MessageSquare,
          label: 'Shared Phone Number',
          detail: `${link.profile_a} ↔ ${link.profile_b} share a phone number`,
          color: '#38bdf8',
        });
      }
    });
  }

  // Cross-platform presence
  const platforms = [...new Set(profiles.map((p: any) => p.platform))];
  if (platforms.length >= 2) {
    evidence.push({
      type: 'cross_platform',
      icon: Globe,
      label: 'Cross-Platform Presence',
      detail: `Active on ${platforms.join(', ')} — identity confirmed via shared identifiers`,
      color: '#a78bfa',
    });
  }

  // Wallet as primary key
  if (wallets.length > 0) {
    evidence.push({
      type: 'primary_key',
      icon: Fingerprint,
      label: 'Wallet = Primary Key',
      detail: `Crypto wallet address serves as permanent cross-platform fingerprint. This identity is linked by ${wallets.length} wallet(s).`,
      color: '#c084fc',
    });
  }

  if (evidence.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Evidence Chain — Why These Are The Same Person</h3>
      </div>
      <div className="space-y-3">
        {evidence.map((ev, i) => {
          const Icon = ev.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl animate-fade-in"
              style={{
                background: `${ev.color}06`,
                border: `1px solid ${ev.color}15`,
                animationDelay: `${i * 0.15}s`,
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none mt-0.5"
                style={{ background: `${ev.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: ev.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: ev.color }}>{ev.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(215 20% 55%)' }}>{ev.detail}</p>
              </div>
              <div className="flex-none self-center">
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase"
                  style={{ background: `${ev.color}12`, color: ev.color }}>
                  CONFIRMED
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Post Timeline ─────────────────────────────── */

function PostTimeline({ identity }: { identity: any }) {
  const allPosts: any[] = [];
  (identity.profiles || []).forEach((profile: any) => {
    (profile.post_analyses || []).forEach((post: any) => {
      allPosts.push({ ...post, platform: profile.platform, username: profile.username });
    });
  });

  // Sort by score descending for impact
  allPosts.sort((a, b) => b.intent_score - a.intent_score);
  const topPosts = allPosts.slice(0, 8);

  if (topPosts.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-orange-400" />
        <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>
          Highest Intent Posts Across All Platforms
        </h3>
      </div>
      <div className="space-y-2">
        {topPosts.map((post, i) => {
          const pColor = platformColor(post.platform);
          const score = post.intent_score * 100;
          const barWidth = Math.max(score, 3);

          return (
            <div key={post.post_id || i} className="group rounded-lg p-3 transition-all hover:scale-[1.01]"
              style={{
                background: post.flagged ? 'hsla(0, 60%, 15%, 0.08)' : 'hsl(222 47% 5%)',
                border: `1px solid ${post.flagged ? 'hsla(0, 60%, 50%, 0.1)' : 'hsl(217 33% 13%)'}`,
              }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm">{platformEmoji(post.platform)}</span>
                <span className="text-xs font-medium" style={{ color: pColor }}>{post.username}</span>
                <span className="flex-1" />
                <span className="text-xs font-bold font-mono" style={{ color: post.flagged ? '#f87171' : '#4ade80' }}>
                  {score.toFixed(0)}%
                </span>
              </div>
              {/* Score bar */}
              <div className="h-1 rounded-full mb-2" style={{ background: 'hsl(217 33% 12%)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barWidth}%`,
                    background: post.flagged
                      ? 'linear-gradient(90deg, #f87171, #fb923c)'
                      : 'linear-gradient(90deg, #4ade80, #38bdf8)',
                  }} />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'hsl(215 20% 60%)' }}>
                {post.text?.slice(0, 150)}{(post.text?.length || 0) > 150 ? '…' : ''}
              </p>
              <div className="flex gap-2 mt-1.5">
                {post.has_drug_emojis && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'hsla(30,80%,50%,0.1)', color: '#fb923c' }}>
                    Drug Emoji
                  </span>
                )}
                {post.has_price_pattern && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'hsla(0,80%,50%,0.1)', color: '#f87171' }}>
                    Price Pattern
                  </span>
                )}
                {post.matched_anchor && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'hsla(262,83%,65%,0.1)', color: '#a78bfa' }}>
                    Anchor: "{post.matched_anchor?.slice(0, 30)}…"
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────── */

export default function IdentityDive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get("id");
  const [selectedId, setSelectedId] = useState<string>(preselectedId || "");
  const [revealTriggered, setRevealTriggered] = useState(false);

  const { data: idData, isLoading: listLoading } = useQuery({ queryKey: ["/api/identities"] });
  const { data: graphData } = useQuery({ queryKey: ["/api/graph"] });
  const identities = idData?.identities ?? [];

  useEffect(() => {
    if (!selectedId && identities.length > 0) {
      // Auto-select the highest-risk multi-profile identity for maximum demo impact
      const best = identities
        .filter((id: any) => (id.profiles_summary?.length || 0) >= 2)
        .sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0))[0]
        || identities[0];
      setSelectedId(preselectedId || best.identity_id);
    }
  }, [identities, preselectedId]);

  const { data: identity, isLoading: detailLoading } = useQuery({
    queryKey: [`/api/identity/${selectedId}`],
    enabled: !!selectedId,
  });

  // Trigger reveal animation when identity loads
  useEffect(() => {
    if (identity) {
      setRevealTriggered(false);
      setTimeout(() => setRevealTriggered(true), 100);
    }
  }, [identity?.identity_id]);

  if (listLoading) return <div className="p-6" style={{ color: 'hsl(215 20% 50%)' }}>Loading identities...</div>;
  if (!identities.length) return <div className="p-6" style={{ color: 'hsl(215 20% 50%)' }}>No identities resolved yet. Run the pipeline first.</div>;

  const currentIdentitySummary = identities.find((id: any) => id.identity_id === selectedId);

  return (
    <div className="p-5 lg:p-6 space-y-5">

      {/* ── Identity Selector — Visual Cards ──────── */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(215 20% 42%)' }}>
          Select a Unified Identity to Investigate
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {identities
            .sort((a: any, b: any) => (b.risk_score || 0) - (a.risk_score || 0))
            .map((id: any) => {
              const isSelected = id.identity_id === selectedId;
              const numProfiles = id.profiles_summary?.length || id.all_usernames?.length || 0;
              const rc = riskColor(id.risk_score || 0);

              return (
                <button
                  key={id.identity_id}
                  onClick={() => { setSelectedId(id.identity_id); setSearchParams({ id: id.identity_id }); }}
                  className={`flex-none p-3 rounded-xl transition-all duration-300 text-left min-w-[180px] ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${rc}15, hsla(222, 47%, 8%, 1))`
                      : 'hsl(222 47% 5%)',
                    border: `1px solid ${isSelected ? `${rc}40` : 'hsl(217 33% 13%)'}`,
                    boxShadow: isSelected ? `0 4px 20px ${rc}15` : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {(id.platforms || []).slice(0, 3).map((p: string, i: number) => (
                        <span key={i} className="text-xs">{platformEmoji(p)}</span>
                      ))}
                    </div>
                    <span className="ml-auto text-lg font-black" style={{ color: rc }}>
                      {(id.risk_score || 0).toFixed(0)}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {(id.profiles_summary || id.all_usernames || []).slice(0, 2).map((p: any, i: number) => (
                      <p key={i} className="text-[11px] font-medium truncate" style={{ color: 'hsl(210 40% 80%)' }}>
                        {p.username || p}
                      </p>
                    ))}
                    {numProfiles > 2 && (
                      <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>+{numProfiles - 2} more</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <RiskBadge level={id.risk_level || 'Low'} />
                    {numProfiles >= 2 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'hsla(262,83%,65%,0.12)', color: '#a78bfa' }}>
                        {numProfiles} profiles linked
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {detailLoading && <div style={{ color: 'hsl(215 20% 50%)' }}>Loading identity details...</div>}

      {identity && (
        <>
          {/* ── Identity Hero Header ────────────────── */}
          <div className={`glass-card p-6 transition-all duration-700 ${revealTriggered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ borderTop: `2px solid ${riskColor(identity.risk_score || 0)}` }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Fingerprint className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold" style={{ color: 'hsl(262 83% 75%)' }}>
                    Unified Identity
                  </h2>
                  {(identity.profiles?.length || 0) >= 2 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                      style={{ background: 'hsla(0, 80%, 50%, 0.12)', color: '#f87171', border: '1px solid hsla(0, 80%, 50%, 0.2)' }}>
                      ⚠️ MULTI-PLATFORM NETWORK
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono" style={{ color: 'hsl(215 20% 45%)' }}>{identity.identity_id}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {identity.platforms?.map((p: string) => (
                    <span key={p} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                      style={{ background: `${platformColor(p)}15`, color: platformColor(p), border: `1px solid ${platformColor(p)}25` }}>
                      {platformEmoji(p)} {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-5xl font-black" style={{ color: riskColor(identity.risk_score || 0) }}>
                  <AnimatedScore value={Math.round(identity.risk_score || 0)} color={riskColor(identity.risk_score || 0)} />
                </p>
                <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'hsl(215 20% 40%)' }}>Risk Score</p>
                <div className="mt-2"><RiskBadge level={identity.risk_level || "Low"} /></div>
                <button
                  onClick={() => {
                    const w = window.open('', '_blank', 'width=900,height=700');
                    if (!w) return;
                    const profiles = identity.profiles || [];
                    const allPosts = profiles.flatMap((p: any) => (p.post_analyses || []).map((post: any) => ({ ...post, username: p.username, platform: p.platform })));
                    const flaggedPosts = allPosts.filter((p: any) => p.flagged);
                    w.document.write(`<!DOCTYPE html><html><head><title>D-TRACK Case Report — ${identity.identity_id}</title>
                    <style>
                      body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1e293b; line-height: 1.6; }
                      h1 { color: #6366f1; border-bottom: 3px solid #6366f1; padding-bottom: 8px; }
                      h2 { color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 32px; }
                      .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
                      .risk-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
                      .risk-high { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; }
                      .risk-medium { background: #fefce8; color: #ca8a04; border: 1px solid #fde047; }
                      .risk-low { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
                      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                      th, td { padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
                      th { background: #f8fafc; font-weight: 600; }
                      .post-card { padding: 10px; margin: 8px 0; border-radius: 8px; border-left: 3px solid; font-size: 13px; }
                      .flagged { background: #fef2f2; border-left-color: #ef4444; }
                      .clean { background: #f8fafc; border-left-color: #22c55e; }
                      .mono { font-family: 'Consolas', monospace; font-size: 12px; }
                      .score { font-size: 48px; font-weight: 900; color: ${riskColor(identity.risk_score || 0)}; }
                      .header-grid { display: flex; justify-content: space-between; align-items: center; }
                      .meta { color: #64748b; font-size: 12px; }
                      @media print { body { padding: 20px; } }
                    </style></head><body>
                    <div class="header-grid">
                      <div>
                        <h1>🔍 D-TRACK Case Report</h1>
                        <p class="meta">Identity: <span class="mono">${identity.identity_id}</span></p>
                        <p class="meta">Generated: ${new Date().toLocaleString()}</p>
                      </div>
                      <div style="text-align:right">
                        <div class="score">${Math.round(identity.risk_score || 0)}</div>
                        <span class="badge risk-${(identity.risk_level || 'low').toLowerCase()}">${identity.risk_level || 'Low'} Risk</span>
                      </div>
                    </div>

                    <h2>📋 Identity Summary</h2>
                    <table>
                      <tr><th>Linked Usernames</th><td>${(identity.usernames || identity.all_usernames || []).join(', ') || 'N/A'}</td></tr>
                      <tr><th>Platforms</th><td>${(identity.platforms || []).join(', ')}</td></tr>
                      <tr><th>Crypto Wallets</th><td class="mono">${(identity.all_wallets || identity.wallets || []).join('<br>') || 'None'}</td></tr>
                      <tr><th>Total Profiles</th><td>${profiles.length}</td></tr>
                      <tr><th>Total Flagged Posts</th><td style="color:#dc2626;font-weight:700">${flaggedPosts.length} / ${allPosts.length}</td></tr>
                    </table>

                    <h2>👤 Linked Profiles</h2>
                    ${profiles.map((p: any) => `
                      <table>
                        <tr><th>Username</th><td><strong>${p.username}</strong></td><th>Platform</th><td>${p.platform}</td></tr>
                        <tr><th>Display Name</th><td>${p.display_name || 'N/A'}</td><th>Followers</th><td>${(p.followers || 0).toLocaleString()}</td></tr>
                        <tr><th>Max Intent Score</th><td style="color:${(p.max_intent_score || 0) >= 0.5 ? '#dc2626' : '#16a34a'};font-weight:700">${((p.max_intent_score || 0) * 100).toFixed(0)}%</td><th>Flagged Posts</th><td>${p.flagged_posts || 0}/${p.total_posts || 0}</td></tr>
                        ${p.bio ? `<tr><th>Bio</th><td colspan="3">${p.bio}</td></tr>` : ''}
                        ${(p.wallet_addresses || []).length > 0 ? `<tr><th>Wallets</th><td colspan="3" class="mono">${p.wallet_addresses.join(', ')}</td></tr>` : ''}
                      </table>
                    `).join('')}

                    <h2>🔗 Evidence Chain — Why These Profiles Are Linked</h2>
                    ${(identity.link_evidence || []).length > 0 ? `<table>
                      <tr><th>Type</th><th>Detail</th></tr>
                      ${(identity.link_evidence || []).map((e: any) => `<tr><td>${e.type || e.link_type || 'Link'}</td><td>${e.detail || e.description || JSON.stringify(e)}</td></tr>`).join('')}
                    </table>` : '<p class="meta">Link evidence derived from shared wallet addresses and phone numbers across profiles.</p>'}

                    <h2>🚨 Flagged Posts (${flaggedPosts.length})</h2>
                    ${flaggedPosts.map((p: any) => `
                      <div class="post-card flagged">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                          <span class="mono">${p.username} (${p.platform}) — ${p.post_id}</span>
                          <strong style="color:#dc2626">${((p.intent_score || 0) * 100).toFixed(0)}% intent</strong>
                        </div>
                        <div>${p.text || ''}</div>
                        ${p.matched_anchor ? `<div class="meta" style="margin-top:6px">Matched anchor: "${p.matched_anchor}" (similarity: ${(p.anchor_similarity || 0).toFixed(4)})</div>` : ''}
                      </div>
                    `).join('')}

                    <hr style="margin:32px 0;border-color:#e2e8f0">
                    <p class="meta" style="text-align:center">D-TRACK v2.0 — Cross-Platform OSINT Intelligence Platform<br>This report is auto-generated for intelligence review purposes.</p>
                    </body></html>`);
                    w.document.close();
                    setTimeout(() => w.print(), 500);
                  }}
                  className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 w-full"
                  style={{
                    background: 'hsla(262,83%,58%,0.1)',
                    color: '#a78bfa',
                    border: '1px solid hsla(262,83%,58%,0.2)',
                  }}>
                  <FileText className="w-3 h-3" />
                  Generate Case Report
                </button>
              </div>
            </div>
          </div>

          {/* ── Key Metrics ────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
            {[
              { label: "Linked Profiles", value: identity.profiles?.length ?? 0, color: "#a78bfa", icon: User },
              { label: "Platforms", value: identity.platforms?.length ?? 0, color: "#818cf8", icon: Globe },
              { label: "Flagged Posts", value: identity.total_flagged_posts ?? 0, color: "#f87171", icon: AlertTriangle },
              { label: "Max Intent", value: `${((identity.max_intent_score || 0) * 100).toFixed(0)}%`, color: "#fb923c", icon: Zap },
              { label: "Wallets", value: identity.all_wallets?.length ?? 0, color: "#fbbf24", icon: Wallet },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="glass-card p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: s.color }} />
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'hsl(215 20% 42%)' }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* ── Profile Cards with Posts ── */}
          {(identity.profiles?.length || 0) >= 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 88%)' }}>
                  {(identity.profiles?.length || 0) >= 2
                    ? 'The Reveal — Same Person, Different Masks'
                    : 'Profile Analysis — Posts & NLP Breakdown'}
                </h3>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, hsla(0, 80%, 50%, 0.2), transparent)' }} />
              </div>
              <div className={`grid grid-cols-1 ${(identity.profiles?.length || 0) >= 2 ? 'md:grid-cols-2' : ''} gap-3`}>
                {identity.profiles?.map((profile: Profile, i: number) => (
                  <ProfileCard
                    key={profile.profile_id}
                    profile={profile}
                    showReveal={revealTriggered}
                  />
                ))}
              </div>
              {/* Shared wallet callout */}
              {(identity.all_wallets?.length || 0) > 0 && (identity.profiles?.length || 0) >= 2 && (
                <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl animate-pulse"
                  style={{ background: 'hsla(45, 93%, 47%, 0.05)', border: '1px solid hsla(45, 93%, 47%, 0.15)' }}>
                  <Wallet className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                    All profiles share wallet: {identity.all_wallets[0]?.slice(0, 10)}...{identity.all_wallets[0]?.slice(-6)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold" style={{ color: '#f87171' }}>SAME OPERATOR</span>
                </div>
              )}
            </div>
          )}

          {/* ── Evidence Chain ─────────────────────── */}
          <EvidenceChain identity={identity} />

          {/* ── Score Breakdown + Mini Graph ────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Score Breakdown */}
            {identity.score_breakdown && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Risk Score Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "🎯 Centrality", weight: "40%", value: identity.score_breakdown.centrality_component, color: "#818cf8", desc: "Network importance (degree, betweenness, pagerank)" },
                    { label: "🧪 Intent", weight: "35%", value: identity.score_breakdown.intent_component, color: "#fb923c", desc: "NLP-detected trafficking language patterns" },
                    { label: "🔗 Connections", weight: "25%", value: identity.score_breakdown.connection_component, color: "#a78bfa", desc: "Cross-platform links and wallet sharing" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color: 'hsl(210 40% 80%)' }}>
                          {item.label} <span className="font-normal" style={{ color: 'hsl(215 20% 45%)' }}>({item.weight})</span>
                        </span>
                        <span className="text-sm font-black" style={{ color: item.color }}>{(item.value ?? 0).toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: 'hsl(217 33% 10%)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min((item.value ?? 0), 100)}%`,
                            background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                          }} />
                      </div>
                      <p className="text-[9px] mt-0.5" style={{ color: 'hsl(215 20% 40%)' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mini Network Graph */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Network className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Local Network Graph</h3>
              </div>
              <MiniGraph identity={identity} graphData={graphData} />
              <div className="flex gap-4 mt-3 text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#E1306C' }} />Instagram
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#0088cc' }} />Telegram
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#1DA1F2' }} />Twitter
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5" style={{ background: '#fbbf24', transform: 'rotate(45deg)' }} />Wallet
                </span>
              </div>
            </div>
          </div>

          {/* ── Intelligence Profiles Row ───────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {identity.behavioral_profile && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(215 20% 50%)' }}>Behavioral Profile</h4>
                </div>
                <div className="space-y-2.5">
                  <div className="text-center p-3 rounded-xl" style={{ background: 'hsl(222 47% 5%)' }}>
                    <p className="text-lg font-bold capitalize" style={{ color: '#60a5fa' }}>{identity.behavioral_profile.inferred_role}</p>
                    <p className="text-[9px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Inferred Role</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
                      <p className="text-sm font-bold" style={{ color: '#60a5fa' }}>{((identity.behavioral_profile.role_confidence || 0) * 100).toFixed(0)}%</p>
                      <p className="text-[8px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Confidence</p>
                    </div>
                    <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
                      <p className="text-sm font-bold" style={{ color: (identity.behavioral_profile.flag_rate || 0) > 0.5 ? '#f87171' : '#4ade80' }}>
                        {((identity.behavioral_profile.flag_rate || 0) * 100).toFixed(0)}%
                      </p>
                      <p className="text-[8px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Flag Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {identity.temporal_profile && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-green-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(215 20% 50%)' }}>Temporal Profile</h4>
                </div>
                <div className="space-y-2.5">
                  <div className="text-center p-3 rounded-xl" style={{ background: 'hsl(222 47% 5%)' }}>
                    <p className="text-lg font-bold font-mono" style={{ color: '#4ade80' }}>{identity.temporal_profile.peak_hour_utc}:00 UTC</p>
                    <p className="text-[9px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Peak Activity Hour</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
                      <p className="text-sm font-bold" style={{ color: '#4ade80' }}>{identity.temporal_profile.likely_timezone}</p>
                      <p className="text-[8px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Timezone</p>
                    </div>
                    <div className="flex-1 text-center p-2 rounded-lg" style={{ background: 'hsl(222 47% 5%)' }}>
                      <p className="text-sm font-bold" style={{ color: '#4ade80' }}>{identity.temporal_profile.active_days}</p>
                      <p className="text-[8px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Active Days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {identity.network_profile && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(215 20% 50%)' }}>Network Role</h4>
                </div>
                <div className="space-y-2.5">
                  <div className="text-center p-3 rounded-xl" style={{ background: 'hsl(222 47% 5%)' }}>
                    <p className="text-lg font-bold capitalize" style={{ color: '#818cf8' }}>{identity.network_profile.network_role}</p>
                    <p className="text-[9px] uppercase" style={{ color: 'hsl(215 20% 40%)' }}>Graph Role</p>
                  </div>
                  <p className="text-xs" style={{ color: 'hsl(215 20% 50%)' }}>{identity.network_profile.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Bot Alert ───────────────────────────── */}
          {identity.bot_assessment?.is_likely_bot && (
            <div className="glass-card p-4 animate-fade-in"
              style={{ borderLeft: '3px solid #fbbf24', background: 'linear-gradient(135deg, hsla(45,93%,47%,0.04), transparent)' }}>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-amber-400">
                  BOT DETECTED — {((identity.bot_assessment.bot_probability ?? 0) * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'hsl(215 20% 50%)' }}>
                Recommendation: {identity.bot_assessment.recommendation}
              </p>
            </div>
          )}


          {/* Posts are now shown inline within each ProfileCard above */}

          {/* ── All Linked Wallets ──────────────────── */}
          {identity.all_wallets?.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="h-4 w-4 text-yellow-400" />
                <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>
                  Linked Wallets — The Primary Key
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: 'hsla(45,93%,47%,0.1)', color: '#fbbf24' }}>
                  {identity.all_wallets.length} wallet{identity.all_wallets.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {identity.all_wallets.map((w: string) => (
                  <div key={w} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'hsla(45,93%,47%,0.03)', border: '1px solid hsla(45,93%,47%,0.1)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'hsla(45,93%,47%,0.1)' }}>
                      <Wallet className="w-4 h-4 text-yellow-400" />
                    </div>
                    <code className="text-xs font-mono break-all flex-1" style={{ color: '#fbbf24' }}>{w}</code>
                    <span className="text-[9px] px-2 py-1 rounded-lg font-bold"
                      style={{ background: 'hsla(45,93%,47%,0.1)', color: '#fbbf24' }}>
                      DETERMINISTIC LINK
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
