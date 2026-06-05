import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';

export default function Footer() {
  return (
    <footer className="bg-white py-20 px-8">
      <div className="w-full flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto border-t border-slate-100 pt-16">
        <div className="mb-10 md:mb-0 text-center md:text-left">
          <div className="text-2xl font-black text-primary mb-3 tracking-tighter flex items-center justify-center md:justify-start gap-1">
          <Link to="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoImg} alt="LYFFLOW Logo" style={{ height: '32px', width: 'auto' }} />
            <img src={titleImg} alt="LYFFLOW" style={{ height: '18px', width: 'auto' }} />
          </Link>
          </div>
          <p className="font-['Inter'] text-slate-500 text-sm">© {new Date().getFullYear()} LYFFLOW, Inc. All rights reserved.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-10">
          <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/legal#sec-9">Privacy Policy</Link>
          <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/legal">Terms of Service</Link>
          <Link className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" to="/sales">Contact Sales</Link>
          <a className="text-sm font-medium text-slate-500 hover:text-primary transition-colors" href="#">API Docs</a>
        </div>
      </div>
    </footer>
  );
}
