import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const SUPPORT_PATHS = [
  {
    icon: 'support_agent',
    eyebrow: 'Product support',
    title: 'Get help with LYFFLOW',
    description: 'For questions about Pages, AI agents, knowledge, conversations, or your workspace.',
    action: 'Email product support',
    href: 'mailto:support@lyfflow.com?subject=LYFFLOW%20product%20support%20request',
    tone: 'emerald'
  },
  {
    icon: 'lock_reset',
    eyebrow: 'Account access',
    title: 'Can’t sign in?',
    description: 'Contact us from the email address connected to your workspace so we can help verify access.',
    action: 'Get account help',
    href: 'mailto:support@lyfflow.com?subject=Cannot%20access%20my%20LYFFLOW%20account',
    tone: 'blue'
  },
  {
    icon: 'handshake',
    eyebrow: 'Sales',
    title: 'Planning something bigger?',
    description: 'Talk with our sales team about plans, onboarding, integrations, and larger deployments.',
    action: 'Contact sales',
    to: '/sales',
    tone: 'violet'
  }
];

const toneClasses = {
  emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500',
  blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-500',
  violet: 'bg-violet-50 text-violet-600 group-hover:bg-violet-500'
};

export default function Contact() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex flex-col selection:bg-secondary selection:text-white">
      <Navbar />

      <main className="flex-grow">
        <section className="relative overflow-hidden px-6 pt-36 pb-20 md:pt-44 md:pb-28">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-emerald-400/10 blur-[110px] pointer-events-none" />
          <div className="absolute top-24 -right-40 w-[520px] h-[520px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 border border-emerald-100">
              <span className="material-symbols-outlined text-[17px]">contact_support</span>
              LYFFLOW Help Center
            </span>
            <h1 className="mt-7 font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.04] text-slate-950">
              Find the help you need.<br />
              <span className="text-emerald-500">Keep your work flowing.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg leading-relaxed text-slate-500 font-medium">
              Start with guided help inside your workspace, contact product support, or reach the team best suited to your question.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/dashboard/support"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-xl shadow-slate-300 hover:bg-slate-800 hover:-translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[19px]">menu_book</span>
                Open support guides
              </Link>
              <a
                href="mailto:support@lyfflow.com?subject=LYFFLOW%20support%20request"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-6 py-4 text-sm font-black text-slate-800 hover:border-slate-400 hover:-translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[19px]">mail</span>
                Email support
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Choose a path</p>
              <h2 className="mt-3 font-headline text-3xl md:text-4xl font-black tracking-tight text-slate-950">Reach the right team faster</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SUPPORT_PATHS.map(path => {
                const content = (
                  <>
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:text-white ${toneClasses[path.tone]}`}>
                      <span className="material-symbols-outlined">{path.icon}</span>
                    </span>
                    <span className="mt-6 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">{path.eyebrow}</span>
                    <span className="mt-2 text-xl font-black text-slate-950">{path.title}</span>
                    <span className="mt-3 flex-grow text-sm leading-6 font-medium text-slate-500">{path.description}</span>
                    <span className="mt-7 inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                      {path.action}
                      <span className="material-symbols-outlined text-[17px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </span>
                  </>
                );

                return path.to ? (
                  <Link key={path.title} to={path.to} className="group min-h-[300px] flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all">
                    {content}
                  </Link>
                ) : (
                  <a key={path.title} href={path.href} className="group min-h-[300px] flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all">
                    {content}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 pb-28">
          <div className="max-w-6xl mx-auto rounded-[2rem] bg-slate-950 text-white p-8 md:p-12 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Before you contact us</p>
              <h2 className="mt-3 font-headline text-3xl md:text-4xl font-black tracking-tight">A little context helps us help you.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 font-medium">Include the workspace email, affected Facebook Page, what you expected to happen, and any useful screenshots. Never send passwords or complete payment-card details.</p>
            </div>
            <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="space-y-4">
                {['Describe the goal and the issue', 'Include the affected Page or agent', 'Add the approximate time it occurred'].map((tip, index) => (
                  <div key={tip} className="flex items-center gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center text-xs font-black">{index + 1}</span>
                    <span className="text-sm font-bold text-slate-100">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
