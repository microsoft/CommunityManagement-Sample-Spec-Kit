// Email rendering — Spec 015
//
// Renders notification data into HTML emails using templates.
// Uses simple string replacement (no external template engine needed).

import { readFileSync } from "fs";
import { resolve, dirname } from "path";

// Template directory path — resolved relative to this file
const TEMPLATE_DIR = resolve(dirname(new URL(import.meta.url).pathname), "templates");

let baseTemplate: string | null = null;
let notificationTemplate: string | null = null;

function getBaseTemplate(): string {
  if (!baseTemplate) {
    baseTemplate = readFileSync(
      resolve(TEMPLATE_DIR, "base.html"),
      "utf-8",
    );
  }
  return baseTemplate;
}

function getNotificationTemplate(): string {
  if (!notificationTemplate) {
    notificationTemplate = readFileSync(
      resolve(TEMPLATE_DIR, "notification.html"),
      "utf-8",
    );
  }
  return notificationTemplate;
}

export interface RenderEmailOptions {
  subject: string;
  title: string;
  body: string;
  actionUrl?: string;
  unsubscribeUrl: string;
}

/**
 * Render a notification email from templates.
 */
export function renderNotificationEmail(options: RenderEmailOptions): string {
  let content = getNotificationTemplate()
    .replace("{{TITLE}}", escapeHtml(options.title))
    .replace("{{BODY}}", escapeHtml(options.body));

  // Handle conditional action URL
  if (options.actionUrl) {
    content = content
      .replace("{{#ACTION_URL}}", "")
      .replace("{{/ACTION_URL}}", "")
      .replace("{{ACTION_URL}}", options.actionUrl);
  } else {
    content = content.replace(/\{\{#ACTION_URL\}\}[\s\S]*?\{\{\/ACTION_URL\}\}/g, "");
  }

  return getBaseTemplate()
    .replace("{{SUBJECT}}", escapeHtml(options.subject))
    .replace("{{CONTENT}}", content)
    .replace("{{UNSUBSCRIBE_URL}}", options.unsubscribeUrl);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
