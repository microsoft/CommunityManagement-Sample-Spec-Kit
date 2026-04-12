import { Suspense } from "react";
import ExplorerPage from "@/components/events/ExplorerPage";

export const metadata = {
  title: "Events Explorer",
  description: "Explore community events by calendar, map, and location.",
};

export default function ExplorerRoute() {
  return (
    <div style={{ height: "calc(100vh - 64px)" }}>
      <h1 style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", borderWidth: 0 }}>
        Events Explorer
      </h1>
      <Suspense
        fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <span>Loading explorer…</span>
          </div>
        }
      >
        <ExplorerPage />
      </Suspense>
    </div>
  );
}
