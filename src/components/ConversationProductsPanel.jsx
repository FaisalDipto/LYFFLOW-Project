import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CornerDownLeft, Image as ImageIcon, Package, Search, X } from 'lucide-react';
import { apiService } from '../services/api';
import { API_BASE } from '../config/env';
import { useBusiness } from '../context/BusinessContext';
import ProductPrice from './products/ProductPrice';
import { formatAmount, isOnSale, normalizeStockStatus, stockLabel, toAmount, variantTitle } from '../utils/productPricing';

const PAGE_SIZE = 20;
const DEFAULT_CURRENCY = 'BDT';
const AVAILABILITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'In stock' },
];

const assetUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const Thumbnail = ({ product }) => {
  const [failed, setFailed] = useState(false);
  const image = (product.primary_assets || []).find(asset => asset.file_type === 'image');
  if (!image || failed) {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300">
        <ImageIcon size={16} />
      </div>
    );
  }
  return (
    <img
      src={assetUrl(image.url)}
      alt=""
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
    />
  );
};

const stockTone = (status) => {
  const normalized = normalizeStockStatus(status);
  if (normalized === 'out_of_stock') return 'text-red-600';
  if (normalized === 'on_backorder') return 'text-amber-600';
  return 'text-emerald-700';
};

// One line for the reply box, e.g. "Linen Summer Shirt – White / M (SHI-03-WHITE-M):
// BDT 1,290.00 (was BDT 1,450.00)". A variant without its own price uses the product's.
const productReplyText = (product, variant = null, currency = DEFAULT_CURRENCY) => {
  const source = variant || product;
  const regular = toAmount(source.regular_price) ?? toAmount(product.regular_price);
  const sale = variant ? (toAmount(variant.sale_price) ?? (toAmount(variant.regular_price) === null ? toAmount(product.sale_price) : null)) : toAmount(product.sale_price);
  const name = variant
    ? `${product.name} – ${variant.title || variantTitle(variant.option_values, product.options)}`
    : product.name;
  const code = variant ? (variant.sku || product.code) : product.code;
  const price = isOnSale(regular, sale)
    ? `${formatAmount(sale, currency)} (was ${formatAmount(regular, currency)})`
    : formatAmount(regular, currency);
  const stock = normalizeStockStatus(source.stock_status) === 'out_of_stock' ? ' – currently out of stock' : '';
  return `${name}${code ? ` (${code})` : ''}: ${price}${stock}`;
};

// Product catalog beside a conversation: search, check price and stock, and drop a
// product (or one of its variants) into the reply box. Replies are plain text, so
// the product goes in as a line of text the agent can edit before sending.
const ConversationProductsPanel = ({ namespaces = [], defaultNamespaceId = '', onInsert, onClose }) => {
  const { business } = useBusiness();
  const currency = business?.currency || DEFAULT_CURRENCY;
  const panelRef = useRef(null);

  const [pickedNamespaceId, setPickedNamespaceId] = useState('');
  const namespaceId = pickedNamespaceId
    || defaultNamespaceId
    || namespaces[0]?.namespace_id
    || namespaces[0]?.namespace
    || '';

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availability, setAvailability] = useState('all');

  // The last list response, tagged with the request it answers; anything else is loading.
  const [result, setResult] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [insertedKey, setInsertedKey] = useState('');

  const requestKey = `${namespaceId}|${searchQuery}|${availability}`;

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!namespaceId) return undefined;
    let cancelled = false;
    const availabilityParam = availability === 'all' ? null : availability === 'available';
    apiService.getProducts(namespaceId, null, PAGE_SIZE, availabilityParam, null, searchQuery)
      .then(data => {
        if (cancelled) return;
        setResult({ key: requestKey, items: data?.items || [], nextCursor: data?.pagination?.next_cursor || null, hasMore: Boolean(data?.pagination?.has_more), error: '' });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Failed to load products:', error);
        setResult({ key: requestKey, items: [], nextCursor: null, hasMore: false, error: error?.message || 'Could not load products.' });
      });
    return () => { cancelled = true; };
  }, [namespaceId, searchQuery, availability, requestKey]);

  const isLoading = Boolean(namespaceId) && result?.key !== requestKey;
  const current = result?.key === requestKey ? result : null;
  const products = current?.items || [];

  const loadMore = async () => {
    if (!current?.nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const availabilityParam = availability === 'all' ? null : availability === 'available';
      const data = await apiService.getProducts(namespaceId, current.nextCursor, PAGE_SIZE, availabilityParam, null, searchQuery);
      setResult(prev => (prev?.key === requestKey
        ? { ...prev, items: [...prev.items, ...(data?.items || [])], nextCursor: data?.pagination?.next_cursor || null, hasMore: Boolean(data?.pagination?.has_more) }
        : prev));
    } catch (error) {
      console.error('Failed to load more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleProduct = (product) => {
    const id = product.product_id;
    setExpandedId(open => (open === id ? null : id));
    if (details[id] && details[id].status !== 'error') return;
    setDetails(prev => ({ ...prev, [id]: { status: 'loading' } }));
    apiService.getProductDetail(namespaceId, id)
      .then(data => setDetails(prev => ({ ...prev, [id]: { status: 'ready', data: { ...product, ...data } } })))
      .catch(error => {
        console.error('Failed to load product detail:', error);
        setDetails(prev => ({ ...prev, [id]: { status: 'error' } }));
      });
  };

  const insert = (key, product, variant = null) => {
    onInsert?.(productReplyText(product, variant, currency));
    setInsertedKey(key);
    setTimeout(() => setInsertedKey(k => (k === key ? '' : k)), 1600);
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Escape' || !panelRef.current?.contains(e.target)) return;
    // Escape in the search box clears it first; a second press closes the panel.
    if (e.target.type === 'search' && searchInput) { setSearchInput(''); return; }
    onClose?.();
  };

  const changeCatalog = (value) => {
    setPickedNamespaceId(value);
    setExpandedId(null);
  };

  const insertButton = (key, product, variant = null) => (
    <button
      type="button"
      onClick={() => insert(key, product, variant)}
      aria-label={`Insert ${variant ? variant.title || variantTitle(variant.option_values, product.options) : product.name} in reply`}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-solid border-emerald-200 bg-emerald-50 px-2 text-[11px] font-bold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
    >
      {insertedKey === key ? <Check size={13} strokeWidth={2.6} /> : <CornerDownLeft size={13} strokeWidth={2.4} />}
      {insertedKey === key ? 'Added' : 'Insert in reply'}
    </button>
  );

  return (
    <aside
      ref={panelRef}
      onKeyDown={handleKeyDown}
      aria-label="Products"
      className="conversation-products-panel fixed inset-y-0 right-0 z-[9995] flex w-full max-w-[420px] flex-col overflow-hidden border-l border-slate-200 bg-[#f9f9fb] shadow-[0_30px_100px_-15px_rgba(15,23,42,0.45)] animate-fade-in-right lg:static lg:z-auto lg:w-[380px] lg:max-w-none lg:shrink-0 lg:shadow-none xl:w-[400px]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Package size={18} strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h2 className="font-['Epilogue'] text-lg font-black tracking-tight text-slate-900">Products</h2>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">Check details and add them to your reply</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close products"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="shrink-0 space-y-2.5 border-b border-slate-200/60 bg-white px-5 py-3.5">
        {namespaces.length > 1 && (
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">database</span>
            <select
              value={namespaceId}
              onChange={(e) => changeCatalog(e.target.value)}
              aria-label="Catalog"
              style={{ backgroundImage: 'none' }}
              className="products-filter-select h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-bold text-slate-700 outline-none"
            >
              {namespaces.map(ns => {
                const id = ns.namespace_id || ns.namespace;
                return (
                  <option key={id} value={id}>
                    {ns.namespace_name || ns.name}{id === defaultNamespaceId ? ' (agent’s catalog)' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products by name, code, brand, or category"
            aria-label="Search products"
            className="products-filter-select products-search-input h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Availability">
          {AVAILABILITY_FILTERS.map(filter => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={availability === filter.value}
              onClick={() => setAvailability(filter.value)}
              className={`h-7 rounded-md border border-solid px-2.5 text-[11px] font-bold transition-colors ${
                availability === filter.value
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {!namespaceId ? (
          <p className="px-1 py-10 text-center text-sm font-medium text-slate-400">No product catalog yet. Create one under Knowledge → Products.</p>
        ) : isLoading ? (
          <div className="space-y-2" aria-label="Loading products">
            {[0, 1, 2, 3].map(key => <div key={key} className="h-[68px] animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : current?.error ? (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600">{current.error}</p>
        ) : products.length === 0 ? (
          <p className="px-1 py-10 text-center text-sm font-medium text-slate-400">
            {searchQuery ? <>Nothing matches &ldquo;{searchQuery}&rdquo;.</> : 'No products in this catalog.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {products.map(product => {
              const isOpen = expandedId === product.product_id;
              const detail = details[product.product_id];
              const full = detail?.data || product;
              const variants = (full.variants || []).filter(variant => variant.is_active !== false);
              return (
                <li key={product.product_id} className={`overflow-hidden rounded-xl border bg-white transition-colors ${isOpen ? 'border-emerald-200' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => toggleProduct(product)}
                    aria-expanded={isOpen}
                    className="side-panel-row flex w-full items-center gap-3 bg-transparent px-3 py-2.5 text-left hover:bg-slate-50/70"
                  >
                    <Thumbnail product={product} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{product.name}</p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px]">
                        {product.code && <span className="truncate font-mono text-slate-500">{product.code}</span>}
                        <span className={`shrink-0 font-semibold ${stockTone(product.stock_status)}`}>
                          {stockLabel(product.stock_status)}
                          {product.stock_quantity !== null && product.stock_quantity !== undefined ? ` · ${product.stock_quantity}` : ''}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <ProductPrice regularPrice={product.regular_price} salePrice={product.sale_price} currency={product.currency || currency} size="sm" />
                      </div>
                    </div>
                    <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-2.5">
                      {detail?.status === 'loading' && <div className="h-10 animate-pulse rounded-lg bg-slate-100" />}
                      {detail?.status === 'error' && <p className="text-[11px] font-semibold text-rose-600">Could not load the full details.</p>}
                      {full.description && <p className="line-clamp-3 text-xs leading-5 text-slate-600">{full.description}</p>}
                      {(full.brand || full.category) && (
                        <p className="text-[11px] font-medium text-slate-400">{[full.brand, full.category].filter(Boolean).join(' · ')}</p>
                      )}
                      {variants.length > 0 && (
                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                          {variants.map(variant => {
                            const key = `${product.product_id}:${variant.variant_id}`;
                            const regular = variant.regular_price ?? full.regular_price;
                            const sale = variant.regular_price == null && variant.sale_price == null ? full.sale_price : variant.sale_price;
                            return (
                              <li key={variant.variant_id} className="flex items-center gap-2 px-2.5 py-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-bold text-slate-800">{variant.title || variantTitle(variant.option_values, full.options)}</p>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]">
                                    <ProductPrice regularPrice={regular} salePrice={sale} currency={full.currency || currency} size="sm" />
                                    <span className={`font-semibold ${stockTone(variant.stock_status)}`}>
                                      {stockLabel(variant.stock_status)}
                                      {variant.stock_quantity !== null && variant.stock_quantity !== undefined ? ` · ${variant.stock_quantity}` : ''}
                                    </span>
                                  </p>
                                </div>
                                {insertButton(key, full, variant)}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <div className="flex justify-end">{insertButton(product.product_id, full)}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {current?.hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="mt-3 h-9 w-full rounded-lg border border-solid border-slate-200 bg-white text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </aside>
  );
};

export default ConversationProductsPanel;
