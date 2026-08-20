import React, { useState, useEffect, useRef } from 'react';
import './ProductShowcase.css';
import logoImg  from '../assets/logo1.webp';
import titleImg from '../assets/title.webp';

/* ── DATA ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    id: 'conversations',
    tabIcon: 'chat_bubble',
    tabLabel: 'Unified Inbox',
    activeNav: 'Conversations',
    color: '#0ea5e9',
    description: 'Every DM from Facebook, Instagram & WhatsApp in one intelligent inbox — with full context, no tab-switching.',
  },
  {
    id: 'agents',
    tabIcon: 'smart_toy',
    tabLabel: 'AI Agents',
    activeNav: 'Agents',
    color: '#10b981',
    description: 'Deploy trained agents that handle queries, qualify leads, and escalate when needed — fully autonomously.',
  },
  {
    id: 'knowledge',
    tabIcon: 'menu_book',
    tabLabel: 'Knowledge Base',
    activeNav: 'Knowledge',
    color: '#6366f1',
    description: 'Upload documents or paste text, and your agents instantly know everything about your business.',
  },
  {
    id: 'overview',
    tabIcon: 'grid_view',
    tabLabel: 'Live Overview',
    activeNav: 'Overview',
    color: '#f59e0b',
    description: 'Monitor all connected pages, assigned agents and pipeline health from one command center.',
  },
];

const SIDEBAR_ITEMS = [
  { icon: 'dashboard',     label: 'Overview' },
  { icon: 'chat',          label: 'Conversations' },
  { icon: 'menu_book',     label: 'Knowledge' },
  { icon: 'smart_toy',     label: 'Agents' },
  { icon: 'feedback',      label: 'Feedback' },
  { icon: 'school',        label: 'Tutorial' },
];

const CONTACTS = [
  { name: 'Meharaz Hossain', preview: 'How can I assist you further?',  time: '2:08 AM', active: true  },
  { name: 'Facebook User',   preview: 'No messages yet',                time: '2:08 AM', active: false },
  { name: 'Mehedi Rifat',    preview: 'This is a test message',         time: '2:08 AM', active: false },
  { name: 'Rimi Islam',      preview: 'Oi',                             time: '2:08 AM', active: false },
];

const MESSAGES = [
  { side: 'bot',    text: 'Hi! How can I help you today?',                                                                                          delay: 150  },
  { side: 'user',   text: 'Can you describe the leaf logo?',                                                                                         delay: 550  },
  { side: 'bot',    text: 'The Monstera leaf represents growth and organic connectivity — perfect for a platform that scales with you.',              delay: 1050 },
  { side: 'typing',                                                                                                                                   delay: 1650 },
];

const AGENTS = [
  { name: 'James', role: 'Support Agent', chats: 12, status: 'active' },
  { name: 'Sarah', role: 'Sales Agent',   chats: 8,  status: 'active' },
  { name: 'Test',  role: 'QA Agent',      chats: 3,  status: 'idle'   },
];

const KB_ITEMS = [
  { icon: 'picture_as_pdf', name: 'Brand Guidelines.pdf', meta: 'File · 2.4 MB',  color: '#ef4444', type: 'file' },
  { icon: 'text_snippet',   name: 'FAQ – General',        meta: 'Text · 1.2 KB',  color: '#6366f1', type: 'text' },
  { icon: 'description',    name: 'Product Catalog.docx', meta: 'File · 856 KB',  color: '#0ea5e9', type: 'file' },
  { icon: 'text_snippet',   name: 'Pricing Policy',       meta: 'Text · 640 B',   color: '#6366f1', type: 'text' },
];

const PAGES = [
  { name: 'QChat',   icon: 'movie',       agent: 'James', progress: 75, color: '#10b981' },
  { name: 'ZipClip', icon: 'chat_bubble', agent: 'Sarah', progress: 50, color: '#0f172a' },
];

const GREEN_FILTER = 'brightness(0) saturate(100%) invert(59%) sepia(72%) saturate(450%) hue-rotate(100deg) brightness(95%) contrast(90%)';

/* ── MOCK SIDEBAR ──────────────────────────────────────────── */
function MockSidebar({ activeNav }) {
  return (
    <div className="mock-sidebar">
      <div className="mock-logo">
        <img src={logoImg}  alt="LYFFLOW" style={{ height: 26, width: 'auto', filter: 'brightness(0) saturate(100%) invert(59%) sepia(72%) saturate(450%) hue-rotate(100deg) brightness(95%) contrast(90%)' }} />
        <img src={titleImg} alt="LYFFLOW" style={{ height: 14, width: 'auto', filter: 'brightness(0) saturate(100%) invert(59%) sepia(72%) saturate(450%) hue-rotate(100deg) brightness(95%) contrast(90%)' }} />
      </div>
      <div className="mock-new-agent-btn">
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#38bdf8' }}>add</span>
        New Agent
      </div>
      {SIDEBAR_ITEMS.map(item => (
        <div key={item.label} className={`mock-nav-item ${item.label === activeNav ? 'active' : ''}`}>
          <span className="material-symbols-outlined">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
      <div className="mock-sidebar-bottom">
        <div className="mock-nav-item">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Support</span>
        </div>
        <div className="mock-nav-item">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </div>
      </div>
    </div>
  );
}

/* ── CONVERSATIONS DEMO ────────────────────────────────────── */
function ConversationsDemo() {
  return (
    <div className="demo-conversations">
      {/* Contact list */}
      <div className="conv-contact-list">
        <div className="conv-header">
          <div className="conv-title">Messages</div>
          <div className="conv-search">
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#94a3b8' }}>search</span>
            <span>Search conversations...</span>
          </div>
        </div>
        {CONTACTS.map((c, i) => (
          <div key={i} className={`conv-contact conv-contact-anim-${i} ${c.active ? 'active' : ''}`}>
            <div className="conv-avatar" style={{ background: c.active ? '#0ea5e9' : '#e2e8f0', color: c.active ? 'white' : '#475569' }}>
              {c.name[0]}
            </div>
            <div className="conv-info">
              <div className="conv-name-row">
                <span className="conv-name">{c.name}</span>
                <span className="conv-time">{c.time}</span>
              </div>
              <div className="conv-preview">{c.preview}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chat pane */}
      <div className="conv-chat-pane">
        <div className="chat-header">
          <div className="chat-avatar" style={{ background: '#0ea5e9' }}>M</div>
          <div>
            <div className="chat-name">Meharaz Hossain</div>
            <div className="chat-status">● Active now</div>
          </div>
        </div>
        <div className="chat-messages">
          {MESSAGES.map((m, i) =>
            m.side === 'typing' ? (
              <div key={i} className={`chat-msg bot msg-anim-${i}`} style={{ animationDelay: `${m.delay}ms` }}>
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            ) : (
              <div key={i} className={`chat-msg ${m.side} msg-anim-${i}`} style={{ animationDelay: `${m.delay}ms` }}>
                {m.text}
              </div>
            )
          )}
        </div>
        <div className="chat-input-bar">
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>attach_file</span>
          <span style={{ flex: 1, fontSize: 11, color: '#94a3b8' }}>Type your message...</span>
          <div className="chat-send-btn">
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'white' }}>send</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AGENTS DEMO ───────────────────────────────────────────── */
function AgentsDemo() {
  return (
    <div className="demo-agents">
      <div className="agents-header">
        <div>
          <div className="demo-section-label">Fleet Management</div>
          <div className="demo-section-title">AI Agents</div>
          <div className="demo-section-sub">Deploy and scale your autonomous fleet.</div>
        </div>
        <div className="agents-cta-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
          Create Agent
        </div>
      </div>
      <div className="agents-grid">
        {/* Create card */}
        <div className="agent-card create-card agent-card-anim-0">
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#10b981' }}>add_circle</span>
          <div style={{ color: 'white', fontWeight: 700, fontSize: 11, marginTop: 6 }}>New Intelligence</div>
          <div style={{ color: '#475569', fontSize: 10, marginTop: 2 }}>Deploy a custom trained model</div>
        </div>
        {AGENTS.map((a, i) => (
          <div key={i} className={`agent-card agent-card-anim-${i + 1}`}>
            <div className="agent-card-top">
              <div className="agent-avatar">{a.name[0]}</div>
              <div className={`agent-status-dot ${a.status}`} />
            </div>
            <div className="agent-name">{a.name}</div>
            <div className="agent-role">{a.role}</div>
            <div className="agent-metric">
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#10b981' }}>chat_bubble</span>
              <span>{a.chats} active chats</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── KNOWLEDGE DEMO ────────────────────────────────────────── */
function KnowledgeDemo() {
  return (
    <div className="demo-knowledge">
      <div className="knowledge-header">
        <div>
          <div className="demo-section-label">Agent Memory</div>
          <div className="demo-section-title">Knowledge Base</div>
        </div>
        <div className="knowledge-cta-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
          Add Knowledge
        </div>
      </div>
      <div className="knowledge-search-bar">
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8' }}>search</span>
        <span className="knowledge-search-text">brand guidelines</span>
        <span className="knowledge-cursor">|</span>
      </div>
      <div className="knowledge-list">
        {KB_ITEMS.map((item, i) => (
          <div key={i} className={`knowledge-item knowledge-item-anim-${i}`}>
            <div className="knowledge-icon" style={{ background: `${item.color}20` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: item.color }}>{item.icon}</span>
            </div>
            <div className="knowledge-info">
              <div className="knowledge-name">{item.name}</div>
              <div className="knowledge-meta">{item.meta}</div>
            </div>
            <div className="knowledge-actions">
              {item.type === 'text' && (
                <>
                  <button className="knowledge-action-btn">View</button>
                  <button className="knowledge-action-btn">Edit</button>
                </>
              )}
              <button className="knowledge-action-btn danger">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── OVERVIEW DEMO ─────────────────────────────────────────── */
function OverviewDemo() {
  return (
    <div className="demo-overview">
      <div className="overview-header">
        <div>
          <div className="demo-section-label">Active Workspace</div>
          <div className="demo-section-title">My Workspace</div>
        </div>
        <div className="overview-avatars">
          {[['M', '#0ea5e9'], ['F', '#6366f1'], ['S', '#10b981']].map(([l, c], i) => (
            <div key={i} className="overview-avatar" style={{ background: c }}>{l}</div>
          ))}
          <div className="overview-avatar" style={{ background: '#e2e8f0', color: '#64748b', fontSize: 9 }}>+4</div>
        </div>
      </div>
      <div className="overview-grid">
        {PAGES.map((p, i) => (
          <div key={i} className={`overview-page-card overview-card-anim-${i}`}>
            <div className="page-card-top">
              <div className="page-icon" style={{ background: `${p.color}22` }}>
                <span className="material-symbols-outlined" style={{ color: p.color, fontSize: 20 }}>{p.icon}</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#cbd5e1' }}>more_vert</span>
            </div>
            <div className="page-name">{p.name}</div>
            <div className="page-desc">Automated agent assignments and settings for this workspace.</div>
            <div className="page-agent-row">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: p.color }}>person</span>
              <span className="page-agent-label">ASSIGNED AGENT</span>
              <div className="page-agent-select">
                {p.agent}
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>expand_more</span>
              </div>
            </div>
            <div className="page-progress-track">
              <div
                className={`page-progress-bar page-progress-anim-${i}`}
                style={{ background: p.color }}
              />
            </div>
            <div className="page-progress-label">{p.progress}%</div>
          </div>
        ))}
        {/* Add page */}
        <div className="overview-page-card add-card overview-card-anim-2">
          <div className="add-card-inner">
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#cbd5e1' }}>add</span>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginTop: 6 }}>Add New Page</div>
            <div style={{ color: '#cbd5e1', fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Project Canvas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ────────────────────────────────────────── */
export default function ProductShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [animKey, setAnimKey]     = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % FEATURES.length);
      setAnimKey(k => k + 1);
    }, 5000);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const selectTab = (idx) => {
    setActiveIdx(idx);
    setAnimKey(k => k + 1);
    startTimer(); // restart timer on manual click
  };

  const feature = FEATURES[activeIdx];

  const renderDemo = () => {
    switch (feature.id) {
      case 'conversations': return <ConversationsDemo key={animKey} />;
      case 'agents':        return <AgentsDemo        key={animKey} />;
      case 'knowledge':     return <KnowledgeDemo     key={animKey} />;
      case 'overview':      return <OverviewDemo      key={animKey} />;
      default:              return null;
    }
  };

  return (
    <section className="product-showcase-section">
      <div className="product-showcase-inner">

        {/* Header */}
        <div className="showcase-header">
          <label className="showcase-eyebrow">Live Product Tour</label>
          <h2 className="showcase-headline">See the dashboard in action.</h2>
          <p className="showcase-sub">
            Every feature you need — powerful automation and analytics, laid out in a premium, intuitive interface.
          </p>
        </div>

        {/* Body */}
        <div className="showcase-body">

          {/* Feature Tabs */}
          <div className="showcase-tabs">
            {FEATURES.map((f, i) => (
              <button
                key={f.id}
                className={`showcase-tab ${activeIdx === i ? 'active' : ''}`}
                style={{ '--tab-color': f.color }}
                onClick={() => selectTab(i)}
              >
                <div
                  className="tab-icon-wrap"
                  style={{ background: activeIdx === i ? `${f.color}22` : '#1a2336' }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 20, color: activeIdx === i ? f.color : '#475569' }}
                  >
                    {f.tabIcon}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tab-label" style={{ color: activeIdx === i ? f.color : '#94a3b8' }}>
                    {f.tabLabel}
                  </div>
                  <div className="tab-desc">{f.description}</div>
                </div>
                {/* Progress bar restarts via key */}
                {activeIdx === i && (
                  <div
                    key={`prog-${animKey}`}
                    className="tab-progress-bar"
                    style={{ background: f.color }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Dashboard Mockup */}
          <div className="showcase-mockup">
            {/* Browser chrome */}
            <div className="browser-chrome">
              <div className="browser-dots">
                <span style={{ background: '#ef4444' }} />
                <span style={{ background: '#f59e0b' }} />
                <span style={{ background: '#22c55e' }} />
              </div>
              <div className="browser-url">lyfflow.com/app/dashboard</div>
            </div>

            {/* Dashboard UI */}
            <div className="mock-dashboard">
              <MockSidebar activeNav={feature.activeNav} />
              <div className="mock-content-area">
                {renderDemo()}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
