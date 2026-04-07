import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/events/service";

const SIZE = { width: 1200, height: 630 };

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const event = await getEventById(id);
  if (!event || event.status !== "published") {
    return new NextResponse(null, { status: 404 });
  }

  const title = truncate(event.title, 70);
  const date = new Date(event.startDatetime).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const price = event.cost === 0 ? "Free" : `${event.currency} ${event.cost}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", color: "#a5b4fc" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>AcroYoga Community</span>
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
            }}
          >
            {title}
          </span>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <span style={{ fontSize: 28, color: "#c7d2fe" }}>{date}</span>
            <span style={{ fontSize: 24, color: "#818cf8" }}>•</span>
            <span style={{ fontSize: 28, color: "#c7d2fe" }}>{event.cityName}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 22, color: "#818cf8" }}>{event.category}</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#ffffff",
              background: "#4f46e5",
              padding: "8px 24px",
              borderRadius: "8px",
            }}
          >
            {price}
          </span>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    },
  );
}
