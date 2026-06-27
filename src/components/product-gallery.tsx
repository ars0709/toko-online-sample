"use client";
import { useState } from "react";

export function ProductGallery({ images }: { images: { url: string; alt: string }[] }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
        {main && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={main.url} alt={main.alt} className="h-full w-full object-cover" />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`size-16 overflow-hidden rounded-md border-2 ${i === active ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
