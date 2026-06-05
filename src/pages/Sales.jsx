import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FAQ from '../components/FAQ';
import { apiService } from '../services/api';

const FEATURES = [
  { icon: 'smart_toy', title: 'Dedicated Onboarding', desc: 'A dedicated success manager walks your team through setup from day one.' },
  { icon: 'speed', title: 'Custom Integrations', desc: 'We tailor integrations for your existing stack — CRM, helpdesk, and beyond.' },
  { icon: 'insights', title: 'Enterprise Analytics', desc: 'Deep reporting dashboards, data exports, and white-label options for agencies.' },
  { icon: 'shield', title: 'SLA & Priority Support', desc: '99.9% uptime SLA with a dedicated support line and escalation path.' },
];

export default function Sales() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', teamSize: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Disable submit button by checking state if needed, or just let it spin
    try {
      await apiService.createLead({
        name: form.name,
        company_name: form.company,
        work_mail: form.email,
        phone_number: form.phone,
        team_size: form.teamSize,
        message: form.message
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit lead form:', err);
      alert('There was an issue sending your message. Please try again.');
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">

        {/* ── HERO ── */}
        <section className="relative pt-36 pb-24 px-6 overflow-hidden">
          {/* Background blobs */}
          <div className="absolute top-[-80px] left-[-60px] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-40px] right-[-60px] w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <span className="inline-block py-1 px-4 mb-6 rounded-full bg-primary text-white text-[10px] font-bold tracking-widest uppercase shadow-lg shadow-primary/20">
                Talk to Sales
              </span>
              <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] text-primary mb-6">
                Let's build something<br />
                <span className="text-secondary">remarkable.</span>
              </h1>
              <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed mb-10">
                Whether you're a startup scaling fast or an agency managing hundreds of clients — our team will craft a plan that fits. No generic pitches. Just straight talk.
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-6">
                {[
                  { label: '10,000+', sub: 'Businesses Trust Us' },
                  { label: '100M+', sub: 'Messages Automated' },
                  { label: '< 1 day', sub: 'Avg. Onboarding Time' },
                ].map(({ label, sub }) => (
                  <div key={sub} className="text-center">
                    <p className="font-headline text-2xl font-black text-primary">{label}</p>
                    <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-widest">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Contact Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 rounded-[2rem] transform rotate-1 pointer-events-none" />
              {submitted ? (
                <div className="relative bg-white rounded-[2rem] shadow-2xl p-12 text-center border border-slate-100">
                  <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <h2 className="font-headline text-3xl font-black tracking-tight text-primary mb-3">Message Received!</h2>
                  <p className="text-on-surface-variant mb-8">Our sales team will reach out within one business day. In the meantime, feel free to explore our platform.</p>
                  <Link to="/pricing" className="inline-block bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                    View Pricing →
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="relative bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 border border-slate-100 space-y-5">
                  <h2 className="font-headline text-2xl font-black tracking-tight text-primary mb-2">Get in touch</h2>
                  <p className="text-sm text-on-surface-variant mb-6">Fill out the form and we'll be in touch within 24 hours.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" htmlFor="name">Full Name *</label>
                      <input
                        id="name" name="name" type="text" required placeholder="Jane Smith"
                        value={form.name} onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" htmlFor="company">Company *</label>
                      <input
                        id="company" name="company" type="text" required placeholder="Acme Corp"
                        value={form.company} onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" htmlFor="email">Work Email *</label>
                    <input
                      id="email" name="email" type="email" required placeholder="jane@company.com"
                      value={form.email} onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" htmlFor="phone">Phone (Optional)</label>
                      <input
                        id="phone" name="phone" type="tel" placeholder="+1 (555) 000-0000"
                        value={form.phone} onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" htmlFor="teamSize">Team Size *</label>
                      <select
                        id="teamSize" name="teamSize" required
                        value={form.teamSize} onChange={handleChange}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-slate-50 cursor-pointer"
                      >
                        <option value="">Select size...</option>
                        <option value="1-5">1–5 people</option>
                        <option value="6-25">6–25 people</option>
                        <option value="26-100">26–100 people</option>
                        <option value="100+">100+ people</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2" htmlFor="message">How can we help? *</label>
                    <textarea
                      id="message" name="message" required rows={4}
                      placeholder="Tell us about your use case, goals, or any questions you have..."
                      value={form.message} onChange={handleChange}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-slate-50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:bg-slate-800 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    Send Message
                    <span className="material-symbols-outlined text-xl">send</span>
                  </button>

                  <p className="text-center text-[11px] text-slate-400">No spam, ever. We respect your privacy.</p>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── WHAT YOU GET ── */}
        <section className="py-24 bg-surface-container-lowest px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-secondary font-label text-xs font-bold tracking-[0.3em] uppercase mb-4 block">Enterprise Features</span>
              <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tight text-primary">Everything your team needs to win.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} className="group p-8 bg-white rounded-[1.5rem] border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl transition-colors duration-300">{icon}</span>
                  </div>
                  <h3 className="font-headline font-bold text-xl text-primary mb-3">{title}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section className="py-24 px-6 bg-primary text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-secondary/30 via-primary to-primary pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { quote: 'LYFFLOW automated 90% of our DMs. Revenue from social grew 3x in 60 days.', name: 'Aria Chen', role: 'CMO, Pulse Retail' },
                { quote: 'The onboarding team had us live the same day. Enterprise-grade but feels human.', name: 'James Osei', role: 'Operations Lead, NovaBrands' },
                { quote: 'Our agency manages 40+ clients through LYFFLOW. The white-label option is a game-changer.', name: 'Sofia Delgado', role: 'Founder, Vantage Agency' },
              ].map(({ quote, name, role }) => (
                <blockquote key={name} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-[1.5rem] p-8">
                  <p className="text-slate-200 text-base leading-relaxed mb-6 italic">"{quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center font-bold text-sm">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{name}</p>
                      <p className="text-slate-400 text-xs">{role}</p>
                    </div>
                  </div>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <FAQ />

        {/* ── BOTTOM CTA ── */}
        <section className="py-24 px-6 bg-surface-container-low text-center">
          <h2 className="font-headline text-3xl md:text-5xl font-black tracking-tight text-primary mb-4">
            Ready to move fast?
          </h2>
          <p className="text-on-surface-variant text-lg mb-10 max-w-xl mx-auto">
            Start for free and upgrade when you're ready — or let our team build a custom plan for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/get-started" className="bg-primary text-white px-10 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]">
              Start Free Trial
            </Link>
            <Link to="/pricing" className="border-2 border-slate-200 text-primary px-10 py-4 rounded-xl font-bold hover:bg-white transition-all hover:border-primary">
              View Pricing
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
