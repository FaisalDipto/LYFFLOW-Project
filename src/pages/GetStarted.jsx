import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Moon, Sun } from 'lucide-react';
import './GetStarted.css';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';
import LegalCenter from '../components/LegalCenter';
import catAnimationUrl from '../../animation/catLottieJSON.json?url';
import { googleLoginUrl } from '../services/api';
import { useSiteTheme } from '../hooks/useSiteTheme';

// Reasons the backend appends as ?auth=failed&error=<reason>.
const AUTH_ERROR_MESSAGES = {
  google_token: 'Google did not complete the sign-in. Please try again.',
  google_userinfo: 'We could not read your Google account details. Please try again.',
  state_mismatch: 'Your sign-in session expired. Please try again.',
  access_denied: 'Sign-in was cancelled. Choose a Google account to continue.',
  unexpected: 'Something went wrong on our side. Please try again in a moment.',
};

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1z" />
    <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76z" />
  </svg>
);

export default function GetStarted() {
  const location = useLocation();
  // Shares the homepage's saved light/dark preference.
  const { theme, toggleTheme } = useSiteTheme();

  const query = new URLSearchParams(location.search);
  const authError = query.get('auth') === 'failed'
    ? AUTH_ERROR_MESSAGES[query.get('error')] || AUTH_ERROR_MESSAGES.unexpected
    : null;

  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleLogin = () => {
    if (!agreed) {
      setShowError(true);
      return;
    }
    setIsRedirecting(true);
    window.location.href = googleLoginUrl();
  };

  return (
    <div className="get-started-container" data-theme={theme} style={{ colorScheme: theme }}>
      <button
        type="button"
        className="gs-theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
      </button>

      {/* Main Connection Interface */}
      <div className="left-panel">
        <div className="left-panel-header">
          <Link to="/" className="gs-logo-container">
            <img src={logoImg} alt="LYFFLOW Logo" className="gs-brand-img" style={{ height: '40px', width: 'auto' }} />
            <img src={titleImg} alt="LYFFLOW" className="gs-brand-img" style={{ height: '20px', width: 'auto', marginLeft: '8px' }} />
          </Link>
        </div>
        
        <div className="left-panel-content">
          <div className="graphic-placeholder flex justify-center items-center w-full max-w-[280px] mx-auto mb-8 relative" style={{ height: '240px' }}>
            <DotLottieReact
              src={catAnimationUrl}
              loop
              autoplay
              style={{ width: '100%', height: '100%', transform: 'scale(1.7)', transformOrigin: 'center' }}
            />
          </div>
          <h1 className="left-title">Sign in</h1>
          <p className="left-desc">Use your Google account to sign in to LYFFLOW. You can connect your Facebook pages once your business is set up.</p>
        </div>

        <div className="left-panel-footer">
          <Link to="/" className="back-link">&lt; Back to home</Link>
        </div>
      </div>

      {/* Right Panel - White */}
      <div className="right-panel">
        <div className="right-content w-full max-w-sm mx-auto min-w-0">
          <div className="step-container fade-in w-full min-w-0">
            {authError && (
              <div role="alert" className="gs-auth-error mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{authError}</span>
              </div>
            )}
            <div className="flex flex-col gap-3 w-full mt-4 mb-8">
              <button
                type="button"
                className="btn-connect-google flex items-center justify-center gap-3 w-full transition-all duration-300 py-3 rounded-xl font-bold disabled:cursor-wait disabled:opacity-70"
                onClick={handleGoogleLogin}
                disabled={isRedirecting}
              >
                <GoogleMark />
                {isRedirecting ? 'Redirecting to Google...' : 'Continue with Google'}
              </button>
            </div>

            <div className={`w-full border rounded-xl p-4 sm:p-5 flex flex-col gap-3 transition-colors min-w-0 box-border overflow-hidden gs-terms-box ${showError ? 'gs-terms-error bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-start gap-3 w-full min-w-0">
                <input 
                  type="checkbox" 
                  className={`mt-1 w-5 h-5 rounded cursor-pointer flex-shrink-0 transition-colors ${showError ? 'border-red-400 text-red-500 focus:ring-red-500' : 'border-slate-300 text-primary focus:ring-primary'}`}
                  checked={agreed} 
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setShowError(false);
                  }}
                />
                <div className={`text-xs sm:text-sm text-left leading-relaxed flex-1 min-w-0 break-words ${showError ? 'text-red-700' : 'text-slate-600'}`}>
                  By proceeding, I acknowledge that I have read and agree to the Lyfflow{' '}
                  <Link to="/legal" target="_blank" className="font-bold hover:text-primary transition-colors text-inherit underline underline-offset-2">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/legal" target="_blank" className="font-bold hover:text-primary transition-colors text-inherit underline underline-offset-2">Privacy Policy</Link>.
                </div>
              </div>
              {showError && (
                <div className="text-red-600 text-[11px] sm:text-xs font-bold pl-8 animate-fade-in flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  Please agree to the terms to continue.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
