"use client";

import { useState } from "react";

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  web: "Web sitesi",
};

/** Kaynak videonun gömülü ön izlemesi (YouTube) ya da linki. */
export default function SourceEmbed({
  url,
  platform,
  author,
  authorUrl,
}: {
  url: string | null;
  platform: string | null;
  author: string | null;
  authorUrl: string | null;
}) {
  const [show, setShow] = useState(false);
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  const label = PLATFORM_LABEL[platform ?? ""] ?? "Kaynak";

  return (
    <div style={{ margin: "0 0 12px", fontSize: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", color: "var(--ink-soft)" }}>
        <span>Kaynak:</span>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "var(--accent)" }}>
          {label}
        </a>
        {author && (
          <>
            <span>·</span>
            {authorUrl ? (
              <a href={authorUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                {author}
              </a>
            ) : (
              <span>{author}</span>
            )}
          </>
        )}
        {yt && !show && (
          <button type="button" className="chip" style={{ minHeight: 32 }} onClick={() => setShow(true)}>
            ▶ Videoyu izle
          </button>
        )}
      </div>
      {yt && show && (
        <div style={{ aspectRatio: "16/9", marginTop: 8, borderRadius: 8, overflow: "hidden", background: "#000" }}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt[1]}`}
            title="Kaynak video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}
    </div>
  );
}
