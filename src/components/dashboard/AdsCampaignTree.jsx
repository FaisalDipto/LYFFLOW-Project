import { useState } from 'react';
import { ChevronRight, ExternalLink, Globe } from 'lucide-react';
import { formatCount, formatMoney, formatPct } from '../../utils/ownerDashboard';
import { VERDICTS, adLabel, adSetLabel, campaignLabel, postUrl, spendMoney } from '../../utils/adsFigures';
import HoverTip from '../HoverTip';

/**
 * The campaign tree of GET /v1/statistics/ads (campaign > ad set > ad), with LyfFlow's chats,
 * orders and sales next to Meta's spend and purchase counts. Spend is in each campaign's
 * own currency (`currency`), sales in the business's. A row's Orders number opens its
 * orders (campaign_id, ad_set_id or ad_id); the group with no campaign isn't a link.
 * @param {{ campaigns: object[], salesCurrency: string, metaShown: boolean, pageFiltered: boolean,
 *   activeFilter: { kind: string, id: string } | null, onShowOrders: (filter: object) => void }} props
 */
export default function AdsCampaignTree({ campaigns, salesCurrency, metaShown, pageFiltered, activeFilter, onShowOrders }) {
  // Collapsed campaigns, and ad sets whose ads without a chat are shown.
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showQuiet, setShowQuiet] = useState(() => new Set());
  const toggle = (setter, key) => setter(current => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const noSpendReason = (row, level) => {
    if (!metaShown) return null;
    if (level !== 'ad' && row.campaign_id === null) return 'This group has no campaign, so Meta has no spend for it. Each ad shows its own.';
    if (pageFiltered) return 'Shared with another page, or Meta has no figure for it. Meta doesn\'t split spend by page: remove the page filter to see it.';
    return 'Meta has no figure for this row in these days.';
  };

  const renderRow = (row, level, currency, keyPrefix) => {
    const isAd = level === 'ad';
    const id = level === 'campaign' ? row.campaign_id : level === 'ad_set' ? row.ad_set_id : row.ad_id;
    const label = level === 'campaign' ? campaignLabel(row) : level === 'ad_set' ? adSetLabel(row) : adLabel(row);
    const linkable = Boolean(id) && row.orders > 0;
    const active = activeFilter && activeFilter.kind === level && activeFilter.id === id;
    const spendMissing = row.ad_spend === null || row.ad_spend === undefined;
    const reason = spendMissing ? noSpendReason(row, level) : null;
    // A campaign that mostly sells on the website: its spend per chat order reads high.
    const websiteHeavy = Number(row.meta_website_purchases) > Math.max(Number(row.orders) || 0, 0) && Number(row.meta_website_purchases) > 0;
    const verdict = isAd && (row.chats > 0 || row.orders > 0) ? VERDICTS[row.verdict] || VERDICTS.not_enough_data : null;
    const link = isAd ? postUrl(row.post_id) : null;
    const campaignKey = `${keyPrefix}`;
    const isCollapsed = level === 'campaign' && collapsed.has(campaignKey);
    return (
      <tr key={`${keyPrefix}|${level}|${id ?? 'none'}`} className={`ads-tree-row ads-tree-${level} border-b border-solid border-slate-100 align-top ${active ? 'bg-emerald-50/60' : ''}`}>
        <td className={`py-2.5 pr-3 ${level === 'campaign' ? 'pl-0' : level === 'ad_set' ? 'pl-6' : 'pl-12'}`}>
          <div className="flex min-w-0 items-start gap-1.5">
            {level === 'campaign' && (
              <button type="button" onClick={() => toggle(setCollapsed, campaignKey)} aria-expanded={!isCollapsed} aria-label={isCollapsed ? `Show ${label}` : `Hide ${label}`}
                className="-ml-0.5 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <ChevronRight size={14} className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
              </button>
            )}
            <div className="min-w-0">
              <p className={`m-0 [overflow-wrap:anywhere] ${level === 'campaign' ? 'font-semibold text-slate-900' : level === 'ad_set' ? 'font-medium text-slate-800' : 'text-slate-800'}`}>
                {label}
                {level === 'campaign' && row.campaign_id !== null && <span className="ml-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Campaign</span>}
                {level === 'ad_set' && row.ad_set_id !== null && <span className="ml-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Ad set</span>}
              </p>
              <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-400">
                {id && <span className="font-mono">ID {id}</span>}
                {level === 'campaign' && row.campaign_id === null && <span>LyfFlow hasn't read these ads' campaign from Meta yet.</span>}
                {isAd && row.title && row.name && row.title !== row.name && <span title="The headline the customer tapped">“{row.title}”</span>}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-slate-500 hover:text-slate-900 hover:underline">
                    Post <ExternalLink size={11} aria-hidden="true" />
                  </a>
                )}
              </p>
              {verdict && (
                <p className={`m-0 mt-1 flex items-center gap-1.5 text-[12px] ${verdict.tone}`}>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${verdict.dot}`} aria-hidden="true" />
                  {verdict.text(row)}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">
          {formatCount(row.chats)}
          {row.chat_to_order_rate !== null && row.chat_to_order_rate !== undefined && <span className="block text-[11.5px] text-slate-400">{formatPct(row.chat_to_order_rate)} ordered</span>}
        </td>
        <td className="px-2 py-2.5 text-right tabular-nums">
          {linkable ? (
            <button type="button" onClick={() => onShowOrders({ kind: level, id, label })} className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline" title="Show these orders">
              {formatCount(row.orders)}
            </button>
          ) : <span className="font-semibold text-slate-900">{formatCount(row.orders)}</span>}
          {row.orders_after_comment > 0 && <span className="block text-[11.5px] text-slate-400">{formatCount(row.orders_after_comment)} after a comment</span>}
          {row.purchases_sent > 0 && <span className="block text-[11.5px] text-slate-400">{formatCount(row.purchases_sent)} sent to Meta</span>}
        </td>
        <td className="px-2 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(row.sales, salesCurrency)}</td>
        <td className="px-2 py-2.5 text-right tabular-nums">
          {spendMissing ? (
            reason ? <HoverTip text={reason} className="cursor-help text-slate-400">{pageFiltered && level !== 'ad' && row.campaign_id !== null ? 'Shared' : '—'}</HoverTip> : <span className="text-slate-400">—</span>
          ) : (
            <>
              <span className="text-slate-900">{spendMoney(row.ad_spend, currency)}</span>
              {row.cost_per_order !== null && row.cost_per_order !== undefined && <span className="block text-[11.5px] text-slate-400">{spendMoney(row.cost_per_order, currency)} per order</span>}
              {websiteHeavy && !isAd && (
                <HoverTip text="Most of this row's results are website purchases, which aren't chat orders, so its spend per order reads high. Compare its spend with its website purchases." className="block cursor-help text-[11px] text-sky-700">
                  Mostly website sales
                </HoverTip>
              )}
            </>
          )}
        </td>
        <td className="py-2.5 pl-2 text-right tabular-nums text-slate-700">
          {row.meta_purchases === null || row.meta_purchases === undefined ? <span className="text-slate-400">—</span> : formatCount(row.meta_purchases)}
          {Number(row.meta_website_purchases) > 0 && (
            <span className="flex items-center justify-end gap-1 text-[11.5px] text-slate-400"><Globe size={11} aria-hidden="true" />{formatCount(row.meta_website_purchases)} on website</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="ads-tree w-full min-w-[760px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-solid border-slate-200 text-[12px] text-slate-500">
            <th scope="col" className="py-2 pr-3 font-medium">Campaign, ad set and ad</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Chats</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Orders</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">Sales</th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              <HoverTip text="What Meta charged, in the ad account's currency. A campaign's or ad set's spend also covers ads with no chat and archived ads, so the rows below can add up to less." className="cursor-help underline decoration-dotted underline-offset-2">Ad spend</HoverTip>
            </th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">
              <HoverTip text="Purchases Meta credits to the row: on Messenger, and on your website (counted by your Meta pixel, not part of LyfFlow's orders). Meta counts every source that reports to it, so this isn't a receipt of what LyfFlow sent." className="cursor-help underline decoration-dotted underline-offset-2">Meta purchases</HoverTip>
            </th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign, campaignIndex) => {
            const campaignKey = `c${campaignIndex}|${campaign.campaign_id ?? 'none'}`;
            const currency = campaign.currency || null;
            const rows = [renderRow(campaign, 'campaign', currency, campaignKey)];
            if (collapsed.has(campaignKey)) return rows;
            (campaign.ad_sets || []).forEach((adSet, setIndex) => {
              const setKey = `${campaignKey}|s${setIndex}|${adSet.ad_set_id ?? 'none'}`;
              rows.push(renderRow(adSet, 'ad_set', currency, setKey));
              const ads = adSet.ads || [];
              const active = ads.filter(ad => ad.chats > 0 || ad.orders > 0);
              const quiet = ads.filter(ad => !(ad.chats > 0 || ad.orders > 0));
              const showAll = showQuiet.has(setKey);
              (showAll ? ads : active).forEach((ad, adIndex) => rows.push(renderRow(ad, 'ad', currency, `${setKey}|a${adIndex}`)));
              if (quiet.length > 0) {
                rows.push(
                  <tr key={`${setKey}|quiet`} className="border-b border-solid border-slate-100">
                    <td colSpan={6} className="py-1.5 pl-12">
                      <button type="button" onClick={() => toggle(setShowQuiet, setKey)} className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 hover:underline">
                        {showAll
                          ? 'Hide the ads without a chat'
                          : `${quiet.length} more ${quiet.length === 1 ? 'ad' : 'ads'} without a chat in these days`}
                      </button>
                    </td>
                  </tr>,
                );
              }
            });
            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}
