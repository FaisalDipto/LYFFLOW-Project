import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';
import ProductShowcase from './ProductShowcase';
import HeroShowcase from './HeroShowcase';
import teamCorporate from '../assets/team_corporate.webp';

const TEAM = [
  {
    id: 'meharaz',
    name: 'Meharaz Hossain',
    since: 'Since 2025',
    role: 'Backend & AI Developer',
    background: 'B.Sc. Engg. in CSE, Bangladesh University of Business and Technology',
    interests: null,
    delay: '',
    icon: 'memory'
  },
  {
    id: 'mehedi',
    name: 'Mehedi Rifat',
    since: 'Since 2025',
    role: 'Backend Developer',
    background: 'B.Sc. Engg. in CSE, Bangladesh University of Business and Technology',
    interests: null,
    delay: '[transition-delay:100ms]',
    icon: 'dns'
  },
  {
    id: 'faisal',
    name: 'Faisal Amir Dipto',
    since: 'Since 2026',
    role: 'UI/UX & Frontend Developer',
    background: 'B.Sc. Engg. in CSE, Bangladesh University of Business and Technology',
    interests: null,
    delay: '[transition-delay:200ms]',
    icon: 'design_services'
  },
  {
    id: 'swajan',
    name: 'Swajan Baruah',
    since: 'Since 2026',
    role: 'Backend Developer',
    background: 'B.Sc. Engg. in CSE, American International University Bangladesh (AIUB)',
    interests: null,
    delay: '[transition-delay:300ms]',
    icon: 'database'
  },
];


export default function Hero({ theme }) {
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const [tappedMember, setTappedMember] = useState(null);

  const handleMouseMove = useCallback((e, memberId) => {
    setCursor({ x: e.clientX, y: e.clientY });
    setHoveredMember(memberId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredMember(null);
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    return () => {
      document.querySelectorAll('.reveal').forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <>
      <HeroShowcase theme={theme} />

      {/* How it Works */}
      <section className="py-20 sm:py-40 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-24 reveal">
            <label className="font-label text-sm font-extrabold tracking-[0.25em] uppercase mb-4 block text-[#00C896]">THE PROCESS</label>
            <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-[#0D1F3C] dark:text-white">From Setup to Automation in Minutes</h2>
          </div>
          <div className="flex flex-col md:grid md:grid-cols-3 gap-12 md:gap-8 lg:gap-12">
            <div className="reveal">
              <div className="group h-full p-8 lg:p-10 rounded-[2rem] border border-[#D8DBFF] dark:border-indigo-900/50 bg-[#EEF0FF] dark:bg-indigo-950/30 hover:shadow-2xl hover:shadow-[#EEF0FF]/60 dark:hover:shadow-indigo-900/20 transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-white dark:bg-indigo-900/80 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500 text-[#6366F1] dark:text-indigo-400">
                  <span className="material-symbols-outlined text-3xl" data-icon="link">link</span>
                </div>
                <p className="text-sm font-extrabold tracking-[0.2em] uppercase mb-2 text-[#00C896]">Step 1</p>
                <h3 className="font-headline text-2xl font-bold mb-4 text-[#0D1F3C] dark:text-white">Connect Your Page</h3>
                <p className="leading-relaxed text-[17px] text-[#4B5563] dark:text-slate-400">Link your Facebook or Instagram Business page in seconds. Lyfflow instantly syncs with your Messenger channel — no complex configuration, no developer needed.</p>
              </div>
            </div>
            <div className="reveal [transition-delay:150ms]">
              <div className="group h-full p-8 lg:p-10 rounded-[2rem] border border-[#C2EBE0] dark:border-emerald-900/50 bg-[#E6F7F2] dark:bg-emerald-950/30 hover:shadow-2xl hover:shadow-[#E6F7F2]/60 dark:hover:shadow-emerald-900/20 transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-white dark:bg-emerald-900/80 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500 text-[#00C896]">
                  <span className="material-symbols-outlined text-3xl" data-icon="auto_awesome">auto_awesome</span>
                </div>
                <p className="text-sm font-extrabold tracking-[0.2em] uppercase mb-2 text-[#00C896]">Step 2</p>
                <h3 className="font-headline text-2xl font-bold mb-4 text-[#0D1F3C] dark:text-white">Build Your AI Agent</h3>
                <p className="leading-relaxed text-[17px] text-[#4B5563] dark:text-slate-400">Define your agent's personality, upload your business knowledge, and configure response logic. Your AI learns your brand voice and handles queries with precision.</p>
              </div>
            </div>
            <div className="reveal [transition-delay:300ms]">
              <div className="group h-full p-8 lg:p-10 rounded-[2rem] border border-[#D9DCE1] dark:border-slate-700/50 bg-[#F0F2F5] dark:bg-slate-800/40 hover:shadow-2xl hover:shadow-[#F0F2F5]/60 dark:hover:shadow-slate-700/30 transition-all duration-500 hover:-translate-y-2">
                <div className="w-16 h-16 bg-white dark:bg-slate-700/80 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500 text-[#6B7280] dark:text-slate-300">
                  <span className="material-symbols-outlined text-3xl" data-icon="trending_up">trending_up</span>
                </div>
                <p className="text-sm font-extrabold tracking-[0.2em] uppercase mb-2 text-[#00C896]">Step 3</p>
                <h3 className="font-headline text-2xl font-bold mb-4 text-[#0D1F3C] dark:text-white">Deploy &amp; Monitor</h3>
                <p className="leading-relaxed text-[17px] text-[#4B5563] dark:text-slate-400">Go live across your channels with full control over permissions. Track conversations, measure performance, and let your AI work 24/7 — while you focus on growth.</p>
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* ── WHAT WE DO — Feature Grid ── */}
      {/* <section className="py-20 sm:py-32 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-24">
            <label className="font-label text-xs font-bold tracking-[0.3em] uppercase text-secondary mb-4 block">Our Platform</label>
            <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-primary mb-6">Designed for impact.</h2>
            <p className="text-on-surface-variant text-xl max-w-2xl mx-auto">Our features aren't just utilities — they are tools that refine your digital presence into a curated, high-performance experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="group">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-tertiary group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-tertiary/20">
                <span className="material-symbols-outlined text-3xl text-tertiary group-hover:text-white transition-colors duration-500">auto_awesome</span>
              </div>
              <h4 className="font-headline text-xl mb-4 text-primary">Smart Replies</h4>
              <p className="text-on-surface-variant leading-relaxed">Context-aware AI that mimics your brand's unique tone of voice, providing instant, accurate answers around the clock.</p>
            </div>
            <div className="group">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-secondary group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-secondary/20">
                <span className="material-symbols-outlined text-3xl text-secondary group-hover:text-white transition-colors duration-500">security</span>
              </div>
              <h4 className="font-headline text-xl mb-4 text-primary">Automated Moderation</h4>
              <p className="text-on-surface-variant leading-relaxed">Protect your community with real-time sentiment analysis and proactive filtering of harmful content before it causes damage.</p>
            </div>
            <div className="group">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-primary/20">
                <span className="material-symbols-outlined text-3xl text-primary group-hover:text-white transition-colors duration-500">insights</span>
              </div>
              <h4 className="font-headline text-xl mb-4 text-primary">Conversation Insights</h4>
              <p className="text-on-surface-variant leading-relaxed">Turn dialogue into data. Understand customer pain points and trends through deep linguistic modeling and AI reporting.</p>
            </div>
            <div className="group">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-slate-800 group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-slate-800/20">
                <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-white transition-colors duration-500">all_inbox</span>
              </div>
              <h4 className="font-headline text-xl mb-4 text-primary">Unified Inbox</h4>
              <p className="text-on-surface-variant leading-relaxed">One dashboard to rule them all. Manage Instagram, WhatsApp, and Messenger without ever switching context.</p>
            </div>
          </div>
        </div>
      </section> */}

      <ProductShowcase />

      {/* ── OUR MISSION & PRINCIPLES ── */}
      <section className="py-20 sm:py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-20">
            {/* Sticky label */}
            <div className="lg:w-1/3">
              <div className="lg:sticky lg:top-32">
                <label className="font-label text-sm font-extrabold tracking-[0.25em] uppercase text-secondary mb-4 block">Our Philosophy</label>
                <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-primary mb-8">Our core principles.</h2>
                <p className="text-on-surface-variant text-lg">We don't just build software; we build a philosophy for the modern digital era of AI-first business.</p>
              </div>
            </div>
            {/* Cards */}
            <div className="lg:w-2/3 space-y-8">
              <div className="p-10 bg-primary border border-white/10 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-2">
                <div className="flex items-start gap-8">
                  <span className="font-headline text-5xl text-white/30 font-black flex-shrink-0">01</span>
                  <div>
                    <h3 className="font-headline text-2xl mb-4 text-white">Simplicity</h3>
                    <p className="text-white/90 text-lg leading-relaxed">Complexity is the enemy of execution. We design every interface to be intuitive, stripping away the friction until only the essentials remain.</p>
                  </div>
                </div>
              </div>
              <div className="p-10 bg-secondary border border-white/10 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-secondary/40 hover:-translate-y-2">
                <div className="flex items-start gap-8">
                  <span className="font-headline text-5xl text-white/30 font-black flex-shrink-0">02</span>
                  <div>
                    <h3 className="font-headline text-2xl mb-4 text-white">Intelligence</h3>
                    <p className="text-white/90 text-lg leading-relaxed">Data without context is noise. Our AI isn't just fast; it's smart. It learns from your history to predict the needs of your future customers.</p>
                  </div>
                </div>
              </div>
              <div className="p-10 bg-tertiary border border-white/10 rounded-[2rem] transition-all duration-300 hover:shadow-2xl hover:shadow-tertiary/40 hover:-translate-y-2">
                <div className="flex items-start gap-8">
                  <span className="font-headline text-5xl text-white/30 font-black flex-shrink-0">03</span>
                  <div>
                    <h3 className="font-headline text-2xl mb-4 text-white">Scalability</h3>
                    <p className="text-white/90 text-lg leading-relaxed">Growth should never be painful. Whether you're handling ten chats or ten million, Lyfflow scales horizontally to meet the demand without missing a beat.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ── WHO WE ARE ── */}
      <section id="about" className="bg-surface-container-low py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 items-center">
          {/* Left: image + stat card */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-surface-container-highest shadow-2xl">
              <img
                alt="Creative team collaborating"
                className="w-full h-full object-cover contrast-125 transition-all duration-700"
                src={teamCorporate}
                width="820"
                height="1024"
                loading="lazy"
                decoding="async"
              />
            </div>
            {/* Floating stat */}
            <div className="absolute -bottom-10 -right-6 bg-white/80 backdrop-blur-xl border border-white/60 p-8 rounded-[1.5rem] shadow-xl max-w-xs hidden md:block">
              <p className="font-headline text-primary text-4xl font-black mb-2">100M+</p>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Messages curated daily across our global ecosystem</p>
            </div>
          </div>
          {/* Right: text */}
          <div>
            <span className="text-secondary font-label text-sm font-extrabold tracking-[0.25em] uppercase mb-6 block">Who We Are</span>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-6xl font-bold mb-8 leading-tight text-primary">Eliminating the bottlenecks of human scale.</h2>
            <div className="space-y-6 text-on-surface-variant text-lg leading-relaxed">
              <p>We are a team of curators, engineers, and dreamers who believe that technology should amplify human connection, not replace it. Our mission is to provide the digital infrastructure that allows brands to speak with thousands while maintaining the intimacy of one.</p>
              <p>By blending high-end editorial aesthetics with cutting-edge AI, we've built a platform that feels like a boutique agency but performs like a global enterprise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="py-20 sm:py-40 bg-primary relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 relative">
          <div className="mb-12 sm:mb-24">
            <label className="font-label text-sm font-extrabold tracking-[0.25em] uppercase text-tertiary mb-4 block">The Brains Behind the Solution</label>
            <h2 className="font-headline text-4xl sm:text-5xl font-black tracking-tight text-white">Our Expertise</h2>
          </div>
          <div className="relative space-y-0">
            {TEAM.map((member) => (
              <div
                key={member.id}
                className="team-row group relative py-8 sm:py-12 flex flex-col cursor-pointer border-b border-white/10 overflow-hidden"
                onMouseMove={(e) => { if (window.innerWidth >= 768) handleMouseMove(e, member.id); }}
                onMouseLeave={handleMouseLeave}
                onClick={() => { if (window.innerWidth < 768) setTappedMember(tappedMember === member.id ? null : member.id); }}
              >
                {/* Row content */}
                <div className="flex items-center justify-between w-full">
                  <span className="hidden md:block text-slate-400 font-bold text-xs uppercase tracking-widest z-20 transition-colors group-hover:text-white shrink-0">{member.since}</span>
                  <div className="flex-1 text-center md:text-left z-20 min-w-0">
                    <h3 className="team-name font-headline text-xl sm:text-4xl md:text-8xl font-black tracking-tighter uppercase leading-none truncate">{member.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden md:block text-slate-400 font-bold text-xs uppercase tracking-widest text-right z-20 transition-colors group-hover:text-white">{member.role}</span>
                    {/* Mobile chevron */}
                    <span className={`md:hidden text-white/50 text-lg transition-transform duration-300 ${tappedMember === member.id ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </div>

                {/* Mobile expand card */}
                <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
                  tappedMember === member.id ? 'max-h-[400px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'
                }`}>
                  <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 bg-tertiary/15 rounded-xl flex items-center justify-center border border-tertiary/30 shrink-0">
                        <span className="material-symbols-outlined text-tertiary text-2xl">{member.icon || 'terminal'}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg leading-tight">{member.name}</p>
                        <p className="text-tertiary text-[10px] font-bold uppercase tracking-widest mt-1">{member.role}</p>
                      </div>
                    </div>
                    <div className="h-px bg-white/10 w-full mb-5"></div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Background</p>
                        <p className="text-slate-200 text-sm leading-relaxed">{member.background}</p>
                      </div>
                      {member.interests && (
                        <div>
                          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">Focus</p>
                          <p className="text-slate-200 text-sm leading-relaxed">{member.interests}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-40 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto bg-primary rounded-[2rem] sm:rounded-[4rem] p-8 sm:p-16 md:p-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-tertiary/40 via-primary to-primary"></div>
          <div className="relative z-10">
            <h2 className="font-headline text-4xl md:text-7xl font-extrabold text-white tracking-tighter mb-10 leading-tight">
              Ready to dominate your <br className="hidden md:block"/>social channels?
            </h2>
            <p className="text-slate-400 text-xl md:text-2xl max-w-2xl mx-auto mb-16 leading-relaxed">
              Join 10,000+ businesses automating their growth with Lyfflow. Start your 14-day free trial today.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/get-started" className="bg-white text-primary px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-white/5">
                Create Free Account
              </Link>
              <Link to="/sales" className="bg-transparent border-2 border-white/20 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-white/5 transition-all">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Cursor-following team card — desktop only */}
      {hoveredMember && window.innerWidth >= 768 && (() => {
        const member = TEAM.find(m => m.id === hoveredMember);
        if (!member) return null;
        const CARD_W = 600;
        const CARD_H = 280;
        const OFFSET = 24;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let x = cursor.x + OFFSET;
        let y = cursor.y + OFFSET;
        if (x + CARD_W > vw - 16) x = cursor.x - CARD_W - OFFSET;
        if (y + CARD_H > vh - 16) y = cursor.y - CARD_H - OFFSET;
        return (
          <div
            className="team-cursor-card"
            style={{ left: x, top: y }}
          >
            <div className="team-cursor-info">
              <div className="team-cursor-header">
                <div className="team-cursor-icon">
                  <span className="material-symbols-outlined">{member.icon || 'terminal'}</span>
                </div>
                <div>
                  <p className="team-cursor-name">{member.name}</p>
                  <p className="team-cursor-role">{member.role}</p>
                </div>
              </div>
              <div className="team-cursor-divider" />
              <div className="team-cursor-body">
                <p className="team-cursor-meta"><strong>Background</strong> <span>{member.background}</span></p>
                {member.interests && (
                  <p className="team-cursor-meta"><strong>Focus</strong> <span>{member.interests}</span></p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
