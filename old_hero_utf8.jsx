import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';
import ProductShowcase from './ProductShowcase';
import meharazPhoto from '../assets/team/meharaz.jpg';
import swajanPhoto from '../assets/team/swajan.jpg';
import mehediPhoto from '../assets/team/mehedi.jpg';
import faisalPhoto from '../assets/team/faisal.jpg';
import teamCorporate from '../assets/team_corporate.png';
import dashboardCorporate from '../assets/dashboard_corporate.png';

const TEAM = [
  {
    id: 'meharaz',
    name: 'Meharaz Hossain',
    since: 'Since 2025',
    role: 'Backend & AI Developer',
    background: 'B.Sc. Engg. in CSE, Bangladesh University of Business and Technology',
    interests: null,
    photo: meharazPhoto,
    delay: '',
  },
  {
    id: 'mehedi',
    name: 'Mehedi Rifat',
    since: 'Since 2025',
    role: 'Backend Developer',
    background: 'B.Sc. Engg. in CSE, Bangladesh University of Business and Technology',
    interests: null,
    photo: mehediPhoto,
    delay: '[transition-delay:100ms]',
  },
  {
    id: 'faisal',
    name: 'Faisal Amir Dipto',
    since: 'Since 2026',
    role: 'UI/UX & Frontend Developer',
    background: 'B.Sc. Engg. in CSE, Bangladesh University of Business and Technology',
    interests: null,
    photo: faisalPhoto,
    delay: '[transition-delay:200ms]',
  },
  {
    id: 'swajan',
    name: 'Swajan Baruah',
    since: 'Since 2026',
    role: 'Backend Developer',
    background: 'B.Sc. Engg. in CSE, American International University Bangladesh (AIUB)',
    interests: null,
    photo: swajanPhoto,
    delay: '[transition-delay:300ms]',
  },
];

export default function Hero() {
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
      {/* Hero Section */}
      <section className="relative isolate min-h-screen flex items-center pt-[96px] sm:pt-[136px] pb-[60px] sm:pb-[88px] overflow-hidden">
        <div className="absolute inset-0 bg-background -z-30"></div>
        
          {/* Floating Background Layers ΓÇö hidden on very small screens */}
          <div className="absolute inset-0 -z-10 pointer-events-none hidden sm:block">
            {/* Rect 1: Top Left */}
            <div className="absolute top-[12%] left-[8%] w-[450px] h-[450px] bg-[#10B981]/15 opacity-60 rounded-[12px] animate-rect1"></div>
            {/* Rect 2: Top Right */}
            <div className="absolute top-[8%] right-[10%] w-[350px] h-[350px] bg-[#6366F1]/10 opacity-50 rounded-[12px] animate-rect2"></div>
            {/* Rect 3 */}
            <div className="absolute top-[52%] left-[42%] w-[350px] h-[350px] bg-[#10B981]/20 opacity-70 rounded-[12px] animate-rect3 z-10"></div>
            {/* Rect 4 */}
            <div className="absolute top-[38%] left-[22%] w-[500px] h-[500px] bg-[#6366F1]/15 opacity-60 rounded-[12px] animate-rect4"></div>
          </div>
          {/* Simplified blob for mobile only */}
          <div className="absolute inset-0 -z-10 pointer-events-none sm:hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[200px] h-[200px] bg-[#6366F1]/10 opacity-40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[10%] left-[-5%] w-[150px] h-[150px] bg-[#10B981]/10 opacity-40 rounded-full blur-2xl"></div>
          </div>

        {/* CONTENT LAYER */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10 w-full">
          <div className="space-y-8 animate-fade-up">
            <span className="inline-block px-4 py-1.5 bg-secondary text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-full shadow-lg shadow-secondary/20">Automate Everything</span>
            <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] text-primary">
              Automate Conversations on <span className="text-tertiary">
                <span className="animate-stretch-shrink" style={{transformOrigin: 'bottom left'}}>Facebook,</span>{' '}
                <span className="animate-stretch-shrink" style={{transformOrigin: 'bottom center'}}>Instagram</span>{' '}
                <span className="animate-stretch-shrink" style={{transformOrigin: 'bottom center'}}>&amp;</span>{' '}
                <span className="animate-stretch-shrink" style={{transformOrigin: 'bottom right'}}>WhatsApp</span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              Scale your customer engagement with instant AI-powered replies, automated lead capture, and hyper-growth sales funnels that work 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/app/get-started" className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all group shadow-xl shadow-primary/10">
                Start Free Trial
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" data-icon="arrow_forward">arrow_forward</span>
              </Link>
              <button className="bg-white border border-slate-200 text-primary px-8 py-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all">
                Watch Demo
              </button>
            </div>
          </div>
          {/* Detailed Chat Interface ΓÇö hidden on small mobile, shown from sm+ */}
          <div className="relative animate-fade-in [animation-delay:200ms] hidden sm:block">
            {/* Accent Blur 1 ΓÇö Green #108981, 160├ù160, bottom-left overflow, 60% opacity, layer blur */}
            <div className="absolute -bottom-[40px] -left-[40px] w-[160px] h-[160px] bg-[#10B981]/5 opacity-30 rounded-[12px] blur-[32px] z-20 pointer-events-none"></div>
            {/* Accent Blur 2 ΓÇö Amber #FEF3C7, 128├ù128, top-right overflow, 60% opacity, layer blur */}
            <div className="absolute -top-[40px] -right-[40px] w-[128px] h-[128px] bg-[#FEF3C7]/50 opacity-30 rounded-[12px] blur-[32px] z-20 pointer-events-none"></div>
            <div className="relative z-10 bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)]">
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                  </div>
                  <div className="bg-slate-50 text-slate-700 py-3 px-5 rounded-[1.5rem] rounded-tl-none shadow-sm max-w-[85%] border border-slate-100">
                    <p className="text-[15px] font-medium leading-relaxed">Hi there ≡ƒæï How can we help you?</p>
                  </div>
                </div>
                <div className="flex items-start justify-end gap-3">
                  <div className="bg-[#0ea5e9] text-white py-3 px-5 rounded-[1.5rem] rounded-tr-none shadow-lg shadow-blue-500/20 max-w-[85%]">
                    <p className="text-[15px] font-medium leading-relaxed">Yes ≡ƒÿè Would you like pricing or a demo?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                  </div>
                  <div className="bg-slate-50 text-slate-700 py-3 px-5 rounded-[1.5rem] rounded-tl-none shadow-sm max-w-[85%] border border-slate-100">
                    <p className="text-[15px] font-medium leading-relaxed">Book me a demo ≡ƒÜÇ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0 shadow-lg shadow-tertiary/30">
                    <span className="material-symbols-outlined text-white text-[10px]">bolt</span>
                  </div>
                  <div className="bg-white py-3 px-5 rounded-[1.5rem] rounded-tl-none border border-slate-100 flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl opacity-60 -z-10"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary-container rounded-full blur-3xl opacity-60 -z-10"></div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 sm:py-40 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-24 reveal">
            <label className="font-label text-sm font-extrabold tracking-[0.25em] uppercase text-secondary mb-4 block">The Process</label>
            <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-primary">Three steps to automation</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-16">
            <div className="group reveal">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-tertiary group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-tertiary/20">
                <span className="material-symbols-outlined text-3xl" data-icon="hub">hub</span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-5">Connect</h3>
              <p className="text-on-surface-variant leading-relaxed">Securely link your social profiles in seconds with our one-click integration suite.</p>
            </div>
            <div className="group reveal [transition-delay:150ms]">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-secondary group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-secondary/20">
                <span className="material-symbols-outlined text-3xl" data-icon="auto_awesome">auto_awesome</span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-5">Automate</h3>
              <p className="text-on-surface-variant leading-relaxed">Build intelligent conversation flows using our visual drag-and-drop AI architect.</p>
            </div>
            <div className="group reveal [transition-delay:300ms]">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-10 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm border border-slate-100 group-hover:shadow-xl group-hover:shadow-primary/20">
                <span className="material-symbols-outlined text-3xl" data-icon="trending_up">trending_up</span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-5">Grow</h3>
              <p className="text-on-surface-variant leading-relaxed">Watch your lead list expand and conversion rates soar with 24/7 engagement.</p>
            </div>
          </div>
        </div>
      </section>




      {/* ΓöÇΓöÇ WHAT WE DO ΓÇö Feature Grid ΓöÇΓöÇ */}
      {/* <section className="py-20 sm:py-32 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center mb-24">
            <label className="font-label text-xs font-bold tracking-[0.3em] uppercase text-secondary mb-4 block">Our Platform</label>
            <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-primary mb-6">Designed for impact.</h2>
            <p className="text-on-surface-variant text-xl max-w-2xl mx-auto">Our features aren't just utilities ΓÇö they are tools that refine your digital presence into a curated, high-performance experience.</p>
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

      {/* ΓöÇΓöÇ OUR MISSION & PRINCIPLES ΓöÇΓöÇ */}
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
              <div className="p-10 bg-surface-container-lowest border border-outline-variant/20 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-start gap-8">
                  <span className="font-headline text-5xl text-primary/20 font-black flex-shrink-0">01</span>
                  <div>
                    <h3 className="font-headline text-2xl mb-4 text-primary">Simplicity</h3>
                    <p className="text-on-surface-variant text-lg leading-relaxed">Complexity is the enemy of execution. We design every interface to be intuitive, stripping away the friction until only the essentials remain.</p>
                  </div>
                </div>
              </div>
              <div className="p-10 bg-surface-container-lowest border border-outline-variant/20 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-start gap-8">
                  <span className="font-headline text-5xl text-secondary/25 font-black flex-shrink-0">02</span>
                  <div>
                    <h3 className="font-headline text-2xl mb-4 text-primary">Intelligence</h3>
                    <p className="text-on-surface-variant text-lg leading-relaxed">Data without context is noise. Our AI isn't just fast; it's smart. It learns from your history to predict the needs of your future customers.</p>
                  </div>
                </div>
              </div>
              <div className="p-10 bg-surface-container-lowest border border-outline-variant/20 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="flex items-start gap-8">
                  <span className="font-headline text-5xl text-tertiary/25 font-black flex-shrink-0">03</span>
                  <div>
                    <h3 className="font-headline text-2xl mb-4 text-primary">Scalability</h3>
                    <p className="text-on-surface-variant text-lg leading-relaxed">Growth should never be painful. Whether you're handling ten chats or ten million, Lyfflow scales horizontally to meet the demand without missing a beat.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ΓöÇΓöÇ WHO WE ARE ΓöÇΓöÇ */}
      <section id="about" className="bg-surface-container-low py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 items-center">
          {/* Left: image + stat card */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-surface-container-highest shadow-2xl">
              <img
                alt="Creative team collaborating"
                className="w-full h-full object-cover contrast-125 transition-all duration-700"
                src={teamCorporate}
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
                    <span className={`md:hidden text-white/50 text-lg transition-transform duration-300 ${tappedMember === member.id ? 'rotate-180' : ''}`}>Γû╛</span>
                  </div>
                </div>

                {/* Mobile expand card */}
                <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
                  tappedMember === member.id ? 'max-h-[400px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'
                }`}>
                  <div className="flex items-start gap-5 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0 shadow-lg"
                    />
                    <div className="min-w-0">
                      <p className="text-white font-bold text-base">{member.name}</p>
                      <p className="text-tertiary text-xs font-semibold uppercase tracking-wider mb-3">{member.role}</p>
                      <p className="text-slate-300 text-sm leading-relaxed">{member.background}</p>
                      {member.interests && (
                        <p className="text-slate-400 text-xs mt-2">≡ƒÄ» {member.interests}</p>
                      )}
                      <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">{member.since}</p>
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
              <Link to="/app/get-started" className="bg-white text-primary px-12 py-5 rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-white/5">
                Create Free Account
              </Link>
              <Link to="/app/sales" className="bg-transparent border-2 border-white/20 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-white/5 transition-all">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Cursor-following team card ΓÇö desktop only */}
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
            <img className="team-cursor-photo" alt={member.name} src={member.photo} />
            <div className="team-cursor-info">
              <p className="team-cursor-name">{member.name}</p>
              <p className="team-cursor-role">{member.role}</p>
              <div className="team-cursor-divider" />
              <p className="team-cursor-meta"><strong>Background:</strong> <span>{member.background}</span></p>
              {member.interests && (
                <p className="team-cursor-meta"><strong>Interests:</strong> <span>{member.interests}</span></p>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
