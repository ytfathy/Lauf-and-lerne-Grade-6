import React, { useEffect, useState } from 'react';

interface CutoutCharacterImageProps {
  src: string;
  alt: string;
  className?: string;
  enableBlink?: boolean;
}

/**
 * Loads the generated Pixar studio portrait on a pure white studio background and
 * keys out ONLY exterior border-connected white pixels via BFS flood-fill so
 * Malek's white hoodie and sleeves remain 100% solid while compositing cleanly.
 */
export function CutoutCharacterImage({
  src,
  alt,
  className = '',
  enableBlink = true,
}: CutoutCharacterImageProps) {
  const [cutoutSrc, setCutoutSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      try {
        const maxH = 720;
        const scale = Math.min(1, maxH / img.naturalHeight);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCutoutSrc(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isNearWhite = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          return r >= 228 && g >= 228 && b >= 228 && maxC - minC <= 26;
        };

        const enqueue = (idx: number) => {
          if (visited[idx]) return;
          if (!isNearWhite(idx)) return;
          visited[idx] = 1;
          queue[tail++] = idx;
        };

        // Seed all 4 outer borders
        for (let x = 0; x < w; x++) {
          enqueue(x);
          enqueue((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          enqueue(y * w);
          enqueue(y * w + (w - 1));
        }

        while (head < tail) {
          const idx = queue[head++];
          data[idx * 4 + 3] = 0;
          const x = idx % w;
          const y = (idx - x) / w;
          if (x > 0) enqueue(idx - 1);
          if (x + 1 < w) enqueue(idx + 1);
          if (y > 0) enqueue(idx - w);
          if (y + 1 < h) enqueue(idx + w);
        }

        // Feather 1-pixel edge bordering transparent exterior pixels for clean compositing
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (visited[idx]) continue;
            const touchesBg =
              visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w];
            if (touchesBg) {
              const p = idx * 4;
              const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
              if (lum > 205) {
                data[p + 3] = Math.max(40, Math.round((245 - lum) * 4));
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setCutoutSrc(canvas.toDataURL('image/png'));
      } catch {
        setCutoutSrc(src);
      }
    };
    img.onerror = () => {
      if (active) setFailed(true);
    };
    img.src = src;

    return () => {
      active = false;
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-3xl bg-sky-900/60 border-2 border-amber-300/60 text-amber-200 font-black p-6 ${className}`}
      >
        Malek
      </div>
    );
  }

  return (
    <div className={`relative select-none ${className}`}>
      <img
        src={cutoutSrc ?? src}
        alt={alt}
        referrerPolicy="no-referrer"
        draggable={false}
        className="w-full h-full object-contain drop-shadow-[0_14px_24px_rgba(6,24,66,0.55)]"
      />
      {enableBlink && cutoutSrc && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* Natural periodic blink eyelids aligned to Malek's eyes */}
          <span
            className="animate-malek-blink absolute rounded-full"
            style={{
              left: '40.5%',
              top: '23.2%',
              width: '7.8%',
              height: '5.4%',
              background: 'linear-gradient(180deg, #dc9e76 0%, #f0b892 85%, #5b3019 100%)',
            }}
          />
          <span
            className="animate-malek-blink absolute rounded-full"
            style={{
              left: '51.2%',
              top: '23.2%',
              width: '7.8%',
              height: '5.4%',
              background: 'linear-gradient(180deg, #dc9e76 0%, #f0b892 85%, #5b3019 100%)',
            }}
          />
        </div>
      )}
    </div>
  );
}
