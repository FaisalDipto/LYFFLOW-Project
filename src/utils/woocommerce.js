// WooCommerce connection helpers shared by the Platforms dialog and the orders screen.

// Collapses GET /v1/woocommerce/status into the states the UI shows:
//   connected — the plugin handshake succeeded and the store is live
//   pending   — a store is on record but the plugin hasn't connected yet
//   error     — the store or plugin is failing (auth_failed, error)
//   none      — not connected (not_connected, disabled, revoked, or no status)
// The backend lists a few status names and allows others, so unknown ones fall to none.
export const wooConnectionState = (status) => {
  const value = String(status?.status || '').toLowerCase();
  if (value === 'error' || value === 'auth_failed') return 'error';
  if (value === 'connected') return status.plugin_connected ? 'connected' : 'pending';
  return 'none';
};

// Link to an order in the store's WP admin (WooCommerce redirects this to its newer
// order screen where that's enabled).
export const wooOrderAdminUrl = (storeUrl, wcOrderId) => {
  if (!storeUrl || !wcOrderId) return null;
  return `${String(storeUrl).replace(/\/+$/, '')}/wp-admin/post.php?post=${encodeURIComponent(wcOrderId)}&action=edit`;
};
