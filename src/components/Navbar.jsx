import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleAboutClick = () => {
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      // Already on home — smooth scroll directly
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Navigate to home with hash — ScrollManager will handle the scroll
      navigate('/app#about');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isMobileMenuOpen) {
      setActiveAccordion(null);
    }
  };

  return (
    <div className="navbar-container">
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        {/* Logo Section */}
        <Link to="/" className="nav-logo">
          <img src={logoImg} alt="LYFFLOW Logo" className="brand-logo-img" />
          <img src={titleImg} alt="LYFFLOW" className="brand-title-img" />
        </Link>

        {/* Hamburger Menu Button */}
        <button
          className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        {/* Desktop Links & Actions / Mobile Menu Container */}
        <div className={`nav-menu-wrapper ${isMobileMenuOpen ? 'open' : ''}`}>
          {/* Links Section */}
          <ul className="nav-links">
            <li
              className={`nav-item ${activeAccordion === 'product' ? 'active-accordion' : ''}`}
              onClick={() => isMobileMenuOpen && setActiveAccordion(activeAccordion === 'product' ? null : 'product')}
            >
              <span className="nav-link-text">Product</span>
              <div className="dropdown-menu">
                <div className="dropdown-item">
                  <div className="dropdown-icon-container product-ig">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">Instagram</h4>
                    <p className="dropdown-desc">Automate DMs and stories.</p>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div className="dropdown-icon-container product-wa">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">WhatsApp</h4>
                    <p className="dropdown-desc">Connect with customers directly.</p>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div className="dropdown-icon-container product-ms">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">Messenger</h4>
                    <p className="dropdown-desc">Scale Facebook interactions.</p>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div className="dropdown-icon-container product-web">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">LYFFLOW Web</h4>
                    <p className="dropdown-desc">Custom widget for your site.</p>
                  </div>
                </div>
              </div>
            </li>

            <li
              className={`nav-item ${activeAccordion === 'resources' ? 'active-accordion' : ''}`}
              onClick={() => isMobileMenuOpen && setActiveAccordion(activeAccordion === 'resources' ? null : 'resources')}
            >
              <span className="nav-link-text">Resources</span>
              <div className="dropdown-menu">
                <Link to="/contact" className="dropdown-item" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="dropdown-icon-container res-help">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">Help Center</h4>
                    <p className="dropdown-desc">Guides and documentation.</p>
                  </div>
                </Link>
                <Link to="/sales" className="dropdown-item" onClick={() => setIsMobileMenuOpen(false)}>
                  <div className="dropdown-icon-container res-contact">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">Contact Us</h4>
                    <p className="dropdown-desc">Get in touch with sales.</p>
                  </div>
                </Link>
                <div className="dropdown-item">
                  <div className="dropdown-icon-container res-status">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">Status</h4>
                    <p className="dropdown-desc">System uptime and health.</p>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div className="dropdown-icon-container res-services">
                    <svg className="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                  </div>
                  <div className="dropdown-text-content">
                    <h4 className="dropdown-title">Services</h4>
                    <p className="dropdown-desc">Professional setup and strategy.</p>
                  </div>
                </div>
              </div>
            </li>

            <li className="nav-item">
              <button className="nav-link-text" onClick={handleAboutClick} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}>About</button>
            </li>
            <li className="nav-item">
              <Link to="/pricing" className="nav-link-text" onClick={() => isMobileMenuOpen && setIsMobileMenuOpen(false)}>Pricing</Link>
            </li>
          </ul>

          {/* Action Section */}
          <div className="nav-actions">
            <Link to="/login" className="btn-signin">Sign In</Link>
            <Link to="/get-started" className="btn-get-started">Get Started</Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
