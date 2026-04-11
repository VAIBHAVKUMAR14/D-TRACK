import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, RiskScoreBar } from "@/components/dtrack/risk-badge";
import { Link } from "react-router-dom";

export default function Leaderboard() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/risk-scores"] });
  const leaderboard = data?.leaderboard ?? [];

  if (isLoading) return <div className="p-6 text-stone-500">Loading leaderboard...</div>;

  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Identity</TableHead>
            <TableHead>Usernames</TableHead>
            <TableHead>Platforms</TableHead>
            <TableHead>Risk Score</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Intent</TableHead>
            <TableHead>Flagged</TableHead>
            <TableHead>Wallet</TableHead>
            <TableHead>Bot</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((entry: any) => (
            <TableRow key={entry.identity_id} className="hover:bg-stone-50 cursor-pointer">
              <TableCell className="font-bold text-stone-400">
                {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank-1] : `#${entry.rank}`}
              </TableCell>
              <TableCell>
                <Link to={`/identity?id=${entry.identity_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                  {entry.identity_id}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-stone-600 max-w-32 truncate">
                {entry.primary_usernames.join(", ")}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {entry.platforms.map((p: string) => (
                    <Badge key={p} variant="outline" className="text-xs">
                      {p === "instagram" ? "📸" : p === "telegram" ? "✈️" : "🐦"} {p}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="min-w-32">
                <RiskScoreBar score={entry.risk_score} />
              </TableCell>
              <TableCell><RiskBadge level={entry.risk_level} /></TableCell>
              <TableCell className="text-sm font-mono">{entry.max_intent_score.toFixed(2)}</TableCell>
              <TableCell className="text-sm">{entry.total_flagged_posts}</TableCell>
              <TableCell>{entry.has_wallet ? "💰" : "—"}</TableCell>
              <TableCell>
                {entry.is_bot_network ? (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">⚠️ BOT</Badge>
                ) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
