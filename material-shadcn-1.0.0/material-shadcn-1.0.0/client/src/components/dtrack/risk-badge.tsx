import { cn } from "@/lib/utils";

const config = {
  Critical: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  High:     { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  Medium:   { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", dot: "bg-yellow-500" },
  Low:      { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
};

export function RiskBadge({ level }: { level: string }) {
  const c = config[level as keyof typeof config] ?? config.Low;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {level.toUpperCase()}
    </span>
  );
}

export function RiskScoreBar({ score }: { score: number }) {
  const color = score >= 86 ? "bg-red-500" : score >= 61 ? "bg-orange-500" : score >= 31 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold text-stone-900 dark:text-white w-10">{score.toFixed(0)}</span>
      <div className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-full h-1.5">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
