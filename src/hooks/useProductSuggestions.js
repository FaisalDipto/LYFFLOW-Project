import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

const SUGGESTION_LIMIT = 8;
const DEBOUNCE_MS = 250;

/**
 * Catalog products matching `query` (name, code, brand or category, via the list
 * endpoint's `search`), for autocompleting order items. Searches once typing pauses.
 * Without `catalogId` it uses the business's first catalog.
 *
 * @returns {{ catalogId: string, status: 'idle'|'loading'|'ready'|'error', products: object[] }}
 */
export function useProductSuggestions(catalogId, query) {
  const [fallbackCatalogId, setFallbackCatalogId] = useState('');
  const [result, setResult] = useState(null);
  const effectiveCatalogId = catalogId || fallbackCatalogId;
  const trimmed = (query || '').trim();
  const requestKey = `${effectiveCatalogId}|${trimmed}`;

  // Only looked up when no catalog was given, and only once a search is wanted.
  useEffect(() => {
    if (catalogId || fallbackCatalogId || !trimmed) return undefined;
    let cancelled = false;
    apiService.getNamespaces()
      .then(data => {
        const first = (data?.namespaces || data || [])[0];
        if (!cancelled && first) setFallbackCatalogId(first.namespace_id || first.namespace || '');
      })
      .catch(error => console.error('Failed to load catalogs for item suggestions:', error));
    return () => { cancelled = true; };
  }, [catalogId, fallbackCatalogId, trimmed]);

  useEffect(() => {
    if (!effectiveCatalogId || !trimmed) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      apiService.getProducts(effectiveCatalogId, null, SUGGESTION_LIMIT, null, null, trimmed)
        .then(data => { if (!cancelled) setResult({ key: requestKey, products: data?.items || [], error: false }); })
        .catch(error => {
          console.error('Failed to load item suggestions:', error);
          if (!cancelled) setResult({ key: requestKey, products: [], error: true });
        });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [effectiveCatalogId, trimmed, requestKey]);

  if (!trimmed) return { catalogId: effectiveCatalogId, status: 'idle', products: [] };
  if (result?.key !== requestKey) return { catalogId: effectiveCatalogId, status: 'loading', products: [] };
  return { catalogId: effectiveCatalogId, status: result.error ? 'error' : 'ready', products: result.products };
}
