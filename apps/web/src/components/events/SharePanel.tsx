"use client";

import { useState, useCallback } from "react";
import type { ShareMetaResponse, ShareSource } from "@acroyoga/shared/types/seo";
import { SHARE_PANEL_MESSAGES as msg } from "./share-panel-messages";

interface SharePanelProps {
  meta: ShareMetaResponse;
}

const SOURCE_MEDIUM: Record<ShareSource, string> = {
  twitter: "social",
  whatsapp: "messaging",
  facebook: "social",
  linkedin: "social",
  clipboard: "referral",
  native: "referral",
};

function buildShareUrl(
  base: string,
  source: ShareSource,
  campaign = "event-share",
): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", SOURCE_MEDIUM[source]);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

export default function SharePanel({ meta }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = buildShareUrl(meta.url, "clipboard");
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: create temporary input
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [meta.url]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator.share !== "function") return;
    await navigator.share({
      title: meta.title,
      text: meta.description,
      url: buildShareUrl(meta.url, "native"),
    });
  }, [meta]);

  const twitterUrl =
    "https://twitter.com/intent/tweet?" +
    new URLSearchParams({
      url: buildShareUrl(meta.url, "twitter"),
      text: meta.title,
    }).toString();

  const whatsappUrl =
    "https://wa.me/?" +
    new URLSearchParams({
      text: `${meta.title} ${buildShareUrl(meta.url, "whatsapp")}`,
    }).toString();

  const hasNativeShare = typeof window !== "undefined" && "share" in navigator;

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-sm font-medium"
        aria-label={msg.shareThisEvent}
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>

      {open && (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog role is interactive per WAI-ARIA
        <div
          role="dialog"
          aria-modal="true"
          aria-label={msg.shareEvent}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{msg.shareEvent}</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
                aria-label={msg.closeSharePanel}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4 truncate">{meta.title}</p>

            <div className="flex flex-col gap-3">
              {/* Copy Link */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border hover:bg-gray-50 text-start min-h-[44px]"
                aria-label={copied ? msg.linkCopied : msg.copyLink}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span className="text-sm">
                  {copied ? msg.linkCopied : msg.copyLink}
                </span>
              </button>

              {/* Native Share (mobile) */}
              {hasNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border hover:bg-gray-50 text-start min-h-[44px]"
                  aria-label={msg.shareVia}
                >
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                  <span className="text-sm">{msg.shareVia}</span>
                </button>
              )}

              {/* Twitter/X */}
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border hover:bg-gray-50 min-h-[44px]"
                aria-label={msg.twitterX}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-sm">{msg.twitterX}</span>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border hover:bg-gray-50 min-h-[44px]"
                aria-label={msg.whatsApp}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-sm">{msg.whatsApp}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
