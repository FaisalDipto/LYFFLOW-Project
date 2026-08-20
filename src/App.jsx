import { useEffect, useState, lazy, Suspense } from 'react' // Final check on imports
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { WidgetProvider } from './context/WidgetContext'
import AppLoadingScreen from './components/AppLoadingScreen'
import Home from './pages/Home'
import './App.css'

const GetStarted = lazy(() => import('./pages/GetStarted'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Legal = lazy(() => import('./pages/Legal'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Sales = lazy(() => import('./pages/Sales'))
const Contact = lazy(() => import('./pages/Contact'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

const APP_FONT_STYLESHEET = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,600;9..40,700;9..40,800&family=Manrope:wght@400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';

function RouteFontLoader() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || document.getElementById('lyfflow-app-fonts')) return;

    const stylesheet = document.createElement('link');
    stylesheet.id = 'lyfflow-app-fonts';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = APP_FONT_STYLESHEET;
    document.head.appendChild(stylesheet);
  }, [pathname]);

  return null;
}

// Handles scroll-to-top on route change and smooth-scroll to hash sections
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Give the page time to render before scrolling to the element
      const timer = setTimeout(() => {
        try {
          if (hash === '#_=_') return;
          const el = document.querySelector(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch {
          // ignore invalid selectors
        }
      }, 80);
      return () => clearTimeout(timer);
    } else {
      // No hash — always start at the top of the new page
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
}

function RateLimitModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleRateLimit = () => setIsOpen(true);
    window.addEventListener('lyfflow-api-rate-limit', handleRateLimit);
    
    // Globally suppress alerts for rate limiting to avoid double-popups
    const originalAlert = window.alert;
    window.alert = (msg) => {
      if (msg && typeof msg === 'string' && msg.toLowerCase().includes('too many requests')) return;
      originalAlert(msg);
    };

    return () => {
      window.removeEventListener('lyfflow-api-rate-limit', handleRateLimit);
      window.alert = originalAlert;
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in relative border border-slate-100 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
          <span className="material-symbols-outlined text-4xl">hourglass_empty</span>
        </div>
        <h2 className="text-2xl font-headline font-black tracking-tight text-slate-900 mb-4">Too Many Requests</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          You are making requests too quickly. Please wait a moment and try again.
        </p>
        <button
          onClick={() => setIsOpen(false)}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors cursor-pointer border-none text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <WidgetProvider>
      <RouteFontLoader />
      <RateLimitModal />
      <ScrollManager />
      <Suspense fallback={<AppLoadingScreen />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/support" element={<Contact />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPanel />} />
          
          
          {/* Redirect hardcoded backend callbacks back to /app prefix */}

        </Routes>
      </Suspense>
    </WidgetProvider>
  )
}

export default App
