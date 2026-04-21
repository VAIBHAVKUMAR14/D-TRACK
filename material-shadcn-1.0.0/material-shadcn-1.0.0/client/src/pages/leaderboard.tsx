import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? '#f87171' : score >= 60 ? '#fb923c' : score >= 30 ? '#fbbf24' : '#4ade80';
  return (
    <div className="flex items-center gap-2 min-w-32">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(217 33% 12%)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color }}>{score.toFixed(0)}</span>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    Critical: { bg: 'rgba(239,68,68,0.12)', color: '#f87171' },
    High: { bg: 'rgba(249,115,22,0.12)', color: '#fb923c' },
    Medium: { bg: 'rgba(234,179,8,0.12)', color: '#fbbf24' },
    Low: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  };
  const s = styles[level] || styles.Low;
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}25` }}>
      {level}
    </span>
  );
}

export default function Leaderboard() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/risk-scores"] });
  const leaderboard = data?.leaderboard ?? [];

  if (isLoading) return <div className="p-6" style={{ color: 'hsl(215 20% 50%)' }}>Loading leaderboard...</div>;

  return (
    <div className="p-5 lg:p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(217 33% 13%)' }}>
              {["Rank", "Identity", "Usernames", "Platforms", "Risk Score", "Level", "Intent", "Flagged", "Wallet", "Bot"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: 'hsl(215 20% 40%)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry: any, idx: number) => (
              <tr key={entry.identity_id}
                className="transition-colors hover:bg-white/[0.02] group"
                style={{ borderBottom: '1px solid hsl(217 33% 10%)' }}
              >
                <td className="px-3 py-3 font-bold text-lg"
                  style={{ color: idx < 3 ? ['#fbbf24', '#94a3b8', '#cd7c32'][idx] : 'hsl(215 20% 35%)' }}>
                  {idx < 3 ? ["🥇","🥈","🥉"][idx] : `#${entry.rank}`}
                </td>
                <td className="px-3 py-3">
                  <Link to={`/identity?id=${entry.identity_id}`}
                    className="font-mono text-xs transition-colors hover:text-purple-400"
                    style={{ color: 'hsl(262 83% 70%)' }}>
                    {entry.identity_id}
                  </Link>
                </td>
                <td className="px-3 py-3 text-xs max-w-32 truncate" style={{ color: 'hsl(215 20% 60%)' }}>
                  {entry.primary_usernames.join(", ")}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {entry.platforms.map((p: string) => (
                      <span key={p} className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'hsl(217 33% 12%)', color: 'hsl(215 20% 55%)' }}>
                        {p === "instagram" ? "📸" : p === "telegram" ? "✈️" : "🐦"}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 min-w-36"><RiskBar score={entry.risk_score} /></td>
                <td className="px-3 py-3"><RiskBadge level={entry.risk_level} /></td>
                <td className="px-3 py-3 font-mono text-xs" style={{ color: entry.max_intent_score >= 0.4 ? '#fb923c' : 'hsl(215 20% 50%)' }}>
                  {entry.max_intent_score.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-xs" style={{ color: 'hsl(215 20% 55%)' }}>{entry.total_flagged_posts}</td>
                <td className="px-3 py-3">{entry.has_wallet ? "💰" : <span style={{ color: 'hsl(215 20% 30%)' }}>—</span>}</td>
                <td className="px-3 py-3">
                  {entry.is_bot_network ? (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                      ⚠️ BOT
                    </span>
                  ) : <span style={{ color: 'hsl(215 20% 30%)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
