/**
 * API Service for interacting with the LYFFLOW Backend
 */

// Since we setup a proxy in Vite, we can just use relative paths locally
// In production, this might need to be an absolute URL if the frontend and backend servers differ

import { API_BASE } from '../config/env';

export const SESSION_EXPIRED_EVENT = 'lyfflow-session-expired';
export const NO_ACTIVE_BUSINESS_EVENT = 'lyfflow-no-active-business';

export const isNoActiveBusinessError = (error) =>
  error?.status === 403 && /no active business/i.test(error?.message || '');

// Google login is a full-page redirect: the backend handles the OAuth round trip
// and lands the browser on /businesses (or /get-started?auth=failed).
export const googleLoginUrl = () => `${API_BASE}/v1/auth/google/login`;

// Owner-only. The backend 303s to Facebook and returns to /dashboard?reauth=...
export const facebookConnectUrl = () => `${API_BASE}/v1/auth/facebook/connect`;

// The backend clears the session cookie and 302s to the public landing page,
// so this must be a navigation rather than a fetch.
export const logoutUrl = () => `${API_BASE}/v1/logout`;

// Set to true to test frontend without a running backend
const MOCK_MODE = window.location.search.includes('mock=true');
// Lets mock scenarios simulate data that only shows up some time after page load.
const MOCK_LOADED_AT = Date.now();
// The dashboard strips one-shot params (e.g. ?reauth=) from the URL, so scenarios
// that must outlive that read the query string as it was at load.
const MOCK_LOAD_PARAMS = new URLSearchParams(window.location.search);
let mockHasPlan = MOCK_LOAD_PARAMS.get('mockNoPlan') !== 'true';
const MOCK_DELAY_MS = Math.max(0, Number(new URLSearchParams(window.location.search).get('mockDelay')) || 0);

// A month of orders, newest first, spread through each day so the dashboard's order
// charts have shape at every bar size. Two in three belong to the first page.
const MOCK_ORDER_NAMES = [
  'Nusrat Jahan', 'Tanvir Ahmed', 'Farzana Akter', 'Rakib Hasan', 'Sadia Islam', 'Mahmud Karim',
  'Tasnim Rahman', 'Arif Hossain', 'Mithila Chowdhury', 'Imran Kabir', 'Sumaiya Begum', 'Shakil Uddin',
];
const MOCK_ORDER_STATUSES = ['delivered', 'delivered', 'delivered', 'pending', 'new', 'in_review', 'hold', 'cancelled'];
const MOCK_ORDERS = (() => {
  const orders = [];
  for (let day = 0; day < 31; day += 1) {
    const perDay = 3 + ((day * 5 + 2) % 8);
    for (let i = 0; i < perDay; i += 1) {
      const n = orders.length;
      orders.push({
        customer_order_id: `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`,
        order_id: `ORD-${1001 + n}`,
        page_id: n % 3 === 2 ? 'page_2' : 'page_1',
        // Today's orders haven't shipped yet.
        status: day === 0 ? (i % 2 ? 'pending' : 'new') : MOCK_ORDER_STATUSES[(n * 7 + day) % MOCK_ORDER_STATUSES.length],
        created_by: n % 4 === 3 ? 'manual' : 'ai',
        total: (450 + ((n * 389) % 3600)).toFixed(2),
        contact_name: MOCK_ORDER_NAMES[(n * 5 + day) % MOCK_ORDER_NAMES.length],
        created_at: new Date(MOCK_LOADED_AT - day * 86400000 - Math.floor((i * 86400000) / perDay) - ((n * 13) % 40) * 60000).toISOString(),
      });
    }
  }
  return orders;
})();

// Orders per conversation for mock mode, newest first. John Doe (conv_1) has two and
// Jane Smith (conv_2) none; manual create adds to the list until reload.
const mockConversationOrders = {
  conv_1: [
    { ...MOCK_ORDERS[0], order_items: [{ name: 'Cotton T-Shirt (Black - L)', code: 'TSH-BLK-L', quantity: 2, price: 500 }, { name: 'Gift wrap', code: null, quantity: 1, price: 0 }] },
    { ...MOCK_ORDERS[9], order_items: [{ name: 'Premium Leather Wallet', code: 'WAL-01', quantity: 1, price: 1170 }] },
  ].map(order => ({
    ...order, page_id: 'page_1', conversation_id: 'conv_1', contact_name: 'John Doe', delivery_charge: '60.00',
    total: (order.order_items.reduce((sum, item) => sum + item.quantity * item.price, 0) + 60).toFixed(2),
  })),
};

// Filters and pages the mock orders the way the endpoint does: page_id and status
// filters, then an opaque cursor (here, the offset of the next page).
const mockOrdersPage = (endpoint) => {
  const params = new URLSearchParams(endpoint.split('?')[1] || '');
  const pageSize = Number(params.get('page_size')) || 20;
  const offset = Number(params.get('cursor')) || 0;
  const matching = MOCK_ORDERS.filter(order =>
    (!params.get('page_id') || order.page_id === params.get('page_id')) &&
    (!params.get('status') || order.status === params.get('status')));
  const hasMore = offset + pageSize < matching.length;
  return {
    orders: matching.slice(offset, offset + pageSize),
    pagination: { next_cursor: hasMore ? String(offset + pageSize) : '', has_more: hasMore, page_size: pageSize, total: matching.length },
  };
};

// WooCommerce in mock mode. ?mockWoo=connected | error | pending (plugin not yet
// connected) | none (default). Disconnecting switches to none until reload.
const MOCK_WOO_STATUSES = {
  connected: {
    status: 'connected', store_url: 'https://demostore.example', namespace_id: 'ns_1',
    last_synced_at: '2026-10-10T08:15:00Z', last_sync_error: null, connected_at: '2026-10-08T15:32:00Z',
    plugin_connected: true, plugin_version: '1.0.0', wc_version: '9.3.2', wp_version: '6.6.2', plugin_connected_at: '2026-10-08T15:32:00Z',
  },
  error: {
    status: 'auth_failed', store_url: 'https://demostore.example', namespace_id: 'ns_1',
    last_synced_at: '2026-10-09T21:02:00Z', last_sync_error: 'The store rejected the API key (401). It may have been revoked in Lyfflow.',
    connected_at: '2026-10-08T15:32:00Z', plugin_connected: true, plugin_version: '1.0.0', wc_version: '9.3.2', wp_version: '6.6.2', plugin_connected_at: '2026-10-08T15:32:00Z',
  },
  pending: {
    status: 'connected', store_url: 'https://demostore.example', namespace_id: null,
    last_synced_at: null, last_sync_error: null, connected_at: '2026-10-08T15:32:00Z', plugin_connected: false,
  },
  none: { status: 'not_connected', store_url: null, connected_at: null, plugin_connected: false },
};
let mockWooStatus = MOCK_WOO_STATUSES[MOCK_LOAD_PARAMS.get('mockWoo')] || MOCK_WOO_STATUSES.none;
// Orders pushed during this mock session: customer_order_id -> wc_order_id.
const mockWooPushed = new Map();

// Deterministic sync state per mock order while a store is connected: every third
// order synced, the next failed, the rest local only.
const mockWooSync = (order) => {
  const n = Math.max(0, MOCK_ORDERS.indexOf(order));
  if (!mockWooStatus.store_url) return { wc_order_id: null, wc_synced_at: null, wc_sync_error: null, wc_sync_attempts: 0 };
  if (mockWooPushed.has(order.customer_order_id)) {
    return { wc_order_id: mockWooPushed.get(order.customer_order_id), wc_synced_at: new Date().toISOString(), wc_sync_error: null, wc_sync_attempts: 1 };
  }
  if (n % 3 === 0) return { wc_order_id: 4000 + n, wc_synced_at: order.created_at, wc_sync_error: null, wc_sync_attempts: 1 };
  if (n % 3 === 1) return { wc_order_id: null, wc_synced_at: null, wc_sync_error: 'WooCommerce rejected the order: SKU WAL-01 is out of stock.', wc_sync_attempts: 3 };
  return { wc_order_id: null, wc_synced_at: null, wc_sync_error: null, wc_sync_attempts: 0 };
};

// Product catalog for mock mode (namespace ns_1). Create, update, delete and the
// variant endpoints edit it until reload.
const mockVariant = (productId, n, sku, title, optionValues, regular, sale, qty, status = 'in_stock') => ({
  variant_id: `var_${productId}_${n}`, product_id: productId, sku, title, barcode: null, option_values: optionValues,
  regular_price: regular, sale_price: sale, cost_price: null, track_inventory: qty !== null, stock_quantity: qty, stock_status: status,
  weight: null, image_asset_id: null, position: n, is_active: true, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
});
let mockProducts = [
  {
    product_id: 'prod_1', name: 'Premium Leather Wallet', code: 'WAL-01', product_type: 'simple', brand: 'Hidebound', category: 'Accessories',tags: ['leather', 'gift'],
    description: 'Full-grain leather bifold with six card slots.', regular_price: '1170.00', sale_price: '990.00', currency: 'BDT',
    stock_status: 'in_stock', stock_quantity: 42, availability: true, options: [], variants: [], assets: [], primary_assets: [],
  },
  {
    product_id: 'prod_2', name: 'Canvas Tote Bag', code: 'TOT-02', product_type: 'simple', brand: 'Loomhouse', category: 'Bags',tags: ['canvas'],
    description: 'Heavy cotton canvas tote with an inner pocket.', regular_price: '850.00', sale_price: null, currency: 'BDT',
    stock_status: 'in_stock', stock_quantity: 18, availability: true, options: [], variants: [], assets: [], primary_assets: [],
  },
  {
    product_id: 'prod_3', name: 'Linen Summer Shirt', code: 'SHI-03', product_type: 'variable', brand: 'Loomhouse', category: 'Clothing',tags: ['linen', 'summer'],
    description: 'Breathable linen shirt in two colours.', regular_price: '1450.00', sale_price: null, currency: 'BDT',
    stock_status: 'out_of_stock', stock_quantity: 0, availability: false,
    options: [{ name: 'Color', values: ['White', 'Sky Blue'] }, { name: 'Size', values: ['M', 'L'] }],
    variants: [
      mockVariant('prod_3', 0, 'SHI-03-WHITE-M', 'White / M', { Color: 'White', Size: 'M' }, '1450.00', null, 0, 'out_of_stock'),
      mockVariant('prod_3', 1, 'SHI-03-WHITE-L', 'White / L', { Color: 'White', Size: 'L' }, '1450.00', null, 0, 'out_of_stock'),
      mockVariant('prod_3', 2, 'SHI-03-SKY-BLUE-M', 'Sky Blue / M', { Color: 'Sky Blue', Size: 'M' }, '1450.00', '1290.00', 0, 'on_backorder'),
    ],
    assets: [], primary_assets: [],
  },
];
const MOCK_LIST_FIELDS = ['product_id', 'name', 'code', 'product_type', 'regular_price', 'sale_price', 'currency', 'stock_status', 'stock_quantity', 'availability', 'primary_assets'];
const mockProductListItem = (product) => Object.fromEntries(MOCK_LIST_FIELDS.map(field => [field, product[field]]));
const mockMoney = (value) => (value === null || value === undefined || value === '' ? null : Number(value).toFixed(2));

// Agents for mock mode; create and update edit this list until reload. SupportBot has
// the Messenger pause sign turned off (null) so both states are visible.
let mockAgents = [
  { agent_id: 'agent_1', name: 'SalesBot', agent_name: 'SalesBot', role: 'Sales', agent_role: 'Sales', agent_tone: 'Friendly', agent_language: 'Mimic User Language', business_name: 'Demo Store', business_description: 'Leather goods and accessories, delivered across Bangladesh.', agent_timezone: 'Asia/Dhaka', human_handover_sign: '#pause' },
  { agent_id: 'agent_2', name: 'SupportBot', agent_name: 'SupportBot', role: 'Support', agent_role: 'Support', agent_tone: 'Professional', agent_language: 'English', business_name: 'Demo Store', business_description: 'Order help, returns and delivery questions for Demo Store.', agent_timezone: 'Asia/Dhaka', human_handover_sign: null },
];

const MOCK_NAMESPACES = [{ namespace_id: 'ns_1', namespace_name: 'Demo catalog' }];

// API keys for mock mode.Full keys are remembered so the key tester can validate
// keys created in this session; the two seeded keys have no plaintext to test.
const MOCK_API_KEY_SECRETS = new Map();
let mockApiKeys = [
  {
    api_key_id: '6f1c2b7e-3d4a-4f5b-9c8d-1a2b3c4d5e6f',
    name: 'WooCommerce plugin',
    key_prefix: 'lf_live_8Kq2',
    permissions: 'products:read,products:write,orders:read,namespaces:read',
    is_active: true,
    last_used_at: new Date(MOCK_LOADED_AT - 2 * 3600000).toISOString(),
    created_at: '2026-09-12T09:30:00.000Z',
  },
  {
    api_key_id: '9a8b7c6d-5e4f-4a3b-8c2d-0f1e2d3c4b5a',
    name: 'Inventory sync script',
    key_prefix: 'lf_live_Zt7m',
    permissions: 'products:read',
    is_active: false,
    last_used_at: '2026-09-28T17:05:00.000Z',
    created_at: '2026-08-30T11:00:00.000Z',
  },
];

// The active business in mock mode; PATCH /v1/business edits it until reload.
let mockBusiness = {
  business_id: 'biz_1',
  name: 'Demo Store',
  currency: 'BDT',
  phone_number: '+8801712345678',
  country: 'Bangladesh',
  timezone: 'Asia/Dhaka',
  website: 'https://demostore.example',
  email: 'hello@demostore.example',
  created_at: '2026-09-01T00:00:00.000Z',
};

const mockData = {
  '/v1/user/profile': { display_name: 'Demo User', email: 'demo@lyfflow.com', profile_pic_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  '/v1/businesses': [
    { business_id: 'biz_1', name: 'Demo Store', currency: 'BDT', role: 'owner', is_owner: true, phone_number: '+8801712345678', country: 'Bangladesh', timezone: 'Asia/Dhaka' },
    { business_id: 'biz_2', name: 'Partner Shop', currency: 'USD', role: 'member', is_owner: false, phone_number: '+12025550143', country: 'United States', timezone: 'America/New_York' },
  ],
  '/v1/business/invitations': [
    { member_id: 'mem_9', business_id: 'biz_3', business_name: 'Invited Boutique', role: 'admin', invite_token: '4fa1bf7a-6f3b-48aa-b541-698fba0e3032', invite_expires_at: '2026-12-01T00:00:00.000Z' },
  ],
  '/v1/business/members': [
    { member_id: 'mem_1', invited_email: 'demo@lyfflow.com', role: 'owner', status: 'active', joined_at: '2026-09-01T00:00:00.000Z' },
    { member_id: 'mem_2', invited_email: 'alice@example.com', role: 'admin', status: 'active', joined_at: '2026-09-10T00:00:00.000Z' },
    { member_id: 'mem_3', invited_email: 'bob@example.com', role: 'member', status: 'invited', joined_at: null },
  ],
  '/v1/business/pages': [
    { page_id: 'page_1', name: 'Lyfflow Demo Page', category: 'Software', followers: 1250, agent_name: 'SalesBot', profile_pic_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', is_active: true, is_token_active: true, needs_reauth: false, token_invalid_at: null },
    // Second page is deliberately in the expired-token state so the reconnect UI is testable.
    { page_id: 'page_2', name: 'Lyfflow Support Page', category: 'Software', followers: 430, agent_name: 'SupportBot', profile_pic_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=80', is_active: true, is_token_active: false, needs_reauth: true, token_invalid_at: '2026-09-23T05:14:40.906Z' }
  ],
  '/v1/user-required-actions': { actions: [] },
'/v1/agent/on-boarding/pre-questions': [
    { question_id: 'qualify_leads', question_text: 'Should this agent qualify customers before recommending the next step?', display_order: 1 },
    { question_id: 'collect_details', question_text: 'Should this agent collect contact details when a customer is interested?', display_order: 2 },
    { question_id: 'human_handover', question_text: 'Should this agent offer a human handover when it cannot resolve a request?', display_order: 3 }
  ],
  '/v1/agent/on-boarding/pre-instructions': {
    instructions: [
      'Ask a few focused questions before making a recommendation.',
      'Collect contact details only when the customer clearly shows interest.',
      'Offer to connect the customer with a person when the request cannot be resolved.'
    ]
  },
  '/v1/subscription': {
    subscription_id: 'sub_1',
    is_active: true,
    started_at: '2026-08-01T00:00:00.000Z',
    expires_at: '2026-09-01T00:00:00.000Z',
    conversations_remaining: 3500,
    plan: {
      plan_name: 'GROWTH',
      plan_level: 2,
      price_per_month: 49,
      max_assign: 10,
      max_agents: 10,
      max_namespaces: 10,
      max_products: 200,
      max_business_members: 5,
      max_conversations_per_month: 5000,
      max_storage_bytes: 209715200
    },
    usage: {
      agent_assigned: 2,
      agent_created: 2,
      product_created: 48,
      namespace_created: 1,
      member_assigned: 3,
      conversations_used: 1500,
      storage_used: 5242880
    }
  },
  // Mirrors the plan catalog in the backend's app/seeds/plans.json.
  '/v1/plans': [
    { plan_name: 'FREE', plan_level: 0, max_agents: 20, max_assign: 20, max_namespaces: 20, max_products: 1000, max_business_members: 1, max_conversations_per_month: 10000, max_storage_bytes: 10485760, price_per_month: 0 },
    { plan_name: 'STARTER', plan_level: 1, max_agents: 3, max_assign: 3, max_namespaces: 3, max_products: 50, max_business_members: 3, max_conversations_per_month: 1000, max_storage_bytes: 52428800, price_per_month: 19 },
    { plan_name: 'GROWTH', plan_level: 2, max_agents: 10, max_assign: 10, max_namespaces: 10, max_products: 200, max_business_members: 5, max_conversations_per_month: 5000, max_storage_bytes: 209715200, price_per_month: 49 },
    { plan_name: 'AGENCY', plan_level: 3, max_agents: 999999, max_assign: 999999, max_namespaces: 999999, max_products: 1000, max_business_members: 10, max_conversations_per_month: 50000, max_storage_bytes: 1073741824, price_per_month: 99 }
  ],
  '/v1/steadfast/connect': {
    webhook_url: 'https://api.lyfflow.com/v1/steadfast/webhook/mock-user',
    auth_token: 'mock_steadfast_webhook_token'
  },
  '/v1/steadfast/orders/{order_id}/prefill': {
    invoice: 'INV-1001',
    recipient_name: 'John Doe',
    recipient_phone: '01700000000',
    alternative_phone: '',
    recipient_email: 'john@example.com',
    recipient_address: 'Dhaka, Bangladesh',
    cod_amount: 1250,
    note: 'Please call before delivery.',
    item_description: 'Customer order items',
    total_lot: 1,
    delivery_type: 0
  },
  '/v1/steadfast/orders/{order_id}/place': {
    status: 200,
    message: 'Consignment created successfully.',
    consignment: {
      consignment_id: 100001,
      invoice: 'INV-1001',
      tracking_code: 'MOCK-TRACK-1001',
      recipient_name: 'John Doe',
      recipient_phone: '01700000000',
      recipient_address: 'Dhaka, Bangladesh',
      cod_amount: 1250,
      status: 'pending',
      note: 'Please call before delivery.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  '/v1/pathao/connect': {
    status: true,
    message: 'Pathao account connected successfully.',
    webhook_url: 'https://api.lyfflow.com/v1/pathao/webhook/mock-user',
    auth_token: 'mock_pathao_webhook_token'
  },
  '/v1/pathao/orders/{order_id}/prefill': {
    invoice: 'INV-1001',
    recipient_name: 'John Doe',
    recipient_phone: '01700000000',
    recipient_address: 'House 12, Road 5, Dhanmondi, Dhaka',
    amount_to_collect: 1250,
    item_quantity: 1,
    item_weight: 0.5,
    item_description: 'Customer order items',
    special_instruction: 'Please call before delivery.',
    delivery_type: 48,
    item_type: 2
  },
  '/v1/pathao/orders/{order_id}/place': {
    message: 'Order Created Successfully',
    type: 'success',
    code: 200,
    data: { consignment_id: 'DL121224VS8TTJ', merchant_order_id: 'INV-1001', order_status: 'Pending', delivery_fee: 80 }
  },
  '/v1/pathao/orders/{consignment_id}/info': {
    message: 'Order info',
    type: 'success',
    code: 200,
    data: { consignment_id: 'DL121224VS8TTJ', merchant_order_id: 'INV-1001', order_status: 'Pending', order_status_slug: 'Pending', updated_at: new Date().toISOString(), invoice_id: null, payment_status: 'Unpaid' }
  },
  '/v1/pathao/price-plan': {
    price: 80, discount: 0, promo_discount: 0, plan_id: 69, cod_enabled: 1, cod_percentage: 0.01, additional_charge: 0, final_price: 80
  },
  '/v1/pathao/stores': {
    data: [
      { store_id: 1001, store_name: 'Main Store', store_address: 'Banani, Dhaka', is_active: 1, city_id: 1, zone_id: 1, is_default_store: true },
      { store_id: 1002, store_name: 'Chattogram Outlet', store_address: 'GEC Circle, Chattogram', is_active: 1, city_id: 2, zone_id: 3, is_default_store: false }
    ],
    total: 2
  },
  '/v1/pathao/locations': {
    data: [
      { city_id: 1, city_name: 'Dhaka', zones: [
        { zone_id: 1, zone_name: 'Banani', areas: [{ area_id: 11, area_name: 'Road 11' }, { area_id: 12, area_name: 'Kamal Ataturk Avenue' }] },
        { zone_id: 2, zone_name: 'Dhanmondi', areas: [{ area_id: 21, area_name: 'Road 27' }] }
      ] },
      { city_id: 2, city_name: 'Chattogram', zones: [
        { zone_id: 3, zone_name: 'Agrabad', areas: [{ area_id: 31, area_name: 'CDA Avenue' }] }
      ] }
    ]
  },
  '/v1/page/page_1/conversations': {
    conversations: [
      { id: 'conv_1', conversation_id: 'conv_1', name: 'John Doe', snippet: 'Hello, I need help with my order.', updated_time: new Date().toISOString(), profile_pic_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
      { id: 'conv_2', conversation_id: 'conv_2', name: 'Jane Smith', snippet: 'Is the product in stock?', updated_time: new Date().toISOString(), profile_pic_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' }
    ]
  },
  '/v1/page/page_1/conversation/conv_1': {
    messages: [
      { id: 'm1', message: 'Hello, I need help with my order.', role: 'user', created_at: new Date(Date.now() - 100000).toISOString() },
      { id: 'm2', message: 'Sure, I can help with that. What is your order number?', role: 'agent', created_at: new Date(Date.now() - 50000).toISOString() }
    ]
  },
  '/v1/page/page_1/conversation/conv_2': {
    messages: [
      { id: 'm3', message: 'Is the product in stock?', role: 'user', created_at: new Date(Date.now() - 200000).toISOString() }
    ]
  },
  '/v1/admin/login': {
    status: true,
    message: "Login successful",
    admin: {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "user@example.com",
      full_name: "Admin User",
      created_at: "2026-07-09T16:44:13.533Z"
    }
  },
  '/v1/admin/me': {
    status: true,
    admin: {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      email: "user@example.com",
      full_name: "Admin User",
      created_at: "2026-07-09T16:44:13.533Z"
    }
  },
  '/v1/admin/dashboard': {
    total_users: 1420,
    active_users: 1380,
    suspended_users: 40,
    total_subscriptions: 310,
    active_subscriptions: 295,
    total_agents: 560,
    total_pages: 340,
    total_conversations: 12450,
    total_messages: 48900,
    total_feedbacks: 180,
    total_leads: 620,
    total_conversations_used: 9620,
    total_revenue: 28450
  },
  '/v1/admin/jobs': {
    jobs: [
      {
        job_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        job_type: "initial_facebook_sync",
        status: "queued",
        duration_ms: 1240,
        created_at: "2026-07-17T06:43:09.940Z"
      },
      {
        job_id: "8bc92a11-4421-4831-a9ef-1b2c4e55de12",
        job_type: "daily_knowledge_index",
        status: "complete",
        duration_ms: 4520,
        created_at: "2026-07-17T05:12:00.120Z"
      }
    ],
    pagination: {
      next_cursor: "",
      has_more: false,
      page_size: 20,
      total: 2
    }
  },
  '/v1/admin/jobs/stats': {
    total_job: 1420,
    queued_job: 18,
    running_job: 5,
    success_job: 1385,
    failed_job: 10,
    retrying_job: 2
  },
  '/v1/admin/job/3fa85f64-5717-4562-b3fc-2c963f66afa6': {
    job_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    arq_job_id: "arq:job:3fa85f64",
    job_type: "initial_facebook_sync",
    status: "queued",
    user_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    page_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    input_payload: {
      additionalProp1: { sync_messages: true, max_history_days: 30 }
    },
    result_summary: "Job is queued for processing worker.",
    error_detail: "",
    attempt: 1,
    max_attempts: 3,
    queued_at: "2026-07-17T06:47:39.214Z",
    started_at: "2026-07-17T06:47:39.214Z",
    completed_at: "2026-07-17T06:47:39.214Z",
    duration_ms: 1240,
    created_at: "2026-07-17T06:47:39.214Z"
  },
  '/v1/admin/subscriptions': {
    subscriptions: [
      {
        subscription_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        user_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        user_display_name: "Johnathan Smith",
        user_email: "john.smith@example.com",
        profile_pic_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        plan_name: "Enterprise Plan",
        started_at: "2026-07-17T06:52:26.820Z",
        expires_at: "2027-07-17T06:52:26.820Z",
        is_active: true,
        conversations_used: 8400,
        price_per_month: 299
      },
      {
        subscription_id: "9ab85c21-1234-4567-890a-bcdef0123456",
        user_id: "71234c21-8888-4567-890a-bcdef0123456",
        user_display_name: "Sarah Jenkins",
        user_email: "s.jenkins@techcorp.io",
        profile_pic_url: "",
        plan_name: "Professional Plan",
        started_at: "2026-06-01T10:00:00.000Z",
        expires_at: "2026-07-01T10:00:00.000Z",
        is_active: false,
        conversations_used: 3100,
        price_per_month: 99
      }
    ],
    pagination: {
      next_cursor: "",
      has_more: false,
      page_size: 20,
      total: 2
    }
  },
  '/v1/pages/orders': {
    orders: MOCK_ORDERS,
    pagination: {
      next_cursor: '',
      has_more: false,
      page_size: 20,
      total: MOCK_ORDERS.length
    }
  },
  '/v1/pages/orders/{order_id}': {
    customer_order_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    page_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    conversation_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    order_id: 'ORD-1001',
    status: 'new',
    created_by: 'ai',
    total: '1250.00',
    delivery_charge: '80.00',
    delivery_address: 'House 12, Road 5, Dhanmondi, Dhaka',
    contact_name: 'John Doe',
    contact_phone: '01700000000',
    contact_email: 'john@example.com',
    order_items: [
      {
        name: 'Premium Leather Wallet',
        code: 'WAL-01',
        quantity: 1,
        price: 1170.00
      }
    ],
    notes: 'Please call before delivery.',
    created_at: '2026-09-20T14:13:25.177Z',
    updated_at: '2026-09-20T14:13:25.177Z'
  }
};

/**
 * Helper to perform fetch requests with default headers
 */
const inFlightGetRequests = new Map();
const responseCache = new Map();
let cacheGeneration = 0;

const invalidateGetState = () => {
  cacheGeneration += 1;
  responseCache.clear();
  inFlightGetRequests.clear();
};

const apiFetch = async (endpoint, options = {}) => {
  const { cacheTtl = 0, invalidateCache = false, preserveGetCache = false, bypassCache = false, ...requestOptions } = options;
  const method = (requestOptions.method || 'GET').toUpperCase();

  if (MOCK_MODE) {
    console.log(`[MOCK API] ${method} ${endpoint}`);
    if (MOCK_DELAY_MS > 0) {
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
    }
    
    const mockRole = new URLSearchParams(window.location.search).get('mockRole') || 'owner';
    if (endpoint === '/v1/business' && method === 'PATCH') {
      mockBusiness = { ...mockBusiness, ...JSON.parse(requestOptions.body || '{}') };
      return mockBusiness;
    }
    if (endpoint === '/v1/business' && method === 'GET') {
      return { business: mockBusiness, role: mockRole };
    }
    if (endpoint === '/v1/businesses' && method === 'POST') {
      const body = JSON.parse(requestOptions.body || '{}');
      // Mirrors the backend's 422 for the now-required phone number.
      if (!body.phone_number || String(body.phone_number).trim().length < 6) {
        const error = new Error('body.phone_number: Value error, Enter a valid phone number');
        error.status = 422;
        throw error;
      }
      return { business: { business_id: 'biz_new', currency: 'BDT', timezone: 'UTC', country: null, website: null, email: null, ...body, created_at: new Date().toISOString() }, role: 'owner' };
    }
    const switchMatch = endpoint.match(/^\/v1\/businesses\/([^/]+)\/switch$/);
    if (switchMatch) return { business_id: switchMatch[1], role: mockRole };
    if (endpoint === '/v1/business/members/invite') {
      const body = JSON.parse(requestOptions.body || '{}');
      return { member_id: 'mem_new', invited_email: body.email, role: body.role, status: 'invited', invite_link: `${window.location.origin}/invite?token=mock-token` };
    }
    if (endpoint.startsWith('/v1/business/members/') && method === 'PATCH') {
      return { ...mockData['/v1/business/members'][1], ...JSON.parse(requestOptions.body || '{}') };
    }
    if (endpoint === '/v1/business/members/accept') return { ...mockData['/v1/business/members'][1], status: 'active' };
    if (method === 'DELETE' && endpoint.startsWith('/v1/business')) return '';
    // ?mockNoBusiness=true simulates a first-time user with no memberships or invites.
    const mockParams = new URLSearchParams(window.location.search);
    if (MOCK_LOAD_PARAMS.get('mockNoBusiness') === 'true' && (endpoint === '/v1/businesses' || endpoint === '/v1/business/invitations')) {
      return [];
    }
    // ?mockSync=delay keeps the page list empty for ~9s after load (a background
    // Facebook sync landing); ?mockSync=never keeps it empty to reach the timeout.
    if (endpoint === '/v1/business/pages' && method === 'GET') {
      const mockSync = MOCK_LOAD_PARAMS.get('mockSync');
      if (mockSync === 'never') return { pages: [] };
      if (mockSync === 'delay' && Date.now() - MOCK_LOADED_AT < 9000) return { pages: [] };
      return { pages: mockData['/v1/business/pages'] };
    }
    // ?mockNoPlan=true: the owner has no active plan (404) until they subscribe.
    if (endpoint === '/v1/subscription/subscribe' && method === 'POST') {
      mockHasPlan = true;
      return { status: true, message: 'Subscribed (mock)' };
    }
    if (endpoint === '/v1/subscription' && !mockHasPlan) {
      const error = new Error('No active subscription found');
      error.status = 404;
      throw error;
    }
    // ?mockActions=true shows required-action banners; only the owner can act on them.
    if (endpoint === '/v1/user-required-actions') {
      if (mockParams.get('mockActions') !== 'true') return { actions: [] };
      const canAction = mockRole === 'owner';
      return {
        actions: [
          { id: 'act_1', business_id: 'biz_1', action_type: 'facebook_reauth', title: 'Reconnect your Facebook Page', description: 'Facebook invalidated the access token for Lyfflow Support Page.', reference_id: 'page_2', data: { page_id: 'page_2' }, can_action: canAction, created_at: '2026-09-29T12:00:00Z' },
          { id: 'act_2', business_id: 'biz_1', action_type: 'subscription_due', title: 'Your subscription payment is due', description: 'Renew the plan to keep agents replying.', reference_id: null, data: null, can_action: canAction, created_at: '2026-09-30T12:00:00Z' },
        ],
      };
    }
    if (endpoint === '/v1/knowledge/get-namespaces') {
      return { namespaces: MOCK_NAMESPACES };
    }
    if (/^\/v1\/knowledge\/ns_1$/.test(endpoint)) {
      return [
        { knowledge_usage_id: 'kn_1', name: 'Return policy', knowledge_type: 'text' },
        { knowledge_usage_id: 'kn_2', name: 'size-guide.pdf', knowledge_type: 'file', file_name: 'size-guide.pdf' },
      ];
    }
    if (/^\/v1\/products\/ns_1\/all-products/.test(endpoint)) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const availabilityParam = params.get('availability');
      const search = (params.get('search') || '').trim().toLowerCase();
      const items = mockProducts
        .filter(product => !search || [product.name, product.code, product.brand, product.category]
          .some(value => String(value || '').toLowerCase().includes(search)))
        .map(mockProductListItem);
      return {
        items: availabilityParam === null ? items : items.filter(item => String(item.availability) === availabilityParam),
        pagination: { has_more: false, next_cursor: null },
      };
    }
    const productDetailMatch = endpoint.match(/^\/v1\/products\/[^/]+\/detail\/([^/?]+)$/);
    if (productDetailMatch) {
      const product = mockProducts.find(item => item.product_id === productDetailMatch[1]);
      if (product) return product;
    }
    const productUpdateMatch = endpoint.match(/^\/v1\/products\/[^/]+\/update\/([^/?]+)$/);
    if (productUpdateMatch && method === 'PATCH') {
      const changes = JSON.parse(requestOptions.body || '{}');
      ['regular_price', 'sale_price'].forEach(field => { if (field in changes) changes[field] = mockMoney(changes[field]); });
      mockProducts = mockProducts.map(item => (item.product_id === productUpdateMatch[1] ? { ...item, ...changes } : item));
      return mockProducts.find(item => item.product_id === productUpdateMatch[1]);
    }
    const productDeleteMatch = endpoint.match(/^\/v1\/products\/[^/]+\/delete\/([^/?]+)$/);
    if (productDeleteMatch && method === 'DELETE') {
      mockProducts = mockProducts.filter(item => item.product_id !== productDeleteMatch[1]);
      return '';
    }
    const variantMatch = endpoint.match(/^\/v1\/products\/[^/]+\/([^/]+)\/variants(?:\/([^/?]+))?$/);
    if (variantMatch) {
      const [, productId, variantId] = variantMatch;
      const product = mockProducts.find(item => item.product_id === productId);
      if (!product) { const error = new Error('Product not found'); error.status = 404; throw error; }
      const save = (variants) => { mockProducts = mockProducts.map(item => (item.product_id === productId ? { ...item, variants } : item)); };
      if (method === 'GET') return product.variants;
      if (method === 'POST') {
        const body = JSON.parse(requestOptions.body || '{}');
        const created = { ...mockVariant(productId, product.variants.length, body.sku, body.title, body.option_values || {}, mockMoney(body.regular_price), mockMoney(body.sale_price), body.stock_quantity ?? null, body.stock_status || 'in_stock'), variant_id: `var_${Date.now()}` };
        save([...product.variants, created]);
        return created;
      }
      if (method === 'PATCH') {
        const changes = JSON.parse(requestOptions.body || '{}');
        ['regular_price', 'sale_price'].forEach(field => { if (field in changes) changes[field] = mockMoney(changes[field]); });
        save(product.variants.map(variant => (variant.variant_id === variantId ? { ...variant, ...changes } : variant)));
        return product.variants.find(variant => variant.variant_id === variantId);
      }
      if (method === 'DELETE') { save(product.variants.filter(variant => variant.variant_id !== variantId)); return ''; }
    }
    // A month of agent activity spread through each day, deterministic per agent, so
    // the analytics charts have shape at every bar size (hourly up to daily).
    const agentActivityMatch = endpoint.match(/^\/v1\/agent\/([^/]+)\/agent_activity(?:\?|$)/);
    if (agentActivityMatch) {
      const seed = agentActivityMatch[1].length;
      const agent_activities = [];
      for (let day = 0; day < 31; day += 1) {
        const perDay = 18 + ((day * 7 + seed * 3) % 23);
        for (let i = 0; i < perDay; i += 1) {
          agent_activities.push({
            activity_id: `act_${seed}_${day}_${i}`,
            response_time_ms: 900 + i * 40,
            status: i % 7 === 3 ? 'failed' : 'success',
            is_human_handover: i % 9 === 5,
            created_at: new Date(Date.now() - day * 86400000 - Math.floor((i * 86400000) / perDay) - ((i * 37 + seed * 11) % 50) * 60000).toISOString(),
          });
        }
      }
      return { agent_activities, pagination: { has_more: false, next_cursor: null, total: agent_activities.length } };
    }
    const conversationCountMatch = endpoint.match(/^\/v1\/page\/(page_\d+)\/conversations\?.*page_size=1(?:&|$)/);
    if (conversationCountMatch) {
      return { conversations: [], pagination: { has_more: true, next_cursor: null, total: conversationCountMatch[1] === 'page_1' ? 1284 : 412 } };
    }
    // A long thread for conv_1, newest first and paged like the real endpoint, so
    // scrolling and "load older messages" can be exercised in mock mode.
    if (endpoint.startsWith('/v1/page/page_1/conversation/conv_1')) {
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const size = Number(params.get('page_size')) || 20;
      const offset = Number(params.get('cursor')) || 0;
      const thread = Array.from({ length: 60 }, (_, index) => ({
        id: `m1_${index}`,
        message: index % 2 ? `Agent reply #${60 - index}: here are the details you asked about.` : `Customer message #${60 - index}: could you tell me more about this item?`,
        role: index % 2 ? 'agent' : 'user',
        created_at: new Date(MOCK_LOADED_AT - index * 5 * 60000).toISOString(),
      }));
      const hasMore = offset + size < thread.length;
      return { messages: thread.slice(offset, offset + size), pagination: { has_more: hasMore, next_cursor: hasMore ? String(offset + size) : null } };
    }
    // Product codes are unique per namespace; the mock catalog already uses these.
    if (/^\/v1\/products\/[^/]+\/create$/.test(endpoint) && method === 'POST') {
      const code = String(requestOptions.body?.get?.('code') || '').trim();
      if (['WAL-01', 'TOT-02', 'SHI-03'].includes(code.toUpperCase())) {
        const error = new Error(`Product with code '${code}' already exists in this namespace.`);
        error.status = 409;
        throw error;
      }
      const form = requestOptions.body;
      const productId = `prod_${Date.now()}`;
      const options = JSON.parse(form.get('options') || '[]');
      const variants = JSON.parse(form.get('variants') || '[]').map((variant, index) => ({
        ...mockVariant(productId, index, variant.sku, variant.title, variant.option_values || {}, mockMoney(variant.regular_price), mockMoney(variant.sale_price), variant.stock_quantity ?? null, variant.stock_status || 'in_stock'),
      }));
      const created = {
        product_id: productId, name: form.get('name'), code, product_type: form.get('product_type') || 'simple', category: form.get('category') || null,
        tags: String(form.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean), description: form.get('description'),
        regular_price: mockMoney(form.get('regular_price')), sale_price: mockMoney(form.get('sale_price')), currency: 'BDT',
        stock_status: 'in_stock', stock_quantity: null, availability: form.get('availability') !== 'false', options, variants, assets: [], primary_assets: [],
      };
      mockProducts = [created, ...mockProducts];
      return created;
    }
    if (endpoint === '/v1/agents' && method === 'GET') return mockAgents;
    if (endpoint === '/v1/agent/create' && method === 'POST') {
      const body = JSON.parse(requestOptions.body || '{}');
      const now = new Date().toISOString();
      const created = {
        agent_id: `agent_${Date.now()}`, ...body, name: body.agent_name, role: body.agent_role,
        // Omitted means the backend default; null (or '') turns it off.
        human_handover_sign: body.human_handover_sign === undefined ? '#pause' : (body.human_handover_sign || null),
        namespace_id: null, total_dialog: 0, handover_count: 0, created_at: now, updated_at: now,
      };
      mockAgents = [...mockAgents, created];
      return created;
    }
    const agentUpdateMatch = endpoint.match(/^\/v1\/agent\/update\/([^/?#]+)$/);
    if (agentUpdateMatch && method === 'PATCH') {
      const body = JSON.parse(requestOptions.body || '{}');
      if ('human_handover_sign' in body) body.human_handover_sign = body.human_handover_sign || null;
      const existing = mockAgents.find(agent => agent.agent_id === agentUpdateMatch[1]) || { agent_id: agentUpdateMatch[1] };
      const updated = { ...existing, ...body, name: body.agent_name || existing.name, updated_at: new Date().toISOString() };
      mockAgents = mockAgents.map(agent => (agent.agent_id === updated.agent_id ? updated : agent));
      return updated;
    }
    if (endpoint === '/v1/woocommerce/status') return mockWooStatus;
    if (endpoint === '/v1/woocommerce/disconnect' && method === 'DELETE') {
      mockWooStatus = MOCK_WOO_STATUSES.none;
      return { message: 'WooCommerce store disconnected successfully.' };
    }
    const wooPushMatch = endpoint.match(/^\/v1\/woocommerce\/orders\/([^/]+)\/push$/);
    if (wooPushMatch && method === 'POST') {
      const order = MOCK_ORDERS.find(item => item.customer_order_id === wooPushMatch[1]);
      const fail = (message) => { const error = new Error(message); error.status = 400; throw error; };
      if (!mockWooStatus.store_url) fail('No WooCommerce store is connected.');
      if (!order) fail('Order not found.');
      if (mockWooSync(order).wc_order_id) fail('This order is already synced to WooCommerce.');
      const wcOrderId = 5000 + MOCK_ORDERS.indexOf(order);
      mockWooPushed.set(order.customer_order_id, wcOrderId);
      return { success: true, message: 'Order push initiated successfully.', wc_order_id: wcOrderId, job_id: null };
    }
    if (endpoint === '/v1/woocommerce/orders/bulk-push' && method === 'POST') {
      if (!mockWooStatus.store_url) { const error = new Error('No WooCommerce store is connected.'); error.status = 400; throw error; }
      const ids = JSON.parse(requestOptions.body || '{}').order_ids;
      const pending = MOCK_ORDERS.filter(order => (!ids || ids.includes(order.customer_order_id)) && !mockWooSync(order).wc_order_id);
      pending.forEach(order => mockWooPushed.set(order.customer_order_id, 5000 + MOCK_ORDERS.indexOf(order)));
      return { queued_count: pending.length, message: `Successfully queued ${pending.length} order(s) for WooCommerce push.` };
    }
    if (/^\/v1\/products\/ns_1\/import\/csv\/history/.test(endpoint)) {
      return { batches: [], items: [], pagination: { has_more: false, next_cursor: null } };
    }

    if (endpoint === '/v1/api-keys' && method === 'GET') return { items: mockApiKeys };
    if (endpoint === '/v1/api-keys/create' && method === 'POST') {
      const body = JSON.parse(requestOptions.body || '{}');
      const secret = `lf_live_${Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')}`;
      const created = { api_key_id: crypto.randomUUID(), name: body.name, key: secret, key_prefix: secret.slice(0, 12), created_at: new Date().toISOString() };
      MOCK_API_KEY_SECRETS.set(secret, created.api_key_id);
      mockApiKeys = [{ api_key_id: created.api_key_id, name: created.name, key_prefix: created.key_prefix, permissions: body.permissions, is_active: true, last_used_at: null, created_at: created.created_at }, ...mockApiKeys];
      return created;
    }
    const apiKeyRevokeMatch = endpoint.match(/^\/v1\/api-keys\/([^/?#]+)$/);
    if (apiKeyRevokeMatch && method === 'DELETE') {
      mockApiKeys = mockApiKeys.map(item => (item.api_key_id === apiKeyRevokeMatch[1] ? { ...item, is_active: false } : item));
      return '';
    }

    // Exact match, supported dynamic route, or partial match for dynamic IDs
    const courierOrderMatch = endpoint.match(/^\/v1\/(steadfast|pathao)\/orders\/[^/]+\/(prefill|place|info)$/);
    const courierOrderMock = courierOrderMatch
      ? mockData[`/v1/${courierOrderMatch[1]}/orders/{${courierOrderMatch[2] === 'info' ? 'consignment_id' : 'order_id'}}/${courierOrderMatch[2]}`]
      : null;
    const pageOrderDetailMatch = endpoint.match(/^\/v1\/pages\/orders\/([^/?#]+)$/);
    const pageOrderListItem = pageOrderDetailMatch && [...Object.values(mockConversationOrders).flat(), ...MOCK_ORDERS]
      .find(order => order.customer_order_id === pageOrderDetailMatch[1]);
    const pageOrderDetailMock = pageOrderDetailMatch
      ? (pageOrderListItem
        ? { ...mockData['/v1/pages/orders/{order_id}'], ...pageOrderListItem, ...mockWooSync(pageOrderListItem) }
        : mockData['/v1/pages/orders/{order_id}'])
      : null;
    if (pageOrderDetailMatch && method === 'PATCH') {
      const updated = { ...pageOrderDetailMock, ...JSON.parse(requestOptions.body || '{}') };
      const itemsTotal = (updated.order_items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
      updated.total = (itemsTotal + Number(updated.delivery_charge || 0)).toFixed(2);
      updated.updated_at = new Date().toISOString();
      return updated;
    }
    if (pageOrderDetailMatch && method === 'DELETE') return '';
    const conversationOrdersMatch = endpoint.match(/^\/v1\/pages\/orders\/conversation\/([^/?#]+)(?:\?(.*))?$/);
    if (conversationOrdersMatch) {
      const params = new URLSearchParams(conversationOrdersMatch[2] || '');
      return (mockConversationOrders[conversationOrdersMatch[1]] || [])
        .filter(order => !params.get('status') || order.status === params.get('status'))
        .slice(0, Number(params.get('limit')) || 50);
    }
    const manualOrderCreateMatch = endpoint.match(/^\/v1\/pages\/orders\/create\/([^/?#]+)$/);
    if (manualOrderCreateMatch) {
      const body = JSON.parse(requestOptions.body || '{}');
      const itemsTotal = (body.order_items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
      const conversationId = manualOrderCreateMatch[1];
      const now = new Date().toISOString();
      const created = {
        ...mockData['/v1/pages/orders'].orders[0], ...body, created_by: 'manual',
        customer_order_id: `00000000-0000-4000-9000-${String(Date.now()).slice(-12)}`,
        order_id: `ORD-M${String(Date.now()).slice(-5)}`,
        conversation_id: conversationId, created_at: now, updated_at: now,
        total: body.total ?? (itemsTotal + Number(body.delivery_charge || 0)).toFixed(2),
      };
      mockConversationOrders[conversationId] = [created, ...(mockConversationOrders[conversationId] || [])];
      return created;
    }
    const pageOrdersListMatch = endpoint.startsWith('/v1/pages/orders');
    const pageOrdersListMock = (pageOrdersListMatch && !pageOrderDetailMatch)
      ? mockOrdersPage(endpoint)
      : null;
    const mockResponse = pageOrderDetailMock || pageOrdersListMock || mockData[endpoint] || courierOrderMock ||
                         Object.entries(mockData).find(([k]) => endpoint.startsWith(k))?.[1];

    if (mockResponse) return mockResponse;
    
    // Default empty responses for un-mocked endpoints
    if (endpoint.includes('conversations')) return [];
    if (endpoint.includes('messages')) return [];
    return { status: 'ok', message: 'Mock response' };
  }

  const url = `${API_BASE}${endpoint}`;
  const requestKey = `${method}:${url}`;

  if (invalidateCache) invalidateGetState();

  if (method === 'GET') {
    if (!bypassCache) {
      const cached = responseCache.get(requestKey);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
      if (cached) responseCache.delete(requestKey);
    }

    const inFlight = inFlightGetRequests.get(requestKey);
    if (inFlight) return inFlight;
  } else if (!preserveGetCache) {
    // Mutations can affect any dashboard aggregate, so discard short-lived GET data.
    invalidateGetState();
  }

  const requestGeneration = cacheGeneration;

  const headers = { ...requestOptions.headers };
  // If the body is FormData, let the browser set the Content-Type with the correct boundary
  if (!(requestOptions.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else {
    delete headers['Content-Type'];
  }

  const mergedOptions = {
    ...requestOptions,
    credentials: 'include', // Important: Ensures cookies/sessions are sent with every request
    headers,
  };

  const requestPromise = (async () => {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      if (response.status === 429) {
        window.dispatchEvent(new Event('lyfflow-api-rate-limit'));
        const error = new Error('Too many requests. Please slow down and try again later.');
        error.status = 429;
        throw error;
      }

      // Attempt to extract JSON error message if provided by FastAPI
      let errorMessage = 'An error occurred while fetching data';
      try {
        const errorData = await response.json();
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ');
        } else {
          errorMessage = errorData.detail || errorMessage;
        }
      } catch {
        // Ignore parsing errors for non-JSON responses
      }
      const error = new Error(errorMessage);
      error.status = response.status;
      // Session-level failures are handled once by the app shell rather than per screen:
      // 401 means the session is gone (expired, logged out, or membership revoked);
      // this 403 means the session has no business bound and must pick one.
      if (response.status === 401) {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      } else if (response.status === 403 && isNoActiveBusinessError(error)) {
        error.noActiveBusiness = true;
        window.dispatchEvent(new Event(NO_ACTIVE_BUSINESS_EVENT));
      }
      throw error;
    }

    // Parse JSON response body if content-type matches
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      if (!text) return {}; // Handle empty responses gracefully
      try {
        return JSON.parse(text);
      } catch {
        return text; // Fallback to returning text if JSON is malformed
      }
    }
    return response.text();
  })();

  if (method === 'GET') inFlightGetRequests.set(requestKey, requestPromise);

  try {
    const result = await requestPromise;
    if (method === 'GET' && cacheTtl > 0 && requestGeneration === cacheGeneration) {
      responseCache.set(requestKey, { value: result, expiresAt: Date.now() + cacheTtl });
    }
    return result;
  } finally {
    if (method === 'GET' && inFlightGetRequests.get(requestKey) === requestPromise) {
      inFlightGetRequests.delete(requestKey);
    }
  }
};

/**
 * Reads the download filename the server asked for. Content-Disposition is only
 * readable cross-origin when the API sends Access-Control-Expose-Headers, so
 * callers must always pass a fallback.
 */
const filenameFromDisposition = (disposition) => {
  if (!disposition) return null;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return encoded[1].trim();
    }
  }
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
};

/**
 * File downloads bypass apiFetch, which parses every response as JSON or text and
 * would corrupt binary content. Resolves to { blob, filename }; the caller saves it.
 */
const apiDownload = async (endpoint, fallbackFilename) => {
  if (MOCK_MODE) {
    console.log(`[MOCK API] GET ${endpoint} (download)`);
    if (MOCK_DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
    if (endpoint === '/v1/woocommerce/plugin/download') {
      // An empty but valid zip (just the end-of-central-directory record).
      const emptyZip = new Uint8Array(22);
      emptyZip.set([0x50, 0x4b, 0x05, 0x06]);
      return { blob: new Blob([emptyZip], { type: 'application/zip' }), filename: fallbackFilename.replace(/\.zip$/, '-mock.zip') };
    }
    // A stand-in so the download path is testable; not a real spreadsheet.
    const rows = 'order_id,status,contact_name,total\nORD-1001,new,John Doe,1250.00\nORD-1002,pending,Jane Smith,2400.00\n';
    return {
      blob: new Blob([rows], { type: 'text/csv' }),
      filename: fallbackFilename.replace(/\.xlsx$/, '-mock.csv'),
    };
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 429) {
      window.dispatchEvent(new Event('lyfflow-api-rate-limit'));
      const error = new Error('Too many requests. Please slow down and try again later.');
      error.status = 429;
      throw error;
    }
    let errorMessage = 'An error occurred while preparing the download';
    try {
      const errorData = await response.json();
      if (Array.isArray(errorData.detail)) {
        errorMessage = errorData.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ');
      } else {
        errorMessage = errorData.detail || errorMessage;
      }
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  return {
    blob,
    filename: filenameFromDisposition(response.headers.get('content-disposition')) || fallbackFilename,
  };
};

/**
 * Checks a key against GET /v1/api-keys/validate?api_key=…, which runs in the signed-in
 * session ("for the active business") and takes the key as a query parameter.
 *
 * This bypasses apiFetch on purpose: a rejected key can answer 401, and apiFetch reads
 * any 401 as an expired session and signs the user out. Here a 401 only means the
 * session is gone when the backend says "Not authenticated"; that error carries
 * `sessionExpired` so the caller can say so instead of blaming the key.
 * Resolves to the validation payload; rejects with `status` set on failure.
 */
const validateApiKey = async (key) => {
  if (MOCK_MODE) {
    if (MOCK_DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
    const item = mockApiKeys.find(entry => entry.api_key_id === MOCK_API_KEY_SECRETS.get(key));
    if (!item || !item.is_active) {
      const error = new Error('Invalid API key');
      error.status = 401;
      throw error;
    }
    return { valid: true, api_key_id: item.api_key_id, name: item.name, permissions: item.permissions.split(','), created_at: item.created_at };
  }

  const response = await fetch(`${API_BASE}/v1/api-keys/validate?${new URLSearchParams({ api_key: key })}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    let message = 'Could not validate this key';
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string') message = data.detail;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    const error = new Error(message);
    error.status = response.status;
    error.sessionExpired = response.status === 401 && /not authenticated/i.test(message);
    throw error;
  }
  return response.json();
};

/**
 * GET /v1/woocommerce/namespaces?api_key=… — the business and namespaces a key belongs
 * to. The WordPress plugin calls it to offer a catalog to sync into; the dashboard
 * uses it to show which catalogs a pasted key will offer.
 *
 * It authenticates with the key alone, so like validateApiKey it skips apiFetch: a
 * rejected key answers 401, which must not sign the user out. Rejects with `status`.
 * @param {string} key
 * @returns {Promise<{ business_id: string, namespaces: { namespace_id: string, namespace_name: string }[] }>}
 */
const getWooNamespacesForKey = async (key) => {
  if (MOCK_MODE) {
    if (MOCK_DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
    const item = mockApiKeys.find(entry => entry.api_key_id === MOCK_API_KEY_SECRETS.get(key));
    if (!item || !item.is_active) {
      const error = new Error('Invalid or inactive API key');
      error.status = 401;
      throw error;
    }
    return { business_id: 'biz_1', namespaces: MOCK_NAMESPACES };
  }

  const response = await fetch(`${API_BASE}/v1/woocommerce/namespaces?${new URLSearchParams({ api_key: key })}`);
  if (!response.ok) {
    let message = 'Could not load the catalogs for this key';
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string') message = data.detail;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

/**
 * POST /v1/woocommerce/plugin/connect — the WordPress plugin's handshake. The plugin
 * sends its home_url(), versions and the catalog the merchant picked, authenticated
 * with the API key in the X-API-Key header (no session). The dashboard never calls
 * this in normal use; it's here to simulate the plugin when testing.
 *
 * Skips apiFetch for the same reason as the namespaces lookup. Rejects with `status`.
 * @param {string} key
 * @param {PluginConnectRequest} body
 * @returns {Promise<PluginConnectResponse>}
 */
const connectWooPlugin = async (key, body) => {
  if (MOCK_MODE) {
    if (MOCK_DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
    const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
    const item = mockApiKeys.find(entry => entry.api_key_id === MOCK_API_KEY_SECRETS.get(key));
    if (!key) fail(401, 'API key is missing');
    if (!item || !item.is_active) fail(401, 'Invalid API key');
    if (!body?.store_url || String(body.store_url).length < 8) fail(422, 'store_url: String should have at least 8 characters');
    if (!MOCK_NAMESPACES.some(ns => ns.namespace_id === body.namespace_id)) fail(404, 'Namespace not found');
    const now = new Date().toISOString();
    mockWooStatus = {
      status: 'connected', store_url: body.store_url, namespace_id: body.namespace_id,
      last_synced_at: null, last_sync_error: null, connected_at: mockWooStatus.connected_at || now,
      plugin_connected: true, plugin_version: body.plugin_version || null, wc_version: body.wc_version || null,
      wp_version: body.wp_version || null, plugin_connected_at: now,
    };
    return { success: true, message: 'WordPress plugin connected successfully.', business_id: 'biz_1', namespace_id: body.namespace_id };
  }

  const response = await fetch(`${API_BASE}/v1/woocommerce/plugin/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = 'Could not connect the plugin';
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string') message = data.detail;
      else if (Array.isArray(data?.detail)) message = data.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ');
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const apiService = {
  // Returns current logged-in user detailsincluding profile_pic_url
  getUserProfile: () => apiFetch('/v1/user/profile', { cacheTtl: 5000 }),

  // Gets the active business's connected pages. `fresh` skips the short-lived cache,
  // which polling needs while a Facebook page sync is still landing rows.
  getPages: ({ fresh = false } = {}) => apiFetch('/v1/business/pages', { cacheTtl: 15000, bypassCache: fresh }),
  // Unlinks the page from the business; its history stays on the server.
  disconnectPage: (pageId) => apiFetch(`/v1/business/pages/${encodeURIComponent(pageId)}`, {
    method: 'DELETE',
  }),

  // Businesses. The active business lives on the server-side session, so only
  // create and switch take an id; the session cookie rotates on both.
  /**
   * @typedef {'BDT' | 'USD'} Currency
   *
   * @typedef {Object} BusinessCreateRequest
   * @property {string} name                 1-100 characters.
   * @property {string} phone_number         Required, 6-50 characters; stored as E.164.
   * @property {Currency} [currency]         Defaults to "BDT".
   * @property {string|null} [country]       Up to 100 characters.
   * @property {string|null} [timezone]      IANA name, e.g. "Asia/Dhaka"; defaults to "UTC".
   * @property {string|null} [website]       Up to 255 characters.
   * @property {string|null} [email]
   *
   * @typedef {Partial<BusinessCreateRequest>} BusinessUpdateRequest  null clears an optional field.
   *
   * @typedef {Object} BusinessResponse
   * @property {string} business_id
   * @property {string} name
   * @property {Currency} currency
   * @property {string} phone_number
   * @property {string|null} country
   * @property {string|null} timezone
   * @property {string|null} website
   * @property {string|null} email
   * @property {string} created_at
   */
  getBusinesses: () => apiFetch('/v1/businesses'),
  /** @param {BusinessCreateRequest} businessData */
  createBusiness: (businessData) => apiFetch('/v1/businesses', {
    method: 'POST',
    body: JSON.stringify(businessData),
  }),
  switchBusiness: (businessId) => apiFetch(`/v1/businesses/${encodeURIComponent(businessId)}/switch`, {
    method: 'POST',
  }),
  getActiveBusiness: () => apiFetch('/v1/business', { cacheTtl: 15000 }),
  /** @param {BusinessUpdateRequest} businessData */
  updateBusiness: (businessData) => apiFetch('/v1/business', {
    method: 'PATCH',
    body: JSON.stringify(businessData),
  }),
  deleteBusiness: () => apiFetch('/v1/business', { method: 'DELETE' }),

  // Business members & invites
  getBusinessMembers: () => apiFetch('/v1/business/members'),
  inviteBusinessMember: (email, role) => apiFetch('/v1/business/members/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  }),
  updateBusinessMemberRole: (memberId, role) => apiFetch(`/v1/business/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }),
  removeBusinessMember: (memberId) => apiFetch(`/v1/business/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
  }),
  getMyInvitations: () => apiFetch('/v1/business/invitations'),
  acceptInvite: (inviteToken) => apiFetch('/v1/business/members/accept', {
    method: 'POST',
    body: JSON.stringify({ invite_token: inviteToken }),
  }),
  rejectInvite: (inviteToken) => apiFetch('/v1/business/members/reject', {
    method: 'POST',
    body: JSON.stringify({ invite_token: inviteToken }),
  }),

  // Banners for things only a person can fix (expired FB token, unpaid plan).
  getRequiredActions: () => apiFetch('/v1/user-required-actions', { cacheTtl: 15000 }),
  resolveRequiredAction: (actionId) => apiFetch(`/v1/user-required-actions/${encodeURIComponent(actionId)}/resolve`, {
    method: 'POST',
  }),

  // Knowledge Base
  generateNamespace: (namespaceName = 'New Namespace') => apiFetch('/v1/knowledge/generate-namespace', { method: 'POST', body: JSON.stringify({ namespace_name: namespaceName }) }),
  getNamespaces: () => apiFetch('/v1/knowledge/get-namespaces', { cacheTtl: 15000 }),

  getKnowledge: (namespaceId) => apiFetch(`/v1/knowledge/${namespaceId}`),

  getKnowledgeItem: (namespaceId, knowledgeId) => apiFetch(`/v1/knowledge/${namespaceId}/${knowledgeId}`),

  createKnowledge: (namespaceId, payload) => apiFetch(`/v1/knowledge/${namespaceId}/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  uploadKnowledgeFiles: (namespaceId, formData) => apiFetch(`/v1/knowledge/${namespaceId}/upload`, {
    method: 'POST',
    body: formData,
  }),

  editKnowledge: (namespaceId, knowledgeId, updateData) => apiFetch(`/v1/knowledge/${namespaceId}/${knowledgeId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  }),

  deleteKnowledge: (namespaceId, knowledgeId) => apiFetch(`/v1/knowledge/${namespaceId}/${knowledgeId}`, {
    method: 'DELETE',
  }),

  // Products. Prices are regular_price / sale_price (decimal strings on reads), and
  // variable products carry `options` plus SKU-level `variants`, which are edited
  // through their own endpoints after the product exists.
  /**
   * @typedef {'simple'|'variable'|'bundle'|'grouped'} ProductType
   * @typedef {'in_stock'|'out_of_stock'|'on_backorder'} StockStatus
   * @typedef {{ name: string, values: string[] }} ProductOption
   *
   * @typedef {Object} ProductVariantResponse
   * @property {string} variant_id
   * @property {string} product_id
   * @property {string} sku
   * @property {string} title                     e.g. "Red / M"
   * @property {Record<string, string>} option_values  e.g. { Color: 'Red', Size: 'M' }
   * @property {string|number} regular_price
   * @property {string|number|null} sale_price
   * @property {boolean} track_inventory
   * @property {number|null} [stock_quantity]
   * @property {StockStatus} stock_status
   * @property {number} position
   * @property {boolean} is_active
   *
   * @typedef {Object} ProductListItem
   * @property {string} product_id
   * @property {string} name
   * @property {string} [code]
   * @property {ProductType} product_type
   * @property {string} regular_price             decimal string, e.g. "1170.00"
   * @property {string|null} sale_price
   * @property {string} currency                  e.g. "BDT"
   * @property {StockStatus} stock_status
   * @property {number|null} [stock_quantity]
   * @property {boolean} availability             true = available, false = unavailable
   * @property {Array<Object>} primary_assets
   *
   * @typedef {ProductListItem & { description: string, category?: string|null, tags?: string[],
   *   options: ProductOption[], variants: ProductVariantResponse[], assets: Array<Object> }} ProductDetailResponse
   *
   * @typedef {Object} CreateProductPayload  Sent as multipart form data.
   * @property {string} name
   * @property {string} code
   * @property {string} description
   * @property {string|number} regular_price      required
   * @property {string|number} [sale_price]
   * @property {ProductType} [product_type]       defaults to "simple"
   * @property {string} [category]
   * @property {string} [tags]                    comma separated
   * @property {string} [options]                 JSON of ProductOption[]
   * @property {string} [variants]                JSON of variant create requests
   * @property {boolean} [availability]
   *
   * @typedef {Object} UpdateProductPayload  Sent as JSON; no variants (use the variant endpoints).
   */

  /** @param {string} namespaceId @param {CreateProductPayload} productData */
  createProduct: (namespaceId, productData) => {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      const value = productData[key];
      // Optional fields are left out rather than sent as "null"/"undefined".
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) value.forEach(item => formData.append(key, item));
      else formData.append(key, value);
    });
    return apiFetch(`/v1/products/${namespaceId}/create`, {
      method: 'POST',
      body: formData,
    });
  },
  // `availability`: true lists in-stock products, false out-of-stock ones, null (or
  // undefined) leaves the parameter off and lists both. `search` matches name, code,
  // brand or category.
  getProducts: (namespaceId, cursor = null, pageSize = 20, availability = null, importSource = null, search = '') => {
    let url = `/v1/products/${namespaceId}/all-products?page_size=${pageSize}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (typeof availability === 'boolean') url += `&availability=${availability}`;
    if (importSource && importSource !== 'all') url += `&import_source=${importSource}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return apiFetch(url);
  },
  getProductDetail: (namespaceId, productId) => apiFetch(`/v1/products/${namespaceId}/detail/${productId}`),
  updateProduct: (namespaceId, productId, updateData) => apiFetch(`/v1/products/${namespaceId}/update/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  }),
  // Variants of a variable product.
  getProductVariants: (namespaceId, productId) => apiFetch(`/v1/products/${namespaceId}/${productId}/variants`),
  createProductVariant: (namespaceId, productId, variant) => apiFetch(`/v1/products/${namespaceId}/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(variant),
  }),
  updateProductVariant: (namespaceId, productId, variantId, changes) => apiFetch(`/v1/products/${namespaceId}/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  }),
  deleteProductVariant: (namespaceId, productId, variantId) => apiFetch(`/v1/products/${namespaceId}/${productId}/variants/${variantId}`, {
    method: 'DELETE',
  }),
  deleteProduct: (namespaceId, productId) => apiFetch(`/v1/products/${namespaceId}/delete/${productId}`, {
    method: 'DELETE',
  }),
  addProductAssets: (namespaceId, productId, formData) => apiFetch(`/v1/products/${namespaceId}/update/${productId}/add-assets`, {
    method: 'POST',
    body: formData,
  }),
  deleteProductAsset: (namespaceId, productId, assetId) => apiFetch(`/v1/products/${namespaceId}/update/${productId}/delete-assets/${assetId}`, {
    method: 'DELETE',
  }),
  setPrimaryAsset: (namespaceId, productId, assetId) => apiFetch(`/v1/products/${namespaceId}/update/${productId}/set-assets/primary`, {
    method: 'PATCH',
    body: JSON.stringify({ asset_id: assetId }),
  }),
  importProductsCsv: (namespaceId, formData) => apiFetch(`/v1/products/${namespaceId}/import/csv`, {
    method: 'POST',
    body: formData,
  }),
  getImportBatch: (namespaceId, batchId) => apiFetch(`/v1/products/${namespaceId}/import/csv/${batchId}`),
  getImportCsvHistory: (namespaceId, status = null, cursor = null, pageSize = 10) => {
    let url = `/v1/products/${namespaceId}/import/csv/history?page_size=${pageSize}`;
    if (status && status !== 'all') url += `&status=${status}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    return apiFetch(url);
  },

  // Agent Management
  getAgents: () => apiFetch('/v1/agents', { cacheTtl: 15000 }),
  setAgentNamespace: (agentId, namespaceId) => apiFetch(`/v1/agent/${agentId}/set-namespace/${namespaceId}`, { method: 'PATCH' }),
  unsetAgentNamespace: (agentId) => apiFetch(`/v1/agent/${agentId}/unset-namespace`, { method: 'PATCH' }),

  // Returns paginated activity log for a specific agent
  getAgentActivity: (agentId, cursor = null, page_size = null) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/v1/agent/${agentId}/agent_activity${qs}`);
  },
  getAgentActivityDetail: (agentId, activityId) => apiFetch(`/v1/agent/${agentId}/agent_activity/${activityId}/detail`),

  // human_handover_sign (string up to 10 characters, or null): sending it in a Messenger
  // conversation pauses or resumes the agent there. Defaults to "#pause" when omitted
  // on create; null turns it off. Agents from GET /v1/agents carry it too.
  createAgent: (agentData) => apiFetch('/v1/agent/create', {
    method: 'POST',
    body: JSON.stringify(agentData),
  }),

  getAgentPreQuestions: (agentRole) => apiFetch(`/v1/agent/on-boarding/pre-questions?agent_role=${encodeURIComponent(agentRole)}`, {
    cacheTtl: 300000,
  }),

  getAgentPreInstructions: (agentRole, answers) => apiFetch(`/v1/agent/on-boarding/pre-instructions?agent_role=${encodeURIComponent(agentRole)}`, {
    method: 'POST',
    body: JSON.stringify(answers),
    preserveGetCache: true,
  }),

  // Partial update. human_handover_sign: a new sign, or null to turn it off.
  updateAgent: (agentId, agentData) => apiFetch(`/v1/agent/update/${agentId}`, {
    method: 'PATCH',
    body: JSON.stringify(agentData),
  }),

  setAgentAvatar: (agentId, avatarConfig) => apiFetch(`/v1/agent/${agentId}/set-avatar`, {
    method: 'PATCH',
    body: JSON.stringify(avatarConfig),
  }),

  deleteAgent: (agentId) => apiFetch(`/v1/agent/delete?agent_id=${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  }),

  assignAgentToPage: (pageId, agentId) => apiFetch(`/v1/business/pages/${pageId}/assign-agent`, {
    method: 'PATCH',
    body: JSON.stringify({ agent_id: agentId }),
  }),

  unassignAgentFromPage: (pageId) => apiFetch(`/v1/business/pages/${pageId}/unassign-agent`, {
    method: 'PATCH',
  }),

  // Profile. Only display_name is editable; email comes from Google and is fixed.
  updateUserProfile: (profileData) => apiFetch('/v1/profile/update', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  }),

  // Conversations
  getPageDetails: (pageId, cursor = null, page_size = 10, isHumanNeeded = null) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    const size = page_size || 10;
    q.set('page_size', size);
    q.set('limit', size);
    if (isHumanNeeded !== null && isHumanNeeded !== undefined) {
      q.set('is_human_needed', String(isHumanNeeded));
    }
    const qs = `?${q.toString()}`;
    return apiFetch(`/v1/page/${pageId}/conversations${qs}`);
  },
  getConversationDetails: (pageId, conversationId, cursor = null, page_size = 20) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    const size = page_size || 20;
    q.set('page_size', size);
    q.set('limit', size);
    const qs = `?${q.toString()}`;
    return apiFetch(`/v1/page/${pageId}/conversation/${conversationId}${qs}`);
  },
  replyToConversation: (pageId, conversationId, message) => apiFetch(`/v1/facebook/${pageId}/messenger/${conversationId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  // Returns basic info for a conversation (name, is_human_needed, updated_time)
  getConversationInfo: (conversationId) => apiFetch(`/v1/conversations/${conversationId}/info`),

  // Returns basic info for a specific message (role, has_attachment, is_ai_msg, created_at)
  getMessageInfo: (conversationId, messageId) => apiFetch(`/v1/conversations/${conversationId}/messages/${messageId}/info`),

  setConversationPauseStatus: (pageId, conversationId, pauseStatus) => apiFetch(`/v1/agent/page/${pageId}/conversation/${conversationId}/pause`, {
    method: 'PATCH',
    body: JSON.stringify({ pause_status: pauseStatus }),
  }),

  // Integrations
  connectSteadfast: (credentials) => apiFetch('/v1/steadfast/connect', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getSteadfastOrderPrefill: (orderId) => apiFetch(
    `/v1/steadfast/orders/${encodeURIComponent(orderId)}/prefill`
  ),
  placeSteadfastOrder: (orderId, orderData) => apiFetch(
    `/v1/steadfast/orders/${encodeURIComponent(orderId)}/place`,
    {
      method: 'POST',
      body: JSON.stringify(orderData),
    }
  ),
  connectPathao: (credentials) => apiFetch('/v1/pathao/connect', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getPathaoOrderPrefill: (orderId) => apiFetch(
    `/v1/pathao/orders/${encodeURIComponent(orderId)}/prefill`
  ),
  placePathaoOrder: (orderId, orderData) => apiFetch(
    `/v1/pathao/orders/${encodeURIComponent(orderId)}/place`,
    {
      method: 'POST',
      body: JSON.stringify(orderData),
    }
  ),
  getPathaoOrderInfo: (consignmentId) => apiFetch(
    `/v1/pathao/orders/${encodeURIComponent(consignmentId)}/info`
  ),
  // Price quotes don't change server data, so keep cached stores/locations.
  calculatePathaoPrice: (priceData) => apiFetch('/v1/pathao/price-plan', {
    method: 'POST',
    body: JSON.stringify(priceData),
    preserveGetCache: true,
  }),
  getPathaoStores: () => apiFetch('/v1/pathao/stores', { cacheTtl: 60000 }),
  // City > zone > area hierarchy; large and rarely changes.
  getPathaoLocations: () => apiFetch('/v1/pathao/locations', { cacheTtl: 3600000 }),

  // WooCommerce runs through the Lyfflow WordPress plugin: the merchant creates an API
  // key here and pastes it into the plugin. The plugin lists the key's namespaces
  // (GET /v1/woocommerce/namespaces), the merchant picks the catalog to sync into, and
  // the plugin connects with POST /v1/woocommerce/plugin/connect { store_url,
  // namespace_id }. That call and DELETE /v1/woocommerce/plugin/disconnect use the API
  // key and are made by the plugin only; the dashboard disconnects with the session.
  /**
   * @typedef {Object} WooCommerceStatusResponse
   * @property {string} status                 "connected", "auth_failed", "disabled", "not_connected", …
   * @property {string|null} [store_url]
   * @property {string|null} [namespace_id]
   * @property {string|null} [last_synced_at]
   * @property {string|null} [last_sync_error]
   * @property {string|null} [connected_at]
   * @property {boolean} plugin_connected       true once the plugin handshake succeeded
   * @property {string|null} [plugin_version]
   * @property {string|null} [wc_version]
   * @property {string|null} [wp_version]
   * @property {string|null} [plugin_connected_at]
   *
   * @typedef {Object} WooCommerceNamespaceListResponse   GET /v1/woocommerce/namespaces
   * @property {string} business_id
   * @property {{ namespace_id: string, namespace_name: string }[]} namespaces
   *
   * @typedef {Object} PluginConnectRequest   POST /v1/woocommerce/plugin/connect
   * @property {string} store_url              The store's home_url(), 8-500 characters.
   * @property {string} namespace_id           Catalog the store's products sync into.
   * @property {string|null} [plugin_version]
   * @property {string|null} [wc_version]
   * @property {string|null} [wp_version]
   *
   * @typedef {Object} PluginConnectResponse
   * @property {boolean} success
   * @property {string} message
   * @property {string} business_id
   * @property {string} namespace_id
   *
   * @typedef {{ success: boolean, message: string, wc_order_id?: number|null, job_id?: string|null }} OrderPushResponse
   * @typedef {{ queued_count: number, message: string }} OrderBulkPushResponse
   */
  /** @param {{ fresh?: boolean }} [options] fresh skips the 15s cache (after "Check again"). */
  getWooCommerceStatus: ({ fresh = false } = {}) => apiFetch('/v1/woocommerce/status', fresh ? { bypassCache: true } : { cacheTtl: 15000 }),
  // Owner only.
  disconnectWooCommerce: () => apiFetch('/v1/woocommerce/disconnect', { method: 'DELETE' }),
  // The catalogs the plugin will offer for this key (see getWooNamespacesForKey).
  getWooNamespacesForKey: (key) => getWooNamespacesForKey(key),
  // The plugin's own handshake, for simulating it in tests (see connectWooPlugin).
  connectWooPlugin: (key, body) => connectWooPlugin(key, body),
  // The plugin zip for manual install. Needs the session (401 without it), so it goes
  // through apiDownload rather than a plain link. Resolves to { blob, filename }.
  downloadWooPlugin: () => apiDownload('/v1/woocommerce/plugin/download', 'lyfflow-woocommerce.zip'),
  // Retries (or first-time pushes) one order. Orders are pushed automatically when
  // created, so this is for failures and manual nudges. 30 requests a minute.
  pushWooOrder: (orderId) => apiFetch(`/v1/woocommerce/orders/${encodeURIComponent(orderId)}/push`, { method: 'POST' }),
  // Owner only; null/omitted ids pushes every unsynced order. 5 requests a minute.
  bulkPushWooOrders: (orderIds = null) => apiFetch('/v1/woocommerce/orders/bulk-push', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds }),
  }),

  // General AI Chat
  aiChat: (prompt) => apiFetch(`/v1/chat?prompt=${encodeURIComponent(prompt)}`, {
    method: 'POST',
  }),

  // Leads
  createLead: (leadData) => apiFetch('/v1/leads/create', {
    method: 'POST',
    body: JSON.stringify(leadData),
  }),

  // Feedback
  submitFeedback: (feedbackData) => apiFetch('/v1/feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData),
  }),

  // API keys for programmatic access (plugins, scripts). The full key is only ever
  // returned by createApiKey; the list carries a prefix.
  fetchApiKeys: () => apiFetch('/v1/api-keys'),
  createApiKey: ({ name, permissions }) => apiFetch('/v1/api-keys/create', {
    method: 'POST',
    body: JSON.stringify({ name, permissions }),
  }),
  revokeApiKey: (apiKeyId) => apiFetch(`/v1/api-keys/${encodeURIComponent(apiKeyId)}`, { method: 'DELETE' }),
  validateApiKey: (key) => validateApiKey(key),

  // Subscriptions
  getPlans: () => apiFetch('/v1/plans', { cacheTtl: 300000 }),
  getSubscription: () => apiFetch('/v1/subscription', { cacheTtl: 15000 }),

  subscribe: (subscriptionData) => apiFetch('/v1/subscription/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscriptionData),
  }),

  // Captured customer leads
  getCustomerLeads: ({ page_id, status, cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (page_id) q.set('page_id', page_id);
    if (status) q.set('status', status);
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/v1/pages/leads${qs}`);
  },
  getCustomerLead: (leadId) => apiFetch(`/v1/pages/leads/${leadId}`),
  updateCustomerLeadStatus: (leadId, status) => apiFetch(`/v1/pages/leads/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),

  // Captured customer orders
  getCustomerOrders: ({ page_id, status, cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (page_id) q.set('page_id', page_id);
    if (status) q.set('status', status);
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/v1/pages/orders${qs}`);
  },
  getCustomerOrder: (orderId) => apiFetch(`/v1/pages/orders/${encodeURIComponent(orderId)}`),
  // Orders placed in one conversation, newest first, as full order details
  // (OrderResponseDetail[]; [] when there are none). status filters; limit is 1-50
  // (default 50). 403 when the conversation isn't in the active business, 404 when
  // it doesn't exist.
  getConversationOrders: (conversationId, { status, limit } = {}) => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (limit) q.set('limit', limit);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/v1/pages/orders/conversation/${encodeURIComponent(conversationId)}${qs}`);
  },
  // Streams matching orders back as a generated .xlsx; every filter is optional.
  exportCustomerOrders: ({ page_id, status, created_by, start_date, end_date } = {}) => {
    const q = new URLSearchParams();
    if (page_id) q.set('page_id', page_id);
    if (status) q.set('status', status);
    if (created_by) q.set('created_by', created_by);
    if (start_date) q.set('start_date', start_date);
    if (end_date) q.set('end_date', end_date);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const stamp = new Date().toISOString().slice(0, 10);
    return apiDownload(`/v1/pages/orders/export${qs}`, `customer-orders-${stamp}.xlsx`);
  },
  /**
   * @typedef {Object} OrderItem
   * @property {string} name          1-200 characters.
   * @property {number} quantity      Whole number, at least 1.
   * @property {number} price         Unit price, 0 or more.
   * @property {string|null} code     Product code / SKU. Listed as required but
   *                                  nullable, so send null rather than omitting it.
   */
  // Manually record an order against a conversation (created_by = "manual").
  // orderData.order_items: OrderItem[].
  createManualOrder:(conversationId, orderData) => apiFetch(
    `/v1/pages/orders/create/${encodeURIComponent(conversationId)}`,
    {
      method: 'POST',
      body: JSON.stringify(orderData),
    }
  ),
  // Partial update; only the fields sent are applied and the backend recalculates total.
  // order_items (OrderItem[]) replaces the whole list.
  updateCustomerOrder: (orderId, orderData) => apiFetch(`/v1/pages/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify(orderData),
  }),
  // Soft delete; responds 204 with no body.
  deleteCustomerOrder: (orderId) => apiFetch(`/v1/pages/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
  }),
  updateCustomerOrderStatus: (orderId, status) => apiFetch(`/v1/pages/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),

  // Notifications
  getNotifications: ({ category, page_id, unread_only, cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (category) q.set('category', category);
    if (page_id) q.set('page_id', page_id);
    if (unread_only) q.set('unread_only', 'true');
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', String(page_size));
    const qs = q.toString() ? `?${q}` : '';
    return apiFetch(`/v1/notifications${qs}`);
  },

  getUnreadNotificationCount: () => apiFetch('/v1/notifications/unread-count'),

  // An empty body tells the backend to mark every unread notification.
  markNotificationsRead: (notificationIds) => apiFetch('/v1/notifications/read', {
    method: 'POST',
    body: JSON.stringify(notificationIds?.length ? { notification_ids: notificationIds } : {}),
    preserveGetCache: true,
  }),

  deleteNotification: (notificationId) => apiFetch(`/v1/notifications/${notificationId}`, {
    method: 'DELETE',
    preserveGetCache: true,
  }),

  // Admin
  adminLogin: (credentials) => apiFetch('/v1/admin/login', { method: 'POST', body: JSON.stringify(credentials) }),
  adminMe: () => apiFetch('/v1/admin/me', { cacheTtl: 5000 }),
  adminDashboard: () => apiFetch('/v1/admin/dashboard', { cacheTtl: 5000 }),
  adminUsers: ({ cursor, page_size, status, search } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (status) q.set('status', status);
    if (search) q.set('search', search);
    return apiFetch(`/v1/admin/users?${q}`);
  },
  adminGetUser: (userId) => apiFetch(`/v1/admin/users/${userId}`),
  adminChangeUserStatus: (userId, status) => apiFetch(`/v1/admin/users/${userId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
  adminSubscriptions: ({ cursor, page_size, plan_type, active_only } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (plan_type) q.set('plan_type', plan_type);
    if (active_only !== undefined) q.set('active_only', active_only);
    return apiFetch(`/v1/admin/subscriptions?${q}`);
  },
  adminGetSubscription: (subId) => apiFetch(`/v1/admin/subscription/${subId}`),
  adminRevenue: () => apiFetch('/v1/admin/revenue'),
  adminAgents: ({ cursor, page_size, user_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    return apiFetch(`/v1/admin/agents?${q}`);
  },
  adminOnboardingQuestions: ({ is_active } = {}) => {
    const q = new URLSearchParams();
    if (typeof is_active === 'boolean') q.set('is_active', String(is_active));
    const qs = q.toString();
    return apiFetch(`/v1/admin/agent/onboarding-questions${qs ? `?${qs}` : ''}`);
  },
  adminCreateOnboardingQuestion: (payload) => apiFetch('/v1/admin/agent/onboarding-question/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  adminUpdateOnboardingQuestion: (questionId, payload) => apiFetch(`/v1/admin/agent/onboarding-question/update/${encodeURIComponent(questionId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  adminDeleteOnboardingQuestion: (questionId) => apiFetch(`/v1/admin/agent/onboarding-question/delete/${encodeURIComponent(questionId)}`, {
    method: 'DELETE',
  }),
  adminPages: ({ cursor, page_size, user_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    return apiFetch(`/v1/admin/pages?${q}`, { cacheTtl: 30000 });
  },
  adminConversations: ({ cursor, page_size, page_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (page_id) q.set('page_id', page_id);
    return apiFetch(`/v1/admin/conversations?${q}`);
  },
  adminGetCheckpointerState: (conversationId) => apiFetch(`/v1/admin/user/get-checkpointer-state/${conversationId}`),
  adminFeedbacks: ({ cursor, page_size, type } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (type) q.set('type', type);
    return apiFetch(`/v1/admin/feedbacks?${q}`);
  },
  adminLeads: ({ cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    return apiFetch(`/v1/admin/leads?${q}`);
  },
  adminActivityStats: (start_date, end_date) => {
    const q = new URLSearchParams();
    if (start_date) q.set('start_date', start_date);
    if (end_date) q.set('end_date', end_date);
    return apiFetch(`/v1/admin/activity/stats?${q}`);
  },
  adminActivityDaily: (start_date, end_date) => {
    const q = new URLSearchParams();
    if (start_date) q.set('start_date', start_date);
    if (end_date) q.set('end_date', end_date);
    return apiFetch(`/v1/admin/activity/daily?${q}`);
  },
  adminActivityRecent: ({ cursor, page_size, agent_id, user_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (agent_id) q.set('agent_id', agent_id);
    if (user_id) q.set('user_id', user_id);
    return apiFetch(`/v1/admin/activity/recent?${q}`);
  },
  adminGetActivity: (activityId) => apiFetch(`/v1/admin/activity/${activityId}`),
  adminProducts: ({ cursor, page_size, user_id, namespace_id, category } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    if (namespace_id) q.set('namespace_id', namespace_id);
    if (category) q.set('category', category);
    return apiFetch(`/v1/admin/products?${q}`);
  },
  adminCustomerLeads: ({ cursor, page_size, page_id, status } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (page_id) q.set('page_id', page_id);
    if (status) q.set('status', status);
    return apiFetch(`/v1/admin/captured-leads?${q}`);
  },
  adminCustomerOrders: ({ cursor, page_size, page_id, status } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (page_id) q.set('page_id', page_id);
    if (status) q.set('status', status);
    return apiFetch(`/v1/admin/captured-orders?${q}`);
  },
  adminKnowledges: ({ cursor, page_size, user_id, namespace_id, knowledge_type } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    if (namespace_id) q.set('namespace_id', namespace_id);
    if (knowledge_type) q.set('knowledge_type', knowledge_type);
    return apiFetch(`/v1/admin/knowledges?${q}`);
  },
  adminNamespaces: ({ cursor, page_size, user_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    return apiFetch(`/v1/admin/namespaces?${q}`);
  },
  adminPlatforms: ({ cursor, page_size, user_id, platform_type } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    if (platform_type) q.set('platform_type', platform_type);
    return apiFetch(`/v1/admin/platforms?${q}`);
  },
  adminJobs: ({ cursor, page_size, status, job_type, user_id, page_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (status) q.set('job_status', status);
    if (job_type) q.set('job_type', job_type);
    if (user_id) q.set('user_id', user_id);
    if (page_id) q.set('page_id', page_id);
    return apiFetch(`/v1/admin/jobs?${q}`);
  },
  adminGetJob: (jobId) => apiFetch(`/v1/admin/job/${jobId}`),
  adminJobStats: () => apiFetch('/v1/admin/jobs/stats'),
  adminGetConversationMessages: (conversationId, { cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q}` : '';
    return apiFetch(`/v1/admin/conversations/${conversationId}${qs}`);
  },
};
