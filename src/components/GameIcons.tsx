import React from 'react';
import { GAME_TITLE } from '../game/constants';
import type { PowerUpType } from '../game/types';

export function MalekLogoSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 540 230"
      className={className}
      role="img"
      aria-label={GAME_TITLE}
    >
      <defs>
        <linearGradient id="laufGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="capNavy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="logoShadow" x="-12%" y="-12%" width="128%" height="136%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#05173d" floodOpacity="0.88" />
        </filter>
      </defs>

      {/* Waving German Flag Ribbon Behind Title */}
      <g filter="url(#logoShadow)" transform="rotate(-4 270 118)">
        <path
          d="M52 72 Q175 44 295 68 T465 56 L478 96 Q355 112 245 92 T62 110 Z"
          fill="#111827"
        />
        <path
          d="M60 98 Q175 72 295 94 T474 84 L482 122 Q355 138 245 118 T68 134 Z"
          fill="#dc2626"
        />
        <path
          d="M66 124 Q175 98 295 118 T480 110 L486 146 Q355 162 245 142 T74 156 Z"
          fill="#facc15"
        />
        {/* Subtle gloss highlight on ribbon */}
        <path
          d="M72 78 Q180 54 295 74 T460 64"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* Graduation Cap Sitting Above Center */}
      <g filter="url(#logoShadow)" transform="translate(238, 2) rotate(5 42 28)">
        {/* Cap base */}
        <path d="M22 36 Q45 50 68 36 L64 52 Q45 62 26 52 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
        {/* Mortarboard diamond */}
        <polygon
          points="45,6 92,24 45,42 -2,24"
          fill="url(#capNavy)"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Tassel */}
        <circle cx="45" cy="24" r="3.5" fill="#fbbf24" />
        <path d="M45 24 Q74 28 78 52" fill="none" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M74 51 L82 51 L84 62 L72 62 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="1" />
      </g>

      {/* Primary Gold Display: "Lauf und Lerne" */}
      <g filter="url(#logoShadow)" transform="rotate(-3 270 112)">
        <text
          x="270"
          y="122"
          textAnchor="middle"
          fontSize="64"
          fontWeight="900"
          fontStyle="italic"
          letterSpacing="-1"
          fill="url(#laufGold)"
          stroke="#06286b"
          strokeWidth="15"
          strokeLinejoin="round"
          paintOrder="stroke fill"
        >
          Lauf und Lerne
        </text>
      </g>

      {/* White Curved Plaque Banner for "mit Malek!" */}
      <g filter="url(#logoShadow)" transform="rotate(-3 245 170)">
        <rect
          x="105"
          y="138"
          width="284"
          height="58"
          rx="29"
          fill="#ffffff"
          stroke="#06286b"
          strokeWidth="7"
        />
        <text
          x="247"
          y="179"
          textAnchor="middle"
          fontSize="40"
          fontWeight="900"
          fontStyle="italic"
          fill="#b91c1c"
          stroke="#ffffff"
          strokeWidth="1"
        >
          mit Malek!
        </text>
      </g>

      {/* Open Golden Book Icon at Bottom-Right */}
      <g filter="url(#logoShadow)" transform="translate(384, 138) rotate(10 42 36)">
        <path
          d="M4 18 Q24 10 42 20 L42 64 Q24 54 4 62 Z"
          fill="#fef9c3"
          stroke="#d97706"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M80 18 Q60 10 42 20 L42 64 Q60 54 80 62 Z"
          fill="#fef3c7"
          stroke="#d97706"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M12 28 Q26 23 36 29 M12 39 Q26 34 36 40 M12 50 Q26 45 36 51" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M48 29 Q58 23 72 28 M48 40 Q58 34 72 39 M48 51 Q58 45 72 50" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

const IEE_LOGO_SRC = '/assets/aistudio/5c094ceb-eb9a-40e8-bf4f-aa9eb4c60f29_5b10bf33.jpeg';

export function InternationalEducationEgyptLogo({ className = '' }: { className?: string }) {
  const [cutoutSrc, setCutoutSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!active) return;
      try {
        const maxW = 860;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const total = w * h;

        // 0 = keep, 1 = transparent background/border
        const removed = new Uint8Array(total);
        const queue = new Int32Array(total);
        let head = 0;
        let tail = 0;

        const isExteriorBlack = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          return Math.max(r, g, b) <= 46 && Math.max(r, g, b) - Math.min(r, g, b) <= 28;
        };

        const isNeutralGray = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          return Math.max(r, g, b) - Math.min(r, g, b) <= 34;
        };

        const isWhiteStickerBorder = (idx: number) => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          return minC >= 178 && maxC - minC <= 40;
        };

        // Pass 1: Flood-fill exterior black from edges
        const enqueueBlack = (idx: number) => {
          if (removed[idx] || !isExteriorBlack(idx)) return;
          removed[idx] = 1;
          queue[tail++] = idx;
        };

        for (let x = 0; x < w; x++) {
          enqueueBlack(x);
          enqueueBlack((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          enqueueBlack(y * w);
          enqueueBlack(y * w + (w - 1));
        }

        while (head < tail) {
          const idx = queue[head++];
          const x = idx % w;
          const y = (idx - x) / w;
          if (x > 0) enqueueBlack(idx - 1);
          if (x + 1 < w) enqueueBlack(idx + 1);
          if (y > 0) enqueueBlack(idx - w);
          if (y + 1 < h) enqueueBlack(idx + w);
        }

        // Pass 2: Step up to 4px across JPEG black-to-white neutral anti-aliased edge
        let frontier: number[] = [];
        for (let i = 0; i < tail; i++) frontier.push(queue[i]);

        for (let step = 0; step < 4 && frontier.length > 0; step++) {
          const nextFrontier: number[] = [];
          for (const idx of frontier) {
            const x = idx % w;
            const y = (idx - x) / w;
            const nbs = [
              x > 0 ? idx - 1 : -1,
              x + 1 < w ? idx + 1 : -1,
              y > 0 ? idx - w : -1,
              y + 1 < h ? idx + w : -1,
            ];
            for (const n of nbs) {
              if (n < 0 || removed[n]) continue;
              if (isNeutralGray(n) || isWhiteStickerBorder(n)) {
                removed[n] = 1;
                nextFrontier.push(n);
              }
            }
          }
          frontier = nextFrontier;
        }

        // Pass 3: Flood-fill the entire exterior white sticker border (stopping cleanly at colored/navy strokes)
        head = 0;
        tail = 0;
        for (let idx = 0; idx < total; idx++) {
          if (!removed[idx]) continue;
          const x = idx % w;
          const y = (idx - x) / w;
          const nbs = [
            x > 0 ? idx - 1 : -1,
            x + 1 < w ? idx + 1 : -1,
            y > 0 ? idx - w : -1,
            y + 1 < h ? idx + w : -1,
          ];
          for (const n of nbs) {
            if (n >= 0 && !removed[n] && isWhiteStickerBorder(n)) {
              removed[n] = 1;
              queue[tail++] = n;
            }
          }
        }

        while (head < tail) {
          const idx = queue[head++];
          const x = idx % w;
          const y = (idx - x) / w;
          const nbs = [
            x > 0 ? idx - 1 : -1,
            x + 1 < w ? idx + 1 : -1,
            y > 0 ? idx - w : -1,
            y + 1 < h ? idx + w : -1,
          ];
          for (const n of nbs) {
            if (n >= 0 && !removed[n] && isWhiteStickerBorder(n)) {
              removed[n] = 1;
              queue[tail++] = n;
            }
          }
        }

        // Pass 4: Remove enclosed white sticker counter-holes inside upper letters (y < 70%, safely above Egypt ribbon/flag)
        const upperLimitY = Math.round(h * 0.7);
        const holeVisited = new Uint8Array(total);
        for (let y = 0; y < upperLimitY; y++) {
          for (let x = 0; x < w; x++) {
            const start = y * w + x;
            if (removed[start] || holeVisited[start]) continue;
            const p = start * 4;
            const minC = Math.min(data[p], data[p + 1], data[p + 2]);
            const maxC = Math.max(data[p], data[p + 1], data[p + 2]);
            if (minC < 214 || maxC - minC > 24) continue;

            // Flood component within upper region
            let hHead = 0;
            let hTail = 0;
            holeVisited[start] = 1;
            queue[hTail++] = start;
            let touchesEgyptZone = false;
            while (hHead < hTail) {
              const cur = queue[hHead++];
              const cx = cur % w;
              const cy = (cur - cx) / w;
              if (cy >= upperLimitY - 1) touchesEgyptZone = true;
              const nbs = [
                cx > 0 ? cur - 1 : -1,
                cx + 1 < w ? cur + 1 : -1,
                cy > 0 ? cur - w : -1,
                cy + 1 < upperLimitY ? cur + w : -1,
              ];
              for (const n of nbs) {
                if (n < 0 || removed[n] || holeVisited[n]) continue;
                const np = n * 4;
                const nMin = Math.min(data[np], data[np + 1], data[np + 2]);
                const nMax = Math.max(data[np], data[np + 1], data[np + 2]);
                if (nMin >= 186 && nMax - nMin <= 36) {
                  holeVisited[n] = 1;
                  queue[hTail++] = n;
                }
              }
            }
            if (!touchesEgyptZone && hTail >= 6) {
              for (let k = 0; k < hTail; k++) {
                removed[queue[k]] = 1;
              }
            }
          }
        }

        // Apply transparency to removed pixels
        for (let idx = 0; idx < total; idx++) {
          if (removed[idx]) data[idx * 4 + 3] = 0;
        }

        // Pass 5: Smooth 1px anti-white de-halo along remaining edges so no white rim persists
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (removed[idx]) continue;
            const touchesCutout =
              removed[idx - 1] || removed[idx + 1] || removed[idx - w] || removed[idx + w];
            if (!touchesCutout) continue;

            const p = idx * 4;
            const r = data[p];
            const g = data[p + 1];
            const b = data[p + 2];
            const minC = Math.min(r, g, b);
            const maxC = Math.max(r, g, b);
            const sat = maxC - minC;
            const lum = (r + g + b) / 3;

            if (sat <= 60 && lum >= 135) {
              const t = Math.min(1, Math.max(0, (lum - 135) / 95));
              const newAlpha = Math.round(255 * (1 - t));
              if (newAlpha < 18) {
                data[p + 3] = 0;
              } else {
                // Un-premultiply white fringe cleanly
                const factor = 255 / newAlpha;
                data[p] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - newAlpha / 255)) * factor)));
                data[p + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - newAlpha / 255)) * factor)));
                data[p + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - newAlpha / 255)) * factor)));
                data[p + 3] = newAlpha;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Tightly crop to non-transparent bounds so sizing matches artwork directly
        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 12) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX && maxY > minY) {
          const pad = 2;
          const sx = Math.max(0, minX - pad);
          const sy = Math.max(0, minY - pad);
          const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
          const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);
          const cropped = document.createElement('canvas');
          cropped.width = sw;
          cropped.height = sh;
          const cCtx = cropped.getContext('2d');
          if (cCtx) {
            cCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            setCutoutSrc(cropped.toDataURL('image/png'));
            return;
          }
        }

        setCutoutSrc(canvas.toDataURL('image/png'));
      } catch {
        // Fallback cleanly
      }
    };
    img.src = IEE_LOGO_SRC;
    return () => {
      active = false;
    };
  }, []);

  return (
    <img
      src={cutoutSrc ?? IEE_LOGO_SRC}
      alt="International Education Egypt"
      referrerPolicy="no-referrer"
      draggable={false}
      style={cutoutSrc ? undefined : { opacity: 0 }}
      className={`object-contain select-none drop-shadow-[0_0_7px_rgba(255,255,255,0.58)] drop-shadow-[0_4px_10px_rgba(6,24,66,0.4)] transition-opacity duration-200 ${className}`}
    />
  );
}

export function GoldStarCoinSvg({ className = 'w-12 h-12' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="coinFaceGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="45%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="34" r="27" fill="#92400e" />
      <circle cx="32" cy="31" r="27" fill="url(#coinFaceGold)" stroke="#fef08a" strokeWidth="3" />
      <circle cx="32" cy="31" r="20.5" fill="#eab308" stroke="#b45309" strokeWidth="2" />
      <polygon
        points="32,16 36.4,25.2 46.5,26.6 39.2,33.6 41,43.6 32,38.8 23,43.6 24.8,33.6 17.5,26.6 27.6,25.2"
        fill="#fef9c3"
        stroke="#b45309"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <ellipse cx="22" cy="18" rx="6" ry="2.6" transform="rotate(-28 22 18)" fill="rgba(255,255,255,0.65)" />
    </svg>
  );
}

export function CoinIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="8" fill="#facc15" stroke="#fef08a" strokeWidth="1.2" />
      <path
        d="M7.8 16V8h2.1l2.1 3.6L14.1 8h2.1v8h-2v-4.5l-1.8 3h-.8l-1.8-3V16H7.8z"
        fill="#92400e"
      />
    </svg>
  );
}

export function GemIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon
        points="6,4 18,4 22,10 12,21 2,10"
        fill="#0ea5e9"
        stroke="#0c4a6e"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <polygon points="6,4 18,4 16,10 8,10" fill="#7dd3fc" />
      <polygon points="8,10 16,10 12,21" fill="#38bdf8" />
    </svg>
  );
}

export function StarMultiplierIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon
        points="12,2 15,8.5 22,9.3 16.8,14 18.2,21 12,17.5 5.8,21 7.2,14 2,9.3 9,8.5"
        fill="#facc15"
        stroke="#92400e"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PowerUpIcon({ type, className = 'w-5 h-5' }: { type: PowerUpType; className?: string }) {
  if (type === 'magnet') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path
          d="M6 4v8a6 6 0 0 0 12 0V4h-3.5v8a2.5 2.5 0 0 1-5 0V4H6z"
          fill="#ef4444"
          stroke="#7f1d1d"
          strokeWidth="1.4"
        />
        <rect x="6" y="4" width="3.5" height="3" fill="#e2e8f0" />
        <rect x="14.5" y="4" width="3.5" height="3" fill="#e2e8f0" />
      </svg>
    );
  }
  if (type === 'jetpack') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 2c3 3 4 7 4 12H8c0-5 1-9 4-12z" fill="#22c55e" stroke="#14532d" strokeWidth="1.4" />
        <path d="M8 12l-3 3v3l3-1zM16 12l3 3v3l-3-1z" fill="#ef4444" />
        <path d="M10 15l2 6 2-6z" fill="#f97316" />
      </svg>
    );
  }
  if (type === 'sneakers') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M3 15l3-6 4 2 4-4 6 6v4H3v-2z" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1.4" />
        <rect x="3" y="16.5" width="17" height="2.5" rx="1" fill="#ffffff" />
      </svg>
    );
  }
  if (type === 'multiplier') {
    return <StarMultiplierIcon className={className} />;
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2l8 3.5v6c0 5-3.4 9.2-8 10.5C7.4 20.7 4 16.5 4 11.5v-6L12 2z"
        fill="#06b6d4"
        stroke="#083344"
        strokeWidth="1.5"
      />
      <path d="M8.5 14V9h1.6l1.9 3 1.9-3h1.6v5h-1.4v-2.8l-1.5 2.2h-1.2l-1.5-2.2V14H8.5z" fill="#fef08a" />
    </svg>
  );
}
