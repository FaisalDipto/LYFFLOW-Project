import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion as Motion, useInView, useReducedMotion } from 'framer-motion';
import { Bell, Check, Heart, Package, Truck } from 'lucide-react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import { CommentsArt, DeliveryArt, DmArt, HeroBackdrop, HoodieShape } from './HeroArt';
import studioPhoto from '../assets/hero-studio.webp';
import personCutout from '../assets/hero-studio-person.webp';

/*
 * Hero, styled after ManyChat's homepage: bold illustrated colour fields with native-looking
 * Instagram UI living on top of it. Three tall photo panels side by side, each replaying
 * one Lyfflow automation as if it were happening on that person's phone.
 *
 * Backgrounds are drawn in code (HeroArt.jsx).
 *
 * Colour, taken from ManyChat: aubergine (dark) or lavender (light) page with sticker shapes, Instagram
 * purple for everything the AI sends, hot magenta for the main action and live signals.
 * Type: an ultra-heavy wide grotesque for display, uppercase mono for labels and buttons,
 * and the phone's own system font inside the chat UI.
 */

const DISPLAY = "'Archivo Variable', 'Arial Black', sans-serif";
const MONO = "'DM Mono', ui-monospace, 'SFMono-Regular', monospace";
const SYSTEM = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const IG_PURPLE = '#7B2FCB';
const MAGENTA = '#FA0CF7';
const CTA = '#CF00CC'; // hot magenta, deepened just enough for white text to pass AA

const PALETTES = {
  dark: { page: '#140C26', text: '#FFFFFF', muted: 'rgba(255,255,255,0.66)', line: 'rgba(255,255,255,0.22)' },
  light: { page: '#F1EAFB', text: '#140C26', muted: 'rgba(20,12,38,0.7)', line: 'rgba(11,11,12,0.22)' },
};

const EASE = [0.22, 1, 0.36, 1];

// `ms[i]` is how long step i stays on screen; the last entry is the hold before the loop restarts.
const DM_MS = [1300, 1200, 2600, 1200, 1200, 4400];
const COMMENT_MS = [1000, 1400, 1200, 2600, 4000];
const TRACK_MS = [1500, 1700, 5200];
// The panels start one after another, left to right.
const START_DELAY = [500, 2000, 3500];

function useLoop(ms, running, reduced, delay) {
  // -1 is the idle state before this panel's first run.
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (reduced || !running) return undefined;
    const wait = step < 0 ? delay : ms[step];
    const id = setTimeout(() => setStep((s) => (s < 0 ? 0 : (s + 1) % ms.length)), wait);
    return () => clearTimeout(id);
  }, [step, running, reduced, ms, delay]);

  // Reduced motion: no loop, just the finished state.
  return reduced ? ms.length - 1 : step;
}

// ── Motion ────────────────────────────────────────────────────────────────────

const panels = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
};

const panelIn = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
};

// Messages grow out of the corner they're anchored to, like a real chat app.
const bubble = () => ({
  hidden: { opacity: 0, scale: 0.6, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 26 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
});

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 360, damping: 30 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.16 } } };
const fadeUp = { hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } } };

const drop = {
  hidden: { opacity: 0, y: -60, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  exit: { opacity: 0, y: -30, transition: { duration: 0.3 } },
};

const pulse = {
  hidden: { boxShadow: '0 0 0 0 rgba(250,12,247,0)' },
  show: {
    boxShadow: ['0 0 0 0 rgba(250,12,247,0.7)', '0 0 0 10px rgba(250,12,247,0)', '0 0 0 0 rgba(250,12,247,0.5)', '0 0 0 10px rgba(250,12,247,0)'],
    transition: { duration: 2, times: [0, 0.4, 0.5, 1] },
  },
};

// ── Shared pieces ─────────────────────────────────────────────────────────────

function Typewriter({ text, speed = 24 }) {
  const reduced = useReducedMotion();
  const chars = Array.from(text);
  const [n, setN] = useState(reduced ? chars.length : 0);

  useEffect(() => {
    if (n >= chars.length) return undefined;
    const id = setTimeout(() => setN((v) => v + 1), speed);
    return () => clearTimeout(id);
  }, [n, chars.length, speed]);

  return chars.slice(0, n).join('');
}

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <Motion.span
          key={i}
          className="h-[7px] w-[7px] rounded-[999px] bg-white"
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

function Initial({ letter, tone }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[999px] text-[13px] font-semibold text-white" style={{ background: tone }}>
      {letter}
    </span>
  );
}

// A tall photo panel with a mono label; the automation plays on top of the photo.
function Panel({ art, label, running, children }) {
  return (
    <Motion.article variants={panelIn} className="relative h-[600px] overflow-hidden rounded-[32px] bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] lg:h-full">
      <div aria-hidden="true">{art}</div>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)' }} />

      <p
        className="absolute left-5 top-5 z-20 flex items-center gap-2 rounded-[999px] bg-black/45 px-3.5 py-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-white backdrop-blur-md"
        style={{ fontFamily: MONO }}
      >
        <span className="relative flex h-2 w-2">
          {running && (
            <Motion.span
              className="absolute inset-0 rounded-[999px]"
              style={{ background: MAGENTA }}
              animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
          <span className="relative h-2 w-2 rounded-[999px] transition-colors duration-500" style={{ background: running ? MAGENTA : 'rgba(255,255,255,0.5)' }} />
        </span>
        {label}
      </p>

      <div className="absolute inset-0 z-10" aria-hidden="true" style={{ fontFamily: SYSTEM }}>
        {children}
      </div>
    </Motion.article>
  );
}

// A frosted stat chip; the number rolls in fresh each time it changes.
function StatChip({ value, label, className = '' }) {
  return (
    <div className={`absolute right-4 top-5 z-20 rounded-[16px] bg-black/45 px-3.5 py-2 text-right text-white backdrop-blur-md ${className}`}>
      <div className="relative h-[26px] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <Motion.p
            key={value}
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -26, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="text-[22px] font-black leading-[26px] tracking-[-0.02em]"
            style={{ fontFamily: DISPLAY, fontStretch: '112%' }}
          >
            {value.toLocaleString('en-US')}
          </Motion.p>
        </AnimatePresence>
      </div>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white/75" style={{ fontFamily: MONO }}>{label}</p>
    </div>
  );
}

// Hearts float up from where the AI reply lands, like live reactions.
const HEARTS = [
  { x: 0, d: 0, s: 1 },
  { x: -18, d: 0.15, s: 0.8 },
  { x: 16, d: 0.3, s: 0.9 },
  { x: -6, d: 0.45, s: 0.7 },
  { x: 22, d: 0.6, s: 0.75 },
];

function HeartBurst() {
  return (
    <div className="pointer-events-none absolute bottom-[190px] right-10 z-20 h-40 w-16">
      {HEARTS.map((h, i) => (
        <Motion.span
          key={i}
          className="absolute bottom-0 left-1/2 text-[22px]"
          style={{ color: MAGENTA, filter: 'drop-shadow(0 4px 10px rgba(250,12,247,0.5))' }}
          initial={{ y: 0, x: 0, opacity: 0, scale: 0.4 }}
          animate={{ y: -150, x: h.x, opacity: [0, 1, 1, 0], scale: h.s }}
          transition={{ duration: 1.8, delay: h.d, ease: 'easeOut' }}
        >
          ♥
        </Motion.span>
      ))}
    </div>
  );
}

// ── Panel 1: DM automation ────────────────────────────────────────────────────

const DM_ASK = 'Hi! Is the yellow hoodie available in L? How much is it?';
const DM_REPLY = 'Hi Rafi! Yes, size L is in stock 🙌 Here it is:';
const DM_ORDER = 'Perfect, I’ll take one in L please!';
const DM_CONFIRM = 'Done! Order #1204 is confirmed. Cash on delivery, arriving in 2 days 📦';

function MsgIn({ id, children }) {
  return (
    <Motion.div key={id} layout variants={bubble()} initial="hidden" animate="show" exit="exit" className="flex max-w-[86%] items-end gap-2 self-start" style={{ transformOrigin: 'bottom left' }}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[999px] border border-white/40 bg-[#FFF100] text-[12px] font-bold text-[#1A0620]">R</span>
      <p className="rounded-[22px] rounded-bl-[6px] bg-[#262626]/95 px-4 py-2.5 text-[15px] leading-snug text-white">{children}</p>
    </Motion.div>
  );
}

const aiBubbleStyle = { background: IG_PURPLE, boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 0 18px 40px -12px rgba(26,6,32,0.7)' };

function TypingOut({ id }) {
  return (
    <Motion.div key={id} layout variants={bubble()} initial="hidden" animate="show" exit="exit" className="self-end" style={{ transformOrigin: 'bottom right' }}>
      <span className="flex rounded-[22px] rounded-br-[6px] px-4 py-3.5" style={aiBubbleStyle}>
        <Dots />
      </span>
    </Motion.div>
  );
}

function DmPanel({ step }) {
  return (
    <>
      <StatChip value={step >= 5 ? 87 : 86} label="Orders via DM today" />
      <div className="absolute inset-x-4 bottom-5 flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {step >= 0 && <MsgIn key="ask" id="ask">{DM_ASK}</MsgIn>}

          {step === 1 && <TypingOut key="t1" id="t1" />}

          {step >= 2 && (
            <Motion.div key="product" layout variants={bubble()} initial="hidden" animate="show" exit="exit" className="w-[86%] self-end" style={{ transformOrigin: 'bottom right' }}>
              <div className="rounded-[22px] rounded-br-[6px] p-3 text-white" style={aiBubbleStyle}>
                <p className="px-1 pb-2.5 text-[15px] leading-snug">
                  <Typewriter text={DM_REPLY} />
                </p>
                <Motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
                  <Motion.div variants={fadeUp} className="flex items-center gap-3 rounded-[14px] bg-black/20 p-2">
                    <svg viewBox="-170 -220 340 440" className="h-14 w-14 shrink-0 rounded-[10px] bg-[#9B1FD6]" aria-hidden="true">
                      <HoodieShape />
                    </svg>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">Sunny oversized hoodie</p>
                      <p className="text-[13px] text-white/80">Size L · ৳2,450</p>
                    </div>
                  </Motion.div>
                  <Motion.p variants={fadeUp} className="rounded-[14px] bg-white/20 py-2.5 text-center text-[15px] font-semibold">
                    Order now
                  </Motion.p>
                </Motion.div>
              </div>
            </Motion.div>
          )}

          {step >= 3 && <MsgIn key="order" id="order">{DM_ORDER}</MsgIn>}

          {step === 4 && <TypingOut key="t2" id="t2" />}

          {step >= 5 && (
            <Motion.div key="confirm" layout variants={bubble()} initial="hidden" animate="show" exit="exit" className="w-[86%] self-end" style={{ transformOrigin: 'bottom right' }}>
              <div className="flex items-start gap-2.5 rounded-[22px] rounded-br-[6px] p-3.5 text-white" style={aiBubbleStyle}>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[999px] bg-white" style={{ color: IG_PURPLE }}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3.5} aria-hidden="true" />
                </span>
                <p className="text-[15px] leading-snug">
                  <Typewriter text={DM_CONFIRM} />
                </p>
              </div>
              <p className="mt-1.5 pr-1 text-right text-[11.5px] text-white/80">Order taken by Lyfflow AI</p>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Panel 2: comment automation ───────────────────────────────────────────────

function CommentRow({ letter, tone, name, text, time }) {
  return (
    <div className="flex items-start gap-3">
      <Initial letter={letter} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] leading-snug text-white">
          <span className="font-semibold">{name}</span> <span className="text-white/90">{text}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-white/50">{time} · Reply</p>
      </div>
      <Heart className="mt-1 h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
    </div>
  );
}

function ShopAvatar({ size = 'h-9 w-9', text = 'text-[13px]' }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-[999px] font-black text-[#1A0620] ring-2 ring-white/80 ${text}`} style={{ background: '#FFF100', fontFamily: DISPLAY }}>
      ut
    </span>
  );
}

function CommentsPanel({ step }) {
  return (
    <>
      {/* The product post's header, like the top of an Instagram post */}
      <div className="absolute left-5 right-5 top-[72px] flex items-center gap-2.5">
        <ShopAvatar />
        <div>
          <p className="text-[14px] font-semibold text-white">urbanthreads</p>
          <p className="text-[12px] text-white/80">Cloud Runner, just dropped 👟</p>
        </div>
      </div>

      {step >= 3 && <HeartBurst key="hearts" />}

      {/* Comments sheet */}
      <div className="absolute inset-x-3 bottom-3 rounded-[26px] bg-[#121212]/80 px-4 pb-4 pt-2.5 backdrop-blur-xl">
        <span className="mx-auto mb-2.5 block h-1 w-9 rounded-[999px] bg-white/30" />
        <p className="mb-3.5 text-center text-[13.5px] font-semibold text-white">Comments</p>
        <div className="space-y-3.5">
          <CommentRow letter="M" tone="#E1306C" name="mia.torres" text="These are so clean 🔥" time="6m" />
          <AnimatePresence initial={false}>
            {step >= 1 && (
              <Motion.div key="rafi" layout variants={rise} initial="hidden" animate="show" exit="exit">
                <CommentRow letter="S" tone="#F77737" name="sadia.rahman" text="Price? Do you have size 42? 😍" time="now" />
              </Motion.div>
            )}
            {step === 2 && (
              <Motion.div key="typing" layout variants={rise} initial="hidden" animate="show" exit="exit" className="flex items-center gap-2 pl-11">
                <span className="flex rounded-[999px] px-3 py-2" style={{ background: IG_PURPLE }}><Dots /></span>
              </Motion.div>
            )}
            {step >= 3 && (
              <Motion.div key="reply" layout variants={rise} initial="hidden" animate="show" exit="exit" className="pl-11">
                <Motion.div variants={pulse} initial="hidden" animate="show" className="flex items-start gap-3 rounded-[16px] p-2.5" style={{ background: 'rgba(123,47,203,0.38)', border: '1px solid rgba(250,12,247,0.55)' }}>
                  <ShopAvatar size="h-7 w-7" text="text-[10px]" />
                  <p className="text-[14px] leading-snug text-white">
                    <span className="font-semibold">urbanthreads</span>{' '}
                    <Typewriter text="@sadia.rahman Yes! Size 42 is in stock, ৳3,200. We sent the order link to your DMs 💌" speed={22} />
                  </p>
                </Motion.div>
                <AnimatePresence>
                  {step >= 4 && (
                    <Motion.p variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }} className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: MONO, color: MAGENTA }}>
                      Replied + DM sent by Lyfflow AI
                    </Motion.p>
                  )}
                </AnimatePresence>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// ── Panel 3: delivery updates ─────────────────────────────────────────────────

const STAGES = [
  { icon: Check, title: 'Order confirmed', time: '10:05 am' },
  { icon: Package, title: 'Picked up by courier', time: '1:20 pm' },
  { icon: Truck, title: 'Out for delivery', time: 'Arriving in 10 min' },
];

function DeliveryPanel({ step }) {
  const s = Math.max(step, 0);
  return (
    <>
      <StatChip value={412 + s} label="Orders tracked today" className="top-auto bottom-[250px]" />
      {/* iOS-style push notification */}
      <div className="absolute inset-x-3 top-[64px]">
        <AnimatePresence>
          {step === 2 && (
            <Motion.div variants={drop} initial="hidden" animate="show" exit="exit" className="flex items-start gap-3 rounded-[22px] bg-white/75 p-3.5 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-white" style={{ background: `linear-gradient(160deg, ${MAGENTA}, ${IG_PURPLE})` }}>
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex justify-between text-[12px] text-black/55"><span className="font-semibold uppercase tracking-[0.04em]">Lyfflow</span><span>now</span></p>
                <p className="text-[14.5px] font-semibold leading-snug text-black">Order #1204 is out for delivery!</p>
                <p className="text-[13.5px] leading-snug text-black/75">Your rider is 10 minutes away.</p>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tracking card */}
      <div className="absolute inset-x-3 bottom-3 rounded-[26px] bg-[#121212]/80 p-4 text-white backdrop-blur-xl">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-white/70" style={{ fontFamily: MONO }}>Order #1204</p>
          <p className="text-[12px] text-white/70">Today, 4–6 pm</p>
        </div>
        <div className="mb-4 flex gap-1.5">
          {STAGES.map((st, i) => (
            <span key={st.title} className="h-1 flex-1 overflow-hidden rounded-[999px] bg-white/15">
              <Motion.span
                className="block h-full rounded-[999px]"
                style={{ background: i === 2 ? MAGENTA : '#FFFFFF' }}
                initial={false}
                animate={{ width: i <= s ? '100%' : '0%' }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
              />
            </span>
          ))}
        </div>
        <ol className="space-y-3">
          <AnimatePresence initial={false}>
            {STAGES.slice(0, s + 1).map((st, i) => {
              const Icon = st.icon;
              const live = i === 2;
              return (
                <Motion.li key={st.title} layout variants={rise} initial="hidden" animate="show" exit="exit" className="flex items-center gap-3">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[999px]" style={{ background: live ? MAGENTA : 'rgba(255,255,255,0.14)', color: live ? '#1A0620' : '#FFFFFF' }}>
                    {live && (
                      <Motion.span className="absolute inset-0 rounded-[999px]" style={{ border: `2px solid ${MAGENTA}` }} animate={{ scale: [1, 1.8], opacity: [0.8, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
                    )}
                    <Icon className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                  </span>
                  <p className="flex-1 text-[14.5px] font-semibold">{st.title}</p>
                  <p className="text-[12px] text-white/60">{st.time}</p>
                </Motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      </div>
    </>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

// Photo geometry (source image is 1024×572).
const PHOTO_RATIO = 1024 / 572;
const PERSON_BOX = { left: 362 / 1024, top: 53 / 572, width: 565 / 1024, height: 519 / 572 };
const ELBOW_X = 365 / 1024; // the raised left elbow: where the person starts covering the windows
const WALL = '#595B5A'; // wall colour at the photo's left edge, used to extend it

// Windows are designed at 400×760 and scaled to fit the stage.
const PANEL_W = 400;
const PANEL_H = 760;
const PANEL_GAP = 20;
const GRID_W = PANEL_W * 3 + PANEL_GAP * 2;

const lgQuery = '(min-width: 1024px)';
function useIsLarge() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(lgQuery);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(lgQuery).matches,
    () => true,
  );
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const VEILS = {
  dark: {
    side: 'linear-gradient(90deg, rgba(16,10,28,0.84) 0%, rgba(16,10,28,0.6) 38%, rgba(16,10,28,0) 62%)',
    top: 'linear-gradient(180deg, rgba(16,10,28,0.55), rgba(16,10,28,0))',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.78)',
    line: 'rgba(255,255,255,0.4)',
  },
  light: {
    side: 'linear-gradient(90deg, rgba(246,241,252,0.94) 0%, rgba(246,241,252,0.82) 42%, rgba(246,241,252,0) 66%)',
    top: 'linear-gradient(180deg, rgba(246,241,252,0.6), rgba(246,241,252,0))',
    text: '#140C26',
    muted: 'rgba(20,12,38,0.75)',
    line: 'rgba(20,12,38,0.3)',
  },
};

function Headline({ color, className = '' }) {
  return (
    <h1
      id="hero-heading"
      className={`leading-[0.88] tracking-[-0.04em] ${className}`}
      style={{ fontFamily: DISPLAY, fontWeight: 900, fontStretch: '112%', color }}
    >
      Your inbox, on autopilot.
    </h1>
  );
}

function Actions({ text, line }) {
  return (
    <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
      <Link
        to="/get-started"
        className="flex-1 whitespace-nowrap rounded-[999px] px-7 py-[16px] text-center text-[14px] font-medium uppercase tracking-[0.08em] text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FA0CF7] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--hero-page)] sm:px-8 lg:flex-none"
        style={{ background: CTA, fontFamily: MONO }}
      >
        Start free trial
      </Link>
      <Link
        to="/sales"
        className="flex-1 whitespace-nowrap rounded-[999px] border px-7 py-[16px] text-center text-[14px] font-medium uppercase tracking-[0.08em] backdrop-blur-sm transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FA0CF7] sm:px-8 lg:flex-none"
        style={{ color: text, borderColor: line, fontFamily: MONO }}
      >
        Talk to sales
      </Link>
    </div>
  );
}

const PITCH = 'Lyfflow’s AI answers DMs and comments in seconds, then keeps every order updated until it’s at the door.';

export default function HeroShowcase({ theme = 'dark' }) {
  const C = PALETTES[theme] ?? PALETTES.dark;
  const V = VEILS[theme] ?? VEILS.dark;
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.2 });
  const seen = useInView(sectionRef, { amount: 0.2, once: true });
  const reduced = Boolean(useReducedMotion());
  const large = useIsLarge();
  const { w, h } = useSize(sectionRef);
  const dm = useLoop(DM_MS, inView, reduced, START_DELAY[0]);
  const comments = useLoop(COMMENT_MS, inView, reduced, START_DELAY[1]);
  const delivery = useLoop(TRACK_MS, inView, reduced, START_DELAY[2]);
  const running = (step, ms) => !reduced && step >= 0 && step < ms.length - 1;

  const panelList = (
    <>
      <Panel art={<DmArt />} label="DM automation" running={running(dm, DM_MS)}>
        <DmPanel step={dm} />
      </Panel>
      <Panel art={<CommentsArt />} label="Comment replies" running={running(comments, COMMENT_MS)}>
        <CommentsPanel step={comments} />
      </Panel>
      <Panel art={<DeliveryArt />} label="Live tracking" running={running(delivery, TRACK_MS)}>
        <DeliveryPanel step={delivery} />
      </Panel>
    </>
  );

  const srSummary = (
    <p className="sr-only">
      Three examples of Lyfflow at work: the AI helps a customer buy a hoodie over Instagram DM, replies to a
      price question on a product post, and pushes a notification when the order is out for delivery.
    </p>
  );

  // ── Desktop: photo stage. The person is layered over the windows for depth. ──
  if (large) {
    const pad = Math.max(40, Math.min(96, (w - 1440) / 2 + 40));
    const winTop = 300;
    const scale = Math.min(0.86, Math.max(0.55, (h - winTop - 36) / PANEL_H));
    const winEnd = pad + GRID_W * scale;
    const photoW = h * PHOTO_RATIO;
    // Place the photo so the elbow reaches ~190px into the third window.
    const photoLeft = winEnd - ELBOW_X * photoW - 190;
    const photoBox = { left: photoLeft, top: 0, width: photoW, height: h };

    return (
      <MotionConfig reducedMotion="user">
        <section
          ref={sectionRef}
          aria-labelledby="hero-heading"
          className="relative isolate h-[max(820px,100svh)] overflow-hidden"
          style={{ background: WALL, '--hero-page': WALL }}
        >
          {/* 1. Photo, faded into the wall colour on its left edge */}
          <img
            src={studioPhoto}
            alt=""
            aria-hidden="true"
            className="absolute max-w-none select-none"
            style={{
              ...photoBox,
              maskImage: 'linear-gradient(90deg, transparent 0, black 14%)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0, black 14%)',
            }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ background: V.side }} />

          {/* 2. Windows */}
          {srSummary}
          <Motion.div
            variants={panels}
            initial="hidden"
            animate={seen || reduced ? 'show' : 'hidden'}
            className="absolute grid origin-top-left"
            style={{
              left: pad,
              top: winTop,
              width: GRID_W,
              height: PANEL_H,
              gridTemplateColumns: `repeat(3, ${PANEL_W}px)`,
              gap: PANEL_GAP,
              transform: `scale(${scale})`,
            }}
          >
            {panelList}
          </Motion.div>

          {/* 3. The person, cut out and laid over the windows */}
          <div className="pointer-events-none absolute" style={photoBox} aria-hidden="true">
            <img
              src={personCutout}
              alt=""
              className="absolute max-w-none select-none"
              style={{
                left: `${PERSON_BOX.left * 100}%`,
                top: `${PERSON_BOX.top * 100}%`,
                width: `${PERSON_BOX.width * 100}%`,
                height: `${PERSON_BOX.height * 100}%`,
                filter: 'drop-shadow(-14px 18px 22px rgba(0,0,0,0.35))',
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24" style={{ background: V.top }} />

          {/* 4. Copy */}
          <div className="absolute z-10" style={{ left: pad, top: 116, width: Math.max(560, winEnd - pad) }}>
            <Headline color={V.text} className="text-[clamp(3rem,4.3vw,4.5rem)] whitespace-nowrap" />
            <div className="mt-5 flex items-center justify-between gap-8">
              <p className="max-w-[44ch] text-[16px] leading-relaxed" style={{ color: V.muted }}>{PITCH}</p>
              <Actions text={V.text} line={V.line} />
            </div>
          </div>
        </section>
      </MotionConfig>
    );
  }

  // ── Phones and tablets: headline first, then the windows stacked ──
  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={sectionRef}
        aria-labelledby="hero-heading"
        className="relative isolate flex flex-col overflow-hidden pt-28 pb-14 transition-colors duration-300"
        style={{ background: C.page, '--hero-page': C.page }}
      >
        <HeroBackdrop theme={theme} />
        <div className="mx-auto w-full px-4 sm:px-8">
          <Headline color={C.text} className="text-[3.4rem] sm:text-[5rem]" />
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed" style={{ color: C.muted }}>{PITCH}</p>
          <div className="mt-7">
            <Actions text={C.text} line={C.line} />
          </div>
        </div>
        {srSummary}
        <Motion.div
          variants={panels}
          initial="hidden"
          animate={seen || reduced ? 'show' : 'hidden'}
          className="mx-auto mt-10 grid w-full grid-cols-1 gap-4 px-4 sm:px-8"
        >
          {panelList}
        </Motion.div>
      </section>
    </MotionConfig>
  );
}
