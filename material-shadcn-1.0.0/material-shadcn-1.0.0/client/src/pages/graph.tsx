import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function Graph() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const key = sessionStorage.getItem("dtrack_api_key") || "changeme-replace-in-production";

  const { data: graphData } = useQuery({ queryKey: ["/api/graph"] });
  const { data: communities } = useQuery({ queryKey: ["/api/communities"] });

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const res = await fetch("/api/graph/html", {
          headers: { Authorization: `Bearer ${key}` },
        });
        const html = await res.text();
        if (iframeRef.current) {
          iframeRef.current.srcdoc = html;
        }
      } catch (e) {
        console.error("Failed to load graph", e);
      }
    };
    loadGraph();
  }, []);

  const nodes = graphData?.nodes ?? [];
  const edges = graphData?.edges ?? [];

  return (
    <div className="p-6 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Nodes", value: nodes.length },
          { label: "Total Edges", value: edges.length },
          { label: "Account Nodes", value: nodes.filter((n: any) => n.node_type === "account").length },
          { label: "Communities", value: communities?.total_communities ?? "—" },
        ].map(s => (
          <Card key={s.label} className="border border-stone-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-stone-900">{s.value}</p>
              <p className="text-xs text-stone-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-stone-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Critical</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"/>High</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>Medium</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Low</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block"/>Wallet</span>
        <span className="ml-4">● Human  ■ Bot  ◆ Wallet</span>
      </div>

      {/* Graph iframe */}
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <iframe
          ref={iframeRef}
          className="w-full"
          style={{ height: "600px", border: "none" }}
          title="Shadow Graph"
        />
      </div>
    </div>
  );
}
