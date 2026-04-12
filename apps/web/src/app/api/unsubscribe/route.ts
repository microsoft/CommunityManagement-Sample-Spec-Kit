// GET /api/unsubscribe — One-click email unsubscribe
//
// No authentication required — uses signed tokens from email links.
// Verifies the token, updates notification preferences, returns confirmation HTML.
// Constitution VIII: All user-facing strings from template-messages.ts.

import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { updatePreference } from "@/lib/notifications/preferences";
import { TEMPLATE_MESSAGES as tmsg } from "@/lib/notifications/template-messages";

function buildConfirmationHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${tmsg.unsubscribeConfirmTitle}</title>
  <style>
    body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; text-align: center; }
    .card { max-width: 400px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; color: #111827; margin: 0 0 12px; }
    p { color: #4b5563; line-height: 1.5; }
    a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${tmsg.unsubscribeConfirmTitle}</h1>
    <p>${tmsg.unsubscribeConfirmBody}</p>
    <p>${tmsg.unsubscribeConfirmSettings} <a href="/settings/notifications">${tmsg.unsubscribeSettingsLink}</a>.</p>
  </div>
</body>
</html>`;
}

function buildErrorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${tmsg.unsubscribeErrorTitle}</title>
  <style>
    body { margin: 0; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; text-align: center; }
    .card { max-width: 400px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; color: #dc2626; margin: 0 0 12px; }
    p { color: #4b5563; line-height: 1.5; }
    a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${tmsg.unsubscribeErrorTitle}</h1>
    <p>${tmsg.unsubscribeErrorBody}</p>
    <p>${tmsg.unsubscribeErrorSettings} <a href="/settings/notifications">${tmsg.unsubscribeSettingsLink}</a>.</p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(buildErrorHtml(), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const payload = verifyUnsubscribeToken(token);

  if (!payload) {
    return new NextResponse(buildErrorHtml(), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Update the preference to disable this channel for this notification type
  await updatePreference(
    payload.userId,
    payload.notificationType,
    payload.channel,
    false,
  );

  return new NextResponse(buildConfirmationHtml(), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
