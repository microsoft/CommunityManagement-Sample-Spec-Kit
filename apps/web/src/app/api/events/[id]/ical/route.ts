import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/events/service";
import ical, { ICalCalendarMethod } from "ical-generator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const calendar = ical({ name: "AcroYoga Events" });
  calendar.method(ICalCalendarMethod.PUBLISH);

  calendar.createEvent({
    start: new Date(event.startDatetime),
    end: new Date(event.endDatetime),
    summary: event.title,
    description: event.description ?? undefined,
    location: {
      title: `${event.venue.name}, ${event.venue.address}`,
      geo: { lat: event.venue.latitude, lon: event.venue.longitude },
    },
    url: event.externalUrl ?? undefined,
  });

  const icsContent = calendar.toString();

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`,
    },
  });
}
