import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';
import CheckpointerDebugModal from '../components/CheckpointerDebugModal';
import './AdminPanel.css';

// ── Helpers ──────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();
const initials = (str) => (str || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function CountUp({ end, duration = 1500, prefix = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const target = Number(end) || 0;
    if (target === 0) { setCount(0); return; }
    const step = (target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span>{prefix}{fmt(count)}</span>;
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`admin-stat-card colored ${color || 'slate'}`}>
      <div className="admin-stat-card-header">
        <span className="material-symbols-outlined stat-icon">{icon}</span>
        <span className="admin-stat-card-label">{label}</span>
      </div>
      <div className="admin-stat-card-value">
        <CountUp end={value} />
      </div>
    </div>
  );
}

function LoadingState() {
  return <div className="admin-loading"><div className="admin-spinner" /><span>Loading…</span></div>;
}

function EmptyState({ icon = 'inbox', text = 'No data found' }) {
  return <div className="admin-empty"><span className="material-symbols-outlined">{icon}</span>{text}</div>;
}

function Badge({ type }) {
  const map = {
    active: ['badge-green', 'check_circle'],
    suspended: ['badge-red', 'block'],
    inactive: ['badge-slate', 'radio_button_unchecked'],
    paid: ['badge-green', 'check_circle'],
    failed: ['badge-red', 'cancel'],
  };
  const [cls, icon] = map[type?.toLowerCase()] || ['badge-slate', 'help'];
  return <span className={`badge ${cls}`}><span className="material-symbols-outlined" style={{ fontSize: 11 }}>{icon}</span>{type}</span>;
}

// ── Dashboard Section ──────────────────────────────────
function DashboardSection() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.adminDashboard().then(r => setStats(r?.data || r)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!stats) return <EmptyState text="Could not load dashboard stats." />;

  const cards = [
    { label: 'Total Users', value: stats.total_users, icon: 'group', color: 'indigo' },
    { label: 'Active Users', value: stats.active_users, icon: 'person_check', color: 'green' },
    { label: 'Suspended', value: stats.suspended_users, icon: 'person_off', color: 'red' },
    { label: 'Subscriptions', value: stats.total_subscriptions, icon: 'subscriptions', color: 'blue' },
    { label: 'Active Subs', value: stats.active_subscriptions, icon: 'verified', color: 'emerald' },
    { label: 'AI Agents', value: stats.total_agents, icon: 'smart_toy', color: 'purple' },
    { label: 'Pages', value: stats.total_pages, icon: 'pages', color: 'cyan' },
    { label: 'Conversations', value: stats.total_conversations, icon: 'chat', color: 'sky' },
    { label: 'Messages', value: stats.total_messages, icon: 'message', color: 'violet' },
    { label: 'Feedbacks', value: stats.total_feedbacks, icon: 'feedback', color: 'amber' },
    { label: 'Leads', value: stats.total_leads, icon: 'contacts', color: 'rose' },
    { label: 'Tokens Used', value: stats.total_tokens_used, icon: 'data_usage', color: 'slate' },
  ];

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Overview</div>
        <div className="admin-section-title">Dashboard</div>
      </div>
      <div className="admin-stats-grid">
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>
      {stats.total_revenue !== undefined && (
        <div className="admin-stat-card colored emerald" style={{ marginTop: 24 }}>
          <div className="admin-stat-card-header">
            <span className="material-symbols-outlined stat-icon">payments</span>
            <span className="admin-stat-card-label">Total Revenue</span>
          </div>
          <div className="admin-stat-card-value" style={{ fontSize: 42 }}>
            <CountUp end={stats.total_revenue} prefix="$" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Detail Profile Modal ──────────────────────────
function UserDetailModal({ userId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    apiService.adminGetUser(userId)
      .then(r => setDetail(r?.data || r))
      .catch(e => setError(e.message || 'Failed to load detailed user profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justify: 'center', zIndex: 3000
      }}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
        style={{
          margin: 'auto', backgroundColor: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 850,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#3b82f6' }}>manage_accounts</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Detailed User Profile</h3>
              <div style={{ fontSize: 12, color: '#64748b' }}>ID: {userId}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 28, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><LoadingState /></div>
          ) : error ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : detail ? (
            <>
              {/* Profile Summary Card */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
                padding: 20, backgroundColor: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="admin-avatar" style={{ width: 56, height: 56, fontSize: 20, position: 'relative', overflow: 'hidden' }}>
                    {detail.profile_pic_url ? (
                      <img src={detail.profile_pic_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, borderRadius: '50%' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : null}
                    {initials(detail.display_name || detail.email || 'U')}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                      {detail.display_name || `${detail.first_name || ''} ${detail.last_name || ''}`.trim() || 'No Name'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{detail.email}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Joined: {fmtDate(detail.join_at || detail.created_at)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <Badge type={detail.status} />
                  {detail.has_used_free_plan !== undefined && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 600 }}>
                      {detail.has_used_free_plan ? 'Used Free Plan' : 'Never Used Free Plan'}
                    </span>
                  )}
                </div>
              </div>

              {/* Subscription Card */}
              {detail.subscription && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3b82f6' }}>card_membership</span>
                    Active Subscription Detail
                  </h4>
                  <div style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', display: 'grid', gap: 12,
                    padding: 18, backgroundColor: '#f1f5f9', borderRadius: 16, border: '1px solid #cbd5e1'
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Plan Name</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{detail.subscription.plan_name || 'Free'} (${detail.subscription.price_per_month || 0}/mo)</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
                      <div style={{ marginTop: 2 }}><Badge type={detail.subscription.is_active ? 'active' : 'inactive'} /></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tokens Used</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                        {Number(detail.subscription.tokens_used || 0).toLocaleString()} / {Number(detail.subscription.max_tokens_per_month || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Storage & Agents</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
                        Agents: {detail.subscription.agent_created || 0} created ({detail.subscription.agent_assigned || 0} assigned)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pages Grid */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#06b6d4' }}>pages</span>
                  Connected Pages ({detail.page_count ?? (detail.pages?.length || 0)})
                </h4>
                {(!detail.pages || detail.pages.length === 0) ? (
                  <div style={{ padding: 20, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 12, color: '#94a3b8', fontSize: 13 }}>
                    No connected pages found for this user.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {detail.pages.map((page, idx) => (
                      <div key={page.page_id || idx} style={{ padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{page.page_name || 'Unnamed Page'}</span>
                          <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, backgroundColor: page.is_synced ? '#dcfce7' : '#f1f5f9', color: page.is_synced ? '#166534' : '#64748b', fontWeight: 600 }}>
                            {page.is_synced ? 'Synced' : 'Not Synced'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Category: {page.page_category || 'General'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Fans: {(page.page_fan_count || 0).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agents Grid */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#a855f7' }}>smart_toy</span>
                  AI Agents ({detail.agent_count ?? (detail.agents?.length || 0)})
                </h4>
                {(!detail.agents || detail.agents.length === 0) ? (
                  <div style={{ padding: 20, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 12, color: '#94a3b8', fontSize: 13 }}>
                    No AI agents created by this user yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {detail.agents.map((ag, idx) => (
                      <div key={ag.agent_id || idx} style={{ padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>{ag.agent_name || 'AI Assistant'}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Role: {ag.agent_role || 'General'} | Tone: {ag.agent_tone || 'Friendly'}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Dialogs: {ag.total_dialog || 0} (Success: {ag.success_rate || 0}%)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Activity Detail Modal ──────────────────────────────
function ActivityDetailModal({ activityId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activityId) return;
    setLoading(true);
    setError(null);
    apiService.adminGetActivity(activityId)
      .then(res => setDetail(res?.data || res))
      .catch(e => setError('Failed to load activity details: ' + (e.message || 'Error')))
      .finally(() => setLoading(false));
  }, [activityId]);

  if (!activityId) return null;

  const st = (detail?.status || '').toLowerCase();
  const isSuccess = st === 'success' || st === 'ok' || st === 'completed';
  const isErr = st === 'error' || st === 'failed';
  const badgeColor = isSuccess ? 'badge-green' : isErr ? 'badge-red' : 'badge-blue';

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justify: 'center', zIndex: 3000
      }}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
        style={{
          margin: 'auto', backgroundColor: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 880, maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid #f1f5f9', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#6366f1' }}>terminal</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Execution Trace Details</h3>
              <div style={{ fontSize: 12, color: '#64748b' }}>Run ID: {activityId}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 28, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><LoadingState /></div>
          ) : error ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>{error}</div>
          ) : detail ? (
            <>
              {/* Summary Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${badgeColor}`} style={{ fontSize: 13, padding: '4px 10px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isSuccess ? 'check_circle' : isErr ? 'error' : 'pending'}</span>
                      {detail.status || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Model</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{detail.model_name || '—'}</div>
                </div>
                <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Response Time</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 6 }}>{fmt(detail.response_time_ms || 0)} ms</div>
                </div>
                <div style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Execution Cost</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981', marginTop: 6 }}>${fmt(detail.token_cost || 0)}</div>
                </div>
              </div>

              {/* Tokens Breakdown Card */}
              <div style={{ padding: 20, backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6366f1' }}>memory</span>
                  Token Consumption Breakdown
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Input Tokens</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginTop: 4 }}>{fmt(detail.input_tokens || 0)}</div>
                  </div>
                  <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Output Tokens</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginTop: 4 }}>{fmt(detail.output_tokens || 0)}</div>
                  </div>
                  <div style={{ padding: 12, backgroundColor: '#eff6ff', borderRadius: 10, border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>Total Tokens</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1e40af', marginTop: 4 }}>{fmt((detail.input_tokens || 0) + (detail.output_tokens || 0))}</div>
                  </div>
                </div>
              </div>

              {/* Trace Identifiers Card */}
              <div style={{ padding: 20, backgroundColor: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#475569' }}>link</span>
                  System Identifiers & Metadata
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 12 }}>
                  <div><strong style={{ color: '#475569' }}>User:</strong> {detail.user_display_name || detail.user_id || '—'}</div>
                  <div><strong style={{ color: '#475569' }}>Agent:</strong> {detail.agent_name || detail.agent_id || '—'}</div>
                  <div><strong style={{ color: '#475569' }}>Conversation ID:</strong> <span style={{ fontFamily: 'monospace' }}>{detail.conversation_id || '—'}</span></div>
                  <div><strong style={{ color: '#475569' }}>Trigger Msg ID:</strong> <span style={{ fontFamily: 'monospace' }}>{detail.trigger_message_id || '—'}</span></div>
                  <div><strong style={{ color: '#475569' }}>Response Msg ID:</strong> <span style={{ fontFamily: 'monospace' }}>{detail.response_message_id || '—'}</span></div>
                  <div><strong style={{ color: '#475569' }}>Executed At:</strong> {fmtDate(detail.created_at)}</div>
                </div>
              </div>

              {/* Query & Response Blocks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 18, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#3b82f6' }}>input</span>
                    User Query
                  </div>
                  <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 10, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', color: '#1e293b' }}>
                    {detail.user_query || '—'}
                  </div>
                </div>

                <div style={{ padding: 18, backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981' }}>output</span>
                    Agent Response
                  </div>
                  <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 10, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', color: '#1e293b', borderLeft: '4px solid #10b981' }}>
                    {detail.agent_response || '—'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#64748b' }}>No details found.</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Users Section ──────────────────────────────────────
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminUsers({ search, status: statusFilter, cursor: cur, page_size: 20 })
      .then(r => {
        // Response: { users: [...], pagination: { next_cursor, has_more, total } }
        const list = r?.users || r?.data?.users || r?.data || [];
        setUsers(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || r?.next_cursor || null);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { setCursor(null); load(null); }, [search, statusFilter]);

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    setTogglingId(user.user_id || user.id);
    try {
      const resp = await apiService.adminChangeUserStatus(user.user_id || user.id, newStatus);
      const updatedStatus = resp?.new_status || newStatus;
      setUsers(prev => prev.map(u => (u.user_id || u.id) === (user.user_id || user.id) ? { ...u, status: updatedStatus } : u));
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setTogglingId(null); }
  };

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Management</div>
        <div className="admin-section-title">Users</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Users</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="admin-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        {loading ? <LoadingState /> : users.length === 0 ? <EmptyState icon="group" text="No users found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>User</th><th>Email</th><th>Plan</th><th>Status</th><th>Joined</th><th>Action</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id || u.user_id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="admin-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
                        {u.profile_pic_url ? (
                          <img src={u.profile_pic_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, borderRadius: '50%' }} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : null}
                        {initials(u.display_name || u.email)}
                      </div>
                      <div>
                        <div className="font-bold">{u.display_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}</div>
                        {(u.first_name || u.last_name) && u.display_name && <div className="text-muted">{`${u.first_name || ''} ${u.last_name || ''}`.trim()}</div>}
                      </div>
                    </div></td>
                    <td>{u.email || '—'}</td>
                    <td><span className={`badge ${u.is_subscription_active ? 'badge-blue' : 'badge-slate'}`}>{u.plan_name || 'Free'}</span></td>
                    <td><Badge type={u.status} /></td>
                    <td className="text-muted">{fmtDate(u.join_at || u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="btn-action"
                          style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                          onClick={() => setSelectedUserId(u.id || u.user_id)}
                          title="View Detailed Profile"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>visibility</span>
                          Details
                        </button>
                        <button
                          className={`btn-action ${u.status === 'active' ? 'btn-action-danger' : 'btn-action-success'}`}
                          onClick={() => toggleStatus(u)}
                          disabled={togglingId === (u.user_id || u.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{u.status === 'active' ? 'block' : 'check_circle'}</span>
                          {togglingId === (u.user_id || u.id) ? '…' : u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
      {selectedUserId && <UserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
}

// ── Generic List Section ───────────────────────────────
function GenericListSection({ title, label, icon, fetcher, columns }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);

  const load = useCallback((cur = null) => {
    setLoading(true);
    fetcher({ cursor: cur, page_size: 20 })
      .then(r => {
        const data = r?.data || r;
        setItems(Array.isArray(data) ? data : (data?.items || data?.results || []));
        setNextCursor(r?.next_cursor || null);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [fetcher]);

  useEffect(() => { load(null); }, [load]);

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">{label}</div>
        <div className="admin-section-title">{title}</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">{title}</span>
        </div>
        {loading ? <LoadingState /> : items.length === 0 ? <EmptyState icon={icon} text={`No ${title.toLowerCase()} found.`} /> : (
          <table className="admin-table">
            <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id || item.agent_id || item.page_id || item.conversation_id || i}>
                  {columns.map(c => <td key={c.key}>{c.render ? c.render(item) : (item[c.key] ?? '—')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Revenue Section ────────────────────────────────────
function RevenueSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.adminRevenue().then(r => setData(r?.data || r)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <EmptyState text="Could not load revenue data." />;

  const plans = data.plan_distribution || [];
  const totalActive = data.total_active_subscriptions || plans.reduce((s, p) => s + (p.active_count || 0), 0) || 1;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Financials</div>
        <div className="admin-section-title">Revenue</div>
      </div>
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
        <StatCard label="Monthly Recurring (MRR)" value={`$${fmt(data.total_mrr)}`} icon="payments" color="green" />
        <StatCard label="Active Subscriptions" value={data.total_active_subscriptions} icon="verified" color="blue" />
        <StatCard label="Expired Subscriptions" value={data.total_expired_subscriptions} icon="history" color="slate" />
      </div>
      {plans.length > 0 && (
        <div className="admin-card" style={{ padding: '24px 28px' }}>
          <div className="admin-card-title" style={{ marginBottom: 16 }}>Plan Distribution (Active)</div>
          <div className="plan-distribution">
            {plans.map((p, i) => (
              <div className="plan-card" key={i}>
                <div className="plan-card-name">{p.plan_name}</div>
                <div className="plan-card-count">{fmt(p.active_count)} active</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginTop: 4 }}>${fmt(p.revenue)} rev</div>
                <div className="plan-card-bar-bg" style={{ marginTop: 8 }}>
                  <div className="plan-card-bar-fill" style={{ width: `${Math.round(((p.active_count || 0) / totalActive) * 100)}%` }} />
                </div>
                <div className="text-muted" style={{ marginTop: 4 }}>{Math.round(((p.active_count || 0) / totalActive) * 100)}% of active</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activity Section ───────────────────────────────────
function ActivitySection() {
  const [stats, setStats] = useState(null);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);

  // Recent activity state
  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [nextRecentCursor, setNextRecentCursor] = useState(null);
  const [recentCursor, setRecentCursor] = useState(null);
  const [recentTotal, setRecentTotal] = useState(0);
  const [recentSearch, setRecentSearch] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiService.adminActivityStats(start, end),
      apiService.adminActivityDaily(start, end),
    ]).then(([s, d]) => {
      setStats(s?.data || s);
      const arr = d?.daily_stats || d?.data?.daily_stats || d?.data || d;
      setDaily(Array.isArray(arr) ? arr : []);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [start, end]);

  const loadRecent = useCallback((cur = null) => {
    setRecentLoading(true);
    apiService.adminActivityRecent({ cursor: cur, page_size: 20 })
      .then(r => {
        const list = r?.activities || r?.data?.activities || [];
        setRecent(Array.isArray(list) ? list : []);
        setNextRecentCursor(r?.pagination?.next_cursor || null);
        setRecentTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadRecent(recentCursor); }, [loadRecent, recentCursor]);

  const maxVal = Math.max(...daily.map(d => d.request_count || d.total_tokens || d.messages || d.count || d.total || 0), 1);

  // Helper to get icon for a stat key
  const getStatIcon = (key) => {
    const map = {
      total_requests: 'bar_chart',
      total_success_requests: 'check_circle',
      total_failed_requests: 'error',
      total_input_tokens: 'input',
      total_output_tokens: 'output',
      total_tokens: 'data_usage',
      total_cost: 'payments',
      unique_agents: 'smart_toy',
      unique_users: 'group',
      total_messages: 'message',
      total_dialogs: 'chat',
      active_users: 'group',
      new_leads: 'contacts',
      tokens_used: 'memory',
      conversations: 'forum'
    };
    return map[key] || 'analytics';
  };

  const filteredRecent = recentSearch.trim()
    ? recent.filter(a =>
      (a.user_query || '').toLowerCase().includes(recentSearch.toLowerCase()) ||
      (a.agent_response || '').toLowerCase().includes(recentSearch.toLowerCase()) ||
      (a.agent_name || '').toLowerCase().includes(recentSearch.toLowerCase()) ||
      (a.user_display_name || '').toLowerCase().includes(recentSearch.toLowerCase()) ||
      (a.model_name || '').toLowerCase().includes(recentSearch.toLowerCase())
    )
    : recent;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Analytics</div>
        <div className="admin-section-title">Activity Metrics</div>
      </div>

      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div className="date-range-picker">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Range:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="admin-filter-select" style={{ padding: '6px 12px' }} />
              <span className="text-muted">to</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="admin-filter-select" style={{ padding: '6px 12px' }} />
            </div>
          </div>
          <button className="btn-action btn-action-success" onClick={() => { load(); loadRecent(null); }} style={{ marginLeft: 'auto', padding: '8px 16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Update Stats
          </button>
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <>
          {stats && (
            <div className="admin-stats-grid" style={{ marginBottom: 32 }}>
              {Object.entries(stats).map(([k, v]) => typeof v === 'number' && (
                <StatCard 
                  key={k} 
                  label={k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                  value={k === 'total_cost' ? `$${fmt(v)}` : fmt(v)} 
                  icon={getStatIcon(k)} 
                />
              ))}
            </div>
          )}

          {daily.length > 0 && (
            <div className="admin-card" style={{ padding: '28px', marginBottom: 32 }}>
              <div className="admin-card-header" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
                <span className="admin-card-title">Daily Activity Trend</span>
                <span className="text-muted" style={{ fontWeight: 400, fontSize: 13 }}>Message volume over the selected period</span>
              </div>
              <div className="daily-chart">
                {daily.map((d, i) => {
                  const val = d.request_count || d.total_tokens || d.messages || d.count || d.total || 0;
                  const h = Math.max(8, Math.round((val / maxVal) * 100));
                  const dateLabel = (d.date || d.day || '').slice(5);
                  const tooltip = `Date: ${d.date || d.day}\nRequests: ${fmt(d.request_count || 0)}\nTotal Tokens: ${fmt(d.total_tokens || 0)} (In: ${fmt(d.input_tokens || 0)} / Out: ${fmt(d.output_tokens || 0)})\nCost: $${fmt(d.total_cost || 0)}`;
                  return (
                    <div className="daily-bar-group" key={i} title={tooltip}>
                      <div className="daily-bar" style={{ height: `${h}%` }} />
                      <div className="daily-bar-label">{dateLabel}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Activity Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Recent Agent Executions{recentTotal > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(recentTotal)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search queries or responses…" value={recentSearch} onChange={e => setRecentSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {recentLoading ? <LoadingState /> : filteredRecent.length === 0 ? <EmptyState icon="history" text="No recent executions found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>User / Agent</th><th>Model</th><th>Status</th><th>User Query</th><th>Agent Response</th><th>Tokens & Cost</th><th>Time & Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filteredRecent.map((a, idx) => {
                  const st = (a.status || '').toLowerCase();
                  const isSuccess = st === 'success' || st === 'ok' || st === 'completed';
                  const isErr = st === 'error' || st === 'failed';
                  const badgeColor = isSuccess ? 'badge-green' : isErr ? 'badge-red' : 'badge-blue';

                  return (
                    <tr key={a.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="admin-avatar">{initials(a.user_display_name || 'U')}</div>
                          <div>
                            <div className="font-bold">{a.user_display_name || 'Unknown User'}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>Agent: <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 6px' }}>{a.agent_name || a.agent_id?.slice(0, 8) || '—'}</span></div>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-slate">{a.model_name || '—'}</span></td>
                      <td>
                        <span className={`badge ${badgeColor}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{isSuccess ? 'check_circle' : isErr ? 'error' : 'pending'}</span>
                          {a.status || 'Unknown'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}><div className="font-bold" style={{ fontSize: 12, whiteSpace: 'normal' }}>{a.user_query || '—'}</div></td>
                      <td style={{ maxWidth: 260 }}><div className="text-muted" style={{ fontSize: 12, whiteSpace: 'normal' }}>{a.agent_response || '—'}</div></td>
                      <td>
                        <div className="font-bold">{fmt((a.input_tokens || 0) + (a.output_tokens || 0))} tokens</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>In: {fmt(a.input_tokens || 0)} / Out: {fmt(a.output_tokens || 0)} | ${fmt(a.token_cost || 0)}</div>
                      </td>
                      <td>
                        <div className="font-bold">{fmt(a.response_time_ms || 0)} ms</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{fmtDate(a.created_at)}</div>
                      </td>
                      <td>
                        <button 
                          className="btn-action btn-action-blue" 
                          onClick={() => setSelectedActivityId(a.id)} 
                          style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!recentCursor} onClick={() => setRecentCursor(null)}>← First</button>
          <button disabled={!nextRecentCursor} onClick={() => setRecentCursor(nextRecentCursor)}>Next →</button>
        </div>
      </div>

      <ActivityDetailModal activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />
    </div>
  );
}

function SubscriptionsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminSubscriptions({ cursor: cur, page_size: 20, plan_type: planFilter || undefined, active_only: activeOnly })
      .then(r => {
        let list = [];
        if (Array.isArray(r)) list = r;
        else if (r?.subscriptions && Array.isArray(r.subscriptions)) list = r.subscriptions;
        else if (r?.data?.subscriptions && Array.isArray(r.data.subscriptions)) list = r.data.subscriptions;
        else if (r && typeof r === 'object' && r.subscription_id) list = [r]; // Single object fallback

        setItems(list);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [planFilter, activeOnly]);

  useEffect(() => { setCursor(null); load(null); }, [planFilter, activeOnly]);

  const filtered = search.trim()
    ? items.filter(s => {
        const fullName = s.user_display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim();
        const planName = s.plan_name || s.plan?.plan_name || '';
        const email = s.user_email || s.email || '';
        return (
          fullName.toLowerCase().includes(search.toLowerCase()) ||
          email.toLowerCase().includes(search.toLowerCase()) ||
          planName.toLowerCase().includes(search.toLowerCase())
        );
      })
    : items;

  return (
    <div className="admin-section-content">
      <div className="admin-section-header">
        <div className="admin-section-label">Billing Management</div>
        <div className="admin-section-title">Subscriptions</div>
      </div>

      <div className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <span className="admin-card-title">All Subscriptions</span>
            {total > 0 && <span className="admin-badge-count">{fmt(total)} total</span>}
          </div>

          <div className="admin-toolbar-actions">
            <div className="admin-search-wrapper">
              <span className="material-symbols-outlined">search</span>
              <input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="admin-filter-group">
              <select
                className="admin-select"
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
              >
                <option value="">All Plans</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <label className="admin-check-label">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={e => setActiveOnly(e.target.checked)}
                />
                <span>Active Only</span>
              </label>
            </div>
          </div>
        </div>

        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="subscriptions" text="No subscriptions found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan Details</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Usage</th>
                  <th>Billing Dates</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => {
                  const planName = s.plan_name || s.plan?.plan_name || '—';
                  const price = s.price_per_month ?? s.plan?.price_per_month ?? 0;
                  const tokensUsed = s.tokens_used ?? s.usage?.tokens_used ?? 0;
                  const displayName = s.user_display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
                  const displayEmail = s.user_email || s.email || '—';

                  return (
                    <tr key={s.subscription_id || idx}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">{initials(displayName !== '—' ? displayName : displayEmail)}</div>
                          <div className="admin-user-info">
                            <div className="font-bold">{displayName}</div>
                            <div className="text-muted">{displayEmail}</div>
                            {s.user_id && <div className="text-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>ID: {s.user_id.slice(0, 8)}…</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-plan-cell" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className="badge badge-blue">{planName}</span>
                          {s.subscription_id && <span className="text-muted" style={{ fontSize: 10, fontFamily: 'monospace' }}>Sub: {s.subscription_id.slice(0, 8)}…</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${s.is_active ? 'badge-green' : 'badge-red'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                            {s.is_active ? 'check_circle' : 'cancel'}
                          </span>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td><div className="font-bold">${fmt(price)}<span className="text-muted" style={{ fontSize: 10, fontWeight: 400 }}>/mo</span></div></td>
                      <td>
                        <div className="admin-usage-cell">
                          <span className="font-bold">{fmt(tokensUsed)}</span>
                          <span className="text-muted" style={{ fontSize: 10 }}>tokens</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-date-cell">
                          <div><span className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>Since:</span> {fmtDate(s.started_at)}</div>
                          <div><span className="text-muted" style={{ fontSize: 10, textTransform: 'uppercase' }}>Until:</span> {fmtDate(s.expires_at)}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>
            <span className="material-symbols-outlined">first_page</span> First
          </button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>
            Next <span className="material-symbols-outlined">last_page</span>
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Agents Section ─────────────────────────────────────
function AgentsSection() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminAgents({ cursor: cur, page_size: 20 })
      .then(r => {
        const list = r?.agents || r?.data?.agents || [];
        setAgents(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]);

  // Client-side search filter
  const filtered = search.trim()
    ? agents.filter(a =>
      (a.agent_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.business_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.user_display_name || '').toLowerCase().includes(search.toLowerCase())
    )
    : agents;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Fleet</div>
        <div className="admin-section-title">AI Agents</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Agents{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search agents…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="smart_toy" text="No agents found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Agent</th><th>Role</th><th>Tone</th><th>Language</th><th>Business</th><th>Dialogs</th><th>Owner</th>
              </tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.agent_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-avatar" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>smart_toy</span>
                        </div>
                        <span className="font-bold">{a.agent_name || '—'}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{a.agent_role || '—'}</span></td>
                    <td><span className="badge badge-slate">{a.agent_tone || '—'}</span></td>
                    <td>{a.agent_language || '—'}</td>
                    <td>{a.business_name || '—'}</td>
                    <td><span className="font-bold">{fmt(a.total_dialog ?? 0)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="admin-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(a.user_display_name)}</div>
                        <span>{a.user_display_name || '—'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Platforms Section ──────────────────────────────────
function PlatformsSection() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminPlatforms({ cursor: cur, page_size: 20, platform_type: typeFilter })
      .then(r => {
        const list = r?.platforms || r?.data?.platforms || [];
        setPlatforms(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => { setCursor(null); load(null); }, [load]);

  const filtered = search.trim()
    ? platforms.filter(pl =>
      (pl.platform_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (pl.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (pl.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (pl.user_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : platforms;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Integrations</div>
        <div className="admin-section-title">Connected Platforms</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All User Integrations{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search platform type, user name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="admin-filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Platforms</option>
              <option value="facebook">Facebook</option>
              <option value="shopify">Shopify</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="webhook">Webhook / API</option>
            </select>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="hub" text="No connected platforms found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Integration Platform</th><th>Platform Type</th><th>Owner / User</th><th>Connected At</th><th>Last Updated</th>
              </tr></thead>
              <tbody>
                {filtered.map(pl => {
                  const pt = (pl.platform_type || '').toLowerCase();
                  const isFb = pt === 'facebook' || pt === 'messenger';
                  const isShop = pt === 'shopify';
                  const isIg = pt === 'instagram';
                  const isWa = pt === 'whatsapp';
                  const iconName = isFb ? 'thumb_up' : isShop ? 'storefront' : isIg ? 'photo_camera' : isWa ? 'chat' : 'hub';
                  const badgeColor = isFb ? 'badge-blue' : isShop ? 'badge-green' : isIg ? 'badge-purple' : isWa ? 'badge-green' : 'badge-slate';

                  return (
                    <tr key={pl.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="admin-avatar" style={{ background: isFb ? 'linear-gradient(135deg, #1877f2 0%, #0c5dc7 100%)' : isShop ? 'linear-gradient(135deg, #95bf47 0%, #5e8e3e 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>{iconName}</span>
                          </div>
                          <div>
                            <div className="font-bold" style={{ textTransform: 'capitalize' }}>{pl.platform_type || 'Custom Integration'}</div>
                            <div className="text-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>ID: {pl.id?.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${badgeColor}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>
                          {pl.platform_type || 'General'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="admin-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(pl.user_name || 'U')}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{pl.user_name || '—'}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>ID: {pl.user_id?.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-bold" style={{ fontSize: 12 }}>{fmtDate(pl.created_at)}</div>
                      </td>
                      <td>
                        <div className="text-muted" style={{ fontSize: 12 }}>{fmtDate(pl.updated_at)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Pages Section ──────────────────────────────────────
function PagesSection() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminPages({ cursor: cur, page_size: 20 })
      .then(r => {
        const list = r?.pages || r?.data?.pages || [];
        setPages(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]);

  // Client-side search filter
  const filtered = search.trim()
    ? pages.filter(p =>
      (p.page_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.page_category || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.page_id_by_platform || '').toLowerCase().includes(search.toLowerCase())
    )
    : pages;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Connected</div>
        <div className="admin-section-title">Pages</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Pages{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search pages…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="pages" text="No pages found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Page</th><th>Category</th><th>Platform ID</th><th>Synced</th><th>Agent ID</th><th>Fan Count</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.page_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.profile_pic_url ? (
                          <img src={p.profile_pic_url} alt={p.page_name} className="admin-avatar" style={{ objectFit: 'cover' }} />
                        ) : (
                          <div className="admin-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>pages</span>
                          </div>
                        )}
                        <span className="font-bold">{p.page_name || '—'}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-slate">{p.page_category || '—'}</span></td>
                    <td><span className="text-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.page_id_by_platform || '—'}</span></td>
                    <td>
                      <span className={`badge ${p.is_synced ? 'badge-green' : 'badge-red'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{p.is_synced ? 'check_circle' : 'cancel'}</span>
                        {p.is_synced ? 'Synced' : 'Not Synced'}
                      </span>
                    </td>
                    <td>
                      {p.agent_id
                        ? <span className="text-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.agent_id.slice(0, 8)}…</span>
                        : <span className="badge badge-slate">Unassigned</span>
                      }
                    </td>
                    <td><span className="font-bold">{fmt(p.page_fan_count ?? 0)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Namespaces Section ─────────────────────────────────
function NamespacesSection() {
  const [namespaces, setNamespaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminNamespaces({ cursor: cur, page_size: 20 })
      .then(r => {
        const list = r?.namespaces || r?.data?.namespaces || [];
        setNamespaces(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]);

  const filtered = search.trim()
    ? namespaces.filter(ns =>
      (ns.namespace_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (ns.namespace_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (ns.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (ns.user_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : namespaces;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Knowledge Base</div>
        <div className="admin-section-title">Isolated Namespaces</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Namespaces{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search namespace name, ID or owner…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="dns" text="No namespaces found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Namespace Name & ID</th><th>Knowledge Files</th><th>Products</th><th>Owner</th><th>Created At</th>
              </tr></thead>
              <tbody>
                {filtered.map(ns => (
                  <tr key={ns.namespace_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-avatar" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>dns</span>
                        </div>
                        <div>
                          <div className="font-bold">{ns.namespace_name || 'Default Namespace'}</div>
                          <div className="text-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>ID: {ns.namespace_id || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-purple" style={{ fontSize: 12 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>folder_open</span>
                        <span className="font-bold">{fmt(ns.knowledge_count ?? 0)}</span> files
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: 12 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, marginRight: 4 }}>inventory_2</span>
                        <span className="font-bold">{fmt(ns.product_count ?? 0)}</span> items
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="admin-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(ns.user_name || 'U')}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{ns.user_name || '—'}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>ID: {ns.user_id?.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-bold" style={{ fontSize: 12 }}>{fmtDate(ns.created_at)}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{ns.created_at?.slice(0, 10)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Products Section ───────────────────────────────────
function ProductsSection() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminProducts({ cursor: cur, page_size: 20, category: categoryFilter })
      .then(r => {
        const list = r?.products || r?.data?.products || [];
        setProducts(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [categoryFilter]);

  useEffect(() => { setCursor(null); load(null); }, [load]);

  // Client-side search filter
  const filtered = search.trim()
    ? products.filter(p =>
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.user_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.product_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : products;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Knowledge Base</div>
        <div className="admin-section-title">Products Catalog</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Products & Variants{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search product name, code, category or user…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <input
              placeholder="Filter Category…"
              className="admin-filter-select"
              style={{ padding: '6px 12px', width: 150 }}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            />
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="inventory_2" text="No products found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Product</th><th>Code & Price</th><th>Category</th><th>Availability</th><th>Active</th><th>Assets</th><th>Owner</th><th>Created At</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.product_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-avatar" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>inventory_2</span>
                        </div>
                        <div>
                          <div className="font-bold">{p.name || 'Untitled Product'}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>Source: {p.import_source || 'manual'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-bold" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.code || '—'}</div>
                      <div style={{ color: '#10b981', fontWeight: 600, fontSize: 12 }}>{p.price ? `$${p.price}` : '—'}</div>
                    </td>
                    <td><span className="badge badge-slate">{p.category || 'General'}</span></td>
                    <td>
                      <span className={`badge ${p.availability ? 'badge-green' : 'badge-red'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{p.availability ? 'check_circle' : 'cancel'}</span>
                        {p.availability ? 'In Stock' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.is_active ? 'badge-green' : 'badge-slate'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td><span className="font-bold">{fmt(p.asset_count ?? 0)}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="admin-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(p.user_name || 'U')}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.user_name || '—'}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>ID: {p.user_id?.slice(0, 8)}…</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-muted" style={{ fontSize: 12 }}>{fmtDate(p.created_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Knowledges Section ─────────────────────────────────
function KnowledgesSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminKnowledges({ cursor: cur, page_size: 20, knowledge_type: typeFilter })
      .then(r => {
        const list = r?.items || r?.data?.items || [];
        setItems(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => { setCursor(null); load(null); }, [load]);

  const filtered = search.trim()
    ? items.filter(it =>
      (it.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.filename || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.namespace_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (it.user_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : items;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Knowledge Base</div>
        <div className="admin-section-title">Uploaded RAG Documents</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All RAG Documents & Files{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search document title, filename, user or namespace…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="admin-filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All File Types</option>
              <option value="pdf">PDF (`.pdf`)</option>
              <option value="txt">Text (`.txt`)</option>
              <option value="docx">Word (`.docx`)</option>
              <option value="url">Web (`URL`)</option>
            </select>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="folder_open" text="No knowledge files found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Document Title & File</th><th>Type & Size</th><th>Namespace</th><th>Owner</th><th>Uploaded At</th>
              </tr></thead>
              <tbody>
                {filtered.map(it => {
                  const kt = (it.knowledge_type || '').toLowerCase();
                  const iconName = kt === 'pdf' ? 'picture_as_pdf' : kt === 'url' ? 'link' : kt === 'docx' ? 'description' : 'article';
                  const badgeColor = kt === 'pdf' ? 'badge-red' : kt === 'url' ? 'badge-blue' : kt === 'docx' ? 'badge-purple' : 'badge-slate';

                  const kb = it.size_bytes > 0 ? (it.size_bytes > 1048576 ? `${(it.size_bytes / 1048576).toFixed(2)} MB` : `${Math.round(it.size_bytes / 1024)} KB`) : '—';

                  return (
                    <tr key={it.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="admin-avatar" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>{iconName}</span>
                          </div>
                          <div>
                            <div className="font-bold">{it.title || it.name || it.filename || 'Untitled Document'}</div>
                            <div className="text-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>{it.filename || it.name || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className={`badge ${badgeColor}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
                            {it.knowledge_type || 'file'}
                          </span>
                          <span className="text-muted" style={{ fontSize: 11 }}>{kb}</span>
                        </div>
                      </td>
                      <td>
                        <div className="font-bold">{it.namespace_name || 'Default Namespace'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>ID: {it.namespace_id?.slice(0, 8)}…</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="admin-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initials(it.user_name || 'U')}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{it.user_name || '—'}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>ID: {it.user_id?.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-bold" style={{ fontSize: 12 }}>{fmtDate(it.created_at)}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>ID: {it.id?.slice(0, 8)}…</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Conversations Section ────────────────────────────────
function ConversationsSection() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [pageIdFilter, setPageIdFilter] = useState('');
  const [pagesList, setPagesList] = useState([]);
  const [debugConvId, setDebugConvId] = useState(null);

  useEffect(() => {
    apiService.adminPages({ page_size: 100 })
      .then(r => setPagesList(r?.pages || r?.data?.pages || []))
      .catch(() => {});
  }, []);

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminConversations({ cursor: cur, page_size: 20, page_id: pageIdFilter })
      .then(r => {
        const list = r?.conversations || r?.data?.conversations || [];
        setConversations(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [pageIdFilter]);

  useEffect(() => { setCursor(null); load(null); }, [load]);

  // Client-side search filter
  const filtered = search.trim()
    ? conversations.filter(c =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.page_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.psid || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.page_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : conversations;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Inbox</div>
        <div className="admin-section-title">Conversations</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Conversations{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search user, page or PSID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="admin-filter-select"
              value={pageIdFilter}
              onChange={e => setPageIdFilter(e.target.value)}
            >
              <option value="">All Pages</option>
              {pagesList.map(p => (
                <option key={p.page_id} value={p.page_id}>
                  {p.page_name ? `${p.page_name} (${p.page_id?.slice(0, 8)}…)` : p.page_id}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="chat" text="No conversations found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>User</th><th>Page</th><th>Messages</th><th>Human Needed</th><th>Synced</th><th>Last Updated</th><th>Action</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.conversation_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-avatar">{initials(c.name || 'User')}</div>
                        <div>
                          <div className="font-bold">{c.name || 'Unknown User'}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>PSID: {c.psid}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-bold">{c.page_name || '—'}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>ID: {c.page_id?.slice(0, 8)}…</div>
                    </td>
                    <td><span className="font-bold">{fmt(c.message_count ?? 0)}</span></td>
                    <td>
                      {c.is_human_needed && (
                        <span className="badge badge-red">
                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>warning</span>
                          Yes
                        </span>
                      )}
                      {!c.is_human_needed && <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${c.is_synced ? 'badge-green' : 'badge-slate'}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{c.is_synced ? 'sync' : 'sync_disabled'}</span>
                        {c.is_synced ? 'Synced' : 'No'}
                      </span>
                    </td>
                    <td className="text-muted">{fmtDate(c.updated_time)}</td>
                    <td>
                      <button
                        className="btn-action"
                        style={{ backgroundColor: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => setDebugConvId(c.conversation_id || c.id)}
                        title="Inspect Checkpointer Snapshot & Message Graph"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>memory</span>
                        Debug State
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
      {debugConvId && <CheckpointerDebugModal conversationId={debugConvId} onClose={() => setDebugConvId(null)} />}
    </div>
  );
}

// ── Customer Records Section ───────────────────────────
function CustomerRecordsSection() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [pageIdFilter, setPageIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagesList, setPagesList] = useState([]);

  useEffect(() => {
    apiService.adminPages({ page_size: 100 })
      .then(r => setPagesList(r?.pages || r?.data?.pages || []))
      .catch(() => {});
  }, []);

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminCustomerRecords({
      cursor: cur,
      page_size: 20,
      page_id: pageIdFilter,
      record_type: typeFilter,
      record_status: statusFilter,
    })
      .then(r => {
        const list = r?.records || r?.data?.records || [];
        setRecords(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [pageIdFilter, typeFilter, statusFilter]);

  useEffect(() => { setCursor(null); load(null); }, [load]);

  const filtered = search.trim()
    ? records.filter(r =>
      (r.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.contact_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.contact_phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.page_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.customer_record_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.conversation_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : records;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Inbox & Capture</div>
        <div className="admin-section-title">Customer Records</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Captured Leads & Orders{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search contact name, email, phone or notes…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select
              className="admin-filter-select"
              value={pageIdFilter}
              onChange={e => setPageIdFilter(e.target.value)}
            >
              <option value="">All Pages</option>
              {pagesList.map(p => (
                <option key={p.page_id} value={p.page_id}>
                  {p.page_name ? `${p.page_name} (${p.page_id?.slice(0, 8)}…)` : p.page_id}
                </option>
              ))}
            </select>
            <select
              className="admin-filter-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="lead">Lead</option>
              <option value="order">Order</option>
            </select>
            <input
              placeholder="Filter Status…"
              className="admin-filter-select"
              style={{ padding: '6px 12px', width: 130 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            />
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="assignment_ind" text="No customer records found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Contact Info</th><th>Type & Status</th><th>Page & Conversation</th><th>Order Items</th><th>Notes</th><th>Captured At</th>
              </tr></thead>
              <tbody>
                {filtered.map(r => {
                  const t = (r.record_type || '').toLowerCase();
                  const isOrder = t === 'order';
                  const st = (r.record_status || '').toLowerCase();
                  const isCompleted = st === 'completed' || st === 'closed' || st === 'fulfilled' || st === 'converted';
                  const isPending = st === 'pending' || st === 'new' || st === 'open';
                  const statusColor = isCompleted ? 'badge-green' : isPending ? 'badge-blue' : 'badge-slate';

                  return (
                    <tr key={r.customer_record_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="admin-avatar" style={{ background: isOrder ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#fff' }}>{isOrder ? 'shopping_bag' : 'person'}</span>
                          </div>
                          <div>
                            <div className="font-bold">{r.contact_name || 'Anonymous Contact'}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                              {r.contact_email && <span>📧 {r.contact_email} </span>}
                              {r.contact_phone && <span>📞 {r.contact_phone}</span>}
                              {!r.contact_email && !r.contact_phone && '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span className={`badge ${isOrder ? 'badge-blue' : 'badge-purple'}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
                            {r.record_type || 'General'}
                          </span>
                          {r.record_status && (
                            <span className={`badge ${statusColor}`} style={{ fontSize: 11 }}>
                              {r.record_status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold">{r.page_name || '—'}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          Conv ID: <span style={{ fontFamily: 'monospace' }}>{r.conversation_id?.slice(0, 8) || '—'}</span>…
                        </div>
                      </td>
                      <td>
                        {Array.isArray(r.order_items) && r.order_items.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 80, overflowY: 'auto' }}>
                            {r.order_items.map((it, idx) => (
                              <div key={idx} style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>• {it}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'normal', maxHeight: 80, overflowY: 'auto' }}>
                          {r.notes || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold" style={{ fontSize: 12 }}>{fmtDate(r.created_at)}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>ID: {r.customer_record_id?.slice(0, 8)}…</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Feedbacks Section ───────────────────────────────────
function FeedbacksSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminFeedbacks({ cursor: cur, page_size: 20, type: typeFilter || undefined })
      .then(r => {
        const list = r?.feedbacks || r?.data?.feedbacks || [];
        setItems(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [typeFilter]);

  useEffect(() => { load(null); }, [load]);

  const filtered = search.trim()
    ? items.filter(f =>
      (f.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.user_id || '').toLowerCase().includes(search.toLowerCase())
    )
    : items;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">Reports</div>
        <div className="admin-section-title">Feedbacks</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Feedbacks{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search feedbacks…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="admin-filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature Request</option>
              <option value="improvement">Improvement</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="feedback" text="No feedbacks found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Title & Details</th><th>Type</th><th>User ID</th><th>Date</th>
              </tr></thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.feedback_id}>
                    <td style={{ maxWidth: 400 }}>
                      <div className="font-bold">{f.title || 'No Title'}</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 4, whiteSpace: 'normal' }}>{f.details || 'No details provided.'}</div>
                    </td>
                    <td>
                      <span className="badge badge-slate">{f.type}</span>
                    </td>
                    <td>
                      <div className="text-muted" style={{ fontSize: 11, fontFamily: 'monospace' }}>{f.user_id}</div>
                    </td>
                    <td className="text-muted">{fmtDate(f.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Leads Section ──────────────────────────────────────
function LeadsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminLeads({ cursor: cur, page_size: 20 })
      .then(r => {
        const list = r?.leads || r?.data?.leads || [];
        setItems(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]);

  const filtered = search.trim()
    ? items.filter(l =>
      (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.work_mail || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.company_name || '').toLowerCase().includes(search.toLowerCase())
    )
    : items;

  return (
    <div>
      <div className="admin-section-header">
        <div className="admin-section-label">CRM</div>
        <div className="admin-section-title">Leads</div>
      </div>
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">All Leads{total > 0 && <span className="text-muted" style={{ fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({fmt(total)} total)</span>}</span>
          <div className="admin-filter-row">
            <div className="admin-search-bar">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="contacts" text="No leads found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>Lead</th><th>Email</th><th>Phone</th><th>Team Size</th><th>Message</th><th>Date</th>
              </tr></thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.lead_id || l.id || i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-avatar">{initials(l.name || 'Lead')}</div>
                        <div>
                          <div className="font-bold">{l.name || 'Unknown Lead'}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{l.company_name || 'Individual'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{l.work_mail || '—'}</td>
                    <td>{l.phone_number || '—'}</td>
                    <td><span className="badge badge-slate">{l.team_size || '—'}</span></td>
                    <td style={{ maxWidth: 320 }}><div className="text-muted" style={{ fontSize: 12, whiteSpace: 'normal' }}>{l.message || '—'}</div></td>
                    <td className="text-muted">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-pagination">
          <button disabled={!cursor} onClick={() => { setCursor(null); load(null); }}>← First</button>
          <button disabled={!nextCursor} onClick={() => { setCursor(nextCursor); load(nextCursor); }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Nav Items ──────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { id: 'revenue', label: 'Revenue', icon: 'payments' },
  { id: 'agents', label: 'AI Agents', icon: 'smart_toy' },
  { id: 'platforms', label: 'Platforms & Apps', icon: 'hub' },
  { id: 'pages', label: 'Pages', icon: 'pages' },
  { id: 'namespaces', label: 'Namespaces', icon: 'dns' },
  { id: 'products', label: 'Products', icon: 'inventory_2' },
  { id: 'knowledges', label: 'Knowledge Files', icon: 'folder_open' },
  { id: 'conversations', label: 'Conversations', icon: 'chat' },
  { id: 'customer-records', label: 'Captured Records', icon: 'assignment_ind' },
  { id: 'feedbacks', label: 'Feedbacks', icon: 'feedback' },
  { id: 'leads', label: 'Leads', icon: 'contacts' },
  { id: 'activity', label: 'Activity', icon: 'bar_chart' },
];

// ── Main Component ─────────────────────────────────────
export default function AdminPanel() {
  const [section, setSection] = useState('dashboard');
  const [admin, setAdmin] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const navigate = useNavigate();

  useEffect(() => {
    apiService.adminMe()
      .then(r => setAdmin(r?.admin || r?.data || r))
      .catch(err => {
        // If 401/403, redirect to login
        if (err?.status === 401 || err?.status === 403) {
          navigate('/admin/login');
        }
      });
  }, []);


  const handleLogout = () => navigate('/admin/login');

  const currentLabel = NAV.find(n => n.id === section)?.label || 'Dashboard';

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <DashboardSection />;
      case 'users': return <UsersSection />;
      case 'subscriptions': return <SubscriptionsSection />;
      case 'revenue': return <RevenueSection />;
      case 'agents': return <AgentsSection />;
      case 'platforms': return <PlatformsSection />;
      case 'pages': return <PagesSection />;
      case 'namespaces': return <NamespacesSection />;
      case 'products': return <ProductsSection />;
      case 'knowledges': return <KnowledgesSection />;
      case 'conversations': return <ConversationsSection />;
      case 'customer-records': return <CustomerRecordsSection />;
      case 'feedbacks': return <FeedbacksSection />;
      case 'leads': return <LeadsSection />;
      case 'activity': return <ActivitySection />;
      default: return null;
    }
  };

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="admin-sidebar-logo">
          <img src={logoImg} alt="logo" />
          <img src={titleImg} alt="LYFFLOW" className="title-img" />
        </div>
        <div className="admin-sidebar-subtitle">Admin Console</div>
        <nav className="admin-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <span className="material-symbols-outlined nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          {admin && (
            <div className="admin-profile-chip">
              <div className="admin-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials(admin.full_name || admin.name || admin.email)}</div>
              <div className="admin-profile-chip-info">
                <span className="admin-profile-chip-name">{admin.full_name || admin.name || 'Admin'}</span>
                <span className="admin-profile-chip-email">{admin.email || ''}</span>
              </div>
            </div>
          )}
          <button className="admin-nav-item" onClick={handleLogout}>
            <span className="material-symbols-outlined nav-icon">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <span className="material-symbols-outlined">{sidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
            <span className="admin-topbar-title">{currentLabel}</span>
          </div>
          <div className="admin-topbar-right">
            {admin && (
              <div className="admin-topbar-profile">
                <div className="admin-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(admin.full_name || admin.name || admin.email)}</div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{admin.full_name || admin.name || 'Admin'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{admin.email || ''}</div>
                </div>
              </div>
            )}
            <button className="admin-logout-btn" onClick={handleLogout}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              Sign Out
            </button>
          </div>
        </div>
        <div className="admin-content">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
