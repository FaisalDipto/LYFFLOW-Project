import { Book, CheckCircle2, ChevronDown, ClipboardList, CreditCard, Headphones, HelpCircle, LayoutDashboard, LogOut, Mail, Menu, MessageCircleWarning, MessageSquare, Settings, ShieldCheck, Trash2, TrendingUp, User, UserRound, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';
import AppLoadingScreen from '../components/AppLoadingScreen';
import AgentAvatar from '../components/AgentAvatar';
import AgentAvatarModal from '../components/AgentAvatarModal';
import CustomerRecords from '../components/CustomerRecords';
import ProductsTab from '../components/ProductsTab';
import { useWidget } from '../context/WidgetContext';
import { API_BASE } from '../config/env';
import { apiService } from '../services/api';
import './Dashboard.css';

// Helper to trigger Facebook re-authorization to the API backend directly
const triggerFacebookReauth = () => {
  const nextPath = '/dashboard';
  const redirectUrl = encodeURIComponent(window.location.origin + nextPath);
  window.location.href = `${API_BASE}/v1/auth/facebook/reauth?redirect_uri=${redirectUrl}&next=${nextPath}`;
};

const CountUpNumber = ({ value, duration = 1400 }) => {
  const targetValue = Math.max(0, Number(value) || 0);
  const [displayValue, setDisplayValue] = useState(0);
  const currentValueRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentValueRef.current = targetValue;
      setDisplayValue(targetValue);
      return undefined;
    }

    const startValue = currentValueRef.current;
    const difference = targetValue - startValue;
    let animationFrame;
    let startTime;

    const animate = (timestamp) => {
      if (startTime === undefined) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = progress < 0.5
        ? 4 * Math.pow(progress, 3)
        : 1 - (Math.pow(-2 * progress + 2, 3) / 2);
      const nextValue = Math.round(startValue + (difference * easedProgress));

      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, targetValue]);

  return (
    <span
      key={targetValue}
      className="overview-count-number tabular-nums"
      style={{ animationDuration: `${duration}ms` }}
      aria-label={targetValue.toLocaleString()}
    >
      {displayValue.toLocaleString()}
    </span>
  );
};

// Sub-components
const Overview = ({ user, pages, onNavigate, onUpdate, onAddPage }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [dropdownPlacement, setDropdownPlacement] = useState('bottom');
  const [isPlatformModalOpen, setIsPlatformModalOpen] = useState(false);
  const [showInstaComingSoon, setShowInstaComingSoon] = useState(false);
  const [assigning, setAssigning] = useState({}); // {pageId: boolean}
  const [success, setSuccess] = useState({}); // {pageId: boolean}
  const [selectedAgents, setSelectedAgents] = useState(() => {
    try {
      const cached = localStorage.getItem('lyfflow_assigned_agents');
      return cached ? JSON.parse(cached) : {};
    } catch (e) {
      return {};
    }
  });

  const agents = user?.agents || [];
  const pageCount = Array.isArray(pages) ? pages.length : 0;
  const assignedPageCount = Array.isArray(pages)
    ? pages.filter(page => Boolean(selectedAgents[page.page_id])).length
    : 0;
  const workspaceName = user?.workspace_name || 'My Workspace';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!Array.isArray(pages) || pages.length === 0) return;

    setSelectedAgents(prev => {
      const nextAgents = { ...prev };
      let changed = false;

      pages.forEach(p => {
        let backendAgentId = null;
        if (p.agent_name) {
          const matched = agents.find(a => a.name === p.agent_name);
          if (matched) {
            backendAgentId = matched.agent_id;
          } else {
            // It's assigned by someone else, so we use a fallback placeholder ID
            backendAgentId = `foreign_agent_${p.agent_name}`;
          }
        }

        const agId = backendAgentId || p.agent_id || p.agent?.agent_id || p.agent?.id || p.assigned_agent_id;

        if (p.agent_name === null || p.agent_name === '') {
          if (nextAgents[p.page_id]) {
            delete nextAgents[p.page_id];
            changed = true;
          }
        } else if (agId) {
          if (nextAgents[p.page_id] !== agId) {
            nextAgents[p.page_id] = agId;
            changed = true;
          }
        }
      });

      if (changed) {
        try {
          localStorage.setItem('lyfflow_assigned_agents', JSON.stringify(nextAgents));
        } catch (e) { }
        return nextAgents;
      }
      return prev;
    });
  }, [pages, agents]);

  const handleAssign = async (pageId, agentId) => {
    if (!agentId) return;
    setAssigning(prev => ({ ...prev, [pageId]: true }));
    try {
      const response = await apiService.assignAgentToPage(pageId, agentId);
      console.log('Assign Agent API Response:', response);
      setSelectedAgents(prev => {
        const nextState = { ...prev, [pageId]: agentId };
        try {
          localStorage.setItem('lyfflow_assigned_agents', JSON.stringify(nextState));
        } catch (e) { }
        return nextState;
      });
      setSuccess(prev => ({ ...prev, [pageId]: true }));
      setTimeout(() => {
        setSuccess(prev => ({ ...prev, [pageId]: false }));
      }, 3000);
      // Removed onUpdate() to prevent excessive API calls. Local state handles UI update.
    } catch (error) {
      console.error("Failed to assign agent:", error);
      alert("Failed to assign agent: " + error.message);
    } finally {
      setAssigning(prev => ({ ...prev, [pageId]: false }));
    }
  };

  const handleUnassign = async (pageId) => {
    setAssigning(prev => ({ ...prev, [pageId]: true }));
    try {
      await apiService.unassignAgentFromPage(pageId);
      setSelectedAgents(prev => {
        const nextState = { ...prev };
        delete nextState[pageId];
        try {
          localStorage.setItem('lyfflow_assigned_agents', JSON.stringify(nextState));
        } catch (e) { }
        return nextState;
      });
      setSuccess(prev => ({ ...prev, [pageId]: true }));
      setTimeout(() => {
        setSuccess(prev => ({ ...prev, [pageId]: false }));
      }, 3000);
      // Removed onUpdate() to prevent excessive API calls. Local state handles UI update.
    } catch (error) {
      console.error("Failed to unassign agent:", error);
      alert("Failed to unassign agent: " + error.message);
    } finally {
      setAssigning(prev => ({ ...prev, [pageId]: false }));
    }
  };

  const handleAddPage = () => {
    setIsPlatformModalOpen(true);
  };

  const handleAgentDropdownToggle = (pageId, event) => {
    if (openDropdown === pageId) {
      setOpenDropdown(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const agentRows = Math.max(agents.length, 1);
    const actionRows = selectedAgents[pageId] ? 2 : 1;
    const estimatedMenuHeight = Math.min((agentRows * 37) + (actionRows * 34) + 20, 360);
    const spaceBelow = window.innerHeight - triggerRect.bottom - 12;
    const spaceAbove = triggerRect.top - 12;

    setDropdownPlacement(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom');
    setOpenDropdown(pageId);
  };

  const handlePlatformSelect = (platform) => {
    if (platform === 'facebook') {
      setIsPlatformModalOpen(false);
      if (onAddPage) {
        onAddPage(); // Show the pre-warning modal in parent
      } else {
        triggerFacebookReauth();
      }
    } else {
      setShowInstaComingSoon(true);
    }
  };

  return (
    <div className="dashboard-content-area animate-fade-in-up flex-1 p-4 md:p-6 xl:p-8 w-full text-left bg-surface-bright">
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:px-6 md:py-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Workspace overview</span>
            <h1 className="m-0 truncate font-headline text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{workspaceName}</h1>
            <p className="mb-0 mt-1 text-sm font-medium text-slate-500">Manage your connected pages and the agents answering for them.</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 md:gap-x-7">
            <div>
              <span className="block text-xl font-black leading-none text-slate-950"><CountUpNumber value={pageCount} /></span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Pages</span>
            </div>
            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
            <div>
              <span className="block text-xl font-black leading-none text-slate-950"><CountUpNumber value={assignedPageCount} /></span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned</span>
            </div>
            <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
            <div>
              <span className="block text-xl font-black leading-none text-slate-950"><CountUpNumber value={agents.length} /></span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Agents</span>
            </div>
            <button
              type="button"
              onClick={handleAddPage}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:border-emerald-600 hover:bg-emerald-600 md:ml-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Connect page
            </button>
          </div>
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-sm font-black text-slate-900">Connected pages</h2>
          <p className="mb-0 mt-0.5 text-xs text-slate-500">Choose which agent handles each inbox.</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-400">{pageCount} total</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
        {Array.isArray(pages) && pages.map((page) => {
          const selectedAgent = agents.find(agent => agent.agent_id === selectedAgents[page.page_id]);
          const foreignAgentName = selectedAgents[page.page_id] && String(selectedAgents[page.page_id]).startsWith('foreign_agent_')
            ? String(selectedAgents[page.page_id]).replace('foreign_agent_', '')
            : null;
          const hasAssignedAgent = Boolean(selectedAgents[page.page_id]);

          return (
            <article
              key={page.page_id}
              className={`group relative min-w-0 overflow-visible rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${openDropdown === page.page_id ? 'z-[1000]' : 'z-0'}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  {page.profile_pic_url ? (
                    <img src={page.profile_pic_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-xl text-slate-500">forum</span>
                  )}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" title="Connected" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="m-0 truncate text-sm font-black text-slate-900" title={page.name}>{page.name || 'Untitled page'}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <span className="material-symbols-outlined text-[13px] text-blue-500">facebook</span>
                    <span>Connected</span>
                  </div>
                </div>

                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${hasAssignedAgent ? 'bg-emerald-500' : 'bg-amber-400'}`} title={hasAssignedAgent ? 'Agent assigned' : 'No agent assigned'} />
              </div>

              <p className="mb-0 mt-3 truncate text-xs leading-5 text-slate-500" title={page.description || ''}>
                {page.description || 'Facebook messaging page'}
              </p>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Assigned agent</span>
                  {success[page.page_id] && <span className="text-[10px] font-bold text-emerald-600">Saved</span>}
                </div>

                <div className="custom-dropdown-container relative mx-auto w-[88%] min-w-0">
                  <button
                    type="button"
                    onClick={(event) => handleAgentDropdownToggle(page.page_id, event)}
                    disabled={assigning[page.page_id]}
                    aria-expanded={openDropdown === page.page_id}
                    aria-haspopup="menu"
                    className={`flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 text-left text-xs font-bold transition-colors disabled:cursor-wait disabled:opacity-60 ${hasAssignedAgent ? 'border-emerald-100 bg-emerald-50 text-slate-800 hover:border-emerald-200' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {selectedAgent ? (
                        <AgentAvatar agent={selectedAgent} size="w-5 h-5" iconSize="text-[13px]" />
                      ) : (
                        <span className="material-symbols-outlined text-[17px]">smart_toy</span>
                      )}
                      <span className="truncate">
                        {assigning[page.page_id]
                          ? 'Updating...'
                          : selectedAgent?.name || (foreignAgentName ? `${foreignAgentName} (Team)` : 'Select an agent')}
                      </span>
                    </span>
                    <ChevronDown size={14} className={`shrink-0 transition-transform ${openDropdown === page.page_id ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === page.page_id && (
                    <div
                      className={`absolute left-0 z-[1100] w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl ${dropdownPlacement === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'}`}
                      role="menu"
                    >
                      {agents.length === 0 ? (
                        <div className="px-3 py-3 text-center text-xs font-medium text-slate-500">No agents available</div>
                      ) : (
                        agents.map(agent => (
                          <button
                            type="button"
                            role="menuitem"
                            key={agent.agent_id}
                            onClick={() => {
                              handleAssign(page.page_id, agent.agent_id);
                              setOpenDropdown(null);
                            }}
                            className={`flex w-full items-center justify-between border-0 px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-slate-50 ${selectedAgents[page.page_id] === agent.agent_id ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-700'}`}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <AgentAvatar agent={agent} size="w-5 h-5" iconSize="text-[13px]" />
                              <span className="truncate">{agent.name}</span>
                            </span>
                            {selectedAgents[page.page_id] === agent.agent_id && <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />}
                          </button>
                        ))
                      )}
                      <div className="my-1 border-t border-slate-100" />
                      {hasAssignedAgent && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            handleUnassign(page.page_id);
                            setOpenDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 border-0 bg-white px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <span className="material-symbols-outlined text-[15px]">person_remove</span>
                          Unassign
                        </button>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenDropdown(null);
                          onNavigate('agent');
                        }}
                        className="flex w-full items-center gap-2 border-0 bg-white px-3 py-2 text-left text-xs font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        Create new agent
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        <button
          type="button"
          onClick={handleAddPage}
          className="group flex min-h-[174px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50"
        >
          <span className="material-symbols-outlined flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl text-slate-500 shadow-sm transition-colors group-hover:border-emerald-200 group-hover:text-emerald-600">add</span>
          <span>
            <span className="block text-sm font-black text-slate-700 group-hover:text-emerald-700">Connect another page</span>
            <span className="mt-1 block text-[11px] font-medium text-slate-400">Facebook or Instagram</span>
          </span>
        </button>
      </div>

      {/* Platform Selection Modal */}
      {isPlatformModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsPlatformModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in relative border border-slate-100" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsPlatformModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors border-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            
            <div className="mb-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">hub</span>
              </div>
              <h2 className="text-2xl font-headline font-black tracking-tight text-slate-900 mb-2">Connect Platform</h2>
              <p className="text-slate-500 text-sm font-medium">Select the social platform you want to connect to your workspace.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handlePlatformSelect('facebook')}
                className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-[#1877F2] hover:bg-[#1877F2]/5 hover:shadow-lg hover:shadow-[#1877F2]/10 transition-all bg-white cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="font-bold text-slate-700 group-hover:text-[#1877F2] transition-colors">Facebook</span>
              </button>

              <button 
                onClick={() => handlePlatformSelect('instagram')}
                className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border-2 border-slate-100 hover:border-[#E1306C] hover:bg-[#E1306C]/5 hover:shadow-lg hover:shadow-[#E1306C]/10 transition-all bg-white cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-[#E1306C]/10 flex items-center justify-center text-[#E1306C] group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
                <span className="font-bold text-slate-700 group-hover:text-[#E1306C] transition-colors">Instagram</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Instagram Coming Soon Modal */}
      {showInstaComingSoon && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowInstaComingSoon(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in relative border border-slate-100 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-[#E1306C]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#E1306C]">
              <span className="material-symbols-outlined text-4xl">construction</span>
            </div>
            <h2 className="text-2xl font-headline font-black tracking-tight text-slate-900 mb-4">Coming Soon!</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Direct Instagram integration is currently under development. For now, please use the <strong>Facebook</strong> option to connect your Instagram Business account.
            </p>
            <button
              onClick={() => setShowInstaComingSoon(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition-colors cursor-pointer border-none text-sm"
            >
              Got it, thanks!
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const formatMessageTime = (rawTime) => {
  if (!rawTime) return 'Now';
  const date = new Date(rawTime);
  const today = new Date();
  
  const isToday = date.getDate() === today.getDate() && 
                  date.getMonth() === today.getMonth() && 
                  date.getFullYear() === today.getFullYear();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && 
                      date.getMonth() === yesterday.getMonth() && 
                      date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr;
  } else if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  } else {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }
};

const formatListTime = (rawTime) => {
  if (!rawTime) return '';
  const date = new Date(rawTime);
  const today = new Date();
  
  const isToday = date.getDate() === today.getDate() && 
                  date.getMonth() === today.getMonth() && 
                  date.getFullYear() === today.getFullYear();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && 
                      date.getMonth() === yesterday.getMonth() && 
                      date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return `Yesterday`;
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const ConversationList = ({ pages, user }) => {
  const [selectedPageId, setSelectedPageId] = useState('');
  const [humanNeededFilter, setHumanNeededFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesContainerRef = useRef(null);

  const [conversationsPagination, setConversationsPagination] = useState(null);
  const [messagesPagination, setMessagesPagination] = useState(null);
  const [loadingMoreContacts, setLoadingMoreContacts] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const isLoadingOlderMsgsRef = useRef(false);
  const conversationsRequestVersionRef = useRef(0);

  const currentPageName = pages?.find(p => p.page_id === selectedPageId)?.name || '';
  const isHumanNeeded = humanNeededFilter === 'all'
    ? null
    : humanNeededFilter === 'human';

  const resolveContactName = (contactObj, fallback = 'User') => {
    if (!contactObj) return fallback;
    
    const isBadName = (n) => !n || n.toLowerCase() === 'facebook user' || n.toLowerCase() === 'instagram user';
    const isPageName = (n) => currentPageName && n && n.toLowerCase() === currentPageName.toLowerCase();

    let resolvedName = null;

    if (contactObj.senders?.data) {
      const validSender = contactObj.senders.data.find(s => !isBadName(s.name) && !isPageName(s.name));
      if (validSender) {
        resolvedName = validSender.name;
      }
    }
    
    if (!resolvedName && contactObj.participants?.data) {
      const validParticipant = contactObj.participants.data.find(p => !isBadName(p.name) && !isPageName(p.name));
      if (validParticipant) {
        resolvedName = validParticipant.name;
      }
    }
    
    if (!resolvedName && !isBadName(contactObj.name) && !isPageName(contactObj.name)) {
      resolvedName = contactObj.name;
    }
    
    if (!resolvedName) {
      resolvedName = contactObj.name || contactObj.senders?.data?.[0]?.name || contactObj.participants?.data?.[0]?.name || fallback;
    }
    
    return resolvedName;
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
      if (isLoadingOlderMsgsRef.current) {
        isLoadingOlderMsgsRef.current = false;
      } else {
        // Use a short timeout to ensure DOM has fully calculated heights
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 50);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (pages && pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].page_id);
    }
  }, [pages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.page-dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedPageId) return;
    const requestVersion = ++conversationsRequestVersionRef.current;
    setLoading(true);
    setLoadingMoreContacts(false);
    setContacts([]);
    setActiveContact(null);
    setMessages([]);
    setConversationsPagination(null);
    apiService.getPageDetails(selectedPageId, null, 10, isHumanNeeded)
      .then(data => {
        if (requestVersion !== conversationsRequestVersionRef.current) return;
        // Handle FB Graph variations
        const convs = data?.conversations?.data || data?.conversations || data?.data || [];
        const normalized = Array.isArray(convs) ? convs : [];
        console.log("[Convo Debug] Fetched conversations list:", normalized.map(c => ({ id: c.conversation_id || c.id, name: c.name, profile_pic_url: c.profile_pic_url, allKeys: Object.keys(c), raw: c })));
        setContacts(normalized);
        
        if (data?.pagination) {
          setConversationsPagination(data.pagination);
        } else {
          setConversationsPagination(null);
        }

        if (normalized.length > 0) setActiveContact(normalized[0]);
        else setActiveContact(null);

        // Fetch info + last message in parallel for each conversation
        normalized.forEach(conv => {
          const cId = conv.conversation_id || conv.id;
          if (!cId) return;
          Promise.allSettled([
            apiService.getConversationInfo(cId),
            apiService.getConversationDetails(selectedPageId, cId, null, 1),
          ]).then(([infoRes, detailsRes]) => {
            if (requestVersion !== conversationsRequestVersionRef.current) return;
            const info    = infoRes.status    === 'fulfilled' ? infoRes.value    : null;
            const details = detailsRes.status === 'fulfilled' ? detailsRes.value : null;
            const msgs = details?.messages?.data || details?.messages || details?.data || [];
            const lastMsg = Array.isArray(msgs) && msgs.length > 0 ? msgs[0] : null;
            console.log(`[Convo Debug] Fetched info for ${cId}:`, info);
            setContacts(prev => prev.map(c => {
              if ((c.conversation_id || c.id) === cId) {
                const infoPic = (info?.profile_pic_url && info.profile_pic_url !== 'string' && info.profile_pic_url !== 'null' ? info.profile_pic_url : null)
                             || info?.profile_pic
                             || (typeof info?.picture === 'string' ? info.picture : info?.picture?.data?.url);
                const updatedObj = {
                  ...c,
                  ...(info ? {
                    _info_name: info.name || null,
                    profile_pic_url: infoPic || c.profile_pic_url || c.profile_pic,
                    is_human_needed: info.is_human_needed ?? c.is_human_needed,
                    updated_time: info.updated_time || c.updated_time,
                  } : {}),
                  ...(lastMsg ? {
                    last_message: lastMsg.message || lastMsg.text || '',
                  } : {}),
                };
                setActiveContact(prevAc => prevAc && (prevAc.conversation_id || prevAc.id) === cId ? { ...prevAc, ...updatedObj } : prevAc);
                return updatedObj;
              }
              return c;
            }));
          });
        });
      })
      .catch(err => {
        if (requestVersion === conversationsRequestVersionRef.current) {
          console.error("Failed to fetch conversations", err);
        }
      })
      .finally(() => {
        if (requestVersion === conversationsRequestVersionRef.current) {
          setLoading(false);
        }
      });
  }, [selectedPageId, isHumanNeeded]);

  useEffect(() => {
    if (!selectedPageId || !activeContact) return;
    setLoadingMsgs(true);
    setMessages([]); // Clear previous messages
    const convId = activeContact.id || activeContact.conversation_id || activeContact.id;
    apiService.getConversationDetails(selectedPageId, convId)
      .then(data => {
        const msgs = data?.messages?.data || data?.messages || data?.data || [];
        // Typically Facebook returns newest first, reverse for chat UI
        setMessages(Array.isArray(msgs) ? msgs.reverse() : []);
        
        if (data?.pagination) {
          setMessagesPagination(data.pagination);
        } else {
          setMessagesPagination(null);
        }
      })
      .catch(err => console.error("Failed to fetch messages", err))
      .finally(() => setLoadingMsgs(false));
  }, [selectedPageId, activeContact]);

  const handleLoadMoreConversations = () => {
    if (!selectedPageId || !conversationsPagination?.has_more || !conversationsPagination?.next_cursor) return;
    const requestVersion = conversationsRequestVersionRef.current;
    setLoadingMoreContacts(true);
    apiService.getPageDetails(selectedPageId, conversationsPagination.next_cursor, 10, isHumanNeeded)
      .then(data => {
        if (requestVersion !== conversationsRequestVersionRef.current) return;
        const convs = data?.conversations?.data || data?.conversations || data?.data || [];
        const normalized = Array.isArray(convs) ? convs : [];
        
        setContacts(prev => {
          const newContacts = [...prev];
          normalized.forEach(c => {
            if (!newContacts.find(existing => (existing.conversation_id || existing.id) === (c.conversation_id || c.id))) {
              newContacts.push(c);
            }
          });
          return newContacts;
        });

        if (data?.pagination) {
          setConversationsPagination(data.pagination);
        } else {
          setConversationsPagination(null);
        }

        normalized.forEach(conv => {
          const cId = conv.conversation_id || conv.id;
          if (!cId) return;
          Promise.allSettled([
            apiService.getConversationInfo(cId),
            apiService.getConversationDetails(selectedPageId, cId, null, 1),
          ]).then(([infoRes, detailsRes]) => {
            if (requestVersion !== conversationsRequestVersionRef.current) return;
            const info    = infoRes.status    === 'fulfilled' ? infoRes.value    : null;
            const details = detailsRes.status === 'fulfilled' ? detailsRes.value : null;
            const msgs = details?.messages?.data || details?.messages || details?.data || [];
            const lastMsg = Array.isArray(msgs) && msgs.length > 0 ? msgs[0] : null;
            setContacts(prev => prev.map(c => {
              if ((c.conversation_id || c.id) === cId) {
                const infoPic = (info?.profile_pic_url && info.profile_pic_url !== 'string' && info.profile_pic_url !== 'null' ? info.profile_pic_url : null)
                             || info?.profile_pic
                             || (typeof info?.picture === 'string' ? info.picture : info?.picture?.data?.url);
                const updatedObj = {
                  ...c,
                  ...(info ? {
                    _info_name: info.name || null,
                    profile_pic_url: infoPic || c.profile_pic_url || c.profile_pic,
                    is_human_needed: info.is_human_needed ?? c.is_human_needed,
                    updated_time: info.updated_time || c.updated_time,
                  } : {}),
                  ...(lastMsg ? {
                    last_message: lastMsg.message || lastMsg.text || '',
                  } : {}),
                };
                setActiveContact(prevAc => prevAc && (prevAc.conversation_id || prevAc.id) === cId ? { ...prevAc, ...updatedObj } : prevAc);
                return updatedObj;
              }
              return c;
            }));
          });
        });
      })
      .catch(err => {
        if (requestVersion === conversationsRequestVersionRef.current) {
          console.error("Failed to load more conversations", err);
        }
      })
      .finally(() => {
        if (requestVersion === conversationsRequestVersionRef.current) {
          setLoadingMoreContacts(false);
        }
      });
  };

  const handleScrollMessages = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop < 50 && messagesPagination?.has_more && !loadingMoreMessages) {
      handleLoadMoreMessages();
    }
  };

  const handleLoadMoreMessages = () => {
    if (!selectedPageId || !activeContact || !messagesPagination?.has_more || !messagesPagination?.next_cursor || loadingMoreMessages) return;
    setLoadingMoreMessages(true);
    isLoadingOlderMsgsRef.current = true;
    const convId = activeContact.id || activeContact.conversation_id || activeContact.id;
    
    const container = messagesContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    apiService.getConversationDetails(selectedPageId, convId, messagesPagination.next_cursor)
      .then(data => {
        const msgs = data?.messages?.data || data?.messages || data?.data || [];
        const newMsgs = Array.isArray(msgs) ? msgs.reverse() : [];
        
        setMessages(prev => {
           const all = [...newMsgs, ...prev];
           const unique = [];
           const seen = new Set();
           all.forEach(m => {
             const id = m.id || m.message_id || m.created_at;
             if (!seen.has(id)) {
               seen.add(id);
               unique.push(m);
             }
           });
           return unique;
        });
        
        if (data?.pagination) {
          setMessagesPagination(data.pagination);
        } else {
          setMessagesPagination(null);
        }
        
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
          }
        }, 0);
      })
      .catch(err => console.error("Failed to fetch more messages", err))
      .finally(() => setLoadingMoreMessages(false));
  };

  const handleToggleAIPause = async () => {
    if (!selectedPageId || !activeContact) return;
    const convId = activeContact.conversation_id || activeContact.id;
    // Determine current status: if is_paused is explicitly set use it, otherwise fall back to is_human_needed or false.
    const currentStatus = activeContact.is_paused !== undefined ? activeContact.is_paused : (activeContact.is_human_needed || false);
    const newStatus = !currentStatus;

    // Optimistically update
    setContacts(prev => prev.map(c => 
      (c.conversation_id || c.id) === convId 
        ? { ...c, is_paused: newStatus, is_human_needed: newStatus }
        : c
    ));
    setActiveContact(prev => ({ ...prev, is_paused: newStatus, is_human_needed: newStatus }));

    try {
      await apiService.setConversationPauseStatus(selectedPageId, convId, newStatus);
    } catch (err) {
      console.error("Failed to toggle AI pause status:", err);
      // Revert on error
      setContacts(prev => prev.map(c => 
        (c.conversation_id || c.id) === convId 
          ? { ...c, is_paused: currentStatus, is_human_needed: currentStatus }
          : c
      ));
      setActiveContact(prev => ({ ...prev, is_paused: currentStatus, is_human_needed: currentStatus }));
    }
  };


  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText;
    // Clear input immediately for better UX
    setInputText('');

    if (!selectedPageId || !activeContact) return;
    const convId = activeContact.conversation_id || activeContact.id;

    isLoadingOlderMsgsRef.current = false; // ensure we scroll down on send

    // Optimistically add message
    const tempMsg = {
      id: 'temp_' + Date.now(),
      message: messageText,
      is_ai_msg: true, // to render it on the right side
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    console.log("Sending Payload to Backend:", { message: messageText });

    try {
      const response = await apiService.replyToConversation(selectedPageId, convId, messageText);
      console.log("Facebook Reply Endpoint Response:", response);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      alert("Failed to send message. Please try again.");
    }
  };

  const renderAvatar = (contactObj, extraClass = "") => {
    const name = resolveContactName(contactObj, 'U');
    const rawPic = contactObj?.profile_pic_url || contactObj?.profile_pic || contactObj?.profile_picture_url || (typeof contactObj?.picture === 'string' ? contactObj.picture : contactObj?.picture?.data?.url) || contactObj?.avatar_url || contactObj?.avatar || contactObj?.senders?.data?.[0]?.profile_pic_url || contactObj?.senders?.data?.[0]?.profile_pic || contactObj?.participants?.data?.[0]?.profile_pic_url || contactObj?.participants?.data?.[0]?.profile_pic;
    const picUrl = (rawPic && rawPic !== 'string' && rawPic !== 'null' && rawPic !== 'undefined') ? rawPic : null;
    console.log(`[Convo Debug] renderAvatar for "${name}": rawPic=`, rawPic, ", resolved picUrl=", picUrl, ", contactObj=", contactObj);

    if (picUrl) {
      return (
        <img
          alt={name}
          className={`${extraClass} object-cover`}
          src={picUrl}
          referrerPolicy="no-referrer"
          onError={(e) => {
            const initial = name.charAt(0).toUpperCase();
            e.target.src = `https://ui-avatars.com/api/?name=${initial}&background=random&font-size=0.4`;
          }}
        />
      );
    }
    const initial = name.charAt(0).toUpperCase();
    return (
      <img
        alt={name}
        className={`${extraClass} object-cover`}
        src={`https://ui-avatars.com/api/?name=${initial}&background=random&font-size=0.4`}
      />
    );
  };

  const renderChatMessage = (msg) => {
    let isMe = true;
    if (msg.role === 'user') {
      isMe = false;
    } else if (msg.is_ai_msg === true) {
      isMe = true;
    } else {
      const customerId = activeContact?.senders?.data?.[0]?.id || activeContact?.participants?.data?.[0]?.id || activeContact?.id;
      const fromId = msg?.from?.id;
      if (fromId && customerId) {
        isMe = fromId !== customerId;
      }
    }

    const rawTime = msg.created_at || msg.created_time || msg.timestamp;
    const timeStr = formatMessageTime(rawTime);
    const msgId = msg.id || msg.message_id;
    const convId = activeContact?.conversation_id || activeContact?.id;

    // Fetch message info lazily and cache on the msg object itself
    if (msgId && convId && msg._infoFetched === undefined) {
      msg._infoFetched = false; // mark as in-flight
      apiService.getMessageInfo(convId, msgId)
        .then(info => {
          msg._infoFetched = true;
          msg._hasAttachment = info.has_attachment;
          msg._isAiMsg = info.is_ai_msg;
          // Force a re-render by nudging messages state
          setMessages(prev => [...prev]);
        })
        .catch(() => { msg._infoFetched = true; });
    }

    const hasAttachment = msg._hasAttachment ?? msg.has_attachment ?? false;
    const isAiSource   = Boolean(msg._isAiMsg ?? msg.is_ai_msg);

    if (isMe) {
      // Sent message (AI or agent)
      return (
        <div key={msgId || Math.random()} className="group ml-auto flex max-w-[min(78%,42rem)] flex-row-reverse gap-3">
          <div className="flex min-w-0 flex-col items-end gap-1.5">
            <div className="rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-[14px] leading-relaxed text-white shadow-sm">
              {typeof (msg.message || msg.text) === 'object' && (msg.message || msg.text) !== null ? (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                  {JSON.stringify(msg.message || msg.text, null, 2)}
                </pre>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.message || msg.text || ''}</span>
              )}
              {msg.attachments && msg.attachments.length > 0 ? (
                <div className="mt-2 flex flex-col gap-2">
                  {msg.attachments.map(att => {
                    const isImage = att.attachment_type?.startsWith('image/');
                    const url = `${API_BASE}/v1/media/attachments?key=${encodeURIComponent(att.attachment_key)}`;
                    return isImage ? (
                      <div key={att.attachment_id || att.attachment_key} className="block cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <img src={url} alt="Attachment" className="max-w-[200px] max-h-[200px] object-cover rounded-lg shadow-sm border border-white/20 hover:opacity-90 transition-opacity" />
                      </div>
                    ) : (
                      <a key={att.attachment_id || att.attachment_key} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-fit gap-1 text-[11px] bg-white/20 text-white rounded-full px-2 py-0.5 hover:bg-white/30 transition-colors">
                        <span className="material-symbols-outlined text-[12px]">attach_file</span>
                        Attachment {att.attachment_size ? `(${Math.round(att.attachment_size / 1024)}KB)` : ''}
                      </a>
                    );
                  })}
                </div>
              ) : hasAttachment && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] bg-white/20 text-white rounded-full px-2 py-0.5 mt-1">
                  <span className="material-symbols-outlined text-[12px]">attach_file</span>Attachment
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 px-1 text-[10px] font-medium text-slate-400 transition-opacity">
              {isAiSource && (
                <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-bold" style={{ fontSize: '9px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '9px' }}>smart_toy</span>AI
                </span>
              )}
              {timeStr} <span className="material-symbols-outlined text-[12px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </p>
          </div>
        </div>
      );
    } else {
      // Received message (customer)
      return (
        <div key={msgId || Math.random()} className="group flex max-w-[min(78%,42rem)] gap-2.5">
          {renderAvatar(activeContact, "w-7 h-7 rounded-full self-end ring-2 ring-white")}
          <div className="min-w-0 space-y-1.5">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-[14px] leading-relaxed text-slate-900 shadow-sm">
              {typeof (msg.message || msg.text) === 'object' && (msg.message || msg.text) !== null ? (
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>
                  {JSON.stringify(msg.message || msg.text, null, 2)}
                </pre>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.message || msg.text || ''}</span>
              )}
              {msg.attachments && msg.attachments.length > 0 ? (
                <div className="mt-2 flex flex-col gap-2">
                  {msg.attachments.map(att => {
                    const isImage = att.attachment_type?.startsWith('image/');
                    const url = `${API_BASE}/v1/media/attachments?key=${encodeURIComponent(att.attachment_key)}`;
                    return isImage ? (
                      <div key={att.attachment_id || att.attachment_key} className="block cursor-pointer" onClick={() => setSelectedImage(url)}>
                        <img src={url} alt="Attachment" className="max-w-[200px] max-h-[200px] object-cover rounded-lg shadow-sm border border-slate-200 hover:opacity-90 transition-opacity" />
                      </div>
                    ) : (
                      <a key={att.attachment_id || att.attachment_key} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center w-fit gap-1 text-[11px] bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 hover:bg-slate-300 transition-colors">
                        <span className="material-symbols-outlined text-[12px]">attach_file</span>
                        Attachment {att.attachment_size ? `(${Math.round(att.attachment_size / 1024)}KB)` : ''}
                      </a>
                    );
                  })}
                </div>
              ) : hasAttachment && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 mt-1">
                  <span className="material-symbols-outlined text-[12px]">attach_file</span>Attachment
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 px-1 text-[10px] font-medium text-slate-400 transition-opacity">
              {timeStr}
            </p>
          </div>
        </div>
      );
    }
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleContacts = normalizedSearchQuery
    ? contacts.filter((contact, index) => {
        const contactName = contact._info_name || resolveContactName(contact, `User ${index}`);
        const snippet = contact.snippet || contact.last_message || contact.messages?.data?.[0]?.message || contact.messages?.[0]?.message || '';
        return `${contactName} ${snippet}`.toLowerCase().includes(normalizedSearchQuery);
      })
    : contacts;

  if (!pages || pages.length === 0) {
    return (
      <div className="dashboard-content-area conversation-layout animate-fade-in-up">
        <div style={{ padding: '40px' }}>
          <h2>Conversations</h2>
          <p>Please connect a Facebook page to view your Messenger/Instagram inboxes here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 animate-fade-in-up overflow-hidden bg-[#eef2f5]">
      {/* Conversation List Column */}
      <main className={`shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white ${mobileShowChat ? 'hidden md:flex' : 'flex'} w-full md:w-[340px] xl:w-[380px]`}>
        <div className="border-b border-slate-200 p-4 md:p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Inbox</p>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500">{contacts.length}</span>
              </div>
              <h1 className="m-0 font-['Epilogue'] text-2xl font-black tracking-tight text-slate-950">Conversations</h1>
            </div>
            <div className="relative page-dropdown-container">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative z-0 flex h-9 max-w-[150px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
              >
                {(() => {
                  const selP = pages.find(p => p.page_id === selectedPageId);
                  return selP?.profile_pic_url ? (
                    <img src={selP.profile_pic_url} alt={selP.name} className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200" />
                  ) : (
                    <span className="material-symbols-outlined text-lg">page_info</span>
                  );
                })()}
                 <span className="max-w-[82px] truncate text-xs font-bold">
                  {pages.find(p => p.page_id === selectedPageId)?.name || 'Select Page'}
                </span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-[999] w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-fade-in-up" role="menu">
                  <div className="mb-1 border-b border-slate-100 px-3 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Switch page</p>
                  </div>
                  {pages.map(p => (
                    <button
                      key={p.page_id}
                      onClick={() => {
                        setSelectedPageId(p.page_id);
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between border-0 px-3 py-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-slate-50 ${selectedPageId === p.page_id ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        {p.profile_pic_url ? (
                          <img src={p.profile_pic_url} alt={p.name} className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-blue-500 shrink-0">facebook</span>
                        )}
                        <span className="truncate">{p.name}</span>
                      </div>
                      {selectedPageId === p.page_id && (
                        <span className="material-symbols-outlined text-[16px] text-emerald-500 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div className="group relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-slate-400 transition-colors group-focus-within:text-emerald-600">search</span>
            <input
              className="box-border h-11 w-full max-w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              placeholder="Search people or messages"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="Clear conversation search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Filter conversations">
            {[
              { value: 'all', label: 'All' },
              { value: 'human', label: 'Human' },
              { value: 'ai', label: 'AI managed' },
            ].map(option => (
              <button
                type="button"
                key={option.value}
                onClick={() => setHumanNeededFilter(option.value)}
                className={`h-8 rounded-lg px-2 text-[11px] font-bold transition-all ${humanNeededFilter === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                aria-pressed={humanNeededFilter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center text-sm font-medium text-slate-400">
              <span className="material-symbols-outlined animate-spin text-2xl text-emerald-500">progress_activity</span>
              Loading conversations
            </div>
          ) : visibleContacts.length === 0 ? (
            <div className="flex flex-col items-center p-10 text-center text-sm font-medium text-slate-400">
              <span className="material-symbols-outlined mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl">forum</span>
              {humanNeededFilter === 'human'
                ? 'No conversations need human support.'
                : humanNeededFilter === 'ai'
                  ? 'No AI-managed conversations.'
                  : normalizedSearchQuery
                    ? 'No conversations match your search.'
                    : 'No ongoing conversations.'}
            </div>
          ) : visibleContacts.map((contact, i) => {
            // Prefer the name from /info endpoint, fall back to FB graph resolution
            const contactName = contact._info_name || resolveContactName(contact, `User ${i}`);
            const snippet = contact.snippet || contact.last_message || contact.messages?.data?.[0]?.message || contact.messages?.[0]?.message || 'No messages';
            const updatedTimeValue = contact.updated_time || contact.last_message_at || contact.updated;
            const updated = formatListTime(updatedTimeValue);
            const id = contact.conversation_id || contact.id || i;
            const isActive = (activeContact?.id || activeContact?.conversation_id) === id;

            return (
              <button
                type="button"
                key={id}
                onClick={() => { setActiveContact(contact); setMobileShowChat(true); }}
                className={`group w-full rounded-xl border p-3 text-left transition-all ${isActive ? 'border-emerald-200 bg-emerald-50 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {renderAvatar(contact, `h-11 w-11 rounded-xl ${isActive ? 'ring-2 ring-emerald-200' : 'opacity-90 group-hover:opacity-100'}`)}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${contact.is_human_needed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <h3 className="truncate text-sm font-black text-slate-900">{contactName}</h3>
                        {contact.is_human_needed && <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-rose-600">Human</span>}
                      </div>
                      <span className="mr-3 shrink-0 text-[10px] font-semibold text-slate-400">{updated}</span>
                    </div>
                    <p className={`truncate text-xs ${isActive ? 'font-semibold text-emerald-700' : 'font-medium text-slate-500'}`}>{snippet}</p>
                  </div>
                </div>
              </button>
            );
          })}
          {conversationsPagination?.has_more && (
            <div className="flex justify-center pt-2 pb-4">
              <button 
                onClick={handleLoadMoreConversations}
                disabled={loadingMoreContacts}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors border-none cursor-pointer"
              >
                {loadingMoreContacts ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Active Chat Window */}
      <section className={`min-w-0 flex-1 flex-col overflow-hidden bg-white ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
        {activeContact ? (
          <>
            <header className="z-10 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 md:px-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                {/* Mobile back button */}
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
                  aria-label="Back to conversations"
                >
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </button>
                <div className="relative shrink-0">
                  {renderAvatar(activeContact, "h-10 w-10 rounded-xl")}
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="min-w-0">
                  <h2 className="m-0 truncate font-['Epilogue'] text-[15px] font-black tracking-tight text-slate-900 md:text-base">
                    {resolveContactName(activeContact, 'User')}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    {(activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) ? (
                      <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] text-rose-600 md:text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Human handling
                      </p>
                    ) : (
                      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-600 md:text-[10px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        AI responding
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAIPause}
                  className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black transition-colors md:px-3 ${
                    (activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                  title={(activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) ? 'Resume AI replies' : 'Pause AI replies'}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {(activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) ? 'smart_toy' : 'front_hand'}
                  </span>
                  <span className="hidden lg:inline">
                    {(activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) ? 'Resume AI' : 'Take over'}
                  </span>
                </button>
                <button
                  onClick={() => setIsProfileVisible(!isProfileVisible)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${isProfileVisible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                  title={isProfileVisible ? "Hide Profile" : "Show Profile"}
                >
                  <span className="material-symbols-outlined text-[19px]">person</span>
                </button>
              </div>
            </header>

            <div 
              ref={messagesContainerRef} 
              className="flex-1 space-y-4 overflow-y-auto bg-[#f6f8fa] px-4 py-6 md:px-8 lg:px-12"
              onScroll={handleScrollMessages}
            >
              {loadingMsgs ? (
                <div className="mt-10 flex items-center justify-center gap-2 text-sm font-medium text-slate-400">
                  <span className="material-symbols-outlined animate-spin text-lg text-emerald-500">progress_activity</span>
                  Loading messages
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-16 flex max-w-xs flex-col items-center text-center text-slate-400">
                  <span className="material-symbols-outlined mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl">chat_bubble</span>
                  <p className="text-sm font-bold text-slate-600">No messages yet</p>
                  <p className="mt-1 text-xs">New messages in this conversation will appear here.</p>
                </div>
              ) : (
                <>
                  {loadingMoreMessages && (
                    <div className="mb-5 flex justify-center">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-400 shadow-sm">
                        <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                        Loading older messages...
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <span className="mb-5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Conversation history</span>
                  </div>
                  {messages.map(msg => renderChatMessage(msg))}

                </>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white p-3 md:p-4 lg:px-6">
              <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-4 transition-all focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
                {/* Attach file button — no functionality yet
                <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                */}
                <input
                  className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                  placeholder="Write a reply"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <div className="flex items-center">
                  {/* Emoji button — no functionality yet
                  <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">mood</span>
                  </button>
                  */}
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    aria-label="Send message"
                  >
                    <span className="material-symbols-outlined text-[19px]">send</span>
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-[#f6f8fa] p-8 text-center">
            <div className="max-w-xs">
              <span className="material-symbols-outlined mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl text-slate-400 shadow-sm">forum</span>
              <h2 className="text-base font-black text-slate-700">Choose a conversation</h2>
              <p className="mt-1 text-sm font-medium text-slate-400">Select someone from the inbox to view their messages.</p>
            </div>
          </div>
        )}
      </section>

      {/* Profile Right Sidebar - hidden on mobile */}
      {isProfileVisible && (
        <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white animate-fade-in-right xl:flex">
          {activeContact ? (
            <div className="p-5">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  {renderAvatar(activeContact, "h-20 w-20 rounded-2xl ring-1 ring-slate-200")}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
                </div>
              </div>

              <div className="mb-6 text-center">
                <h2 className="font-['Epilogue'] text-lg font-black tracking-tight text-slate-900">
                  {resolveContactName(activeContact, 'Chat Participant')}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-400">Facebook Messenger</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-700">{user?.subscription?.plan?.plan_name || 'FREE Plan'}</span>
                  {activeContact?.is_human_needed ? (
                    <span className="rounded-md bg-rose-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-rose-700">Human handling</span>
                  ) : (
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">AI managed</span>
                  )}
                </div>
              </div>

              <div className="mb-6 flex w-full justify-center">
                <button 
                  onClick={handleToggleAIPause}
                  className={`flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-xs font-black transition-colors ${
                    (activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) 
                      ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {(activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) ? 'play_circle' : 'pause_circle'}
                  </span>
                  {(activeContact?.is_paused !== undefined ? activeContact.is_paused : activeContact?.is_human_needed) ? 'Resume AI Agent' : 'Pause AI Agent'}
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-4 border-b border-slate-100 pb-2">Information</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5">person</span>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Name</p>
                        <p className="text-xs font-semibold text-slate-900">{resolveContactName(activeContact, 'Unknown')}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5">mail</span>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Email / Source</p>
                        <p className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">Facebook Messenger</p>
                      </div>
                    </li>
                    {(activeContact?.conversation_id || activeContact?.id) && (
                      <li className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5">tag</span>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Conversation ID</p>
                          <p className="text-xs font-semibold text-slate-900 truncate max-w-[200px] font-mono">{activeContact?.conversation_id || activeContact?.id}</p>
                        </div>
                      </li>
                    )}
                    <li className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5">schedule</span>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Last Active</p>
                        <p className="text-xs font-semibold text-slate-900">
                          {activeContact?.updated_time || activeContact?.last_message_at
                            ? new Date(activeContact.updated_time || activeContact.last_message_at).toLocaleString()
                            : 'Unknown'}
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-full w-full h-full flex items-center justify-center">
            <button 
              className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center z-10"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <img 
              src={selectedImage} 
              alt="Attachment Viewer" 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FeedbackPanel = () => {
  const [feedbackType, setFeedbackType] = useState('Suggest Improvement');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const feedbackOptions = [
    { value: 'Suggest Improvement', label: 'Improvement', icon: 'auto_awesome', description: 'Refine an existing workflow' },
    { value: 'Feature Request', label: 'New feature', icon: 'add_circle', description: 'Propose a new capability' },
    { value: 'Report A Bug', label: 'Report a bug', icon: 'bug_report', description: 'Tell us what went wrong' },
    { value: 'General', label: 'General', icon: 'chat_bubble', description: 'Share any other feedback' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (title.trim() || description.trim()) {
      setSubmittingFeedback(true);
      try {
        await apiService.submitFeedback({
          type: feedbackType,
          title: title,
          details: description
        });
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setTitle('');
          setDescription('');
        }, 3000);
      } catch (err) {
        console.error('Feedback submit error:', err);
        alert('Failed to submit feedback. Please try again later.');
      } finally {
        setSubmittingFeedback(false);
      }
    }
  };

  return (
    <div className="min-w-0 flex-1 w-full bg-[#f7f9fb] p-4 md:p-6 xl:p-8 animate-fade-in-up">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:p-7">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Product feedback</p>
          <h1 className="font-['Epilogue'] text-3xl font-extrabold tracking-tight text-slate-950">Help shape LYFFLOW</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Share what would make your workspace faster, clearer, or more reliable. Every submission is reviewed by the team.</p>
        </header>

        <div className="grid overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_44px_rgba(15,23,42,0.06)] lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden bg-slate-950 p-6 text-white md:p-8">
            <div className="relative z-10">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/15"><span className="material-symbols-outlined text-[24px]">forum</span></div>
              <h2 className="text-xl font-extrabold">Useful feedback is specific.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">A little context helps us understand the impact and respond with the right solution.</p>

              <div className="mt-8 space-y-5">
                {[
                  ['ads_click', 'What you were trying to do'],
                  ['difference', 'What you expected to happen'],
                  ['error', 'What happened instead']
                ].map(([icon, text]) => (
                  <div key={text} className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-emerald-400">{icon}</span>
                    <p className="text-sm font-semibold leading-5 text-slate-200">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-10 border-t border-white/10 pt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Need account help?</p>
              <a href="mailto:support@lyfflow.com" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-white transition hover:text-emerald-300"><Mail size={16} />Contact support</a>
            </div>
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-52 w-52 rounded-full border-[38px] border-emerald-400/[0.06]" />
          </aside>

          <form onSubmit={handleSubmit} className="min-w-0 p-5 md:p-8 lg:p-10">
            {submitted && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                <div><p className="text-sm font-extrabold">Feedback submitted</p><p className="mt-0.5 text-xs font-medium text-emerald-700">Thank you—your feedback is now with our team.</p></div>
              </div>
            )}

            <fieldset>
              <legend className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">What is this about?</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {feedbackOptions.map(option => {
                  const isSelected = feedbackType === option.value;
                  return (
                    <button key={option.value} type="button" onClick={() => setFeedbackType(option.value)} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition ${isSelected ? 'border-slate-950 bg-slate-950 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`} aria-pressed={isSelected}>
                      <span className={`material-symbols-outlined flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[18px] ${isSelected ? 'bg-emerald-400 text-slate-950' : 'bg-slate-100 text-slate-500'}`}>{option.icon}</span>
                      <span className="min-w-0"><span className="block truncate text-xs font-extrabold">{option.label}</span><span className={`mt-0.5 block truncate text-[10px] font-medium ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{option.description}</span></span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between gap-3"><label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500" htmlFor="title">Short summary</label><span className={`text-[10px] font-bold ${title.length >= 90 ? 'text-amber-600' : 'text-slate-400'}`}>{title.length}/100</span></div>
              <input id="title" name="title" type="text" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="Summarize your feedback in one sentence" className="box-border h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/70" required />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-3"><label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500" htmlFor="details">Details</label><span className={`text-[10px] font-bold ${description.length >= 900 ? 'text-amber-600' : 'text-slate-400'}`}>{description.length}/1000</span></div>
              <textarea id="details" name="details" value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the workflow, expected result, and what happened instead..." rows="7" className="box-border w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100/70" required />
            </div>

            <div className="mt-7 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[11px] font-medium text-slate-400"><ShieldCheck size={15} />Do not include passwords or payment details.</p>
              <button type="submit" disabled={submitted || submittingFeedback} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                <span>{submittingFeedback ? 'Sending...' : submitted ? 'Submitted' : 'Send feedback'}</span>
                <span className={`material-symbols-outlined text-[18px] ${submittingFeedback ? 'animate-spin' : ''}`}>{submittingFeedback ? 'progress_activity' : submitted ? 'check_circle' : 'arrow_forward'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Knowledge = ({ namespaces, onUpdate }) => {
  const [activeKnowledgeTab, setActiveKnowledgeTab] = useState('products');
  const [showModal, setShowModal] = useState(false);
  const [selectedNamespaceId, setSelectedNamespaceId] = useState('');
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Namespace creation state
  const [showNamespaceModal, setShowNamespaceModal] = useState(false);
  const [newNamespaceName, setNewNamespaceName] = useState('');
  const [generatingNs, setGeneratingNs] = useState(false);

  // Modal state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [knowledgeType, setKnowledgeType] = useState('text');
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleViewClick = async (item) => {
    const actualId = item.knowledge_usage_id || item.id || item.knowledge_id || item.knowledgeId || item.uuid;
    if (!actualId || String(actualId).startsWith('temp_')) {
      addToast('Wait for the item to be fully saved in the database before viewing', 'error');
      return;
    }

    setFetchingDetails(true);
    try {
      const details = await apiService.getKnowledgeItem(selectedNamespaceId, actualId);
      setViewingItem(details);
    } catch (err) {
      console.error(err);
      addToast('Failed to fetch details: ' + err.message, 'error');
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleEditClick = async (item) => {
    const actualId = item.knowledge_usage_id || item.id || item.knowledge_id || item.knowledgeId || item.uuid;
    if (String(actualId).startsWith('temp_')) return alert('Wait for the item to be fully saved before editing');

    setName(item.name || item.data_source?.name || '');
    setTitle(item.title || '');
    setDescription(item.description || item.data_source?.text || '');
    setKnowledgeType('text');
    setEditingItemId(actualId);
    setShowModal(true);

    // Fetch the full detailed item just in case the list view omitted the heavy description field
    if (!item.description && !item.data_source?.text) {
      try {
        const details = await apiService.getKnowledgeItem(selectedNamespaceId, actualId);
        if (details.description) setDescription(details.description);
        if (details.title && !item.title) setTitle(details.title);
      } catch (err) {
        console.warn('Failed to fetch full item details for edit modal', err);
      }
    }
  };

  const handleRequestDelete = (item) => {
    const actualId = item.knowledge_usage_id || item.id || item.knowledge_id || item.knowledgeId || item.uuid;
    if (!actualId || String(actualId).startsWith('temp_')) {
      addToast('Cannot delete item without a valid ID. Wait for save to complete.', 'error');
      return;
    }
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = async () => {
    const item = deleteConfirmItem;
    if (!item) return;
    setDeleteConfirmItem(null);
    const actualId = item.knowledge_usage_id || item.id || item.knowledge_id || item.knowledgeId || item.uuid;
    const type = (item.knowledge_type === 'file' || item.file_name) ? 'file' : 'text';

    console.log('--- DELETION DEBUG ---');
    console.log('Namespace ID:', selectedNamespaceId);
    console.log('Knowledge type evaluated as:', type);
    console.log('Deleting ID:', actualId);
    console.log('Endpoint called:', `/v1/knowledge/${selectedNamespaceId}/${actualId}`);
    console.log('----------------------');

    try {
      await apiService.deleteKnowledge(selectedNamespaceId, actualId);
      setKnowledgeList(prev => prev.filter(k => (k.knowledge_usage_id || k.id || k.knowledge_id || k.knowledgeId || k.uuid) !== actualId));
      addToast('Knowledge deleted successfully', 'delete');
    } catch (error) {
      console.error(error);
      addToast('Failed to delete knowledge: ' + error.message, 'error');
    }
  };

  useEffect(() => {
    if (namespaces && namespaces.length > 0 && !selectedNamespaceId) {
      setSelectedNamespaceId(namespaces[0].namespace_id || namespaces[0].namespace);
    }
  }, [namespaces, selectedNamespaceId]);

  useEffect(() => {
    if (!selectedNamespaceId) return;
    setLoading(true);
    apiService.getKnowledge(selectedNamespaceId)
      .then(data => {
        // Assume data is an array or { results: [] }
        setKnowledgeList(Array.isArray(data) ? data : (data.results || data.items || []));
      })
      .catch(err => console.error("Failed to load knowledge", err))
      .finally(() => setLoading(false));
  }, [selectedNamespaceId]);

  const handleAddKnowledge = async (e) => {
    e.preventDefault();
    if (!selectedNamespaceId) {
      addToast('Please select a namespace first', 'error');
      return;
    }

    // For edits, we keep it blocking since it's fast
    if (editingItemId) {
      setUploading(true);
      try {
        if (!name.trim() || !title.trim() || !description.trim()) {
          setUploading(false);
          addToast('Name, Title, and Description are required', 'error');
          return;
        }
        const updateData = {
          title: title.trim(),
          description: description.trim()
        };
        await apiService.editKnowledge(selectedNamespaceId, editingItemId, updateData);
        // Refresh list
        const updatedList = await apiService.getKnowledge(selectedNamespaceId);
        setKnowledgeList(Array.isArray(updatedList) ? updatedList : (updatedList.results || updatedList.items || []));

        setShowModal(false);
        setName('');
        setTitle('');
        setDescription('');
        setSelectedFiles(null);
        setKnowledgeType('text');
        setEditingItemId(null);
        addToast('Knowledge updated successfully!', 'edit');
      } catch (error) {
        console.error(error);
        addToast('Failed to edit knowledge: ' + error.message, 'error');
      } finally {
        setUploading(false);
      }
      return;
    }

    // For Add Knowledge, we can run it optimistically and close the modal instantly!
    if (knowledgeType === 'text') {
      if (!name.trim() || !title.trim() || !description.trim()) {
        addToast('Name, Title, and Description are required', 'error');
        return;
      }
      const payload = {
        documents: [{ name: name.trim(), title: title.trim(), description: description.trim() }]
      };

      const optimisticId = 'temp_' + Date.now();
      setKnowledgeList(prev => [...prev, {
        id: optimisticId, name: name.trim(), title: title.trim(), description: description.trim(), knowledge_type: 'text'
      }]);

      // Background process: Poll the backend to wait for data (Pinecone sync)
      apiService.createKnowledge(selectedNamespaceId, payload)
        .then(async () => {
          addToast('Document added successfully!', 'success');
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, i === 0 ? 1500 : 2000));
            const rawList = await apiService.getKnowledge(selectedNamespaceId);
            const arr = Array.isArray(rawList) ? rawList : (rawList.results || rawList.items || []);

            setKnowledgeList(prev => {
              const currentTemps = prev.filter(p => String(p.id).startsWith('temp_'));
              const unmatchedTemps = currentTemps.filter(t => !arr.some(k => k.name === t.name || k.file_name === t.name));
              return [...arr, ...unmatchedTemps];
            });

            const found = arr.some(k => k.name === name.trim() && k.title === title.trim());
            if (found || i === 4) break;
          }
        })
        .catch(error => {
          console.error(error);
          addToast('Failed to add text knowledge: ' + error.message, 'error');
          setKnowledgeList(prev => prev.filter(k => k.id !== optimisticId));
        });
    } else {
      if (!selectedFiles || selectedFiles.length === 0) {
        addToast('Please select at least one file to upload', 'error');
        return;
      }
      const formData = new FormData();
      const tempItems = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
        tempItems.push({
          id: 'temp_file_' + Date.now() + '_' + i,
          name: selectedFiles[i].name,
          knowledge_type: 'file',
          file_name: selectedFiles[i].name
        });
      }

      setKnowledgeList(prev => [...prev, ...tempItems]);

      // Background process: Poll the backend to wait for data (Pinecone sync)
      apiService.uploadKnowledgeFiles(selectedNamespaceId, formData)
        .then(async () => {
          addToast('File(s) uploaded successfully!', 'success');
          for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, i === 0 ? 1500 : 2000));
            const rawList = await apiService.getKnowledge(selectedNamespaceId);
            const arr = Array.isArray(rawList) ? rawList : (rawList.results || rawList.items || []);

            setKnowledgeList(prev => {
              const currentTemps = prev.filter(p => String(p.id).startsWith('temp_'));
              const unmatchedTemps = currentTemps.filter(t => !arr.some(k => k.name === t.name || k.file_name === t.name));
              return [...arr, ...unmatchedTemps];
            });

            // Check if the uploaded files are present in backend
            const found = tempItems.every(temp => arr.some(k => k.name === temp.name || k.file_name === temp.name || (k.title && k.title.includes(temp.name))));
            if (found || i === 4) break;
          }
        })
        .catch(error => {
          console.error(error);
          addToast('Failed to upload files: ' + error.message, 'error');
          const tempIds = tempItems.map(t => t.id);
          setKnowledgeList(prev => prev.filter(k => !tempIds.includes(k.id)));
        });
    }

    // Instantly close modal regardless of background processing
    setShowModal(false);
    setName('');
    setTitle('');
    setDescription('');
    setSelectedFiles(null);
    setKnowledgeType('text');
    setEditingItemId(null);
  };

  const namespaceModalPortal = ReactDOM.createPortal(
    <>
      {showNamespaceModal && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !generatingNs && setShowNamespaceModal(false)} />
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-slate-800 font-['Epilogue']">Create Namespace</h3>
              <button
                onClick={() => !generatingNs && setShowNamespaceModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Namespaces help organize your knowledge base documents into distinct collections or categories.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Namespace Name *
              </label>
              <input
                type="text"
                value={newNamespaceName}
                onChange={(e) => setNewNamespaceName(e.target.value)}
                placeholder="e.g. Customer FAQ, Technical Specs"
                className="w-[96%] block mx-auto box-border bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newNamespaceName.trim() && !generatingNs) {
                    setGeneratingNs(true);
                    try {
                      const res = await apiService.generateNamespace(newNamespaceName.trim());
                      addToast('Namespace generated successfully!', 'success');
                      setShowNamespaceModal(false);
                      setNewNamespaceName('');
                      if (res && (res.namespace_id || res.namespace)) {
                        setSelectedNamespaceId(res.namespace_id || res.namespace);
                      }
                      if (onUpdate) onUpdate();
                    } catch (err) {
                      addToast('Failed to generate namespace: ' + err.message, 'error');
                    } finally {
                      setGeneratingNs(false);
                    }
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNamespaceModal(false)}
                disabled={generatingNs}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generatingNs || !newNamespaceName.trim()}
                onClick={async () => {
                  setGeneratingNs(true);
                  try {
                    const res = await apiService.generateNamespace(newNamespaceName.trim());
                    addToast('Namespace generated successfully!', 'success');
                    setShowNamespaceModal(false);
                    setNewNamespaceName('');
                    if (res && (res.namespace_id || res.namespace)) {
                      setSelectedNamespaceId(res.namespace_id || res.namespace);
                    }
                    if (onUpdate) onUpdate();
                  } catch (err) {
                    addToast('Failed to generate namespace: ' + err.message, 'error');
                  } finally {
                    setGeneratingNs(false);
                  }
                }}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingNs ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );

  if (!namespaces || namespaces.length === 0) {
    return (
      <div className="min-w-0 flex-1 bg-[#f7f9fb] p-4 md:p-6 xl:p-8 animate-fade-in-up">
        {namespaceModalPortal}
        {ReactDOM.createPortal(
          <div style={{ position: 'fixed', top: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 999999, pointerEvents: 'none' }}>
            {toasts.map(t => (
              <div key={t.id} style={{
                animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                padding: '16px 20px',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                minWidth: '250px',
                pointerEvents: 'auto',
                backgroundColor: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : t.type === 'delete' ? '#f43f5e' : '#0ea5e9',
              }}>
                <div style={{ marginRight: '12px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                  {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : t.type === 'delete' ? '✕' : 'ℹ'}
                </div>
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
        <div className="mx-auto flex min-h-[520px] max-w-[1400px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/15"><span className="material-symbols-outlined text-[30px]">library_books</span></div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Knowledge workspace</p>
          <h2 className="font-['Epilogue'] text-2xl font-extrabold text-slate-950">Create your first namespace</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Namespaces keep product data and documents organized so agents retrieve the right information.</p>
          <button
              className="mt-6 flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
              onClick={() => {
                setNewNamespaceName('');
                setShowNamespaceModal(true);
              }}
            >
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
              Create namespace
            </button>
        </div>
      </div>
    );
  }

  const totalSizeMB = knowledgeList.reduce((acc, curr) => {
    if (curr.size) return acc + (curr.size / (1024 * 1024));
    return acc + (curr.knowledge_type === 'text' ? 0.1 : 1.2);
  }, 0);

  const fileKnowledgeCount = knowledgeList.filter(item => item.knowledge_type === 'file' || item.file_name).length;
  const textKnowledgeCount = knowledgeList.length - fileKnowledgeCount;
  const filteredKnowledgeList = knowledgeList.filter(item => {
    const query = knowledgeQuery.trim().toLowerCase();
    if (!query) return true;
    return [item.name, item.title, item.file_name, item.description, item.data_source?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="min-w-0 flex-1 w-full bg-[#f7f9fb] p-4 md:p-6 xl:p-8 overflow-y-auto animate-fade-in-up">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-6 p-5 md:p-7 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Knowledge workspace</p>
              <h1 className="mb-2 font-['Epilogue'] text-3xl font-extrabold tracking-tight text-slate-950">Knowledge base</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">Organize the product data and documents your agents use to answer customers accurately.</p>
            </div>

            <div className="flex w-full min-w-0 flex-wrap gap-2 xl:w-auto">
              <label
                className="relative flex h-11 min-w-0 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100/60"
                style={{ width: '280px', maxWidth: '100%', flex: '0 1 280px' }}
              >
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-slate-400">database</span>
                <select
                  value={selectedNamespaceId}
                  onChange={e => setSelectedNamespaceId(e.target.value)}
                  className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent pl-10 pr-9 text-sm font-bold text-slate-700 outline-none focus:border-transparent focus:ring-0"
                  style={{ width: 0, minWidth: 0, boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                >
                  {namespaces.map((ns, idx) => {
                    const nsId = ns.namespace_id || ns.namespace;
                    const nsName = ns.namespace_name || ns.name;
                    return <option key={idx} value={nsId}>{nsName}</option>;
                  })}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[17px] text-slate-400">expand_more</span>
              </label>
              <button
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => {
                  setNewNamespaceName('');
                  setShowNamespaceModal(true);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                New namespace
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-t border-slate-100 bg-slate-50/70 px-5 py-2 md:px-7">
            <button
              onClick={() => setActiveKnowledgeTab('products')}
              className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${activeKnowledgeTab === 'products' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              Products
            </button>
            <button
              onClick={() => setActiveKnowledgeTab('documents')}
              className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${activeKnowledgeTab === 'documents' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              Documents
              {knowledgeList.length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${activeKnowledgeTab === 'documents' ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-600'}`}>{knowledgeList.length}</span>}
            </button>
          </div>
        </section>

        {activeKnowledgeTab === 'documents' ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Total sources', value: knowledgeList.length, icon: 'library_books', color: 'text-slate-950', iconStyle: 'bg-slate-950 text-white' },
                { label: 'Text entries', value: textKnowledgeCount, icon: 'text_snippet', color: 'text-violet-600', iconStyle: 'bg-violet-50 text-violet-600' },
                { label: 'Files', value: fileKnowledgeCount, icon: 'description', color: 'text-blue-600', iconStyle: 'bg-blue-50 text-blue-600' },
                { label: 'Storage used', value: `${totalSizeMB.toFixed(1)} MB`, icon: 'database', color: 'text-emerald-600', iconStyle: 'bg-emerald-50 text-emerald-600' }
              ].map(stat => (
                <div key={stat.label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.iconStyle}`}><span className="material-symbols-outlined text-[20px]">{stat.icon}</span></div>
                  <div className="min-w-0"><p className={`truncate text-lg font-extrabold leading-none ${stat.color}`}>{stat.value}</p><p className="mt-1.5 truncate text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{stat.label}</p></div>
                </div>
              ))}
            </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="m-0 text-base font-extrabold text-slate-900">Sources</h3>
            <p className="m-0 mt-1 text-xs text-slate-500">Manage the text and files indexed for AI retrieval.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <label className="relative flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100/60 lg:w-[360px] lg:flex-none">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input type="text" value={knowledgeQuery} onChange={event => setKnowledgeQuery(event.target.value)} placeholder="Search sources" className="h-full min-w-0 flex-1 border-0 bg-transparent pl-10 pr-9 text-sm font-medium text-slate-800 outline-none focus:border-transparent focus:ring-0" style={{ width: 0, minWidth: 0, boxSizing: 'border-box' }} />
              {knowledgeQuery && <button type="button" onClick={() => setKnowledgeQuery('')} className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Clear source search"><span className="material-symbols-outlined text-[16px]">close</span></button>}
            </label>
          <button
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
            onClick={() => {
              setName('');
              setTitle('');
              setDescription('');
              setSelectedFiles(null);
              setKnowledgeType('text');
              setEditingItemId(null);
              setShowModal(true);
            }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add source
          </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="hidden gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 md:grid" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(110px,1fr) 90px 90px 116px' }}>
            <div>Name</div>
            <div>Type</div>
            <div>Size</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm font-medium text-slate-400"><span className="material-symbols-outlined animate-spin text-2xl text-emerald-500">progress_activity</span>Loading sources...</div>
            ) : filteredKnowledgeList.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><span className="material-symbols-outlined text-2xl">{knowledgeQuery ? 'search_off' : 'note_add'}</span></div>
                <h4 className="text-base font-extrabold text-slate-900">{knowledgeQuery ? 'No matching sources' : 'No sources yet'}</h4>
                <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{knowledgeQuery ? 'Try a different search term.' : 'Add text or upload files to give your agents reliable information.'}</p>
                {knowledgeQuery ? (
                  <button onClick={() => setKnowledgeQuery('')} className="mt-4 text-sm font-bold text-emerald-700">Clear search</button>
                ) : (
                  <button onClick={() => { setKnowledgeType('text'); setEditingItemId(null); setShowModal(true); }} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Add your first source</button>
                )}
              </div>
            ) : (
              filteredKnowledgeList.map((item, i) => {
                const name = item.name || item.title || item.data_source?.name || 'Unnamed Document';
                const isFile = item.knowledge_type === 'file' || item.file_name;

                let extType = 'Text File';
                if (isFile) {
                  const extMatch = name.match(/\.([0-9a-z]+)(?:[\?#]|$)/i);
                  if (extMatch) {
                    const ext = extMatch[1].toLowerCase();
                    if (ext === 'pdf') extType = 'PDF Document';
                    else if (ext === 'doc' || ext === 'docx') extType = 'Word Doc';
                    else if (ext === 'csv') extType = 'CSV Data';
                    else extType = ext.toUpperCase() + ' File';
                  } else {
                    extType = 'Document';
                  }
                }

                let displaySize = '0.1 MB';
                if (item.size) {
                  displaySize = (item.size / (1024 * 1024)).toFixed(1) + ' MB';
                } else if (!isFile) {
                  displaySize = '0.1 MB';
                } else {
                  displaySize = '1.2 MB'; // fallback
                }
                const itemId = item.knowledge_usage_id || item.id || item.knowledge_id || item.knowledgeId || item.uuid || i;
                const isSaving = String(itemId).startsWith('temp_');

                return (
                  <div key={itemId} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/80 md:grid md:items-center md:gap-4 md:px-5" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(110px,1fr) 90px 90px 116px' }}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isFile ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                        <span className="material-symbols-outlined text-[20px]">{isFile ? 'description' : 'text_snippet'}</span>
                      </div>
                      <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-900">{name}</p><p className="mt-0.5 truncate text-[11px] text-slate-400 md:hidden">{extType} · {displaySize}</p></div>
                    </div>

                    <div className="hidden text-xs font-bold text-slate-600 md:block">{extType}</div>

                    <div className="hidden text-xs font-medium text-slate-500 md:block">{displaySize}</div>

                    <div className="hidden md:block">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${isSaving ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${isSaving ? 'animate-pulse bg-amber-400' : 'bg-emerald-500'}`} />{isSaving ? 'Indexing' : 'Ready'}</span>
                    </div>

                    <div className="flex items-center justify-end gap-1 md:justify-end">
                      {!isFile && (
                        <>
                          <button
                            onClick={() => handleViewClick(item)}
                            disabled={fetchingDetails}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            onClick={() => handleEditClick(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleRequestDelete(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 pb-6 text-xs font-bold text-slate-400">
          <span>Showing {filteredKnowledgeList.length} of {knowledgeList.length} sources</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Synced with this namespace</span>
        </div>
          </>
        ) : (
          <ProductsTab selectedNamespaceId={selectedNamespaceId} namespaces={namespaces} />
        )}
      </div>

      {typeof document !== 'undefined' && viewingItem && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={() => setViewingItem(null)}>
          <div className="modal-content animate-fade-in-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Knowledge Details</h3>
              <button type="button" onClick={() => setViewingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Name</h4>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{viewingItem.name || 'N/A'}</div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Title</h4>
                  <div style={{ fontSize: '16px', color: '#334155' }}>{viewingItem.title || 'N/A'}</div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Description</h4>
                  <div style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{viewingItem.description || 'N/A'}</div>
                </div>

                <div style={{ display: 'flex', gap: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8' }}>Knowledge ID</h4>
                    <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>{viewingItem.knowledge_id || viewingItem.id || viewingItem.uuid || 'N/A'}</div>
                  </div>
                  {viewingItem.created_at && (
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8' }}>Created</h4>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{new Date(viewingItem.created_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button type="button" className="btn-cancel" onClick={() => setViewingItem(null)} style={{ background: '#0ea5e9', color: 'white', border: 'none' }}>Close Details</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {typeof document !== 'undefined' && showModal && ReactDOM.createPortal(
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in-up" style={{ maxWidth: '600px' }}>
            <h3>{editingItemId ? 'Edit Knowledge' : 'Add New Knowledge'}</h3>

            <form className="modal-form" onSubmit={handleAddKnowledge}>
              {!editingItemId && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>Knowledge Type</label>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', marginTop: '10px' }}>
                    <div
                      onClick={() => setKnowledgeType('text')}
                      style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: knowledgeType === 'text' ? '#0f172a' : '#64748b', background: knowledgeType === 'text' ? '#ffffff' : 'transparent', boxShadow: knowledgeType === 'text' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                    >
                      Raw Text
                    </div>
                    <div
                      onClick={() => setKnowledgeType('file')}
                      style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500, color: knowledgeType === 'file' ? '#0f172a' : '#64748b', background: knowledgeType === 'file' ? '#ffffff' : 'transparent', boxShadow: knowledgeType === 'file' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
                    >
                      File Upload
                    </div>
                  </div>
                </div>
              )}

              {knowledgeType === 'text' || editingItemId ? (
                <>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Product_Specs"
                      value={name}
                      onChange={e => {
                        const val = e.target.value.replace(/[^a-zA-Z0-9 _-]/g, '');
                        if (val.length <= 50) setName(val);
                      }}
                      maxLength={50}
                      required={knowledgeType === 'text'}
                    />
                    <small style={{ color: '#64748b', marginTop: '6px', fontSize: '12px', display: 'block' }}>Max 50 characters. Letters, numbers, spaces, _, and - only.</small>
                  </div>

                  <div className="form-group">
                    <label>Title *</label>
                    <input type="text" placeholder="e.g. Premium Plan Features" value={title} onChange={e => setTitle(e.target.value)} required={knowledgeType === 'text'} />
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea placeholder="Provide detailed product description or information..." value={description} onChange={e => setDescription(e.target.value)} rows="4" required={knowledgeType === 'text'}></textarea>
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Upload Files *</label>
                  <div style={{ border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '40px', textAlign: 'center', marginTop: '12px', background: '#f8fafc', position: 'relative' }}>
                    <input
                      type="file"
                      multiple
                      onChange={e => {
                        const newFiles = Array.from(e.target.files);
                        if (newFiles.length === 0) return;
                        setSelectedFiles(prev => {
                          const prevArr = Array.isArray(prev) ? prev : Array.from(prev || []);
                          const combined = [...prevArr];
                          for (const nf of newFiles) {
                            if (!combined.some(ex => ex.name === nf.name && ex.size === nf.size)) {
                              combined.push(nf);
                            }
                          }
                          return combined;
                        });
                        e.target.value = '';
                      }}
                      style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                      }}
                      required={knowledgeType === 'file' && (!selectedFiles || selectedFiles.length === 0)}
                    />
                    <p style={{ margin: 0, color: '#0ea5e9', fontWeight: 500, fontSize: '15px' }}>
                      {selectedFiles && selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Click to Browse Files or Drag & Drop'}
                    </p>
                    <p style={{ color: '#64748b', margin: '8px 0 0 0', fontSize: '13px' }}>Supported formats: PDF, TXT, DOCX, CSV</p>
                    {selectedFiles && selectedFiles.length > 0 && (
                      <div style={{ marginTop: '16px', textAlign: 'left', background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', maxHeight: '120px', overflowY: 'auto', position: 'relative', zIndex: 10 }}>
                        {Array.from(selectedFiles).map((file, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#334155', padding: '4px 0', borderBottom: idx < selectedFiles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setSelectedFiles(prev => (Array.isArray(prev) ? prev : Array.from(prev)).filter((_, i) => i !== idx));
                              }}
                              style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}
                              title="Remove File"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '32px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={uploading}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={uploading}>{uploading ? 'Processing...' : (editingItemId ? 'Save Changes' : 'Upload')}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Slide-in Notifications */}
      {ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 999999, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              padding: '16px 20px',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              display: 'flex',
              alignItems: 'center',
              minWidth: '250px',
              pointerEvents: 'auto',
              backgroundColor: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : t.type === 'delete' ? '#f43f5e' : '#0ea5e9',
            }}>
              <div style={{ marginRight: '12px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : t.type === 'delete' ? '✕' : 'ℹ'}
              </div>
              {t.message}
            </div>
          ))}
          {deleteConfirmItem && (
            <div style={{
              animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              padding: '16px 20px',
              borderRadius: '8px',
              color: '#0f172a',
              fontWeight: 500,
              fontSize: '14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '280px',
              pointerEvents: 'auto',
              backgroundColor: '#fff',
              borderLeft: '4px solid #ef4444'
            }}>
              <div style={{ marginBottom: '14px', fontWeight: 600, fontSize: '14.5px' }}>
                Delete "{deleteConfirmItem.name || deleteConfirmItem.title || 'this document'}"?
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirmItem(null)} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>Cancel</button>
                <button onClick={handleConfirmDelete} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dc2626'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ef4444'}>Yes, delete</button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
      {namespaceModalPortal}
    </div>
  );
};

const PERSONAS = [
  {
    id: 'sales',
    icon: TrendingUp,
    iconColor: '#8b5cf6',
    iconBg: 'rgba(139,92,246,0.1)',
    title: 'Sales Assistant',
    desc: 'Helps with product recommendations and sales inquiries.',
  },
  {
    id: 'support',
    icon: Headphones,
    iconColor: '#0ea5e9',
    iconBg: 'rgba(14,165,233,0.1)',
    title: 'Support Agent',
    desc: 'Provides customer support and troubleshooting.',
  },
  {
    id: 'qa',
    icon: HelpCircle,
    iconColor: '#10b981',
    iconBg: 'rgba(16,185,129,0.1)',
    title: 'Q&A Bot',
    desc: 'Answers questions based on your knowledge base.',
  },
  {
    id: 'general',
    icon: Settings,
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.1)',
    title: 'General Agent',
    desc: 'Handles general queries and varied tasks.',
  },
];

/* ─────────────────────────────────────────
   AGENT LOG COMPONENT
───────────────────────────────────────── */
const AgentLog = ({ agents }) => {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Detail drawer state
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [convInfo, setConvInfo] = useState(null);
  const [triggerMsgInfo, setTriggerMsgInfo] = useState(null);
  const [responseMsgInfo, setResponseMsgInfo] = useState(null);

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].agent_id);
    }
  }, [agents]);

  const fetchLogs = () => {
    if (!selectedAgentId) return;
    setLoading(true);
    setActivities([]);
    setPagination(null);
    apiService.getAgentActivity(selectedAgentId, null, 20)
      .then(data => {
        setActivities(data?.agent_activities || []);
        setPagination(data?.pagination || null);
      })
      .catch(err => console.error('Failed to load agent activity', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentId]);

  const handleLoadMore = () => {
    if (!pagination?.has_more || !pagination?.next_cursor || loadingMore) return;
    setLoadingMore(true);
    apiService.getAgentActivity(selectedAgentId, pagination.next_cursor, 20)
      .then(data => {
        setActivities(prev => [...prev, ...(data?.agent_activities || [])]);
        setPagination(data?.pagination || null);
      })
      .catch(err => console.error('Failed to load more activity', err))
      .finally(() => setLoadingMore(false));
  };

  const handleRowClick = async (activity) => {
    setSelectedActivity(activity);
    setConvInfo(null);
    setTriggerMsgInfo(null);
    setResponseMsgInfo(null);
    setDetailLoading(true);

    let currentAct = activity;
    try {
      const detailRes = await apiService.getAgentActivityDetail(selectedAgentId, activity.activity_id);
      if (detailRes && typeof detailRes === 'object') {
        currentAct = { ...activity, ...detailRes };
        setSelectedActivity(currentAct);
      }
    } catch (err) {
      console.warn('Individual activity detail endpoint not available or returned error:', err);
    }

    const convId = currentAct.conversation_id;
    const trigId = currentAct.trigger_message_id;
    const respId = currentAct.response_message_id;

    try {
      // Fire all three requests in parallel
      const [ci, ti, ri] = await Promise.allSettled([
        convId ? apiService.getConversationInfo(convId) : Promise.resolve(null),
        (convId && trigId) ? apiService.getMessageInfo(convId, trigId) : Promise.resolve(null),
        (convId && respId) ? apiService.getMessageInfo(convId, respId) : Promise.resolve(null),
      ]);
      if (ci.status === 'fulfilled') setConvInfo(ci.value);
      if (ti.status === 'fulfilled') setTriggerMsgInfo(ti.value);
      if (ri.status === 'fulfilled') setResponseMsgInfo(ri.value);
    } catch (err) {
      console.error('Failed to fetch activity details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const statusConfig = {
    success: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Success' },
    error:   { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Error'   },
    pending: { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Pending' },
  };
  const getStatusCfg = (s) => statusConfig[s?.toLowerCase()] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: s || '—' };

  const fmt = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!agents || agents.length === 0) {
    return (
      <div className="mt-16 text-center py-16 bg-white rounded-[2rem] border border-dashed border-slate-200">
        <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">history</span>
        <p className="text-slate-500 font-medium text-sm">No agents available to display logs.</p>
      </div>
    );
  }

  return (
    <section className="mt-16 pb-20">
      {/* Section Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-[#45464d] mb-2 block font-bold">Audit Trail</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#000000] font-['Epilogue']">Agent Log</h2>
          <p className="text-sm text-[#45464d] mt-2 max-w-md">Every decision your agent makes — trigger, response, handover, and timing — recorded here.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center justify-center w-11 h-11 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
            title="Refresh Logs"
          >
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
          <select
            value={selectedAgentId}
            onChange={e => setSelectedAgentId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-black/10 cursor-pointer shadow-sm"
          >
            {agents.map(a => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-[2rem] border border-[#e0e3e5] overflow-hidden shadow-sm">
        {/* Table Head */}
        <div className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_1.5fr] gap-4 px-6 py-4 bg-[#f7f9fb] border-b border-[#e0e3e5]">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Activity ID</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Status</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Response Time</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Handover</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Time</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            <span className="material-symbols-outlined animate-spin text-3xl block mb-2">sync</span>
            Loading activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm font-medium">
            <span className="material-symbols-outlined text-3xl block mb-2 text-slate-300">history_toggle_off</span>
            No activity found for this agent.
          </div>
        ) : (
          activities.map((act) => {
            const sc = getStatusCfg(act.status);
            return (
              <div
                key={act.activity_id}
                onClick={() => handleRowClick(act)}
                className="grid grid-cols-[1.5fr_1.5fr_1.2fr_1fr_1.5fr] gap-4 items-center px-6 py-4 border-b border-[#f0f2f4] last:border-0 hover:bg-[#f7f9fb] cursor-pointer transition-colors group"
              >
                {/* Activity ID */}
                <span className="font-mono text-xs text-slate-500 font-semibold truncate" title={act.activity_id}>
                  {act.activity_id ? (act.activity_id.length > 12 ? `${act.activity_id.slice(0, 8)}...` : act.activity_id) : '—'}
                </span>
                {/* Status */}
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                    {sc.label}
                  </span>
                  {act.error_message && (
                    <span className="text-[10px] text-red-400 font-medium truncate max-w-[120px]" title={act.error_message}>{act.error_message}</span>
                  )}
                </div>
                {/* Response Time */}
                <span className="text-sm font-semibold text-slate-700">
                  {act.response_time_ms != null ? `${act.response_time_ms} ms` : '—'}
                </span>
                {/* Handover */}
                <div>
                  {act.is_human_handover ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[12px]">support_agent</span>Yes
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">No</span>
                  )}
                </div>
                {/* Time */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{fmt(act.created_at)}</span>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors text-[16px]">chevron_right</span>
                </div>
              </div>
            );
          })
        )}

        {/* Load More */}
        {pagination?.has_more && (
          <div className="px-6 py-4 border-t border-[#f0f2f4] flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 px-5 py-2.5 rounded-xl transition-colors border border-slate-200 flex items-center gap-2 disabled:opacity-50"
            >
              {loadingMore ? (
                <><span className="material-symbols-outlined text-[14px] animate-spin">sync</span>Loading...</>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">expand_more</span>Load More ({pagination.total - activities.length} remaining)</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Detail Drawer -> Modal */}
      {selectedActivity && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4" onClick={() => setSelectedActivity(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="w-[95vw] max-w-6xl h-[90vh] bg-white rounded-3xl overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Activity Detail</p>
                <h3 className="text-lg font-extrabold text-slate-900 font-['Epilogue'] tracking-tight">Log Entry</h3>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <span className="material-symbols-outlined animate-spin text-4xl block mb-3">sync</span>
                  <p className="text-sm font-medium">Fetching details...</p>
                </div>
              </div>
            ) : (
              <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 space-y-8 bg-slate-50/60 p-6 rounded-3xl border border-slate-100/80">
                  {/* Raw Activity Fields */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100">Activity Fields</h4>
                  <ul className="space-y-3">
                    {[
                      { label: 'Activity ID',    value: selectedActivity.activity_id, alwaysShow: true },
                      { label: 'Agent Name',     value: selectedActivity.agent_name },
                      { label: 'Status',         value: selectedActivity.status, alwaysShow: true },
                      { label: 'Response Time',  value: selectedActivity.response_time_ms != null ? `${selectedActivity.response_time_ms} ms` : '—', alwaysShow: true },
                      { label: 'Completion Time',value: selectedActivity.agent_completion_time_ms != null ? `${selectedActivity.agent_completion_time_ms} ms` : null },
                      { label: 'Total Tokens',   value: selectedActivity.total_tokens ?? (selectedActivity.input_tokens != null ? `${selectedActivity.input_tokens} in / ${selectedActivity.output_tokens || 0} out` : null) },
                      { label: 'Tools Used',     value: Array.isArray(selectedActivity.tools_used) ? selectedActivity.tools_used.join(', ') : selectedActivity.tools_used },
                      { label: 'Error Message',  value: selectedActivity.error_message },
                      { label: 'Handover',       value: selectedActivity.is_human_handover ? 'Yes' : 'No', alwaysShow: true },
                      { label: 'Handover Reason',value: selectedActivity.human_handover_reason },
                      { label: 'Knowledge Used', value: Array.isArray(selectedActivity.knowledge_source) ? selectedActivity.knowledge_source.join(', ') : selectedActivity.knowledge_source },
                      { label: 'Created At',     value: fmt(selectedActivity.created_at), alwaysShow: true },
                    ].filter(item => item.alwaysShow || (item.value != null && item.value !== '' && item.value !== '—')).map(({ label, value }) => (
                      <li key={label} className="flex items-start gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
                        <span className="text-xs font-semibold text-slate-800 break-all">{String(value != null ? value : '—')}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Conversation Info */}
                {selectedActivity.conversation_id && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">forum</span>Conversation
                    </h4>
                    {convInfo ? (
                      <ul className="space-y-3">
                        {[
                          { label: 'ID',           value: convInfo.conversation_id },
                          { label: 'Name',         value: convInfo.name || '—' },
                          { label: 'Human Needed', value: convInfo.is_human_needed ? 'Yes' : 'No' },
                          { label: 'Updated',      value: fmt(convInfo.updated_time) },
                        ].map(({ label, value }) => (
                          <li key={label} className="flex items-start gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
                            <span className="text-xs font-semibold text-slate-800 break-all">{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-2 rounded-lg">{selectedActivity.conversation_id}</p>
                    )}
                  </div>
                )}
                </div>

                <div className="lg:col-span-7 space-y-8">
                  {/* Trigger Messages */}
                {((selectedActivity.trigger_messages && selectedActivity.trigger_messages.length > 0) || selectedActivity.trigger_message_id) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">person</span>Trigger Messages (User)
                    </h4>
                    {selectedActivity.trigger_messages?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedActivity.trigger_messages.map((msg, idx) => (
                          <div key={msg.message_id || idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Role: {msg.role || 'user'}</span>
                              <span>{fmt(msg.created_at)}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">{msg.content || msg.message || '—'}</p>
                            {msg.attachments?.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => {
                                  const name = typeof att === 'string' ? att : (att.filename || att.name || att.url || `Attachment ${i+1}`);
                                  const url = typeof att === 'string' ? att : (att.url || att.file_url);
                                  return url ? (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-sm">
                                      <span className="material-symbols-outlined text-[14px]">attachment</span>{name}
                                    </a>
                                  ) : (
                                    <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                                      <span className="material-symbols-outlined text-[14px]">attachment</span>{name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : triggerMsgInfo ? (
                      <ul className="space-y-3">
                        {[
                          { label: 'Message ID',    value: triggerMsgInfo.message_id },
                          { label: 'Content',       value: triggerMsgInfo.message || '—' },
                          { label: 'Role',          value: triggerMsgInfo.role || '—' },
                          { label: 'Has Attachment',value: triggerMsgInfo.has_attachment ? 'Yes' : 'No' },
                          { label: 'Sent At',       value: fmt(triggerMsgInfo.created_at) },
                        ].map(({ label, value }) => (
                          <li key={label} className="flex items-start gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
                            <span className="text-xs font-semibold text-slate-800 break-all">{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-2 rounded-lg">{selectedActivity.trigger_message_id}</p>
                    )}
                  </div>
                )}

                {/* Response Messages */}
                {((selectedActivity.response_messages && selectedActivity.response_messages.length > 0) || selectedActivity.response_message_id) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">smart_toy</span>Agent Response Messages
                    </h4>
                    {selectedActivity.response_messages?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedActivity.response_messages.map((msg, idx) => (
                          <div key={msg.message_id || idx} className="bg-emerald-50/40 border border-emerald-100/60 rounded-2xl p-4 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-700/70 uppercase tracking-wider">
                              <span>Role: {msg.role || 'assistant'}</span>
                              <span>{fmt(msg.created_at)}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 whitespace-pre-wrap">{msg.content || msg.message || '—'}</p>
                            {msg.attachments?.length > 0 && (
                              <div className="pt-2 flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => {
                                  const name = typeof att === 'string' ? att : (att.filename || att.name || att.url || `Attachment ${i+1}`);
                                  const url = typeof att === 'string' ? att : (att.url || att.file_url);
                                  return url ? (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors shadow-sm">
                                      <span className="material-symbols-outlined text-[14px]">attachment</span>{name}
                                    </a>
                                  ) : (
                                    <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                                      <span className="material-symbols-outlined text-[14px]">attachment</span>{name}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : responseMsgInfo ? (
                      <ul className="space-y-3">
                        {[
                          { label: 'Message ID',    value: responseMsgInfo.message_id },
                          { label: 'Content',       value: responseMsgInfo.message || '—' },
                          { label: 'Role',          value: responseMsgInfo.role || '—' },
                          { label: 'Is AI Message', value: responseMsgInfo.is_ai_msg ? 'Yes' : 'No' },
                          { label: 'Has Attachment',value: responseMsgInfo.has_attachment ? 'Yes' : 'No' },
                          { label: 'Sent At',       value: fmt(responseMsgInfo.created_at) },
                        ].map(({ label, value }) => (
                          <li key={label} className="flex items-start gap-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
                            <span className="text-xs font-semibold text-slate-800 break-all">{String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 font-mono bg-slate-50 px-3 py-2 rounded-lg">{selectedActivity.response_message_id}</p>
                    )}
                  </div>
                )}
                </div>

              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

const AgentPanel = ({ user, pages, namespaces, onUpdate, onAgentCreated, onAgentEdited }) => {
  const agents = user?.agents || [];
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState(null);

  const [agentName, setAgentName] = useState('');
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [tone, setTone] = useState('Professional');
  const [language, setLanguage] = useState('English');
  const [businessName, setBusinessName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [instructions, setInstructions] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [agentTimezone, setAgentTimezone] = useState('');

  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [unassigningId, setUnassigningId] = useState(null);

  const [toasts, setToasts] = useState([]);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const [assignModalAgent, setAssignModalAgent] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [assignPageModalAgent, setAssignPageModalAgent] = useState(null);
  const [assigningPageId, setAssigningPageId] = useState(null);
  const [customizingAvatarAgent, setCustomizingAvatarAgent] = useState(null);
  const [localAvatarsTick, setLocalAvatarsTick] = useState(0);
  const [creationError, setCreationError] = useState(null);

  const handleSaveAvatar = async (updatedConfig, agentId) => {
    setLocalAvatarsTick(prev => prev + 1);
    if (user && user.agents) {
      const target = user.agents.find(a => a.agent_id === agentId);
      if (target) {
        target.avatar_config = updatedConfig;
      }
    }
    if (onUpdate) onUpdate();

    try {
      const updatedAgent = await apiService.setAgentAvatar(agentId, updatedConfig);
      if (updatedAgent && updatedAgent.avatar_config && user && user.agents) {
        const target = user.agents.find(a => a.agent_id === agentId);
        if (target) {
          Object.assign(target, updatedAgent);
        }
      }
    } catch (e) {
      console.warn("Failed to set agent avatar on backend:", e);
    }
  };
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const openCreateForm = () => {
    setIsCreating(true);
    setIsEditing(false);
    setEditingAgentId(null);
    setAttemptedSubmit(false);
    setCreationError(null);
    setAgentName('');
    setBusinessName('');
    setBusinessDesc('');
    setInstructions('');
    setFallbackMessage('');
    setSelectedPersona(null);
    setTone('Professional');
    setLanguage('English');
    setAgentTimezone('');
  };

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [agentQuery, setAgentQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    role: 'All',
    tone: 'All'
  });

  const activeSelectedAgents = JSON.parse(localStorage.getItem('lyfflow_assigned_agents') || '{}');

  const filteredAgents = agents.filter(agent => {
    const normalizedQuery = agentQuery.trim().toLowerCase();
    if (normalizedQuery) {
      const searchableText = [agent.name, agent.role, agent.business_name, agent.tone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    // Role filter
    if (filters.role !== 'All' && agent.role !== filters.role) return false;

    // Tone filter
    if (filters.tone !== 'All' && agent.tone !== filters.tone) return false;

    // Status filter
    if (filters.status !== 'All') {
      const isActive = !!agent.namespace_id;
      if (filters.status === 'Active' && !isActive) return false;
      if (filters.status === 'IDLE' && isActive) return false;
    }

    return true;
  });

  const clearFilters = () => setFilters({ status: 'All', role: 'All', tone: 'All' });
  const activeFiltersCount = Object.values(filters).filter(v => v !== 'All').length;
  const hasActiveAgentSearch = agentQuery.trim().length > 0;

  const handleAssign = async (agentId, namespaceId) => {
    if (!namespaceId) return;
    setAssigningId(agentId);
    try {
      await apiService.setAgentNamespace(agentId, namespaceId);
      addToast('Agent assigned successfully', 'success');
      setAssignModalAgent(null);
      if (onAgentEdited) onAgentEdited(agentId, { namespace_id: namespaceId });
    } catch (e) {
      console.error(e);
      addToast('Failed to assign: ' + e.message, 'error');
    } finally {
      setAssigningId(null);
    }
  };

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleUnassign = async (agentId) => {
    setUnassigningId(agentId);
    try {
      await apiService.unsetAgentNamespace(agentId);
      addToast('Agent unassigned successfully', 'success');
      if (onAgentEdited) onAgentEdited(agentId, { namespace_id: null });
    } catch (e) {
      console.error(e);
      addToast('Failed to unassign: ' + e.message, 'error');
    } finally {
      setUnassigningId(null);
    }
  };

  const getAssignedAgentIdForPage = (page) => {
    try {
      const cached = localStorage.getItem('lyfflow_assigned_agents');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed[page.page_id]) return parsed[page.page_id];
      }
    } catch (e) {}
    if (page.agent_name) {
      const matched = agents.find(a => a.name === page.agent_name);
      if (matched) return matched.agent_id;
    }
    return page.agent_id || page.agent?.agent_id || page.agent?.id || page.assigned_agent_id;
  };

  const handleAssignToPage = async (pageId, agentId) => {
    setAssigningPageId(pageId);
    try {
      await apiService.assignAgentToPage(pageId, agentId);
      try {
        const cached = localStorage.getItem('lyfflow_assigned_agents');
        const nextState = cached ? JSON.parse(cached) : {};
        nextState[pageId] = agentId;
        localStorage.setItem('lyfflow_assigned_agents', JSON.stringify(nextState));
      } catch (e) {}
      addToast('Agent assigned to page successfully', 'success');
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      addToast('Failed to assign to page: ' + e.message, 'error');
    } finally {
      setAssigningPageId(null);
    }
  };

  const handleUnassignPage = async (pageId) => {
    setAssigningPageId(pageId);
    try {
      await apiService.unassignAgentFromPage(pageId);
      try {
        const cached = localStorage.getItem('lyfflow_assigned_agents');
        const nextState = cached ? JSON.parse(cached) : {};
        delete nextState[pageId];
        localStorage.setItem('lyfflow_assigned_agents', JSON.stringify(nextState));
      } catch (e) {}
      addToast('Agent unassigned from page successfully', 'success');
      if (onUpdate) onUpdate();
    } catch (e) {
      console.error(e);
      addToast('Failed to unassign from page: ' + e.message, 'error');
    } finally {
      setAssigningPageId(null);
    }
  };

  const handleDeleteAgent = (agent) => {
    setDeleteConfirmItem(agent);
  };

  const handleConfirmDelete = async () => {
    const agent = deleteConfirmItem;
    if (!agent) return;
    setDeleteConfirmItem(null);
    try {
      await apiService.deleteAgent(agent.agent_id);
      addToast('Agent deleted successfully', 'delete');
      if (onUpdate) onUpdate(); // We can keep onUpdate here or use a delete specific handler. Since deleting might affect dialogue counts elsewhere, onUpdate is okay, but ideal is local. Let's keep onUpdate for delete for now as it's less common.
    } catch (e) {
      console.error(e);
      addToast('Failed to delete agent: ' + e.message, 'error');
    }
  };

  const TONES = ["Professional", "Friendly", "Formal", "Casual", "Persuasive", "Empathetic", "Confident"];
  const LANGUAGES = ["Mimic User Language", "English", "Arabic", "Spanish", "French", "German", "Portuguese", "Hindi", "Bengali"];

  const REVERSE_ROLE_MAP = { 'Sales Agent': 'sales', 'Support Agent': 'support', 'Q&A Agent': 'qa', 'General Agent': 'general' };

  const handleEditClick = (agent) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditingAgentId(agent.agent_id);
    setAttemptedSubmit(false);
    setCreationError(null);

    setAgentName(agent.name || '');
    setBusinessName(agent.business_name || '');
    setBusinessDesc(agent.business_description || '');
    setInstructions(agent.instructions || '');
    setFallbackMessage(agent.fallback_message || '');
    setSelectedPersona(REVERSE_ROLE_MAP[agent.role] || 'sales');
    setTone(agent.tone || 'Professional');
    setLanguage(agent.language || 'English');
    setAgentTimezone(agent.agent_timezone || '');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const missing = [];
    if (!agentName.trim()) missing.push("Agent Name");
    if (!businessName.trim()) missing.push("Business Name");
    if (!selectedPersona) missing.push("Select Persona");
    if (!businessDesc.trim()) missing.push("Business Description");

    if (missing.length > 0) {
      const missingNames = missing.join(", ");
      setCreationError(`Cannot ${isEditing ? 'save changes' : 'create agent'}. Please provide the missing required value(s): ${missingNames}`);
      addToast(`Missing required value(s): ${missingNames}`, 'error');
      return;
    }
    setCreationError(null);

    if (agentName.length > 30 || businessName.length > 100 || businessDesc.length > 500 || (instructions && instructions.length > 500) || (fallbackMessage && fallbackMessage.length > 250)) {
      setCreationError(`Cannot ${isEditing ? 'save changes' : 'create agent'}. One or more input fields exceed the maximum allowed character limit.`);
      addToast("Character limit exceeded!", 'error');
      return;
    }

    setLoading(true);
    try {
      const roleMap = { 'sales': 'Sales Agent', 'support': 'Support Agent', 'qa': 'Q&A Agent', 'general': 'General Agent' };
      const payload = {
        name: agentName,
        role: roleMap[selectedPersona],
        tone,
        language,
        business_name: businessName,
        business_description: businessDesc,
        instructions: instructions.trim() || null,
        fallback_message: fallbackMessage.trim() || null,
        agent_timezone: agentTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      };

      console.log("Create Agent Payload:", JSON.stringify(payload, null, 2));

      if (isEditing) {
        await apiService.updateAgent(editingAgentId, payload);
        if (onAgentEdited) onAgentEdited(editingAgentId, payload);
      } else {
        try {
          const newAgent = await apiService.createAgent(payload);
          if (onAgentCreated) onAgentCreated(newAgent);
        } catch (error) {
          // If the error is about a missing subscription, try to auto-subscribe and retry once
          if (error.status === 403 && (error.message || '').toLowerCase().includes('subscription')) {
            try {
              console.log("Subscription missing on create, attempting silent fix...");
              await apiService.subscribe({ subscription_type: 'FREE', num_months: 120 });
              // Small delay to ensure DB propagation
              await new Promise(resolve => setTimeout(resolve, 500));
              // Retry creation after silent fix
              const retryAgent = await apiService.createAgent(payload);
              if (onAgentCreated) onAgentCreated(retryAgent);
            } catch (retryError) {
              throw retryError; // If it still fails, let the main catch handle it
            }
          } else {
            throw error;
          }
        }
      }

      setCreated(true);
      setTimeout(() => {
        setCreated(false);
        setAgentName('');
        setSelectedPersona(null);
        setBusinessName('');
        setBusinessDesc('');
        setInstructions('');
        setFallbackMessage('');
        setAgentTimezone('');
        setIsCreating(false);
        setIsEditing(false);
        setEditingAgentId(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to create agent:', error);
      setCreationError(error.message || 'An unknown error occurred while creating the agent.');
    } finally {
      setLoading(false);
    }
  };

  const overlays = typeof document !== 'undefined' ? ReactDOM.createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      <div className="absolute top-6 right-6 flex flex-col gap-3 items-end">
        {toasts.map(t => (
          <div key={t.id} style={{
            animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            padding: '12px 20px',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : t.type === 'delete' ? '#ef4444' : '#0ea5e9'
          }}>
            <div style={{ marginRight: '12px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : t.type === 'delete' ? '✕' : 'ℹ'}
            </div>
            {t.message}
          </div>
        ))}
        {deleteConfirmItem && (
          <div style={{
            animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            padding: '16px 20px',
            borderRadius: '8px',
            color: '#0f172a',
            fontWeight: 500,
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '280px',
            pointerEvents: 'auto',
            backgroundColor: '#fff',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{ marginBottom: '14px', fontWeight: 600, fontSize: '14.5px' }}>
              Delete "{deleteConfirmItem.name}"?
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirmItem(null)} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>Cancel</button>
              <button onClick={handleConfirmDelete} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 600, transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#dc2626'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ef4444'}>Yes, delete</button>
            </div>
          </div>
        )}
        {assignModalAgent && (
          <div style={{
            animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            padding: '16px 20px',
            borderRadius: '8px',
            color: '#0f172a',
            fontWeight: 500,
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '320px',
            pointerEvents: 'auto',
            backgroundColor: '#fff',
            borderLeft: '4px solid #0ea5e9'
          }}>
            <div style={{ marginBottom: '14px', fontWeight: 600, fontSize: '14.5px' }}>
              Assign "{assignModalAgent.name}" to Namespace
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '200px', overflowY: 'auto' }}>
              {namespaces?.length > 0 ? namespaces.map((ns, idx) => {
                const nsId = ns.namespace_id || ns.namespace;
                const nsName = ns.namespace_name || ns.name;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAssign(assignModalAgent.agent_id, nsId)}
                    disabled={assigningId === assignModalAgent.agent_id}
                    style={{ textAlign: 'left', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', cursor: assigningId === assignModalAgent.agent_id ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s' }}
                    onMouseEnter={e => { if (assigningId !== assignModalAgent.agent_id) e.currentTarget.style.backgroundColor = '#f1f5f9' }}
                    onMouseLeave={e => { if (assigningId !== assignModalAgent.agent_id) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                  >
                    {nsName ? `${nsName} (${nsId.split('-')[0]}...)` : `Namespace: ${nsId.split('-')[0]}...${nsId.slice(-4)}`}
                  </button>
                );
              }) : (
                <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '10px' }}>No namespaces available. Please generate one in the Knowledge Base first.</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAssignModalAgent(null)}
                disabled={assigningId === assignModalAgent.agent_id}
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, transition: 'background-color 0.2s', cursor: assigningId === assignModalAgent.agent_id ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => { if (assigningId !== assignModalAgent.agent_id) e.currentTarget.style.backgroundColor = '#e2e8f0' }}
                onMouseLeave={e => { if (assigningId !== assignModalAgent.agent_id) e.currentTarget.style.backgroundColor = '#f1f5f9' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {creationError && (
          <div style={{
            animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            padding: '24px',
            borderRadius: '16px',
            color: '#0f172a',
            fontWeight: 500,
            fontSize: '15px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: '340px',
            maxWidth: '420px',
            pointerEvents: 'auto',
            backgroundColor: '#ffffff',
            borderTop: '4px solid #ef4444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined text-[24px]" style={{ color: '#ef4444' }}>error</span>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Creation Failed</h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Required</p>
              </div>
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '14.5px', color: '#475569', lineHeight: '1.6' }}>
              {creationError}
            </p>
            <button
              onClick={() => setCreationError(null)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 700, transition: 'all 0.2s', cursor: 'pointer', border: 'none' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f172a'}
            >
              Okay, got it
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  const avatarModalPortal = typeof document !== 'undefined' && customizingAvatarAgent ? ReactDOM.createPortal(
    <AgentAvatarModal
      agent={customizingAvatarAgent}
      isOpen={!!customizingAvatarAgent}
      onClose={() => setCustomizingAvatarAgent(null)}
      onSave={handleSaveAvatar}
    />,
    document.body
  ) : null;

  const assignPagePortal = typeof document !== 'undefined' && assignPageModalAgent ? ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      pointerEvents: 'auto'
    }} onClick={() => setAssignPageModalAgent(null)}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '28px',
        width: '90%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '85vh',
        border: '1px solid #e2e8f0',
        animation: 'fadeInUp 0.2s ease-out'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined text-blue-600 text-2xl">link</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Assign &quot;{assignPageModalAgent.name}&quot; to Page
            </h3>
          </div>
          <button onClick={() => setAssignPageModalAgent(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', marginTop: 0 }}>
          Select a connected page to handle customer messaging with this AI agent.
        </p>

        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', paddingRight: '4px' }}>
          {(!pages || pages.length === 0) ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              No pages connected. Please connect a Facebook page from the Overview or Channels section first.
            </div>
          ) : (
            pages.map(page => {
              const currentAssignedId = getAssignedAgentIdForPage(page);
              const isThisAgentAssigned = currentAssignedId === assignPageModalAgent.agent_id;
              const otherAgent = agents.find(a => a.agent_id === currentAssignedId);
              const isAssigningThisPage = assigningPageId === page.page_id;

              return (
                <div key={page.page_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '14px', border: isThisAgentAssigned ? '2px solid #10b981' : '1px solid #e2e8f0', backgroundColor: isThisAgentAssigned ? '#ecfdf5' : '#f8fafc', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {page.profile_pic_url ? (
                        <img src={page.profile_pic_url} alt={page.page_name || page.name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span className="material-symbols-outlined text-blue-500 text-sm">facebook</span>
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {page.page_name || page.name || `Page ${page.page_id}`}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: isThisAgentAssigned ? '#059669' : (currentAssignedId ? '#d97706' : '#64748b') }}>
                      {isThisAgentAssigned ? '✓ Currently assigned to this agent' : (currentAssignedId ? `Assigned to: ${otherAgent?.name || 'Another Agent'}` : 'Not assigned')}
                    </span>
                  </div>

                  <button
                    disabled={isAssigningThisPage}
                    onClick={() => {
                      if (isThisAgentAssigned) {
                        handleUnassignPage(page.page_id);
                      } else {
                        handleAssignToPage(page.page_id, assignPageModalAgent.agent_id);
                      }
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: isAssigningThisPage ? 'not-allowed' : 'pointer',
                      backgroundColor: isThisAgentAssigned ? '#fee2e2' : '#0f172a',
                      color: isThisAgentAssigned ? '#ef4444' : '#fff',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      boxShadow: isThisAgentAssigned ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isAssigningThisPage ? 'Wait...' : (isThisAgentAssigned ? 'Unassign' : 'Assign')}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button
            onClick={() => setAssignPageModalAgent(null)}
            style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '13px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const configuredAgentsCount = agents.filter(agent => !!agent.namespace_id).length;
  const assignedPageCount = (pages || []).filter(page => !!getAssignedAgentIdForPage(page)).length;

  if (!isCreating && !isEditing) {
    return (
      <div className="min-w-0 flex-1 w-full p-4 md:p-6 xl:p-8 min-h-screen bg-[#f7f9fb] animate-fade-in-up">
        <div className="max-w-[1400px] mx-auto">
          <section className="mb-6 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Agent workspace</span>
                <h2 className="mb-2 font-['Epilogue'] text-3xl font-extrabold tracking-tight text-slate-950">AI agents</h2>
                <p className="max-w-xl text-sm leading-6 text-slate-500">Create, connect, and monitor the agents that handle conversations across your pages.</p>
              </div>
              <div className="grid w-full min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] xl:w-auto">
                <div className="grid min-w-0 grid-cols-3 items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 py-3">
                  <div className="min-w-0 px-3 text-center sm:px-4"><p className="text-lg font-extrabold leading-none text-slate-950">{agents.length}</p><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">Agents</p></div>
                  <div className="min-w-0 border-x border-slate-200 px-2 text-center sm:px-4"><p className="text-lg font-extrabold leading-none text-emerald-600">{configuredAgentsCount}</p><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">Connected</p></div>
                  <div className="min-w-0 px-3 text-center sm:px-4"><p className="text-lg font-extrabold leading-none text-blue-600">{assignedPageCount}</p><p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">Pages</p></div>
                </div>
                <button onClick={openCreateForm} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 sm:w-auto">
                  <span className="material-symbols-outlined text-[19px]">add</span>
                  Create agent
                </button>
              </div>
            </div>
          </section>

          <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <label
                className="relative flex h-11 min-w-0 items-center overflow-hidden rounded-xl border border-transparent bg-slate-50 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100/60"
                style={{ width: '1200px', maxWidth: '100%', flex: '0 1 1200px' }}
              >
                <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                <input
                  type="text"
                  value={agentQuery}
                  onChange={(event) => setAgentQuery(event.target.value)}
                  placeholder="Search by agent, role, business, or tone"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent pl-11 pr-10 text-sm font-medium text-slate-800 outline-none focus:border-transparent focus:ring-0"
                  style={{ width: 0, minWidth: 0, boxSizing: 'border-box' }}
                />
                {hasActiveAgentSearch && (
                  <button type="button" onClick={() => setAgentQuery('')} className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700" aria-label="Clear agent search">
                    <span className="material-symbols-outlined text-[17px]">close</span>
                  </button>
                )}
              </label>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`relative z-10 flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${isFilterOpen || activeFiltersCount > 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                style={{ width: '112px', flex: '0 0 112px' }}
                aria-expanded={isFilterOpen}
              >
                <span className="material-symbols-outlined text-[19px]">tune</span>
                Filters
                {activeFiltersCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 text-[10px] font-black text-slate-950">{activeFiltersCount}</span>}
              </button>
            </div>
            <div className={`grid overflow-hidden transition-all duration-300 ${isFilterOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="min-h-0">
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
                  <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
                    <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                    <select value={filters.status} onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-300">
                      <option value="All">All statuses</option><option value="Active">Connected</option><option value="IDLE">Needs setup</option>
                    </select>
                  </div>
                  <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
                    <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</label>
                    <select value={filters.role} onChange={e => setFilters(prev => ({ ...prev, role: e.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-300">
                      <option value="All">All roles</option><option value="Sales Agent">Sales Agent</option><option value="Support Agent">Support Agent</option><option value="Q&A Agent">Q&A Agent</option><option value="General Agent">General Agent</option>
                    </select>
                  </div>
                  <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
                    <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Personality</label>
                    <select value={filters.tone} onChange={e => setFilters(prev => ({ ...prev, tone: e.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-300">
                      <option value="All">All tones</option>{TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {activeFiltersCount > 0 && <button onClick={clearFilters} className="h-10 rounded-xl px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50">Clear filters</button>}
                </div>
              </div>
            </div>
          </section>

          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div><h3 className="text-sm font-extrabold text-slate-900">Your agents</h3><p className="text-xs text-slate-500">{filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'} shown</p></div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
            {agents.length === 0 ? (
              <div className="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15"><span className="material-symbols-outlined text-[27px]">smart_toy</span></div>
                <h4 className="text-lg font-extrabold text-slate-950">Build your first agent</h4>
                <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Give it a role, connect a knowledge source, then assign it to a page when you are ready.</p>
                <button onClick={openCreateForm} className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">Create agent</button>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="col-span-full flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white px-6 text-center">
                <span className="material-symbols-outlined mb-3 text-4xl text-slate-300">search_off</span>
                <h4 className="text-base font-extrabold text-slate-900">No matching agents</h4>
                <p className="mt-1 text-sm text-slate-500">Try another search or reset the current filters.</p>
                <button onClick={() => { setAgentQuery(''); clearFilters(); }} className="mt-4 text-sm font-bold text-emerald-700 hover:text-emerald-800">Reset search and filters</button>
              </div>
            ) : filteredAgents.map((agent) => {
              const assignedPagesForThisAgent = (pages || []).filter(p => {
                const assignedId = getAssignedAgentIdForPage(p);
                return assignedId === agent.agent_id || (agent.assigned_page_id && p.page_id === agent.assigned_page_id);
              });
              const isAssigned = !!agent.namespace_id;
              const isAssignedToPage = assignedPagesForThisAgent.length > 0;
              const isStatusGreen = isAssignedToPage || isAssigned;
              const totalDialog = agent.total_dialog || 0;
              return (
                <article key={agent.agent_id} className="group flex min-h-[330px] flex-col rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div
                      onClick={(e) => { e.stopPropagation(); setCustomizingAvatarAgent(agent); }}
                      title="Click to customize agent avatar"
                      className="relative group/avatar cursor-pointer shrink-0"
                    >
                      <AgentAvatar
                        agent={agent}
                        size="w-12 h-12"
                        iconSize="text-[23px]"
                        className="group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 rounded-full bg-slate-900/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="material-symbols-outlined text-white text-[18px]">palette</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${isStatusGreen ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isStatusGreen ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        {isStatusGreen ? 'Ready' : 'Needs setup'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete Agent"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="truncate text-base font-extrabold leading-tight text-slate-950">{agent.name}</h3>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">{agent.role || 'General Agent'}{agent.tone ? ` · ${agent.tone}` : ''}</p>

                  <div className="my-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400"><span className="material-symbols-outlined text-[15px]">chat_bubble_outline</span><span className="text-[9px] font-black uppercase tracking-wider">Dialogues</span></div>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">{totalDialog}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400"><span className="material-symbols-outlined text-[15px]">web</span><span className="text-[9px] font-black uppercase tracking-wider">Pages</span></div>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">{assignedPagesForThisAgent.length}</p>
                    </div>
                  </div>

                  <div className="mb-4 rounded-xl border border-slate-100 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Knowledge source</span>
                      <span className={`text-[10px] font-bold ${isAssigned ? 'text-emerald-600' : 'text-amber-600'}`}>{isAssigned ? 'Connected' : 'Not connected'}</span>
                    </div>
                    {isAssigned ? (
                      <button
                        onClick={() => setAssignModalAgent(agent)}
                        className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-left text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                        title="Change Namespace"
                      >
                        <span className="material-symbols-outlined shrink-0 text-[15px]">database</span>
                        <span className="truncate">{(() => {
                          const matchedNs = namespaces?.find(n => (n.namespace_id || n.namespace) === agent.namespace_id);
                          const nsName = matchedNs?.namespace_name || matchedNs?.name;
                          return nsName || `${String(agent.namespace_id).split('-')[0]}...`;
                        })()}</span>
                        <span className="material-symbols-outlined ml-auto shrink-0 text-[15px]">swap_horiz</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setAssignModalAgent(agent)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100"
                        title="Connect Namespace"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_link</span>
                        Connect knowledge
                      </button>
                    )}

                    <div className="mt-3 flex min-h-7 items-center justify-between gap-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Assigned pages</span>
                      {assignedPagesForThisAgent.length > 0 ? (
                        <div className="flex -space-x-2" title={`Assigned to: ${assignedPagesForThisAgent.map(p => p.name || p.page_name).join(', ')}`}>
                        {assignedPagesForThisAgent.slice(0, 3).map((p) => (
                          <div key={p.page_id} className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-blue-500">
                            {p.profile_pic_url ? (
                              <img src={p.profile_pic_url} alt={p.name || p.page_name} className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[13px] text-white">facebook</span>
                            )}
                          </div>
                        ))}
                        {assignedPagesForThisAgent.length > 3 && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-[9px] font-extrabold text-white">
                            +{assignedPagesForThisAgent.length - 3}
                          </div>
                        )}
                      </div>
                      ) : <span className="text-[11px] font-medium text-slate-400">None yet</span>}
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setAssignPageModalAgent(agent); }}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      <span className="material-symbols-outlined text-[15px]">web</span>
                      {isAssignedToPage ? 'Manage pages' : 'Assign page'}
                    </button>
                    <button
                      onClick={() => handleEditClick(agent)}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-2 text-[11px] font-bold text-white transition hover:bg-slate-800"
                    >
                      Configure <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>

                </article>
              );
            })}


          </div>
          {/* Agent Log Section */}
          <AgentLog agents={agents} />
        </div>
        {overlays}
        {assignPagePortal}
        {avatarModalPortal}
      </div>
    );
  }

  return (
    <div className="dashboard-content-area animate-fade-in-up">
      <div className="dashboard-header flex-between" style={{ alignItems: 'center', marginBottom: '32px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => { setIsCreating(false); setIsEditing(false); setEditingAgentId(null); setAttemptedSubmit(false); setCreationError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, padding: '0' }}>
          <ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} /> Back to Agents
        </button>
      </div>

      <div className="dashboard-header" style={{ textAlign: 'center', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{isEditing ? 'Edit Your Agent' : 'Create Your Agent'}</h3>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Configure your AI agent&apos;s personality, behavior, and business context.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: (attemptedSubmit && !agentName.trim()) ? '#ef4444' : 'inherit' }}>
                Agent Name * {(attemptedSubmit && !agentName.trim()) && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>(Required)</span>}
              </label>
              <span style={{ fontSize: '12px', fontWeight: 600, color: agentName.length > 30 ? '#ef4444' : '#64748b' }}>
                {agentName.length}/30 {agentName.length > 30 && '• Limit exceeded!'}
              </span>
            </div>
            <input type="text" placeholder="e.g. Sales Bot" value={agentName} onChange={(e) => setAgentName(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: (attemptedSubmit && !agentName.trim()) || agentName.length > 30 ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: (attemptedSubmit && !agentName.trim()) || agentName.length > 30 ? '#fef2f2' : '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: 600, color: (attemptedSubmit && !businessName.trim()) ? '#ef4444' : 'inherit' }}>
                Business Name * {(attemptedSubmit && !businessName.trim()) && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>(Required)</span>}
              </label>
              <span style={{ fontSize: '12px', fontWeight: 600, color: businessName.length > 100 ? '#ef4444' : '#64748b' }}>
                {businessName.length}/100 {businessName.length > 100 && '• Limit exceeded!'}
              </span>
            </div>
            <input type="text" placeholder="Your Company Ltd" value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: (attemptedSubmit && !businessName.trim()) || businessName.length > 100 ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: (attemptedSubmit && !businessName.trim()) || businessName.length > 100 ? '#fef2f2' : '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: (attemptedSubmit && !selectedPersona) ? '#ef4444' : 'inherit' }}>
              Select Persona * {(attemptedSubmit && !selectedPersona) && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>(Please select a persona)</span>}
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: (attemptedSubmit && !selectedPersona) ? '8px' : '0', border: (attemptedSubmit && !selectedPersona) ? '2px dashed #ef4444' : 'none', borderRadius: '12px', backgroundColor: (attemptedSubmit && !selectedPersona) ? '#fef2f2' : 'transparent', transition: 'all 0.2s' }}>
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPersona === p.id;
              return (
                <div key={p.id} onClick={() => !isEditing && setSelectedPersona(p.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 12px', borderRadius: '10px', border: isSelected ? '2px solid #0ea5e9' : '2px solid #e2e8f0', backgroundColor: isSelected ? 'rgba(14,165,233,0.05)' : '#f8fafc', cursor: isEditing ? 'not-allowed' : 'pointer', textAlign: 'center', transition: 'all 0.2s', opacity: isEditing && !isSelected ? 0.5 : 1 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: p.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isEditing && !isSelected ? 0.5 : 1 }}>
                    <Icon size={20} color={p.iconColor} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{p.title}</div>
                  {isEditing && isSelected && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '-4px' }}>(Role cannot be changed)</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Tone *</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Language *</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Timezone *</label>
            <select value={agentTimezone} onChange={e => setAgentTimezone(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
              <option value="">Browser Default ({Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"})</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Phoenix">America/Phoenix</option>
              <option value="America/Anchorage">America/Anchorage</option>
              <option value="America/Honolulu">America/Honolulu</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="Europe/Moscow">Europe/Moscow</option>
              <option value="Asia/Dhaka">Asia/Dhaka</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
              <option value="Asia/Hong_Kong">Asia/Hong_Kong</option>
              <option value="Asia/Jakarta">Asia/Jakarta</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="Australia/Melbourne">Australia/Melbourne</option>
              <option value="Pacific/Auckland">Pacific/Auckland</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 600, color: (attemptedSubmit && !businessDesc.trim()) ? '#ef4444' : 'inherit' }}>
              Business Description * {(attemptedSubmit && !businessDesc.trim()) && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>(Required)</span>}
            </label>
            <span style={{ fontSize: '12px', fontWeight: 600, color: businessDesc.length > 500 ? '#ef4444' : '#64748b' }}>
              {businessDesc.length}/500 {businessDesc.length > 500 && '• Limit exceeded!'}
            </span>
          </div>
          <textarea placeholder="What does your business do? How should the agent ground its suggestions?" value={businessDesc} onChange={(e) => setBusinessDesc(e.target.value)} rows="3" style={{ width: '100%', padding: '12px 14px', border: (attemptedSubmit && !businessDesc.trim()) || businessDesc.length > 500 ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: (attemptedSubmit && !businessDesc.trim()) || businessDesc.length > 500 ? '#fef2f2' : '#fff', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Custom Instructions (Optional)</label>
            <span style={{ fontSize: '12px', fontWeight: 600, color: (instructions || '').length > 500 ? '#ef4444' : '#64748b' }}>
              {(instructions || '').length}/500 {(instructions || '').length > 500 && '• Limit exceeded!'}
            </span>
          </div>
          <textarea placeholder="e.g. Always end conversations with 'Have a great day!'" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows="2" style={{ width: '100%', padding: '12px 14px', border: (instructions || '').length > 500 ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: (instructions || '').length > 500 ? '#fef2f2' : '#fff', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Fallback Message (Optional)</label>
            <span style={{ fontSize: '12px', fontWeight: 600, color: (fallbackMessage || '').length > 250 ? '#ef4444' : '#64748b' }}>
              {(fallbackMessage || '').length}/250 {(fallbackMessage || '').length > 250 && '• Limit exceeded!'}
            </span>
          </div>
          <textarea placeholder="e.g. I'm not sure about that, let me connect you with someone who can help." value={fallbackMessage} onChange={(e) => setFallbackMessage(e.target.value)} rows="2" style={{ width: '100%', padding: '12px 14px', border: (fallbackMessage || '').length > 250 ? '2px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '8px', outline: 'none', backgroundColor: (fallbackMessage || '').length > 250 ? '#fef2f2' : '#fff', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        {(() => {
          const hasLimitError = agentName.length > 30 || businessName.length > 100 || businessDesc.length > 500 || (instructions && instructions.length > 500) || (fallbackMessage && fallbackMessage.length > 250);
          return (
            <button type="submit" className="btn-submit" disabled={loading} style={{ backgroundColor: hasLimitError ? '#ef4444' : (created ? '#22c55e' : (loading ? '#94a3b8' : 'var(--text-primary)')), color: '#fff', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.25s' }}>
              {hasLimitError ? '⚠️ Character Limit Exceeded' : (loading ? (isEditing ? 'Saving...' : 'Creating...') : (created ? (isEditing ? '✓ Settings Saved!' : '✓ Agent Created!') : (isEditing ? 'Save Changes' : 'Create Agent')))}
            </button>
          );
        })()}
      </form>
      {overlays}
      {assignPagePortal}
      {avatarModalPortal}
    </div>
  );
};

/* ─────────────────────────────────────────
   SETTINGS PANEL
───────────────────────────────────────── */
const THEMES = [
  { id: 'sky', label: 'Sky Blue', primary: '#87CEEB', accent: '#0ea5e9' },
  { id: 'slate', label: 'Slate', primary: '#94a3b8', accent: '#475569' },
  { id: 'violet', label: 'Violet', primary: '#a78bfa', accent: '#7c3aed' },
  { id: 'rose', label: 'Rose', primary: '#fb7185', accent: '#e11d48' },
  { id: 'emerald', label: 'Emerald', primary: '#6ee7b7', accent: '#059669' },
  { id: 'amber', label: 'Amber', primary: '#fcd34d', accent: '#d97706' },
];

const INITIAL_TEAM = [
  { id: 1, name: 'John Smith', email: 'john.smith@company.com', role: 'Admin', avatar: 'JS', color: '#0ea5e9' },
  { id: 2, name: 'Alice Tan', email: 'alice.tan@company.com', role: 'Agent', avatar: 'AT', color: '#8b5cf6' },
  { id: 3, name: 'Bob Reyes', email: 'bob.reyes@company.com', role: 'Agent', avatar: 'BR', color: '#10b981' },
];

const SettingsPanel = ({ user, onUpdate }) => {
  const [activeSettings, setActiveSettings] = useState('profile');

  // ── Profile state ──
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setDisplayName(user.display_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await apiService.updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        email: email
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Themes state ──
  const [selectedTheme, setSelectedTheme] = useState('sky');
  const [themeSaved, setThemeSaved] = useState(false);

  const {
    themeId, setThemeId,
    widgetColor, setWidgetColor,
    widgetGreeting, setWidgetGreeting,
    widgetPosition, setWidgetPosition,
  } = useWidget();

  // Sync initial selector with global context
  useEffect(() => {
    setSelectedTheme(themeId);
  }, [themeId]);

  const [widgetSaved, setWidgetSaved] = useState(false);

  // ── Team Members state ──
  const [team, setTeam] = useState(INITIAL_TEAM);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Agent');
  const [inviteSent, setInviteSent] = useState(false);

  const handleThemeSave = () => {
    setThemeId(selectedTheme);
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2500);
  };

  const handleWidgetSave = (e) => {
    e.preventDefault();
    setWidgetSaved(true);
    setTimeout(() => setWidgetSaved(false), 2500);
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSent(true);
    setTimeout(() => {
      setInviteSent(false);
      setInviteEmail('');
    }, 2500);
  };

  const removeTeamMember = (id) => {
    setTeam(prev => prev.filter(m => m.id !== id));
  };

  const settingsTabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    // { id: 'themes', icon: Palette, label: 'Themes' },         // no functionality yet
    // { id: 'widget', icon: Monitor, label: 'Widget Appearance' }, // no functionality yet
    // { id: 'team', icon: Users, label: 'Team Members' },       // no functionality yet
  ];

  return (
    <div className="dashboard-content-area animate-fade-in-up" style={{ padding: '0' }}>
      {/* Settings sub-nav */}
      <div style={{ borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', gap: '4px', backgroundColor: '#fff' }}>
        {settingsTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSettings === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSettings(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '14px 16px',
                fontSize: '13.5px', fontWeight: isActive ? 600 : 500,
                color: isActive ? '#0ea5e9' : '#64748b',
                background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid #0ea5e9' : '2px solid transparent',
                cursor: 'pointer', transition: 'color 0.15s',
                marginBottom: '-1px',
              }}
            >
              <Icon size={16} />{tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '32px', maxWidth: '600px' }}>

        {/* ── PROFILE ── */}
        {activeSettings === 'profile' && (
          <form onSubmit={handleProfileSave}>
            <h3 style={{ fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Profile Information</h3>
            <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>Update your account details and how you appear to others.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 600 }}>First Name</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} required />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Last Name</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} required />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Display Name</label>
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} required />
              <small style={{ color: '#94a3b8', fontSize: '12px' }}>This is how your name will appear across the platform.</small>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 600 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} required />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              style={{ marginTop: '16px', backgroundColor: profileSaved ? '#22c55e' : 'var(--text-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontWeight: 700, fontSize: '14px', cursor: profileSaving ? 'not-allowed' : 'pointer', transition: 'background-color 0.25s' }}
            >
              {profileSaving ? 'Saving...' : profileSaved ? '✓ Profile Updated!' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── THEMES ── no functionality yet */}
        {false && activeSettings === 'themes' && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Themes</h3>
            <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>Choose a color theme for your dashboard.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {THEMES.map(t => {
                const isSelected = selectedTheme === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    style={{
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${t.accent}` : '2px solid #e2e8f0',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxShadow: isSelected ? `0 0 0 3px ${t.accent}22` : 'none',
                    }}
                  >
                    <div style={{ height: '56px', background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }} />
                    <div style={{ padding: '8px 10px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>{t.label}</span>
                      {isSelected && (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleThemeSave}
              className="btn-submit"
              style={{ marginTop: '28px', backgroundColor: themeSaved ? '#22c55e' : 'var(--text-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.25s' }}
            >
              {themeSaved ? '✓ Theme Applied!' : 'Apply Theme'}
            </button>
          </div>
        )}

        {/* ── WIDGET APPEARANCE ── no functionality yet */}
        {false && activeSettings === 'widget' && (
          <form onSubmit={handleWidgetSave}>
            <h3 style={{ fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Widget Appearance</h3>
            <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>Customize how your chat widget looks to visitors.</p>

            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Color */}
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Widget Color
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>{widgetColor}</span>
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#e11d48', '#374151'].map(c => (
                      <div
                        key={c}
                        onClick={() => setWidgetColor(c)}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: c, cursor: 'pointer',
                          border: widgetColor === c ? '3px solid #374151' : '3px solid transparent',
                          boxSizing: 'border-box', transition: 'border 0.15s',
                        }}
                      />
                    ))}
                    {/* Custom color picker */}
                    <div
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: !['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#e11d48', '#374151'].includes(widgetColor) ? '3px solid #374151' : '1px solid #e2e8f0',
                        boxSizing: 'border-box'
                      }}
                    >
                      <input
                        type="color"
                        value={widgetColor}
                        onChange={e => setWidgetColor(e.target.value)}
                        style={{
                          width: '40px', height: '40px', /* oversized to hide the input's own borders inside the overflow: hidden circle */
                          border: 'none', cursor: 'pointer', padding: 0,
                          backgroundColor: 'transparent'
                        }}
                        title="Custom color"
                      />
                    </div>
                  </div>
                </div>

                {/* Greeting */}
                <div className="form-group">
                  <label>Greeting Message</label>
                  <input
                    type="text"
                    value={widgetGreeting}
                    onChange={e => setWidgetGreeting(e.target.value)}
                    placeholder="Hi there 👋 How can we help you?"
                  />
                </div>

                {/* Position */}
                <div className="form-group">
                  <label>Widget Position</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {['bottom-right', 'bottom-left'].map(pos => (
                      <div
                        key={pos}
                        onClick={() => setWidgetPosition(pos)}
                        style={{
                          flex: 1, padding: '10px', textAlign: 'center',
                          borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                          border: widgetPosition === pos ? '2px solid #0ea5e9' : '2px solid #e2e8f0',
                          backgroundColor: widgetPosition === pos ? 'rgba(14,165,233,0.05)' : '#f8fafc',
                          transition: 'all 0.15s',
                        }}
                      >
                        {pos === 'bottom-right' ? '↘ Bottom Right' : '↙ Bottom Left'}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview bubble */}
                <div style={{ backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '20px', position: 'relative', minHeight: '80px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>PREVIEW</span>
                  <div style={{
                    position: 'absolute',
                    bottom: '14px',
                    [widgetPosition === 'bottom-right' ? 'right' : 'left']: '14px',
                    width: '44px', height: '44px', borderRadius: '50%',
                    backgroundColor: widgetColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div
                style={{
                  width: '280px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                  alignSelf: 'stretch'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Live Preview</div>

                {/* Received Bubble */}
                <div style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', color: '#334155', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: '13px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '90%' }}>
                  {widgetGreeting || 'Hi there 👋 How can we help you?'}
                </div>

                {/* Sent Bubble */}
                <div style={{ alignSelf: 'flex-end', background: `linear-gradient(90deg, ${widgetColor} 0%, ${widgetColor}dd 100%)`, color: '#ffffff', padding: '10px 14px', borderRadius: '16px 16px 4px 16px', fontSize: '13px', maxWidth: '90%' }}>
                  Yes 😊 Would you like pricing or a demo?
                </div>

                {/* Position Indicator */}
                <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: widgetPosition === 'bottom-left' ? 'flex-start' : 'flex-end' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: widgetColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <MessageSquare size={20} />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit"
              style={{ marginTop: '24px', backgroundColor: widgetSaved ? '#22c55e' : 'var(--text-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'background-color 0.25s' }}
            >
              {widgetSaved ? '✓ Saved!' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* ── TEAM MEMBERS ── no functionality yet */}
        {false && activeSettings === 'team' && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Team Members</h3>
            <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '24px' }}>Manage who has access to your workspace.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {team.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="contact-avatar very-small" style={{ backgroundColor: member.color, color: '#fff', flexShrink: 0 }}>{member.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{member.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{member.email}</div>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', backgroundColor: member.role === 'Admin' ? 'rgba(14,165,233,0.1)' : 'rgba(16,185,129,0.1)', color: member.role === 'Admin' ? '#0ea5e9' : '#059669' }}>
                    {member.role}
                  </span>
                  {member.role !== 'Admin' && (
                    <button onClick={() => removeTeamMember(member.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: '4px', borderRadius: '6px', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e11d48'}
                      onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Mail size={15} color="#0ea5e9" /> Invite a team member
              </div>
              <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{ flex: 1, minWidth: '180px', padding: '10px 13px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none', backgroundColor: '#fff' }}
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ padding: '10px 13px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13.5px', fontFamily: 'inherit', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  <option>Agent</option>
                  <option>Admin</option>
                </select>
                <button
                  type="submit"
                  style={{ padding: '10px 18px', backgroundColor: inviteSent ? '#22c55e' : 'var(--text-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.25s', whiteSpace: 'nowrap' }}
                >
                  {inviteSent ? '✓ Sent!' : 'Send Invite'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

const UsageGauge = ({ label, used, max, color, softColor, icon, isActive }) => {
  const usedValue = Math.max(0, Number(used) || 0);
  const maxValue = Number(max);
  const isUnlimited = max === -1 || max == null || !Number.isFinite(maxValue) || maxValue <= 0;
  const targetPercentage = isUnlimited ? 100 : Math.min((usedValue / maxValue) * 100, 100);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setAnimationProgress(0);
      return undefined;
    }

    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimationProgress(1);
      return undefined;
    }

    setAnimationProgress(0);
    let animationFrame;
    let startTime;
    const duration = 1600;

    const animateGauge = (timestamp) => {
      if (startTime === undefined) startTime = timestamp;
      const elapsed = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 4);
      setAnimationProgress(eased);
      if (elapsed < 1) animationFrame = window.requestAnimationFrame(animateGauge);
    };

    animationFrame = window.requestAnimationFrame(animateGauge);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isActive, targetPercentage, usedValue]);

  const animatedPercentage = targetPercentage * animationProgress;
  const animatedUsedValue = Math.round(usedValue * animationProgress);
  const roundedPercentage = Math.round(animatedPercentage);

  return (
    <article className="flex min-w-0 flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 text-center">
      <div className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: softColor, color }}>
            <span className="material-symbols-outlined text-[19px]">{icon}</span>
          </span>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-slate-500 shadow-sm ring-1 ring-slate-200/70">
          {isUnlimited ? 'Unlimited' : `${roundedPercentage}%`}
        </span>
      </div>

      <div
        className="relative h-[108px] w-[184px] shrink-0"
        role="progressbar"
        aria-label={`${label} usage`}
        aria-valuemin={0}
        aria-valuemax={isUnlimited ? undefined : maxValue}
        aria-valuenow={usedValue}
      >
        <div className="absolute inset-x-0 top-0 h-[92px] overflow-hidden">
          <div
            className="absolute left-0 top-0 h-[184px] w-[184px] rounded-full"
            style={{ borderRadius: '50%', background: `conic-gradient(from 270deg, ${color} 0deg ${animatedPercentage * 1.8}deg, #e7edf4 ${animatedPercentage * 1.8}deg 180deg, transparent 180deg 360deg)` }}
          >
            <div className="absolute left-[22px] top-[22px] h-[140px] w-[140px] rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]" style={{ borderRadius: '50%' }} />
          </div>
        </div>
        <div className="absolute inset-x-0 top-[50px] flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold leading-none text-slate-950">{isUnlimited ? '∞' : `${roundedPercentage}%`}</span>
          <span className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{isUnlimited ? 'limit' : 'used'}</span>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <p className="truncate text-lg font-extrabold tabular-nums text-slate-950">{animatedUsedValue.toLocaleString()}</p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">{isUnlimited ? 'No usage limit' : `of ${maxValue.toLocaleString()}`}</p>
      </div>
    </article>
  );
};

const SubscriptionPanel = ({ isActive = false }) => {
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSubscription();
      setSubData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await apiService.getPlans();
      const formattedPlans = data.map(apiPlan => {
        let color = 'slate';
        if (apiPlan.plan_level === 1) color = 'blue';
        if (apiPlan.plan_level === 2) color = 'emerald';
        if (apiPlan.plan_level >= 3) color = 'purple';

        return {
          name: apiPlan.plan_name,
          price: apiPlan.price_per_month,
          color: color,
          features: [
            `${apiPlan.max_namespaces === -1 ? 'Unlimited' : apiPlan.max_namespaces} Namespaces`,
            `${apiPlan.max_products === -1 ? 'Unlimited' : apiPlan.max_products} Products`,
            `${apiPlan.max_agents === -1 ? 'Unlimited' : apiPlan.max_agents} Agents`,
            `${apiPlan.max_tokens_per_month === -1 ? 'Unlimited Tokens' : (apiPlan.max_tokens_per_month >= 1000000 ? (apiPlan.max_tokens_per_month / 1000000) + 'M Tokens/mo' : (apiPlan.max_tokens_per_month / 1000) + 'K Tokens/mo')}`,
            `${apiPlan.max_storage_bytes === -1 ? 'Unlimited Storage' : (apiPlan.max_storage_bytes >= 1073741824 ? (apiPlan.max_storage_bytes / 1073741824) + ' GB Storage' : (apiPlan.max_storage_bytes / 1048576) + ' MB Storage')}`
          ]
        };
      });
      setPlans(formattedPlans);
    } catch (err) {
      console.error("Failed to fetch plans", err);
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchPlans();
  }, []);

  const handleSubscribe = async (planName) => {
    // If it's a paid plan and we haven't shown the modal yet, show it
    if (planName !== 'FREE' && !showPaymentModal) {
      const plan = plans.find(p => p.name === planName);
      setPendingPlan(plan);
      setShowPaymentModal(true);
      return;
    }

    try {
      setSubmitting(true);
      const subRequest = {
        subscription_type: planName.toUpperCase(),
        num_months: 1
      };
      console.log("Subscribing with:", subRequest);

      await apiService.subscribe(subRequest);
      await fetchSubscription();
      setShowPaymentModal(false);
      setPendingPlan(null);
      const container = document.querySelector('.dashboard-content-wrapper');
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(`Subscription failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };



  if (loading) return <div className="p-8 text-center text-slate-400">Loading subscription details...</div>;

  const currentPlan = subData?.plan || { plan_name: 'NONE' };
  const usage = subData?.usage || { pages_used: 0, agents_used: 0, tokens_used: 0 };

  // Format dates from API response
  const startedAt = subData?.started_at ? new Date(subData.started_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : 'N/A';

  const expiresAt = subData?.expires_at ? new Date(subData.expires_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : 'N/A';

  const pageLimit = currentPlan.max_pages ?? currentPlan.max_connected_pages ?? currentPlan.max_facebook_pages;

  return (
    <div className="dashboard-content-area space-y-8 animate-fade-in-up pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Subscription & Billing</h1>
          <p className="text-slate-500 mt-1">Manage your plan and track your usage limits</p>
        </div>
        {subData?.is_active && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full border border-emerald-100 font-bold text-sm">
            <ShieldCheck size={18} />
            Active Subscription
          </div>
        )}
      </header>

      {/* Current Plan Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
          <div className="w-32 h-32 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 mb-1">Plan</span>
            <span className="text-xl font-black">{currentPlan.plan_name}</span>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Started On</p>
                <p className="text-sm font-bold text-slate-700">{startedAt}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Expires On</p>
                <p className="text-sm font-bold text-slate-700">{expiresAt}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Monthly Cost</p>
                <p className="text-sm font-bold text-slate-700">${currentPlan.price_per_month}/mo</p>
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setShowPlansModal(true)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:scale-105 transition-transform shadow-md"
              >
                Upgrade Plan
              </button>
              <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between overflow-hidden relative group">
          <Zap className="absolute -top-4 -right-4 w-32 h-32 text-white opacity-[0.03] rotate-12 group-hover:scale-110 transition-transform duration-700" />
          <div>
            <h3 className="text-lg font-bold mb-1">Usable Tokens</h3>
            <p className="text-slate-400 text-sm mb-6">Available for AI operations</p>
            <div className="text-4xl font-black">{subData?.usable_token?.toLocaleString() || 0}</div>
          </div>
          <div className="mt-8">
            <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20">Buy More Tokens</button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-7">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Current cycle</p>
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-950"><TrendingUp size={20} className="text-blue-500" />Usage statistics</h2>
          </div>
          <p className="text-xs font-medium text-slate-400">Limits reset with your monthly billing cycle.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UsageGauge label="Pages connected" used={usage.pages_used} max={pageLimit} color="#3b82f6" softColor="#eff6ff" icon="web" isActive={isActive} />
          <UsageGauge label="Agents created" used={usage.agents_used} max={currentPlan.max_agents} color="#10b981" softColor="#ecfdf5" icon="smart_toy" isActive={isActive} />
          <UsageGauge label="Monthly tokens" used={usage.tokens_used} max={currentPlan.max_tokens_per_month} color="#8b5cf6" softColor="#f5f3ff" icon="token" isActive={isActive} />
        </div>
      </div>

      {/* Plan Selection Modal */}
      {showPlansModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl overflow-hidden relative my-8 border border-white/20 animate-fade-in-up">
            <div className="absolute top-6 right-6 z-50">
              <button onClick={() => setShowPlansModal(false)} className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 md:p-16">
              <h2 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-3 mb-4 text-center">
                Upgrade Your Plan
              </h2>
              <p className="text-center text-slate-500 font-medium mb-12 max-w-2xl mx-auto">
                Scale your customer interactions with intelligent AI agents that grow with your business.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {plans.map(plan => {
                  const isCurrent = plan.name === currentPlan.plan_name;
                  const colorClass = plan.color === 'emerald' ? 'border-emerald-500 ring-4 ring-emerald-500/10' :
                    plan.color === 'blue' ? 'border-blue-500 ring-4 ring-blue-500/10' :
                      plan.color === 'purple' ? 'border-purple-500 ring-4 ring-purple-500/10' : 'border-slate-200 hover:border-slate-300';

                  return (
                    <div
                      key={plan.name}
                      className={`bg-slate-50 rounded-[2rem] p-8 border-2 ${isCurrent ? colorClass : 'border-slate-100'} shadow-sm flex flex-col h-full hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group cursor-default`}
                    >
                      {isCurrent && (
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest animate-fade-in">
                          Current Plan
                        </div>
                      )}
                      <div className="mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 group-hover:text-slate-600 transition-colors">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-slate-900 group-hover:scale-110 origin-left transition-transform duration-300">${plan.price}</span>
                          <span className="text-slate-400 text-sm font-medium">/mo</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-4 mb-8">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                            <CheckCircle2 className={`shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-125 ${isCurrent ? 'text-emerald-500' : 'text-slate-300 group-hover:text-emerald-500'}`} size={18} />
                            <span className="font-medium">{feat}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        disabled={isCurrent || submitting}
                        onClick={() => {
                          setShowPlansModal(false);
                          handleSubscribe(plan.name);
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-200 ${isCurrent
                            ? 'bg-slate-200 text-slate-400 cursor-default'
                            : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.05] active:scale-95 shadow-xl shadow-slate-200'
                          }`}
                      >
                        {isCurrent ? 'Active' : submitting ? 'Processing...' : `Select ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mock Payment Modal */}
      {showPaymentModal && pendingPlan && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/20">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                <CreditCard className="text-slate-900" size={24} />
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="px-8 mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-1">Complete Purchase</h2>
              <p className="text-sm text-slate-500 font-medium">You are subscribing to the <span className="text-slate-900 font-bold">{pendingPlan.name}</span> plan.</p>

              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Total due today</p>
                  <p className="text-2xl font-black text-slate-900">${pendingPlan.price}.00</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-0.5">Billing cycle</p>
                  <p className="text-sm font-bold text-slate-700">Monthly</p>
                </div>
              </div>
            </div>

            <div className="px-8 space-y-4 mb-8">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Card details</label>
                <div className="relative">
                  <input type="text" placeholder="4242 4242 4242 4242" readOnly className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-slate-400 transition-colors" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 opacity-50" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 opacity-50" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">Expiry</label>
                  <input type="text" placeholder="MM / YY" readOnly className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-slate-400 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 ml-1">CVC</label>
                  <input type="text" placeholder="•••" readOnly className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-slate-400 transition-colors" />
                </div>
              </div>
            </div>

            <div className="p-8 pt-0">
              <button
                onClick={() => handleSubscribe(pendingPlan.name)}
                disabled={submitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Confirm & Pay ${pendingPlan.price}.00
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-4 font-medium uppercase tracking-widest flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-500" />
                Secure Mock Checkout
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SUPPORT_GUIDES = [
  {
    category: 'Getting started',
    icon: 'link',
    title: 'Connect or reconnect a Facebook Page',
    summary: 'Set up a new Page or restore access after permissions change.',
    answer: 'Open Overview and choose Add Page. Complete Facebook authorization, select the Pages you want LYFFLOW to manage, and return to the dashboard. If a Page was revoked, reconnect it from the same screen.'
  },
  {
    category: 'AI agents',
    icon: 'smart_toy',
    title: 'Create and assign an AI agent',
    summary: 'Configure an agent and connect it to the right business Page.',
    answer: 'Go to Agents, create or select an agent, and configure its role and behavior. Assign it to a Page from Overview so it can respond using that Page’s connected knowledge.'
  },
  {
    category: 'Knowledge',
    icon: 'menu_book',
    title: 'Improve answers with your knowledge base',
    summary: 'Add business information your AI agent can use in replies.',
    answer: 'Open Knowledge, choose the appropriate namespace, then add text, documents, or supported imports. Keep each source focused and up to date so the agent can retrieve accurate answers.'
  },
  {
    category: 'Conversations',
    icon: 'support_agent',
    title: 'Take over a conversation from AI',
    summary: 'Find customers who need help and switch to a human reply.',
    answer: 'Open Conversations and filter by Needs human support. Select the conversation, review the history, and reply directly. You can resume the AI agent when the issue has been resolved.'
  },
  {
    category: 'Billing',
    icon: 'credit_card',
    title: 'Review your plan and subscription',
    summary: 'Check plan details or choose a plan that fits your usage.',
    answer: 'Open Subscription from the dashboard navigation to see your current plan and available options. For a payment-specific question, email support with your account email and avoid sharing complete card details.'
  },
  {
    category: 'Troubleshooting',
    icon: 'sync_problem',
    title: 'Messages or Page data are not updating',
    summary: 'Work through the most common connection checks.',
    answer: 'Confirm that the Page is still connected in Overview and that an agent is assigned. Refresh the dashboard, then reconnect the Page if Facebook permissions changed. If the issue continues, contact support with the Page name and approximate time it began.'
  }
];

const SupportPanel = ({ onNavigate }) => {
  const [supportSearch, setSupportSearch] = useState('');
  const [selectedSupportCategory, setSelectedSupportCategory] = useState('All');
  const [openSupportGuide, setOpenSupportGuide] = useState(null);
  const guidesRef = useRef(null);

  const supportCategories = ['All', ...new Set(SUPPORT_GUIDES.map(guide => guide.category))];
  const normalizedSearch = supportSearch.trim().toLowerCase();
  const filteredSupportGuides = SUPPORT_GUIDES.filter(guide => {
    const matchesCategory = selectedSupportCategory === 'All' || guide.category === selectedSupportCategory;
    const matchesSearch = !normalizedSearch || [guide.title, guide.summary, guide.answer, guide.category]
      .some(value => value.toLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });

  const scrollToGuides = () => {
    const guides = guidesRef.current;
    const scrollContainer = guides?.closest('.dashboard-content-wrapper');
    if (!guides || !scrollContainer) return;

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const guidesTop = guides.getBoundingClientRect().top;
    const targetTop = scrollContainer.scrollTop + guidesTop - containerTop - 24;

    scrollContainer.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth'
    });
  };

  return (
    <div className="dashboard-content-area animate-fade-in-up pb-20">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 md:px-12 md:py-16 text-white shadow-xl shadow-slate-200/70">
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 mb-6">
            <span className="material-symbols-outlined text-[16px]">contact_support</span>
            LYFFLOW Support
          </div>
          <h2 className="text-4xl md:text-5xl font-headline font-black tracking-tighter leading-tight">How can we help?</h2>
          <p className="mt-4 text-sm md:text-base leading-relaxed text-slate-300 font-medium max-w-2xl mx-auto">
            Describe what you are trying to do. Start with a quick answer, then reach our team if you still need a hand.
          </p>

          <div className="relative mt-8 max-w-2xl mx-auto text-left">
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="search"
              value={supportSearch}
              onChange={(event) => setSupportSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && scrollToGuides()}
              placeholder="Try “how do I reconnect my Facebook Page?”"
              aria-label="Search support guides"
              className="w-full box-border rounded-2xl border border-white/10 bg-white py-4 pl-14 pr-12 text-sm font-semibold text-slate-900 outline-none shadow-2xl placeholder:text-slate-400 focus:ring-4 focus:ring-emerald-400/20"
            />
            {supportSearch && (
              <button
                type="button"
                onClick={() => setSupportSearch('')}
                aria-label="Clear support search"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">Tip: include the feature, channel, and outcome you want for better matches.</p>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6" aria-label="Support options">
        <button
          type="button"
          onClick={scrollToGuides}
          className="group text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">library_books</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600 mb-2">Start here</p>
          <h3 className="text-lg font-black text-slate-900">Browse quick answers</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">Follow concise guides for common setup and troubleshooting questions.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-slate-900">View guides <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span></span>
        </button>

        <a
          href="mailto:support@lyfflow.com?subject=LYFFLOW%20support%20request"
          className="group text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">mail</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 mb-2">Personal help</p>
          <h3 className="text-lg font-black text-slate-900">Email our support team</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">Share your issue with our team when the guides do not fully resolve it.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-slate-900">Contact support <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span></span>
        </a>

        <button
          type="button"
          onClick={() => onNavigate?.('subscription')}
          className="group text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-5 group-hover:bg-violet-500 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined">credit_card</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600 mb-2">Plans & billing</p>
          <h3 className="text-lg font-black text-slate-900">Manage your subscription</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">Review your active plan and compare the options available to your workspace.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-slate-900">Open subscription <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span></span>
        </button>
      </section>

      <section ref={guidesRef} className="mt-12 scroll-mt-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-2">Help library</p>
            <h3 className="text-2xl md:text-3xl font-headline font-black tracking-tight text-slate-900">Popular LYFFLOW guides</h3>
            <p className="mt-2 text-sm text-slate-500 font-medium">Practical answers for the tasks people ask about most.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter guides by category">
            {supportCategories.map(category => (
              <button
                type="button"
                key={category}
                onClick={() => setSelectedSupportCategory(category)}
                className={`rounded-full px-3.5 py-2 text-[11px] font-bold transition-colors ${selectedSupportCategory === category
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredSupportGuides.length > 0 ? filteredSupportGuides.map((guide, index) => {
            const guideId = `${guide.category}-${guide.title}`;
            const isOpen = openSupportGuide === guideId;
            return (
              <article key={guideId} className={index > 0 ? 'border-t border-slate-100' : ''}>
                <button
                  type="button"
                  onClick={() => setOpenSupportGuide(isOpen ? null : guideId)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 p-5 md:p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">{guide.icon}</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 mb-1">{guide.category}</span>
                    <span className="block text-sm md:text-base font-black text-slate-900">{guide.title}</span>
                    <span className="hidden md:block mt-1 text-xs text-slate-500 font-medium">{guide.summary}</span>
                  </span>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-6 pl-[76px] md:pl-20 pr-8 text-sm leading-7 text-slate-600 font-medium">
                    {guide.answer}
                  </div>
                )}
              </article>
            );
          }) : (
            <div className="px-6 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
              <h4 className="mt-3 font-black text-slate-900">No matching guide yet</h4>
              <p className="mt-1 text-sm text-slate-500">Try different words or send the question directly to support.</p>
              <button
                type="button"
                onClick={() => { setSupportSearch(''); setSelectedSupportCategory('All'); }}
                className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black text-white hover:bg-slate-700 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] bg-emerald-50 border border-emerald-100 p-6 md:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
        <div className="flex gap-5 max-w-2xl">
          <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-2xl bg-white text-emerald-600 items-center justify-center shadow-sm">
            <span className="material-symbols-outlined">support_agent</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 mb-2">Still need help?</p>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">Tell us what happened.</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 font-medium">Include your workspace email, affected Page, what you expected, and any useful screenshots. Please never send passwords or complete payment-card details.</p>
          </div>
        </div>
        <a
          href="mailto:support@lyfflow.com?subject=LYFFLOW%20support%20request"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 text-sm font-black text-white shadow-lg hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[19px]">mail</span>
          Email support
        </a>
      </section>

      <p className="mt-6 text-center text-xs text-slate-500 font-medium">
        Can’t access your account? Email <a href="mailto:support@lyfflow.com?subject=Cannot%20access%20my%20LYFFLOW%20account" className="font-bold text-slate-900 underline decoration-emerald-400 decoration-2 underline-offset-4">support@lyfflow.com</a> from the address connected to your workspace.
      </p>
    </div>
  );
};

const TutorialPanel = () => {
  return (
    <div className="dashboard-content-area animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '600px' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="material-symbols-outlined text-slate-300 mb-4 inline-block" style={{ fontSize: '72px' }}>school</span>
        <h2 className="text-4xl font-headline font-black tracking-tighter text-slate-900 mb-4">Tutorials</h2>
        <p className="text-slate-500 max-w-md mx-auto text-base">We're putting together comprehensive guides and interactive walkthroughs to help you master LYFFLOW. Check back soon!</p>
        <div className="mt-8">
          <span className="bg-slate-100 text-slate-600 px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase inline-block">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Revoked pages warning (shown after returning from Facebook OAuth)
  const [revokedPagesModal, setRevokedPagesModal] = useState(null); // { pages: string[] }

  // Pre-warning modal (shown before sending user to Facebook OAuth)
  const [preReauthModal, setPreReauthModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchData = useCallback(async () => {
    let isRedirecting = false;
    setLoadError(null);

    try {
      const userData = await apiService.getUserProfile();
      const pagesData = await apiService.getPages();
      let agentsData = { agents: [] };
      try {
        agentsData = await apiService.getAgents();
      } catch (e) {
        console.warn("Could not fetch agents", e);
      }
      
      let namespacesData = { namespaces: [] };
      try {
        namespacesData = await apiService.getNamespaces();
      } catch (e) {
        console.warn("Could not fetch namespaces", e);
      }
      let subscriptionData = null;
      try {
        subscriptionData = await apiService.getSubscription();
      } catch (e) {
        console.warn("Could not fetch subscription", e);
      }

      const parsedUser = userData?.user ? { ...userData.user, ...userData } : (userData || null);
      const parsedPages = Array.isArray(pagesData) ? pagesData : (pagesData?.pages || pagesData?.data || []);
      const parsedAgents = Array.isArray(agentsData) ? agentsData : (agentsData?.agents || agentsData?.data || []);
      const parsedNamespaces = Array.isArray(namespacesData) ? namespacesData : (namespacesData?.namespaces || namespacesData?.data || []);

      if (parsedUser) {
        parsedUser.agents = parsedAgents;
        parsedUser.subscription = subscriptionData;

        if (parsedUser.profile_pic_url || parsedUser.picture || parsedUser.avatar || parsedUser.profile_pic || parsedUser.url) {
          parsedUser.profile_pic_url = parsedUser.profile_pic_url || parsedUser.picture || parsedUser.profile_pic || parsedUser.avatar || parsedUser.url;
        } else {
          // Fallback to the dedicated endpoint
          const uid = parsedUser.id || parsedUser.user_id || parsedUser._id || parsedUser.uuid;
          if (uid) {
            try {
              const picResponse = await fetch(`${API_BASE}/v1/user/profile_pic/${uid}`, { credentials: 'include' });

              if (picResponse.ok) {
                const contentType = picResponse.headers.get('content-type') || '';

                if (contentType.includes('application/json')) {
                  const data = await picResponse.json();
                  parsedUser.profile_pic_url = data.url || data.profile_pic || data.profile_pic_url || data.image_url || null;
                } else if (contentType.includes('image/')) {
                  const blob = await picResponse.blob();
                  if (blob.size > 0) {
                    parsedUser.profile_pic_url = URL.createObjectURL(blob);
                  }
                } else {
                  const text = await picResponse.text();
                  // If it's a raw string URL
                  if (text.startsWith('http')) {
                    parsedUser.profile_pic_url = text;
                  } else {
                    try {
                      const parsed = JSON.parse(text);
                      parsedUser.profile_pic_url = parsed.url || parsed.profile_pic || parsed.profile_pic_url || parsed.image_url || null;
                    } catch (e) {
                      // Just fallback to the URL directly and hope the browser can figure it out
                      parsedUser.profile_pic_url = `${API_BASE}/v1/user/profile_pic/${uid}`;
                    }
                  }
                }
              }
            } catch (e) {
              console.warn("Failed to fetch profile pic via dedicated endpoint:", e);
            }
          }
        }
      }
      setUser(parsedUser);
      setPages(parsedPages);
      setNamespaces(parsedNamespaces);

      // Check subscription via API — if user has no active plan, send them
      // to the plan-selection screen so they can pick one before using the dashboard.
      if (!subscriptionData || !subscriptionData.is_active) {
        isRedirecting = true;
        navigate('/get-started?step=pricing', { replace: true });
        return;
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      if (err.status === 401) {
        isRedirecting = true;
        navigate('/get-started', { replace: true });
        return;
      }

      setLoadError('We could not load your workspace. Please try again.');
    } finally {
      if (!isRedirecting) {
        setLoading(false);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Parse reauth URL params on mount and clean up URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reauth = params.get('reauth');
    const reason = params.get('reason');
    const pagesParam = params.get('pages');

    console.log('[Reauth Debug] location.search:', location.search);
    console.log('[Reauth Debug] reauth:', reauth, '| reason:', reason, '| pages:', pagesParam);

    if ((reauth === 'error' || reauth === 'warning') && reason === 'revoked_pages' && pagesParam) {
      const revokedList = pagesParam.split(',').map(p => p.trim()).filter(Boolean);
      setRevokedPagesModal({ pages: revokedList });
      // Clean up the URL via React Router so it doesn't re-trigger
      navigate(location.pathname, { replace: true });
    } else if (reauth === 'success') {
      navigate(location.pathname, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderContent = () => {
    return (
      <>
        <div style={{ display: activeTab === 'overview' ? 'contents' : 'none' }}>
          <Overview user={user} pages={pages} onNavigate={setActiveTab} onUpdate={fetchData} onAddPage={() => setPreReauthModal(true)} />
        </div>
        <div style={{ display: activeTab === 'records' ? 'contents' : 'none' }}>
          <CustomerRecords pages={pages} />
        </div>
        <div style={{ display: activeTab === 'conversation' ? 'contents' : 'none' }}>
          <ConversationList pages={pages} user={user} />
        </div>
        <div style={{ display: activeTab === 'knowledge' ? 'contents' : 'none' }}>
          <Knowledge namespaces={namespaces} onUpdate={fetchData} />
        </div>
        <div style={{ display: activeTab === 'agent' ? 'contents' : 'none' }}>
          <AgentPanel user={user} pages={pages} namespaces={namespaces} onUpdate={fetchData} onAgentCreated={(newAgent) => setUser(prev => prev ? { ...prev, agents: [...(prev.agents || []), newAgent] } : prev)} onAgentEdited={(id, payload) => setUser(prev => prev ? { ...prev, agents: (prev.agents || []).map(a => a.agent_id === id ? { ...a, ...payload } : a) } : prev)} />
        </div>
        <div style={{ display: activeTab === 'feedback' ? 'contents' : 'none' }}>
          <FeedbackPanel />
        </div>
        <div style={{ display: activeTab === 'settings' ? 'contents' : 'none' }}>
          <SettingsPanel user={user} onUpdate={fetchData} />
        </div>
        <div style={{ display: activeTab === 'subscription' ? 'contents' : 'none' }}>
          <SubscriptionPanel isActive={activeTab === 'subscription'} />
        </div>
        <div style={{ display: activeTab === 'tutorial' ? 'contents' : 'none' }}>
          <TutorialPanel />
        </div>
      </>
    );
  };

  const primaryNavItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'conversation', icon: MessageSquare, label: 'Conversations' },
    { id: 'records', icon: ClipboardList, label: 'Customer Records' },
    { id: 'agent', icon: UserRound, label: 'Agents' },
    { id: 'knowledge', icon: Book, label: 'Knowledge' }
  ];
  const secondaryNavItems = [
    { id: 'subscription', icon: CreditCard, label: 'Subscription' },
    { id: 'feedback', icon: MessageCircleWarning, label: 'Feedback' },
    { id: 'tutorial', icon: Headphones, label: 'Tutorial' }
  ];
  const allNavItems = [...primaryNavItems, ...secondaryNavItems, { id: 'settings', icon: Settings, label: 'Settings' }];
  const activeNavItem = allNavItems.find(item => item.id === activeTab) || primaryNavItems[0];
  const workspaceName = user?.workspace_name || 'My Workspace';
  const displayUserName = user?.display_name || (user?.first_name ? `${user.first_name} ${user?.last_name || ''}`.trim() : null) || user?.username || user?.name || user?.email || 'User';
  const currentPlanName = user?.subscription?.plan?.plan_name || 'Workspace';

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="m-0 text-xl font-bold text-slate-900">Unable to open the dashboard</h1>
          <p className="mt-3 mb-6 text-sm text-slate-600">{loadError}</p>
          <button
            type="button"
            className="rounded-lg border-0 bg-emerald-500 px-5 py-2.5 font-bold text-white cursor-pointer hover:bg-emerald-600"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`dashboard-shell-sidebar flex h-full shrink-0 flex-col font-['Epilogue'] transition-all duration-300
        fixed top-0 left-0 w-[280px] z-[10000] overflow-x-hidden overflow-y-auto
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'md:-translate-x-full md:w-0 md:px-0 md:border-none md:overflow-hidden' : 'md:translate-x-0 md:relative md:w-56 md:px-3 xl:w-64 xl:px-4 md:z-auto md:shadow-none'}`}>
        <div className="flex h-[76px] w-full shrink-0 items-center border-b border-white/8 px-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-300/15">
              <img src={logoImg} alt="" style={{ height: '29px', width: 'auto', filter: 'brightness(0) saturate(100%) invert(73%) sepia(52%) saturate(670%) hue-rotate(103deg) brightness(96%) contrast(92%)' }} />
            </div>
            <div className="min-w-0">
              <img src={titleImg} alt="LYFFLOW" style={{ height: '16px', width: 'auto', filter: 'brightness(0) saturate(100%) invert(80%) sepia(12%) saturate(677%) hue-rotate(181deg) brightness(106%) contrast(94%)' }} />
              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400/80">AI workspace</p>
            </div>
          </div>
          <button className="ml-auto flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-1 py-5">
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Workspace</p>
          <nav className="space-y-1">
          {primaryNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-bold transition-all ${activeTab === item.id
                  ? 'bg-white text-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.2)]'
                  : 'bg-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                }`}
            >
              {activeTab === item.id && <span className="absolute -left-1 h-5 w-1 rounded-r-full bg-emerald-400" />}
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${activeTab === item.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 group-hover:text-slate-300'}`}><item.icon size={17} strokeWidth={2.2} /></span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
          </nav>

          <div className="my-5 h-px bg-white/[0.07]" />
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Manage</p>
          <nav className="space-y-1">
            {secondaryNavItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-bold transition-all ${activeTab === item.id ? 'bg-white text-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.2)]' : 'bg-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'}`}>
                {activeTab === item.id && <span className="absolute -left-1 h-5 w-1 rounded-r-full bg-emerald-400" />}
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${activeTab === item.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 group-hover:text-slate-300'}`}>
                  {item.id === 'tutorial' ? <span className="material-symbols-outlined text-[18px]">school</span> : <item.icon size={17} strokeWidth={2.2} />}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/[0.08] px-1 py-4">
          <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" /><span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">Workspace online</span></div>
            <p className="mt-2 truncate text-[11px] font-medium text-slate-500">{pages.length} pages · {(user?.agents || []).length} agents</p>
          </div>
          <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`group relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.2)]' : 'bg-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'}`}
          >
            {activeTab === 'settings' && <span className="absolute -left-1 h-5 w-1 rounded-r-full bg-emerald-400" />}
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeTab === 'settings' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 group-hover:text-slate-300'}`}><Settings size={17} strokeWidth={2.2} /></span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header className="dashboard-top-navbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpen(true);
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }
              }}
              title="Toggle Sidebar"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <p className="hidden truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 sm:block">{workspaceName}</p>
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-extrabold text-slate-950 sm:text-[15px]">{activeNavItem.label}</h2>
                <span className="hidden h-1.5 w-1.5 rounded-full bg-emerald-400 sm:block" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems ready
            </div>
            <button
              className={`flex h-11 min-w-0 items-center gap-2 rounded-xl border px-2 transition sm:px-3 ${isProfileOpen ? 'border-slate-300 bg-slate-100' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'}`}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
            >
              <div className="contact-avatar very-small overflow-hidden relative ring-2 ring-white shadow-sm" style={{ backgroundColor: '#10b981', color: 'white' }}>
                {user?.profile_pic_url && (
                  <img src={user.profile_pic_url} alt="Profile" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.target.style.display = 'none'} />
                )}
                <span className="relative z-0">
                  {(user?.display_name || user?.first_name || user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                  {user?.last_name ? user.last_name.charAt(0).toUpperCase() : ''}
                  </span>
              </div>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[160px] truncate text-xs font-extrabold text-slate-900">{displayUserName}</span>
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">{currentPlanName}</span>
              </span>
              <ChevronDown size={15} className={`shrink-0 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

        <div className={`dashboard-content-wrapper ${activeTab === 'conversation' ? 'no-scroll' : ''}`}>
          {renderContent()}

          {/* Profile Slideout Drawer */}
          <div className={`profile-drawer ${isProfileOpen ? 'open' : ''}`}>
            <div className="drawer-header">
              <h3>Profile</h3>
            </div>
            <div className="drawer-content">
              <div className="drawer-user-info">
                <div className="contact-avatar large overflow-hidden relative" style={{ backgroundColor: '#0ea5e9', color: 'white', margin: '0 auto 16px auto' }}>
                  {user?.profile_pic_url && (
                    <img src={user.profile_pic_url} alt="Profile" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => e.target.style.display = 'none'} />
                  )}
                  <span className="relative z-0">
                    {(user?.display_name || user?.first_name || user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                    {user?.last_name ? user.last_name.charAt(0).toUpperCase() : ''}
                  </span>
                </div>
                <h4>{user?.display_name || (user?.first_name ? `${user.first_name} ${user?.last_name || ''}`.trim() : null) || user?.username || user?.name || user?.email || 'User'}</h4>
                <p>{user?.email || 'No email provided'}</p>
                {user?.subscription?.plan?.plan_name && (
                  <div className="mt-3 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm">
                    {user.subscription.plan.plan_name} Plan
                  </div>
                )}
              </div>

              <div className="drawer-menu">
                <button className="drawer-menu-item" onClick={() => {
                  setActiveTab('settings');
                  setIsProfileOpen(false);
                }}>
                  <User size={18} /> Account Settings
                </button>
                <button className="drawer-menu-item" onClick={() => {
                  setIsLogoutModalOpen(true);
                  setIsProfileOpen(false);
                }}>
                  <LogOut size={18} /> Log Out
                </button>
              </div>
            </div>
          </div>

          {/* ── Revoked Pages Warning Modal (post-reauth) ── */}
          {revokedPagesModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-6 py-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-amber-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 font-['Epilogue']">Pages Disconnected</h3>
                    <p className="text-xs font-semibold text-amber-600 mt-0.5">Action required to keep your AI agents running</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    During your Facebook re-authorization, you removed access to the following page{revokedPagesModal.pages.length > 1 ? 's' : ''}:
                  </p>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 space-y-2">
                    {revokedPagesModal.pages.map((page, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-red-500 text-[16px]">link_off</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{page}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 shrink-0">info</span>
                    <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                      If you do not grant access to these pages, the AI agent will no longer work for them. They will be deactivated and disappear from your dashboard.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={() => setRevokedPagesModal(null)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                  >
                    Back to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setRevokedPagesModal(null);
                      triggerFacebookReauth();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>refresh</span>
                    Re-authorize Pages
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Pre-Reauth Warning Modal (before going to Facebook) ── */}
          {preReauthModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 font-['Epilogue']">Before Continuing</h3>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">Keep your existing pages checked</p>
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    You're about to connect a new Facebook page. During the process, Facebook will show all your pages — <strong>make sure your currently connected pages stay checked:</strong>
                  </p>

                  {pages && pages.length > 0 ? (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 space-y-2">
                      {pages.map((page, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-emerald-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          </div>
                          <span className="text-sm font-bold text-slate-800">{page.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5 text-sm text-slate-500 italic">No currently connected pages.</div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5 shrink-0">Warning</span>
                    <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                      Unchecking them will disconnect them from LYFFLOW and stop their AI agents.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                  <button
                    onClick={() => setPreReauthModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setPreReauthModal(false);
                      triggerFacebookReauth();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>open_in_new</span>
                    Continue to Facebook
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Logout Modal */}
          {isLogoutModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up border border-slate-100 p-6 m-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-red-500 text-2xl">logout</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-headline font-bold text-slate-900">Log Out</h3>
                    <p className="text-sm text-slate-500 font-medium">Are you sure you want to exit your workspace?</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setIsLogoutModalOpen(false)}
                    disabled={isLoggingOut}
                    className="flex-1 py-3 px-4 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsLoggingOut(true);
                      await apiService.logout().catch(() => { });
                      window.location.href = '/login';
                    }}
                    disabled={isLoggingOut}
                    className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
