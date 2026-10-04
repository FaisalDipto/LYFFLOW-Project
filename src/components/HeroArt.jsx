import React from 'react';

/*
 * Illustrated backgrounds for the three hero panels. Each is one bold colour field
 * (ManyChat-style) with oversized shapes that tell the panel's story. All three share
 * a 460×900 artboard and crop with `slice`, so they fill any panel size.
 */

const DISPLAY = "'Archivo Variable', 'Arial Black', sans-serif";
const heavy = { fontFamily: DISPLAY, fontWeight: 900, fontStretch: '112%' };

function Art({ children, label }) {
  return (
    <svg viewBox="0 0 460 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

// Tiny four-point sparkle.
const sparkle = (x, y, r, fill) => (
  <path key={`${x}-${y}`} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`} fill={fill} />
);

// ── Products (shared by the art and the chat's product card) ─────────────────

const INK = '#1A0620';

// A yellow hoodie, centred on its own origin; about 300 × 360.
export function HoodieShape({ fill = '#FFF100', shade = '#E6D200' }) {
  return (
    <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      {/* hood */}
      <path d="M-58 -96 Q-66 -176 0 -180 Q66 -176 58 -96 Q30 -74 0 -74 Q-30 -74 -58 -96Z" fill={shade} />
      <path d="M-34 -100 Q-30 -150 0 -152 Q30 -150 34 -100 Q18 -90 0 -90 Q-18 -90 -34 -100Z" fill={INK} opacity="0.85" />
      {/* body + sleeves */}
      <path
        d="M-78 -98 L-132 -76 L-156 118 L-110 126 L-96 -14 L-92 170 L92 170 L96 -14 L110 126 L156 118 L132 -76 L78 -98 Q40 -72 0 -72 Q-40 -72 -78 -98Z"
        fill={fill}
      />
      {/* cuffs + hem */}
      <path d="M-156 118 L-110 126 L-112 146 L-158 138Z" fill={shade} />
      <path d="M156 118 L110 126 L112 146 L158 138Z" fill={shade} />
      <path d="M-92 170 L92 170 L92 194 L-92 194Z" fill={shade} />
      {/* pocket */}
      <path d="M-62 70 L62 70 L78 140 L-78 140Z" fill={shade} />
      {/* drawstrings */}
      <path d="M-16 -76 L-20 -8" fill="none" />
      <path d="M16 -76 L20 -8" fill="none" />
      <circle cx="-20" cy="-4" r="4" fill={INK} />
      <circle cx="20" cy="-4" r="4" fill={INK} />
    </g>
  );
}

// A sneaker in side view facing right, centred on its own origin; about 340 × 190.
export function SneakerShape() {
  return (
    <g stroke={INK} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
      {/* outsole + midsole */}
      <path d="M-166 44 L150 44 Q182 44 176 16 L-168 16 Q-180 32 -166 44Z" fill={INK} />
      <path d="M-164 16 L172 16 Q176 -4 164 -14 L-160 -14 Q-172 0 -164 16Z" fill="#FFFFFF" />
      {/* upper */}
      <path d="M-160 -14 Q-170 -78 -124 -92 L-44 -104 Q4 -150 54 -146 L86 -92 Q142 -70 164 -14Z" fill="#F4F0FF" />
      {/* toe cap + heel tab in brand colours */}
      <path d="M96 -86 Q146 -66 164 -14 L100 -14 Q96 -52 96 -86Z" fill="#FFF100" />
      <path d="M-160 -14 Q-170 -78 -124 -92 L-104 -95 Q-122 -48 -100 -14Z" fill="#FA0CF7" />
      {/* collar */}
      <path d="M-44 -104 Q-20 -84 20 -96" fill="none" />
      {/* side panel */}
      <path d="M-78 -14 Q-40 -64 40 -60 Q70 -40 64 -14" fill="none" />
      {/* laces */}
      <path d="M8 -128 L34 -110 M20 -136 L48 -116 M34 -142 L62 -120 M0 -118 L24 -100" fill="none" />
      <circle cx="4" cy="-124" r="3" fill={INK} />
      <circle cx="18" cy="-133" r="3" fill={INK} />
      <circle cx="32" cy="-140" r="3" fill={INK} />
    </g>
  );
}

// ── DM automation: a hoodie on the shop rail, violet → magenta ───────────────

export function DmArt() {
  return (
    <Art label="Illustration of a yellow hoodie on a shop rail with a price tag">
      <defs>
        <linearGradient id="dm-bg" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#5A1FB0" />
          <stop offset="0.55" stopColor="#9B1FD6" />
          <stop offset="1" stopColor="#FA0CF7" />
        </linearGradient>
        <pattern id="dm-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="rgba(255,255,255,0.14)" />
        </pattern>
      </defs>
      <rect width="460" height="900" fill="url(#dm-bg)" />
      <rect width="460" height="900" fill="url(#dm-dots)" />

      {/* Oversized NEW lettering behind */}
      <text x="-10" y="640" fontSize="200" fill="rgba(255,255,255,0.08)" style={heavy}>SHOP</text>

      {/* Rail */}
      <rect x="-20" y="176" width="500" height="12" rx="6" fill={INK} />
      <rect x="-20" y="176" width="500" height="5" rx="2.5" fill="rgba(255,255,255,0.25)" />

      {/* Hanger + hoodie */}
      <g transform="translate(236 382) rotate(-4)">
        <path d="M0 -178 L0 -196 Q0 -214 14 -214 Q30 -212 28 -198" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <path d="M-120 -86 L0 -178 L120 -86" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <HoodieShape />
      </g>

      {/* Price tag on a string */}
      <path d="M318 300 Q330 314 332 336" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <g transform="translate(318 334) rotate(12) scale(0.9)">
        <path d="M-52 0 L44 0 L66 26 L44 52 L-52 52Z" fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <circle cx="48" cy="26" r="5" fill={INK} />
        <text x="-6" y="34" textAnchor="middle" fontSize="19" fill={INK} style={heavy}>৳2,450</text>
      </g>

      {/* Sparkles */}
      <path d="M40 120 q18 -22 36 0 t36 0" fill="none" stroke="#FFF100" strokeWidth="7" strokeLinecap="round" />
      {sparkle(80, 330, 20, '#FFFFFF')}
      {sparkle(410, 240, 14, '#FFF100')}
      {sparkle(60, 520, 12, '#FFFFFF')}
    </Art>
  );
}

// ── Comment replies: a sneaker product shot in electric blue ─────────────────

export function CommentsArt() {
  return (
    <Art label="Illustration of a sneaker on a podium with a new-drop sticker">
      <defs>
        <radialGradient id="cm-bg" cx="0.5" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#5A62F0" />
          <stop offset="0.6" stopColor="#3B42C4" />
          <stop offset="1" stopColor="#262B96" />
        </radialGradient>
        <pattern id="cm-halftone" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="2.2" fill="rgba(255,255,255,0.16)" />
        </pattern>
      </defs>
      <rect width="460" height="900" fill="url(#cm-bg)" />
      <rect width="460" height="900" fill="url(#cm-halftone)" opacity="0.6" />

      {/* Podium */}
      <ellipse cx="230" cy="470" rx="170" ry="34" fill="#262B96" />
      <path d="M60 470 L60 560 Q230 610 400 560 L400 470" fill="#2A2FA8" />
      <ellipse cx="230" cy="470" rx="170" ry="34" fill="#4B52D6" stroke={INK} strokeWidth="5" />

      {/* Floating sneaker + shadow */}
      <ellipse cx="236" cy="462" rx="120" ry="12" fill="rgba(0,0,0,0.3)" />
      <g transform="translate(234 350) rotate(-10) scale(1.05)">
        <SneakerShape />
      </g>

      {/* NEW DROP sticker */}
      <g transform="translate(92 330) rotate(-14) scale(0.85)">
        <path d="M0 -58 L14 -44 L34 -50 L38 -30 L58 -24 L50 -4 L62 12 L44 24 L46 44 L26 44 L16 62 L0 50 L-16 62 L-26 44 L-46 44 L-44 24 L-62 12 L-50 -4 L-58 -24 L-38 -30 L-34 -50 L-14 -44Z" fill="#FFF100" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <text textAnchor="middle" y="-2" fontSize="20" fill={INK} style={heavy}>NEW</text>
        <text textAnchor="middle" y="20" fontSize="20" fill={INK} style={heavy}>DROP</text>
      </g>

      {/* Price tag */}
      <g transform="translate(362 262) rotate(10)">
        <rect x="-54" y="-24" width="108" height="48" rx="24" fill="#FA0CF7" stroke={INK} strokeWidth="5" />
        <text textAnchor="middle" y="8" fontSize="21" fill="#FFFFFF" style={heavy}>৳3,200</text>
      </g>

      {sparkle(400, 360, 16, '#FFF100')}
      {sparkle(60, 400, 14, '#FFFFFF')}
      {sparkle(250, 170, 10, '#FFFFFF')}
    </Art>
  );
}

// ── Live tracking: a street map in deep green ────────────────────────────────

export function DeliveryArt() {
  const route = 'M60 860 C 60 700, 360 720, 330 560 S 90 470, 150 330 S 400 260, 360 150';
  return (
    <Art label="Illustration of a delivery route on a map ending at a parcel">
      <defs>
        <pattern id="dl-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 H0 V40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="460" height="900" fill="#00573F" />
      <rect width="460" height="900" fill="url(#dl-grid)" />

      {/* Blocks and streets */}
      <g fill="#007257">
        <rect x="-10" y="40" width="170" height="130" rx="18" />
        <rect x="200" y="360" width="280" height="120" rx="18" />
        <rect x="-10" y="560" width="150" height="160" rx="18" />
        <rect x="360" y="600" width="120" height="200" rx="18" />
      </g>
      <circle cx="96" cy="420" r="54" fill="#0A8A67" />
      <circle cx="96" cy="420" r="30" fill="#12A079" />
      <g stroke="rgba(255,255,255,0.14)" strokeWidth="26" strokeLinecap="round" fill="none">
        <path d="M-20 250 L480 210" />
        <path d="M250 -20 L200 920" />
      </g>

      {/* Route */}
      <path d={route} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="22" strokeLinecap="round" transform="translate(4 8)" />
      <path d={route} fill="none" stroke="#FFF100" strokeWidth="18" strokeLinecap="round" />
      <path d={route} fill="none" stroke="#1A0620" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 14" />

      {/* Destination pin */}
      <g transform="translate(360 150)">
        <circle r="44" fill="rgba(250,12,247,0.25)" />
        <path d="M0 18 C-26 -8 -30 -20 -30 -34 A30 30 0 0 1 30 -34 C30 -20 26 -8 0 18Z" fill="#FA0CF7" stroke="#1A0620" strokeWidth="5" transform="translate(0 -12)" />
        <circle cy="-46" r="11" fill="#FFFFFF" />
      </g>

      {/* Parcel */}
      <g transform="translate(70 470) rotate(-10)">
        <polygon points="0,30 70,0 140,30 70,60" fill="#E9B872" stroke="#1A0620" strokeWidth="5" strokeLinejoin="round" />
        <polygon points="0,30 70,60 70,150 0,120" fill="#D29A4E" stroke="#1A0620" strokeWidth="5" strokeLinejoin="round" />
        <polygon points="140,30 70,60 70,150 140,120" fill="#BF8436" stroke="#1A0620" strokeWidth="5" strokeLinejoin="round" />
        <polygon points="35,15 105,45 105,60 35,30" fill="#FFF100" stroke="#1A0620" strokeWidth="4" strokeLinejoin="round" />
      </g>

      {sparkle(70, 120, 16, '#FFF100')}
      {sparkle(410, 480, 14, '#FFFFFF')}
    </Art>
  );
}

// ── Section backdrop: the same sticker language as the panels, around them ───

const BACKDROPS = {
  dark: { dot: 'rgba(255,255,255,0.10)', glowA: 'rgba(123,47,203,0.45)', glowB: 'rgba(250,12,247,0.22)', ink: '#1A0620', ring: '#12A079' },
  light: { dot: 'rgba(90,31,176,0.14)', glowA: 'rgba(155,31,214,0.22)', glowB: 'rgba(250,12,247,0.16)', ink: '#1A0620', ring: '#007257' },
};

function Deco({ className, viewBox, style, children }) {
  return (
    <svg viewBox={viewBox} className={`absolute ${className}`} style={style} aria-hidden="true">
      {children}
    </svg>
  );
}

export function HeroBackdrop({ theme = 'dark' }) {
  const B = BACKDROPS[theme] ?? BACKDROPS.dark;
  const burst =
    'M0 -100 L18 -62 L58 -80 L52 -38 L96 -30 L66 0 L96 30 L52 38 L58 80 L18 62 L0 100 L-18 62 L-58 80 L-52 38 L-96 30 L-66 0 L-96 -30 L-52 -38 L-58 -80 L-18 -62Z';

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Dot grid + colour glows */}
      <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${B.dot} 1.4px, transparent 1.6px)`, backgroundSize: '26px 26px' }} />
      <div className="absolute -left-[10%] top-[-10%] h-[70%] w-[55%] rounded-[999px] blur-[90px]" style={{ background: B.glowA }} />
      <div className="absolute -right-[10%] bottom-[-15%] h-[60%] w-[50%] rounded-[999px] blur-[100px]" style={{ background: B.glowB }} />

      {/* Magenta disc, top left */}
      <Deco className="-left-[140px] top-[70px] h-[360px] w-[360px] max-lg:hidden" viewBox="-100 -100 200 200">
        <circle r="92" fill="#FA0CF7" stroke={B.ink} strokeWidth="4" />
        <circle r="60" fill="none" stroke="#FFF100" strokeWidth="6" strokeDasharray="4 14" strokeLinecap="round" />
      </Deco>

      {/* Yellow starburst, right */}
      <Deco className="-right-[110px] top-[34%] h-[300px] w-[300px] rotate-[12deg] max-lg:hidden" viewBox="-110 -110 220 220">
        <path d={burst} fill="#FFF100" stroke={B.ink} strokeWidth="4" strokeLinejoin="round" />
        <circle r="30" fill="#FA0CF7" stroke={B.ink} strokeWidth="4" />
      </Deco>

      {/* Blue squiggle, lower left near the headline */}
      <Deco className="left-[55%] bottom-[215px] h-[70px] w-[260px] max-lg:hidden" viewBox="0 0 300 80">
        <path d="M10 40 q30 -40 60 0 t60 0 t60 0 t60 0" fill="none" stroke={B.ink} strokeWidth="18" strokeLinecap="round" />
        <path d="M10 40 q30 -40 60 0 t60 0 t60 0 t60 0" fill="none" stroke="#3B42C4" strokeWidth="11" strokeLinecap="round" />
      </Deco>

      {/* Green ring, bottom right under the buttons */}
      <Deco className="-right-[110px] -bottom-[150px] h-[240px] w-[240px] max-lg:hidden" viewBox="-100 -100 200 200">
        <circle r="80" fill="none" stroke={B.ink} strokeWidth="44" />
        <circle r="80" fill="none" stroke={B.ring} strokeWidth="34" />
      </Deco>

      {/* Sparkles + plus marks */}
      {[
        ['left-[3%] top-[62%]', '#FFF100', 34],
        ['left-[47%] top-[96px]', '#FA0CF7', 22],
        ['right-[4%] top-[14%]', '#FFFFFF', 26],
        ['left-[46%] bottom-[44px]', '#FFF100', 28],
      ].map(([pos, fill, size]) => (
        <Deco key={pos} className={pos} viewBox="-12 -12 24 24" style={{ width: size, height: size }}>
          <path d="M0 -11 Q0 0 11 0 Q0 0 0 11 Q0 0 -11 0 Q0 0 0 -11Z" fill={fill} stroke={B.ink} strokeWidth="1.2" />
        </Deco>
      ))}
    </div>
  );
}
