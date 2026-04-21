import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authHeaders } from "@/lib/api";
import { Network, X, ExternalLink, Bot, Wallet, AlertTriangle, Info } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  node_type: string;
  platform?: string;
  risk_score?: number;
  risk_level?: string;
  identity_id?: string;
  is_bot?: boolean;
  color?: string;
  size?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  edge_type: string;
  weight?: number;
  color?: string;
}

function riskColor(score: number | undefined): string {
  if (!score) return '#60a5fa';
  if (score >= 80) return '#f87171';
  if (score >= 60) return '#fb923c';
  if (score >= 30) return '#fbbf24';
  return '#4ade80';
}

function platformIcon(p?: string): string {
  if (p === 'instagram') return '📸';
  if (p === 'telegram') return '✈️';
  if (p === 'twitter') return '🐦';
  return '🔗';
}

export default function Graph() {
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: graphData } = useQuery({ queryKey: ["/api/graph"] });
  const { data: communities } = useQuery({ queryKey: ["/api/communities"] });
  const { data: identitiesData } = useQuery({ queryKey: ["/api/identities"] });

  const nodes: GraphNode[] = graphData?.nodes ?? [];
  const edges: GraphEdge[] = graphData?.edges ?? [];

  // Edge type breakdown
  const edgeBreakdown: Record<string, number> = {};
  edges.forEach(e => {
    edgeBreakdown[e.edge_type] = (edgeBreakdown[e.edge_type] || 0) + 1;
  });

  // Risk breakdown
  const riskCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  nodes.forEach(n => {
    if (n.node_type === 'account') {
      const level = n.risk_level || 'Low';
      if (level in riskCounts) riskCounts[level as keyof typeof riskCounts]++;
    }
  });

  // Fetch PyVis HTML graph from backend
  const [graphHtml, setGraphHtml] = useState<string>("");
  const [graphLoading, setGraphLoading] = useState(false);

  useEffect(() => {
    if (nodes.length === 0) return;
    setGraphLoading(true);
    fetch("/api/graph/html", { headers: authHeaders() })
      .then(res => {
        if (res.ok) return res.text();
        throw new Error("Graph HTML not available");
      })
      .then(html => {
        setGraphHtml(html);
        setGraphLoading(false);
      })
      .catch(() => setGraphLoading(false));
  }, [nodes.length]);

  return (
    <div className="p-5 lg:p-6 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
        {[
          { label: "Total Nodes", value: nodes.length, color: "#a78bfa" },
          { label: "Total Edges", value: edges.length, color: "#60a5fa" },
          { label: "Accounts", value: nodes.filter(n => n.node_type === "account").length, color: "#4ade80" },
          { label: "Wallets", value: nodes.filter(n => n.node_type === "wallet").length, color: "#fbbf24" },
          { label: "Communities", value: communities?.total_communities ?? "—", color: "#818cf8" },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'hsl(215 20% 42%)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(215 20% 55%)' }}>Graph Legend</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Node types */}
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'hsl(215 20% 40%)' }}>Node Shapes</p>
            <div className="space-y-1.5">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                <span className="w-3 h-3 rounded-full" style={{ background: '#60a5fa' }} /> Human Account
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                <span className="w-3 h-3" style={{ background: '#60a5fa', borderRadius: '2px' }} /> Bot Account
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                <span className="w-3 h-3" style={{ background: '#fbbf24', transform: 'rotate(45deg)' }} /> Crypto Wallet
              </span>
            </div>
          </div>

          {/* Risk levels */}
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'hsl(215 20% 40%)' }}>Risk Levels</p>
            <div className="space-y-1.5">
              {[
                { label: "Critical (80+)", color: "#f87171", count: riskCounts.Critical },
                { label: "High (60-80)", color: "#fb923c", count: riskCounts.High },
                { label: "Medium (30-60)", color: "#fbbf24", count: riskCounts.Medium },
                { label: "Low (0-30)", color: "#4ade80", count: riskCounts.Low },
              ].map(r => (
                <span key={r.label} className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                  <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                  {r.label}
                  <span className="ml-auto font-mono text-[10px]" style={{ color: r.color }}>{r.count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Edge types */}
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'hsl(215 20% 40%)' }}>Connection Types</p>
            <div className="space-y-1.5">
              {[
                { type: "wallet_link", label: "Wallet Link", color: "#fbbf24", icon: "🔗" },
                { type: "shared_wallet", label: "Shared Wallet", color: "#FF5722", icon: "💰" },
                { type: "shared_phone", label: "Shared Phone", color: "#FF9800", icon: "📱" },
                { type: "promotes", label: "Promotes", color: "#2196F3", icon: "📢" },
                { type: "same_identity", label: "Same Identity", color: "#9C27B0", icon: "👤" },
              ].map(e => (
                <span key={e.type} className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                  <span>{e.icon}</span>
                  {e.label}
                  <span className="ml-auto font-mono text-[10px]" style={{ color: e.color }}>
                    {edgeBreakdown[e.type] || 0}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Special markers */}
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-2 font-semibold" style={{ color: 'hsl(215 20% 40%)' }}>Special Markers</p>
            <div className="space-y-1.5">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                <span className="text-sm">⚠️</span> Dashed border = Bot flagged
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                <span className="text-sm">🎯</span> Larger node = More followers
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 60%)' }}>
                <span className="text-sm">💡</span> Hover node for full tooltip
              </span>
            </div>
            <div className="mt-3 p-2 rounded-lg text-[10px]" style={{ background: 'hsla(262,83%,65%,0.06)', color: '#a78bfa' }}>
              Drag to reposition • Scroll to zoom • Click node for tooltip
            </div>
          </div>
        </div>
      </div>

      {/* Main content: Graph + Detail panel */}
      <div className="flex gap-4">
        {/* PyVis Graph via iframe */}
        <div className="flex-1 rounded-xl overflow-hidden relative" style={{ border: '1px solid hsla(245, 58%, 64%, 0.15)' }}>
          {graphLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: 'rgba(6,6,18,0.8)' }}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm" style={{ color: 'hsl(215 20% 55%)' }}>Building Shadow Graph...</p>
              </div>
            </div>
          )}

          {graphHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={graphHtml}
              className="w-full border-0"
              style={{ height: '620px', background: '#0a0a0a' }}
              title="D-TRACK Shadow Graph"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="w-full flex items-center justify-center" style={{ height: '620px', background: '#060612' }}>
              <div className="text-center">
                <Network className="w-12 h-12 mx-auto mb-3" style={{ color: 'hsl(215 20% 25%)' }} />
                <p className="text-sm" style={{ color: 'hsl(215 20% 45%)' }}>
                  {nodes.length === 0 ? 'Run the pipeline to generate the Shadow Graph' : 'Loading interactive graph...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Node Detail Panel — populated from graph JSON data */}
        {selectedNode && (
          <div className="w-72 glass-card p-4 space-y-3 animate-fade-in flex-none self-start" style={{ maxHeight: '620px', overflowY: 'auto' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Node Detail</h3>
              <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-white/5">
                <X className="h-4 w-4" style={{ color: 'hsl(215 20% 50%)' }} />
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 40%)' }}>Label</p>
                <p className="text-sm font-medium" style={{ color: 'hsl(210 40% 90%)' }}>{selectedNode.label}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 40%)' }}>Type</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm" style={{ color: 'hsl(210 40% 75%)' }}>
                    {selectedNode.node_type === 'wallet' ? '💰 Wallet Node' : `${platformIcon(selectedNode.platform)} Account`}
                  </span>
                  {selectedNode.is_bot && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                      <Bot className="inline h-3 w-3 mr-1" />BOT
                    </span>
                  )}
                </div>
              </div>
              {selectedNode.risk_score !== undefined && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 40%)' }}>Risk Score</p>
                  <p className="text-2xl font-black" style={{ color: riskColor(selectedNode.risk_score) }}>
                    {selectedNode.risk_score?.toFixed(0)}
                  </p>
                </div>
              )}
              {selectedNode.identity_id && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 40%)' }}>Identity</p>
                  <p className="text-xs font-mono" style={{ color: 'hsl(262 83% 70%)' }}>{selectedNode.identity_id}</p>
                </div>
              )}

              {/* Connected nodes */}
              <div>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(215 20% 40%)' }}>Connections</p>
                {edges.filter(e => {
                  const sId = typeof e.source === 'object' ? (e.source as any).id : e.source;
                  const tId = typeof e.target === 'object' ? (e.target as any).id : e.target;
                  return sId === selectedNode.id || tId === selectedNode.id;
                }).map((e, i) => {
                  const sId = typeof e.source === 'object' ? (e.source as any).id : e.source;
                  const tId = typeof e.target === 'object' ? (e.target as any).id : e.target;
                  const otherId = sId === selectedNode.id ? tId : sId;
                  const otherNode = nodes.find(n => n.id === otherId);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs py-1"
                      style={{ borderBottom: '1px solid hsl(217 33% 10%)' }}>
                      <span style={{ color: 'hsl(215 20% 60%)' }}>{otherNode?.label || otherId}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: 'hsl(217 33% 12%)', color: e.edge_type === 'shared_wallet' || e.edge_type === 'wallet_link' ? '#fbbf24' : e.edge_type === 'shared_phone' ? '#38bdf8' : 'hsl(215 20% 55%)' }}>
                        {e.edge_type}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigate button */}
              {selectedNode.identity_id && (
                <button
                  onClick={() => navigate(`/identity?id=${selectedNode.identity_id}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, hsl(245 58% 55%), hsl(262 83% 58%))',
                    color: 'white',
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  View Full Identity Profile
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection Breakdown Table */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>Connection Breakdown</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { type: "wallet_link", label: "Wallet Links", icon: "🔗", color: "#fbbf24", desc: "Account → Wallet ownership" },
            { type: "shared_wallet", label: "Shared Wallets", icon: "💰", color: "#FF5722", desc: "Two accounts same wallet" },
            { type: "shared_phone", label: "Shared Phones", icon: "📱", color: "#FF9800", desc: "Two accounts same phone" },
            { type: "promotes", label: "Promotions", icon: "📢", color: "#2196F3", desc: "Account @mentions another" },
            { type: "same_identity", label: "Same Identity", icon: "👤", color: "#9C27B0", desc: "Resolved as same person" },
          ].map(e => (
            <div key={e.type} className="text-center p-3 rounded-xl" style={{ background: 'hsl(222 47% 5%)' }}>
              <p className="text-lg mb-1">{e.icon}</p>
              <p className="text-xl font-bold" style={{ color: e.color }}>{edgeBreakdown[e.type] || 0}</p>
              <p className="text-[9px] uppercase tracking-wider mt-1" style={{ color: 'hsl(215 20% 42%)' }}>{e.label}</p>
              <p className="text-[9px] mt-1" style={{ color: 'hsl(215 20% 35%)' }}>{e.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick-select nodes for detail panel */}
      {nodes.length > 0 && !selectedNode && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 85%)' }}>High-Risk Nodes</h3>
            <span className="text-[10px] ml-auto" style={{ color: 'hsl(215 20% 40%)' }}>Click to inspect</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nodes
              .filter(n => n.node_type === 'account' && (n.risk_score || 0) >= 50)
              .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
              .slice(0, 12)
              .map(n => (
                <button key={n.id}
                  onClick={() => setSelectedNode(n)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 flex items-center gap-1.5"
                  style={{
                    background: `${riskColor(n.risk_score)}10`,
                    color: riskColor(n.risk_score),
                    border: `1px solid ${riskColor(n.risk_score)}25`,
                  }}>
                  <span>{platformIcon(n.platform)}</span>
                  {n.label}
                  <span className="font-bold">{n.risk_score?.toFixed(0)}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
