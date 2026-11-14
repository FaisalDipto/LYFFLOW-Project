import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw, Users } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { apiService } from '../../services/api';
import { addDays, formatDay, formatDayRange, periodDays, todayInZone } from '../../utils/ownerDashboard';
import { statsErrorMessage } from '../../utils/statsPeriods';
import HoverTip from '../HoverTip';
import { CustomRange, PeriodTabs } from './StatsControls';
import './TeamOnlineTime.css';

// Online time is kept 90 days (today is day 1); the endpoint takes at most 30 days at once.
const KEPT_DAYS = 90;
const PERIOD_DAYS = { today: 1, last_7_days: 7, last_30_days: 30 };
// While the range includes today, members online now count up to now: refresh now and then.
const REFRESH_MS = 2 * 60000;

/** "52 h 10 min", "45 min", "0 min": hours stay hours, however many there are. */
const formatOnline = (seconds) => {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  const hours = Math.floor(minutes / 60);
  if (!hours) return `${minutes} min`;
  return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
};

// One hue, light to dark, by hours online that day (0 is the empty cell).
const LEVELS = [
  { max: 2, label: 'Under 2 h' },
  { max: 4, label: '2 to 4 h' },
  { max: 6, label: '4 to 6 h' },
  { max: 8, label: '6 to 8 h' },
  { max: Infinity, label: '8 h or more' },
];
const levelOf = (seconds) => (seconds > 0 ? LEVELS.findIndex(level => seconds / 3600 < level.max) + 1 : 0);

const errorText = (error) => (error?.status === 403 && !/business/i.test(error?.message || '')
  ? 'Only the business owner can see online time.'
  : error?.status === 422 && /90|kept/i.test(error?.message || '')
    ? 'Online time is kept for 90 days. Pick a later start day.'
    : statsErrorMessage(error, 'online time'));

/**
 * Online time per member and day (GET /v1/business/members/online-time, owner only).
 * Members go online with the header switch; the backend ends a stretch at the member's
 * last heartbeat when the dashboard stops calling.
 * @param {{ isActive?: boolean }} props
 */
export default function TeamOnlineTime({ isActive = true }) {
  const { business } = useBusiness();
  const [periodId, setPeriodId] = useState('last_7_days');
  const [customRange, setCustomRange] = useState(null);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const [loadingKey, setLoadingKey] = useState(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [members, setMembers] = useState(null);

  const timeZone = result.data?.timezone || business?.timezone || undefined;
  const today = todayInZone(timeZone);
  const earliest = addDays(today, -(KEPT_DAYS - 1));
  const isCustom = periodId === 'custom' && customRange;
  const range = isCustom ? customRange : { start_date: addDays(today, -((PERIOD_DAYS[periodId] || 7) - 1)), end_date: today };
  const requestKey = `${business?.business_id || ''}|${range.start_date}|${range.end_date}|${reloadNonce}`;
  const isLoading = loadingKey === requestKey;

  // Who is still on the team, so time from a removed member can say so.
  useEffect(() => {
    if (!isActive || members) return;
    apiService.getBusinessMembers()
      .then(list => setMembers(Array.isArray(list) ? list : []))
      .catch(() => setMembers([]));
  }, [isActive, members]);

  useEffect(() => {
    if (!isActive || !business?.business_id) return undefined;
    const controller = new AbortController();
    setLoadingKey(requestKey);
    apiService.getMemberOnlineTime({ startDate: range.start_date, endDate: range.end_date }, { signal: controller.signal })
      .then(data => setResult({ key: requestKey, data, error: null }))
      .catch(error => { if (error?.name !== 'AbortError') setResult(prev => ({ key: requestKey, data: prev.data, error: errorText(error) })); })
      .finally(() => setLoadingKey(current => (current === requestKey ? null : current)));
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, requestKey]);

  const reload = useCallback(() => setReloadNonce(value => value + 1), []);
  useEffect(() => {
    if (!isActive || range.end_date !== today) return undefined;
    const timer = setInterval(reload, REFRESH_MS);
    return () => clearInterval(timer);
  }, [isActive, range.end_date, today, reload]);

  const data = result.data;
  const days = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: periodDays(data.start_date, data.end_date) }, (_, index) => addDays(data.start_date, index));
  }, [data]);
  const rows = useMemo(() => (data?.members || []).map(member => ({
    ...member,
    byDay: new Map((member.days || []).map(item => [item.day, item.online_seconds])),
    removed: members ? !members.some(item => item.member_id === member.member_id && item.status === 'active') : false,
  })), [data, members]);
  const teamSeconds = rows.reduce((sum, row) => sum + (row.online_seconds || 0), 0);
  const onlineNow = rows.filter(row => row.is_online).length;
  const activeMembers = rows.filter(row => !row.removed).length;
  const busiest = useMemo(() => {
    let best = null;
    days.forEach(day => {
      const total = rows.reduce((sum, row) => sum + (row.byDay.get(day) || 0), 0);
      if (total > 0 && (!best || total > best.total)) best = { day, total };
    });
    return best;
  }, [days, rows]);
  const maxMember = Math.max(1, ...rows.map(row => row.online_seconds || 0));
  const compactDays = days.length > 14;

  if (!isActive) return null;

  return (
    <div className="team-online-time dashboard-content-area w-full flex-1 bg-surface-bright text-left">
      <div className="mx-auto w-full max-w-[980px] space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 text-[20px] font-semibold text-slate-900">Online time</h1>
            <p className="m-0 mt-0.5 text-[13px] text-slate-500">How long each team member was online, per day{timeZone ? ` (${timeZone})` : ''}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodTabs value={isCustom ? null : periodId} onChange={setPeriodId} />
            <CustomRange
              active={Boolean(isCustom)}
              range={range}
              today={today}
              minDate={earliest}
              minDateNote={`Online time is kept for 90 days: pick ${formatDay(earliest)} or later.`}
              onApply={(next) => { setCustomRange(next); setPeriodId('custom'); }}
            />
            <button
              type="button"
              onClick={reload}
              disabled={isLoading}
              aria-label="Refresh online time"
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {result.error && !isLoading && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-solid border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800" role="alert">
            <span className="flex items-center gap-2"><AlertTriangle size={15} aria-hidden="true" />{result.error}</span>
            <button type="button" onClick={reload} className="h-8 rounded-lg border border-solid border-rose-200 bg-white px-3 text-[12px] font-semibold text-rose-800 hover:bg-rose-100">Try again</button>
          </div>
        )}

        {!data ? (isLoading && (
          <div className="space-y-3" aria-hidden="true">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-slate-100" />)}</div>
            <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" />
          </div>
        )) : (
          <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-60' : ''}`} aria-busy={isLoading}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tile icon={Clock3} label="Team online time" value={formatOnline(teamSeconds)} sub={formatDayRange(data.start_date, data.end_date)} />
              <Tile icon={Users} label="Online now" value={`${onlineNow} of ${activeMembers}`} sub={onlineNow ? 'Counting up to now' : 'Nobody is online'} live={onlineNow > 0} />
              <Tile label="Busiest day" value={busiest ? formatDay(busiest.day, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'} sub={busiest ? `${formatOnline(busiest.total)} across the team` : 'No online time yet'} />
            </div>

            <section className="rounded-2xl border border-solid border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="m-0 text-[15px] font-semibold text-slate-900">By member and day</h2>
                  <p className="m-0 mt-0.5 text-[12.5px] text-slate-500">Most online time first. Hover a day for the exact time.</p>
                </div>
                <Legend />
              </header>

              {teamSeconds === 0 && (
                <p className="m-0 mb-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-600">
                  No online time in these days. Members count time while the switch at the top of the dashboard says Online.
                </p>
              )}

              <div className="-mx-1 overflow-x-auto px-1">
                <table className={`tot-table w-full border-collapse text-left text-[13px] ${compactDays ? 'is-compact' : ''}`}>
                  <caption className="sr-only">Online time per member and day, {formatDayRange(data.start_date, data.end_date)}</caption>
                  <thead>
                    <tr className="text-[11px] text-slate-500">
                      <th scope="col" className="tot-member-col pb-2 pr-3 font-medium">Member</th>
                      {days.map(day => (
                        <th key={day} scope="col" className={`tot-day-head pb-2 text-center font-medium ${day === today ? 'is-today' : ''}`}>
                          <span className="block leading-tight">{formatDay(day, { weekday: 'narrow' })}</span>
                          <span className="block leading-tight tabular-nums">{formatDay(day, { day: 'numeric' })}</span>
                        </th>
                      ))}
                      <th scope="col" className="tot-total-col pb-2 pl-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.member_id} className="border-t border-solid border-slate-100">
                        <th scope="row" className="tot-member-col py-2 pr-3 font-normal">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">
                              {(row.invited_email || '?').charAt(0).toUpperCase()}
                              {row.is_online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-solid border-white bg-emerald-500" title="Online now" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-slate-900" title={row.invited_email}>{row.invited_email}</span>
                              <span className="block text-[11px] text-slate-500">
                                {row.removed ? 'Removed from the team' : row.is_online ? 'Online now' : 'Offline'}
                              </span>
                            </span>
                          </span>
                        </th>
                        {days.map(day => {
                          const seconds = row.byDay.get(day) || 0;
                          const text = `${row.invited_email}, ${formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}: ${seconds ? formatOnline(seconds) : 'not online'}${day === today && row.is_online ? ' so far' : ''}`;
                          return (
                            <td key={day} className="tot-cell-wrap py-2 text-center">
                              <HoverTip text={text} className={`tot-cell tot-level-${levelOf(seconds)} ${compactDays ? 'is-compact' : ''}`}>
                                <span className="sr-only">{seconds ? formatOnline(seconds) : 'none'}</span>
                              </HoverTip>
                            </td>
                          );
                        })}
                        <td className="tot-total-col py-2 pl-3 text-right">
                          <span className="block font-semibold tabular-nums text-slate-900">{formatOnline(row.online_seconds)}</span>
                          <span className="tot-bar mt-1 block" aria-hidden="true"><span style={{ width: `${Math.round(((row.online_seconds || 0) / maxMember) * 100)}%` }} /></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <details className="rounded-2xl border border-solid border-slate-200 bg-white px-4 py-3 text-[12.5px] text-slate-600 shadow-sm sm:px-5">
              <summary className="cursor-pointer font-semibold text-slate-800">How online time is counted</summary>
              <ul className="m-0 mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                <li>Each member marks themselves online or offline with the switch at the top of the dashboard, separately in each business.</li>
                <li>When a member closes the tab or their computer sleeps, they're put offline after 11 minutes, and their time ends at their last activity, not when Lyfflow noticed.</li>
                <li>Time online across midnight is split between the two days{timeZone ? `, in ${timeZone}` : ''}. A member online right now counts up to now.</li>
                <li>Online time is kept for 90 days. Removed members are listed only when they have time in these days; pending invitations aren't.</li>
              </ul>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, live = false }) {
  return (
    <div className="rounded-2xl border border-solid border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <p className="m-0 flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
        {Icon && <Icon size={13} aria-hidden="true" />}{label}
        {live && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />}
      </p>
      <p className="m-0 mt-1 text-[22px] font-semibold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="m-0 mt-0.5 text-[12px] text-slate-500">{sub}</p>}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500" aria-label="Colour key">
      <span className="inline-flex items-center gap-1.5"><span className="tot-cell tot-level-0 is-key" />None</span>
      {LEVELS.map((level, index) => (
        <span key={level.label} className="inline-flex items-center gap-1.5"><span className={`tot-cell tot-level-${index + 1} is-key`} />{level.label}</span>
      ))}
    </div>
  );
}
