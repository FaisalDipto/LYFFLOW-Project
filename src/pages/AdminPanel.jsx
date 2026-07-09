import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import logoImg from '../assets/logo1.png';
import titleImg from '../assets/title.png';
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justify: 'center', zIndex: 1000, padding: 24
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 850,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
      }}>
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
                  <div className="admin-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>
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
    </div>
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
                      <div className="admin-avatar">{initials(u.display_name || u.email)}</div>
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

  useEffect(() => { load(); }, [load]);

  const maxVal = Math.max(...daily.map(d => d.request_count || d.total_tokens || d.messages || d.count || d.total || 0), 1);

  // Helper to get icon for a stat key
  const getStatIcon = (key) => {
    const map = {
      total_messages: 'message',
      total_dialogs: 'chat',
      total_tokens: 'data_usage',
      active_users: 'group',
      new_leads: 'contacts',
      tokens_used: 'memory',
      conversations: 'forum',
      messages_sent: 'send',
      messages_received: 'move_to_inbox'
    };
    return map[key] || 'analytics';
  };

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
          <button className="btn-action btn-action-success" onClick={load} style={{ marginLeft: 'auto', padding: '8px 16px' }}>
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
                  value={v} 
                  icon={getStatIcon(k)} 
                />
              ))}
            </div>
          )}

          {daily.length > 0 && (
            <div className="admin-card" style={{ padding: '28px' }}>
              <div className="admin-card-header" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
                <span className="admin-card-title">Daily Activity Trend</span>
                <span className="text-muted" style={{ fontWeight: 400, fontSize: 13 }}>Message volume over the selected period</span>
              </div>
              <div className="daily-chart">
                {daily.map((d, i) => {
                  const val = d.request_count || d.total_tokens || d.messages || d.count || d.total || 0;
                  const h = Math.max(8, Math.round((val / maxVal) * 100));
                  const dateLabel = (d.date || d.day || '').slice(5);
                  const tooltip = `Date: ${d.date || d.day}\nRequests: ${fmt(d.request_count || 0)}\nTokens: ${fmt(d.total_tokens || 0)}\nCost: $${fmt(d.total_cost || 0)}`;
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
        const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
        const planName = s.plan_name || s.plan?.plan_name || '';
        return (
          fullName.toLowerCase().includes(search.toLowerCase()) ||
          (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
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

                  return (
                    <tr key={s.subscription_id || idx}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-avatar">{initials(`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Admin')}</div>
                          <div className="admin-user-info">
                            <div className="font-bold">{`${s.first_name || ''} ${s.last_name || ''}`.trim() || '—'}</div>
                            <div className="text-muted">{s.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-plan-cell">
                          <span className="badge badge-blue">{planName}</span>
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

// ── Conversations Section ────────────────────────────────
function ConversationsSection() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = useCallback((cur = null) => {
    setLoading(true);
    apiService.adminConversations({ cursor: cur, page_size: 20 })
      .then(r => {
        const list = r?.conversations || r?.data?.conversations || [];
        setConversations(Array.isArray(list) ? list : []);
        setNextCursor(r?.pagination?.next_cursor || null);
        setTotal(r?.pagination?.total ?? list.length ?? 0);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(null); }, [load]);

  // Client-side search filter
  const filtered = search.trim()
    ? conversations.filter(c =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.page_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.psid || '').toLowerCase().includes(search.toLowerCase())
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
              <input placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
        {loading ? <LoadingState /> : filtered.length === 0 ? <EmptyState icon="chat" text="No conversations found." /> : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr>
                <th>User</th><th>Page</th><th>Messages</th><th>Human Needed</th><th>Synced</th><th>Last Updated</th>
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
                <th>Lead</th><th>Email</th><th>Phone</th><th>Date</th>
              </tr></thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id || i}>
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
  { id: 'pages', label: 'Pages', icon: 'pages' },
  { id: 'conversations', label: 'Conversations', icon: 'chat' },
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
      case 'pages': return <PagesSection />;
      case 'conversations': return <ConversationsSection />;
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
