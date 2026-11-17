"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X, ZoomIn } from "lucide-react";

export interface QuestionImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export function QuestionFigure({ image, inline = false }: { image: QuestionImage; inline?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const alt = image.alt || (inline ? "Option diagram" : "Original question diagram");

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const figure = (
    <Image
      src={image.url}
      alt={alt}
      width={image.width || 800}
      height={image.height || 400}
      style={{ width: image.width || undefined, height: "auto", maxWidth: "100%" }}
      className="block object-contain"
      unoptimized
    />
  );

  return (
    <div className={`relative group/fig rounded-lg bg-white p-2 ${inline ? "inline-block max-w-full overflow-x-auto" : "my-4 max-w-full overflow-x-auto"}`}>
      <button
        type="button"
        aria-label={`Expand image: ${alt}`}
        aria-haspopup="dialog"
        onClick={(e) => {
          if (inline) {
            e.preventDefault();
            e.stopPropagation();
          }
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="relative block max-w-full cursor-zoom-in rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {figure}
        {inline && (
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-slate-900/80 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover/fig:opacity-100 group-focus-within/fig:opacity-100">
            <ZoomIn className="h-3 w-3" /> Zoom
          </span>
        )}
      </button>
      <dialog
        ref={dialog}
        aria-label="Expanded question image"
        className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-slate-950 p-0 text-white backdrop:bg-black/80"
        onClose={() => { setOpen(false); setZoom(1); }}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/20 p-3">
            <span className="text-sm">{inline ? "Option diagram" : "Question image"}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom === 1}
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(1, z - 0.5)); }}
                className="rounded p-2 hover:bg-white/20 disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setZoom(1); }}
                className="rounded px-3 py-2 text-sm hover:bg-white/20"
              >
                Fit to screen
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom === 4}
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(4, z + 0.5)); }}
                className="rounded p-2 hover:bg-white/20 disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                autoFocus
                aria-label="Close image"
                onClick={(e) => { e.stopPropagation(); dialog.current?.close(); }}
                className="rounded p-2 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-3" aria-label="Image details; scroll to explore when zoomed">
            <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
              <Image src={image.url} alt={alt} width={image.width || 800} height={image.height || 400} unoptimized className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
