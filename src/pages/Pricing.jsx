import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';

export default function Pricing() {
  const navigate = useNavigate();
  const handleSubscribe = async (planType) => {
    try {
      await apiService.subscribe({ subscription_type: planType, num_months: 1 });
      navigate('/dashboard');
    } catch (e) {
      alert("Failed to subscribe: " + e.message);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col">
      <Navbar />

      <main className="relative flex-grow">
        {/* Floating Abstract Background Elements */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary rounded-full -z-10" style={{ filter: 'blur(80px)', opacity: 0.15 }}></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-secondary rounded-full -z-10" style={{ filter: 'blur(80px)', opacity: 0.15 }}></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-surface-tint rounded-full -z-10" style={{ filter: 'blur(80px)', opacity: 0.15 }}></div>
        
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
          <span className="inline-block py-1 px-4 mb-6 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-sm font-bold tracking-widest uppercase">Pricing Plans</span>
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface tracking-tighter leading-tight mb-6">
            Simple, transparent pricing <br className="hidden md:block"/> for teams of all sizes.
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-on-surface-variant font-body mb-12">
            Scale your customer interactions with intelligent AI agents that grow with your business. No hidden fees, just pure flow.
          </p>
        </section>

        {/* Pricing Grid */}
        <section className="relative px-6 pb-32 max-w-7xl mx-auto z-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Free Plan */}
            <div className="flex flex-col p-8 rounded-[1.5rem] bg-surface-container-low transition-all duration-300 hover:bg-surface-container-lowest hover:shadow-2xl shadow-on-surface/5 group border border-transparent hover:border-outline-variant/30">
              <div className="mb-8">
                <h3 className="font-headline text-2xl font-bold mb-2">Free</h3>
                <p className="text-on-surface-variant text-sm">Perfect for hobbyists and experimentation.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-black text-on-surface">$0</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="flex-grow space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>1 Page</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>1 AI Agent</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>100K Tokens/mo</span>
                </li>

                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>10 MB Storage</span>
                </li>
                <li className="pt-4 border-t border-outline-variant/30 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Features</li>
                <li className="text-sm">Basic AI replies</li>
                <li className="text-sm">Manual knowledge base</li>
              </ul>
              <button onClick={() => handleSubscribe('FREE')} className="w-full py-4 bg-surface-container-highest text-on-surface font-bold rounded-full transition-all group-hover:bg-primary group-hover:text-on-primary">
                Get Started
              </button>
            </div>

            {/* Starter Plan */}
            <div className="flex flex-col p-8 rounded-[1.5rem] bg-surface-container-low transition-all duration-300 hover:bg-surface-container-lowest hover:shadow-2xl shadow-on-surface/5 group border border-transparent hover:border-outline-variant/30">
              <div className="mb-8">
                <h3 className="font-headline text-2xl font-bold mb-2">Starter</h3>
                <p className="text-on-surface-variant text-sm">For small teams building their first bots.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-black text-on-surface">$19</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="flex-grow space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>3 Pages</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>3 AI Agents</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>3M Tokens/mo</span>
                </li>

                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>200 MB Storage</span>
                </li>
                <li className="pt-4 border-t border-outline-variant/30 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Features</li>
                <li className="text-sm">AI replies + personality config</li>
                <li className="text-sm">File upload knowledge base</li>
                <li className="text-sm">Human takeover toggle</li>
                <li className="text-sm">Token top-up available</li>
              </ul>
              <button disabled className="w-full py-4 bg-surface-container flex items-center justify-center opacity-80 cursor-not-allowed text-on-surface font-bold rounded-full transition-all">
                Coming Soon
              </button>
            </div>

            {/* Growth Plan (Featured) */}
            <div className="relative flex flex-col p-8 rounded-[1.5rem] bg-white border-2 border-primary shadow-2xl shadow-primary/10 transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_32px_64px_-8px_rgba(15,23,42,0.25)] cursor-pointer">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">Most Popular</div>
              <div className="mb-8">
                <h3 className="font-headline text-2xl font-bold mb-2">Growth</h3>
                <p className="text-on-surface-variant text-sm">Scaling businesses needing advanced control.</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-black text-on-surface">$49</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="flex-grow space-y-4 mb-10">
                <li className="flex items-center gap-3 text-sm font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>10 Pages</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>10 AI Agents</span>
                </li>
                <li className="flex items-center gap-3 text-sm font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>10M Tokens/mo</span>
                </li>

                <li className="flex items-center gap-3 text-sm font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span>1 GB Storage</span>
                </li>
                <li className="pt-4 border-t border-outline-variant/30 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">Features</li>
                <li className="text-sm">All Starter features</li>
                <li className="text-sm">Analytics dashboard</li>
                <li className="text-sm">Multi-admin per page</li>
                <li className="text-sm">Token top-up available</li>
                <li className="text-sm font-medium text-primary">Priority support</li>
              </ul>
              <button disabled className="w-full py-4 bg-outline-variant text-on-surface opacity-80 cursor-not-allowed font-black rounded-full shadow-lg transition-transform">
                Coming Soon
              </button>
            </div>

            {/* Agency Plan */}
            <div className="flex flex-col p-8 rounded-[1.5rem] bg-[#222222] text-[#f1f1f1] transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.6)] hover:border-[#6366f1] group border border-[#333] cursor-pointer">
              <div className="mb-8">
                <h3 className="font-headline text-2xl font-bold mb-2">Agency</h3>
                <p className="text-[#a1a1aa] text-sm">For agencies & resellers</p>
              </div>
              <div className="mb-8 border-b border-[#333] pb-6">
                <span className="text-4xl font-black text-white">$99</span>
                <span className="text-[#a1a1aa]">/mo</span>
              </div>
              <ul className="flex-grow space-y-3 mb-10 text-[13px] xl:text-[14px]">
                <li className="flex items-center justify-between">
                  <span className="text-[#a1a1aa]">Pages</span>
                  <span className="px-2 py-0.5 bg-[#18181b] rounded font-semibold border border-[#333]">Unlimited</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-[#a1a1aa]">AI Agents</span>
                  <span className="px-2 py-0.5 bg-[#18181b] rounded font-semibold border border-[#333]">Unlimited</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-[#a1a1aa]">Tokens / mo</span>
                  <span className="px-2 py-0.5 bg-[#14532d]/40 text-[#4ade80] rounded font-semibold flex items-center gap-1">30M <span className="material-symbols-outlined text-[14px] font-bold">arrow_upward</span></span>
                </li>

                <li className="flex items-center justify-between">
                  <span className="text-[#a1a1aa]">Storage</span>
                  <span className="px-2 py-0.5 bg-[#18181b] rounded font-semibold border border-[#333]">5 GB</span>
                </li>
                <div className="pt-6 space-y-4 border-t border-[#333] !mt-6 block">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#4ade80] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>All Growth features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#4ade80] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>White-label branding</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#4ade80] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>Advanced analytics + export</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#4ade80] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>Token top-up available</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#4ade80] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span>Dedicated support + SLA</span>
                  </div>
                </div>
              </ul>
              <button disabled className="w-full py-4 mt-auto bg-[#333]/50 text-gray-400 opacity-80 cursor-not-allowed font-medium rounded-full shadow-lg transition-transform border border-[#444]">
                Coming Soon
              </button>
            </div>
          </div>
          

        </section>

        {/* Feature Comparison (Editorial Style) */}
        <section className="bg-surface-container-low py-24 z-10 relative">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="font-headline text-4xl font-bold tracking-tight mb-6">Built for high-velocity teams.</h2>
                <p className="text-on-surface-variant mb-8">We don't just provide tokens; we provide a platform that handles the complexity of AI training and deployment so you can focus on growth.</p>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-secondary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-secondary-container">speed</span>
                    </div>
                    <div>
                      <h4 className="font-bold">Lightning Fast Setup</h4>
                      <p className="text-sm text-on-surface-variant">Deploy your first agent in under 2 minutes with our intuitive builder.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-surface-container-highest flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary">shield</span>
                    </div>
                    <div>
                      <h4 className="font-bold">Enterprise Security</h4>
                      <p className="text-sm text-on-surface-variant">Your data is encrypted and isolated. We never train models on your private data.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 rounded-[1.5rem] transform rotate-3"></div>
                <img alt="Modern office space with creative teams collaborating around monitors" className="relative rounded-[1.5rem] shadow-xl object-cover h-96 w-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBr0rMfeHzVigJIdzcOWUT96ryJ3bkpLivnZSsAJGIcrWqxCifsN2TByPJnV41Eqv5JXJBpIFQsP6YHTUTXCOq5MCcHw0uVgkz8u8WtxGJtIvPDW_PgZUp1J19XoJJMBxeteC5BI6__XL2EEF1P5zpRxzFqCvBwBjx_b-6ji6lcOKvUffegs9vFheG4eKHW307Jo2SMHJU3SxuwjbpIIpIAFy6Uri7fq7FyKjYdkyjiHvQaNBNG6zIFyEPb9DPGRgBMZO5fgEew170" />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ CTA */}
        <section className="py-24 text-center px-6 z-10 relative">
          <h2 className="font-headline text-3xl font-bold mb-4">Have questions about our plans?</h2>
          <p className="text-on-surface-variant mb-10">Our sales team is ready to help you find the perfect fit for your workflow.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/sales" className="px-8 py-3 bg-on-surface text-surface rounded-full font-bold hover:bg-surface-variant hover:text-on-surface transition-colors">Contact Sales</Link>
            <Link to="/app#faq" className="px-8 py-3 border border-outline text-on-surface rounded-full font-bold hover:bg-surface-container-low transition-colors">View All FAQs</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
