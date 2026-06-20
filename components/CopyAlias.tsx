"use client";

import { useState } from "react";

export function CopyAlias({ alias }: { alias: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(alias);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <button
      onClick={copy}
      className="group inline-flex items-center gap-2.5 rounded-full border border-[var(--color-line)] bg-cream px-4 py-2.5 text-[14px] font-medium text-espresso transition-all duration-300 hover:border-sage/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/40"
      aria-label={`Copiar alias ${alias}`}
    >
      <span className="font-mono tracking-tight">{alias}</span>
      <span className="text-sage-deep">
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
      <span className="sr-only">{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}
