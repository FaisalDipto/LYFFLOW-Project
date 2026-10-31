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

// An order's WooCommerce push state: OrderResponseDetail.wc_sync_status
// (pending | syncing | synced | failed | skipped), or null when it was never sent.
// Responses from before the field existed are read from wc_order_id / wc_sync_error.
export const wooSyncStatus = (order) => {
  if (!order) return null;
  if (order.wc_sync_status !== undefined) return order.wc_sync_status || null;
  if (order.wc_order_id != null) return 'synced';
  if (order.wc_sync_error) return 'failed';
  return null;
};

// Once the push has started, only an order's status may change (content edits get 409).
export const isWooLocked = (order) => ['syncing', 'synced'].includes(wooSyncStatus(order));

export const WOO_PUSH_STATUSES = [
  { value: 'pending', label: 'Pending payment' },
  { value: 'processing', label: 'Processing' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
];

// POST /v1/woocommerce/orders/{order_id}/push failures, by status, for toasts.
export const wooPushErrorText = (err) => {
  switch (err?.status) {
    case 400: return 'Connect a WooCommerce store in Platforms to push orders.';
    case 403: return 'No active business. Choose a business, then try again.';
    case 409: return 'This order is already in WooCommerce or being sent, or it was cancelled, deleted or not found.';
    case 422: return "That order can't be pushed: its ID isn't valid.";
    case 429: return 'Too many pushes in a minute. Wait a moment and try again.';
    case 500: return "Couldn't queue the push. Try again in a moment.";
    default: return err?.message || "Couldn't push the order to WooCommerce.";
  }
};
