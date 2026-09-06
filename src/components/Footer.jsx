import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo1.webp';
import titleImg from '../assets/title.webp';

export default function Footer() {
  return (
    <footer className="bg-surface py-20 px-8">
      <div className="w-full flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto border-t border-outline-variant pt-16">
        <div className="mb-10 md:mb-0 text-center md:text-left">
          <div className="text-2xl font-black text-on-surface mb-3 tracking-tighter flex items-center justify-center md:justify-start gap-1">
          <Link to="/" className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={logoImg} alt="LYFFLOW Logo" width="56" height="32" loading="lazy" decoding="async" style={{ height: '32px', width: 'auto', filter: 'brightness(0) saturate(100%) invert(59%) sepia(72%) saturate(450%) hue-rotate(100deg) brightness(95%) contrast(90%)' }} />
            <img src={titleImg} alt="LYFFLOW" width="88" height="18" loading="lazy" decoding="async" style={{ height: '18px', width: 'auto', filter: 'brightness(0) saturate(100%) invert(59%) sepia(72%) saturate(450%) hue-rotate(100deg) brightness(95%) contrast(90%)' }} />
          </Link>
          </div>
          <p className="font-['Inter'] text-on-surface-variant text-sm">© {new Date().getFullYear()} LYFFLOW, Inc. All rights reserved.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-10">
          <Link className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" to="legal#privacy_policy_and_security">Privacy Policy</Link>
          <Link className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" to="/legal">Terms of Service</Link>
          <Link className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" to="/support">Help Center</Link>
          <Link className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" to="/sales">Contact Sales</Link>
          <a className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#">API Docs</a>
        </div>
      </div>
    </footer>
  );
}
