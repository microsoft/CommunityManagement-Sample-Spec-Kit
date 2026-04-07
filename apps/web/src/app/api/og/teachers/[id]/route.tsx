import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { getTeacherProfile } from "@/lib/teachers/profiles";

const SIZE = { width: 1200, height: 630 };

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const profile = await getTeacherProfile(id);
  if (!profile || profile.is_deleted) {
    return new NextResponse(null, { status: 404 });
  }

  const name = truncate(profile.user_name, 50);
  const bio = profile.bio ? truncate(profile.bio, 120) : "AcroYoga Teacher";
  const firstPhoto = profile.photos?.[0]?.url;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", color: "#6ee7b7" }}>
          <span style={{ fontSize: 24, fontWeight: 700 }}>AcroYoga Community</span>
        </div>

        {/* Profile */}
        <div style={{ display: "flex", gap: "40px", alignItems: "center" }}>
          {firstPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element -- OG ImageResponse uses satori; next/image is unsupported */
            <img
              src={firstPhoto}
              width={200}
              height={200}
              style={{ borderRadius: "50%", objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                background: "#047857",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 72, color: "#6ee7b7" }}>
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <span style={{ fontSize: 52, fontWeight: 800, color: "#ffffff" }}>
              {name}
            </span>
            <span style={{ fontSize: 26, color: "#a7f3d0" }}>
              AcroYoga Teacher
            </span>
            <span style={{ fontSize: 22, color: "#6ee7b7", lineHeight: 1.4 }}>
              {bio}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: "#34d399", fontSize: 20 }}>
          Find teachers at acroyoga.community
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
