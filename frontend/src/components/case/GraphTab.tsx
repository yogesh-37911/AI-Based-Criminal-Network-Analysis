"use client";

import dynamic from "next/dynamic";

// Three.js uses browser APIs - must be dynamically imported with SSR disabled
const Graph3D = dynamic(() => import("./Graph3D"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{
        height: 600,
        background: "radial-gradient(ellipse at 40% 35%, #0a1525 0%, #050709 100%)",
        border: "1px solid #1A2235",
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 rounded-full border-2 animate-spin"
          style={{ borderColor: "#3FD0DC22", borderTopColor: "#3FD0DC" }}
        />
        <span className="text-xs font-mono" style={{ color: "#3A4556" }}>
          Initialising 3D engine...
        </span>
      </div>
    </div>
  ),
});

export default function GraphTab({ caseId }: { caseId: string }) {
  return <Graph3D caseId={caseId} />;
}