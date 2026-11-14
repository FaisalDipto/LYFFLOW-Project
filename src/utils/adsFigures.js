// Shared by the Ads section and its campaign tree: verdict texts, post links, labels and
// spend money (in the ad account's currency, not the business's).
import { formatCount, formatMoney } from './ownerDashboard';

// The verdict compares how well ads turn chats into orders; it knows nothing about cost,
// so it points the owner at an ad to look at, never tells them to stop one.
export const VERDICTS = {
  above_usual: { dot: 'bg-emerald-500', tone: 'text-emerald-700', text: (ad) => `Better than your other ads: ${formatCount(ad.orders)} ${ad.orders === 1 ? 'order' : 'orders'}, about ${formatCount(Math.round(ad.expected_orders))} expected` },
  usual: { dot: 'bg-slate-400', tone: 'text-slate-600', text: () => 'In line with your other ads' },
  below_usual: { dot: 'bg-amber-500', tone: 'text-amber-700', text: (ad) => `Worse than your other ads: ${formatCount(ad.orders)} ${ad.orders === 1 ? 'order' : 'orders'}, about ${formatCount(Math.round(ad.expected_orders))} expected` },
  not_enough_data: { dot: 'bg-slate-300', tone: 'text-slate-500', text: () => 'Too few orders to judge yet' },
};

// A Facebook page's ad post comes as `<page id>_<post id>`, which facebook.com opens; any
// other form (an Instagram ad's post) has no link to build.
export const postUrl = (postId) => (typeof postId === 'string' && /^\d+_\d+$/.test(postId) ? `https://www.facebook.com/${postId}` : null);

/** Money in the ad account's currency (USD, …); a plain number when the currency isn't known. */
export const spendMoney = (value, currency) => {
  if (value === null || value === undefined || value === '') return '—';
  if (currency) return formatMoney(value, currency);
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
};

export const campaignLabel = (row) => row?.name || (row?.campaign_id ? `Campaign ${row.campaign_id}` : 'Not in a campaign yet');
export const adSetLabel = (row) => row?.name || (row?.ad_set_id ? `Ad set ${row.ad_set_id}` : 'No ad set yet');
export const adLabel = (ad) => ad?.name || ad?.title || ad?.ad_title || `Ad ${ad?.ad_id || ''}`.trim();

