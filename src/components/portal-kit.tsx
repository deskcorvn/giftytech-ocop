"use client";

import type { ReactNode } from "react";

export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: unknown } };

export class ApiFailure extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin", ...init });
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !body?.ok) {
    const failure = body && !body.ok ? body.error : null;
    throw new ApiFailure(response.status, failure?.code ?? "request_failed", failure?.message ?? "Không thể kết nối hệ thống.", failure?.details);
  }
  return body.data;
}

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    play: <path d="m9 6 9 6-9 6Z" />,
    pencil: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" /><path d="m14 7 3 3" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M18 12a6 6 0 0 0-10-4L5 11M6 12a6 6 0 0 0 10 4l3-3" /></>,
    arrow: <><path d="M5 12h14" /><path d="m15 8 4 4-4 4" /></>,
    back: <><path d="M19 12H5" /><path d="m9 8-4 4 4 4" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3" /></>,
    save: <><path d="M5 4h12l2 2v14H5Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></>,
    file: <><path d="M7 3h7l4 4v14H7Z" /><path d="M14 3v5h5" /></>,
    logout: <><path d="M10 5H5v14h5" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z" /></>,
    map: <><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2Z" /><path d="M9 4v14M15 6v14" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1 .8-1 1.6M12 17h.01" /></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /></>,
    external: <><path d="M14 5h5v5M12 12l7-7" /><path d="M19 13v6H5V5h6" /></>,
    microphone: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" /><circle cx="12" cy="12" r="2.5" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    chat: <><path d="M4 5h16v12H8l-4 4Z" /><path d="M8 9h8M8 13h5" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></>,
    award: <><circle cx="12" cy="8" r="5" /><path d="m8.5 12-1 9 4.5-3 4.5 3-1-9" /></>,
    warning: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5M12 18h.01" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`easy-brand ${compact ? "compact" : ""}`}>
      <span className="easy-brand-mark">G</span>
      <span><strong>GiftyID</strong><small>Đồng hành OCOP</small></span>
    </div>
  );
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function humanFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
