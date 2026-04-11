import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, NLPResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

const EXAMPLES = [
  { label: "🚨 Explicit coded", text: "❄️ Fresh batch just landed! Premium quality, 2500/g. DM for full menu 🔌" },
  { label: "🟡 Subtle coded", text: "Got the freshest supply in NCR 🔌 DM if you know what I mean" },
  { label: "✅ Benign", text: "Snow capped peaks of Himachal 🏔️❄️ Nothing beats fresh mountain air" },
];

export default function NLPInspector() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<NLPResult | null>(null);

  const analyze = useMutation({
    mutationFn: (t: string) => api.analyzeText(t),
    onSuccess: setResult,
  });

  const scoreColor = result
    ? result.intent_score >= 0.86 ? "text-red-600"
    : result.intent_score >= 0.61 ? "text-orange-600"
    : result.intent_score >= 0.40 ? "text-yellow-600"
    : "text-green-600"
    : "";

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter any message to analyze for drug trafficking intent..."
          className="min-h-28 font-mono text-sm"
        />
        <Button
          onClick={() => analyze.mutate(text)}
          disabled={!text.trim() || analyze.isPending}
          className="bg-stone-800 hover:bg-stone-700 text-white"
        >
          <FlaskConical className="h-4 w-4 mr-2" />
          {analyze.isPending ? "Analyzing..." : "Analyze Intent"}
        </Button>
      </div>

      {/* Examples */}
      <div className="flex gap-2 flex-wrap">
        {EXAMPLES.map(ex => (
          <Button key={ex.label} variant="outline" size="sm"
            onClick={() => { setText(ex.text); analyze.mutate(ex.text); }}>
            {ex.label}
          </Button>
        ))}
      </div>

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-stone-200">
            <CardContent className="p-6 text-center">
              <p className={`text-6xl font-black ${scoreColor}`}>
                {(result.intent_score * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-stone-500 mt-1">Intent Score</p>
              <Badge className={`mt-3 ${result.flagged ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                {result.flagged ? "⚠️ FLAGGED" : "✅ CLEAN"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border border-stone-200">
            <CardContent className="p-6 space-y-3">
              {[
                { label: "Drug Emojis", value: result.has_drug_emojis ? `✅ Detected (+${result.emoji_boost.toFixed(2)})` : "— None" },
                { label: "Price Pattern", value: result.has_price_pattern ? `✅ Detected (+${result.price_boost.toFixed(2)})` : "— None" },
                { label: "Wallet Detected", value: result.has_wallet ? "✅ Yes" : "— No" },
                { label: "Anchor Similarity", value: result.anchor_similarity.toFixed(4) },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-stone-500">{row.label}</span>
                  <span className="font-medium text-stone-900">{row.value}</span>
                </div>
              ))}
              {result.matched_anchor && (
                <div className="mt-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <p className="text-xs text-stone-500 mb-1">Closest Anchor</p>
                  <p className="text-sm italic text-stone-700">"{result.matched_anchor}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
