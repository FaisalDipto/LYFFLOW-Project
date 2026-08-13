/**
 * API Service for interacting with the LYFFLOW Backend
 */

// Since we setup a proxy in Vite, we can just use relative paths locally
// In production, this might need to be an absolute URL if the frontend and backend servers differ

import { API_BASE } from '../config/env';

// Set to true to test frontend without a running backend
const MOCK_MODE = window.location.search.includes('mock=true');

const mockData = {
  '/v1/user/profile': { user: { id: 'mock_123', first_name: 'Demo', last_name: 'User', display_name: 'Demo User', email: 'demo@lyfflow.com', profile_pic_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' } },
  '/v1/user/': { user: { id: 'mock_123', first_name: 'Demo', last_name: 'User', display_name: 'Demo User', email: 'demo@lyfflow.com' } },
  '/v1/pages': [
    { page_id: 'page_1', name: 'Lyfflow Demo Page', category: 'Software', followers: 1250, agent_name: 'SalesBot', profile_pic_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' }
  ],
  '/v1/agents': [
    { agent_id: 'agent_1', name: 'SalesBot', role: 'Sales' },
    { agent_id: 'agent_2', name: 'SupportBot', role: 'Support' }
  ],
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
  '/v1/subscription': { is_active: true, plan: { plan_name: 'Enterprise', price: 99 } },
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
    total_tokens_used: 1542000,
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
        tokens_used: 125400,
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
        tokens_used: 48200,
        price_per_month: 99
      }
    ],
    pagination: {
      next_cursor: "",
      has_more: false,
      page_size: 20,
      total: 2
    }
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
  const { cacheTtl = 0, invalidateCache = false, preserveGetCache = false, ...requestOptions } = options;
  const method = (requestOptions.method || 'GET').toUpperCase();

  if (MOCK_MODE) {
    console.log(`[MOCK API] ${method} ${endpoint}`);
    await new Promise(r => setTimeout(r, 400)); // Simulate latency
    
    // Exact match or partial match for dynamic IDs
    const mockResponse = mockData[endpoint] || 
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
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (cached) responseCache.delete(requestKey);

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

export const apiService = {
  // Returns current logged-in user details including profile_pic_url
  getUserProfile: () => apiFetch('/v1/user/profile', { cacheTtl: 5000 }),

  // Explicit logout
  logout: () => apiFetch('/v1/logout', { invalidateCache: true }),

  // Gets the connected Facebook Pages
  getPages: () => apiFetch('/v1/pages', { cacheTtl: 15000 }),

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

  // Products
  createProduct: (namespaceId, productData) => {
    const formData = new FormData();
    Object.keys(productData).forEach(key => {
      if (Array.isArray(productData[key])) {
        // Append array items individually (e.g. tags)
        productData[key].forEach(val => formData.append(key, val));
      } else {
        formData.append(key, productData[key]);
      }
    });
    return apiFetch(`/v1/products/${namespaceId}/create`, {
      method: 'POST',
      body: formData,
    });
  },
  getProducts: (namespaceId, cursor = null, pageSize = 20, isActive = null, importSource = null) => {
    let url = `/v1/products/${namespaceId}/all-products?page_size=${pageSize}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    if (isActive !== null) url += `&is_active=${isActive}`;
    if (importSource && importSource !== 'all') url += `&import_source=${importSource}`;
    return apiFetch(url);
  },
  getProductDetail: (namespaceId, productId) => apiFetch(`/v1/products/${namespaceId}/detail/${productId}`),
  updateProduct: (namespaceId, productId, updateData) => apiFetch(`/v1/products/${namespaceId}/update/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
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

  assignAgentToPage: (pageId, agentId) => apiFetch(`/v1/page/${pageId}/assign-agent`, {
    method: 'PATCH',
    body: JSON.stringify({ agent_id: agentId }),
  }),

  unassignAgentFromPage: (pageId) => apiFetch(`/v1/page/${pageId}/unassign-agent`, {
    method: 'PATCH',
  }),

  // Profile
  getProfilePic: (userId) => apiFetch(`/v1/user/profile_pic/${userId}`),
  updateUserProfile: (profileData) => apiFetch('/v1/user/profile/update', {
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

  // Auth / Reauth
  getFacebookReauthUrl: () => apiFetch('/v1/auth/facebook/reauth'),

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

  // Subscriptions
  getPlans: () => apiFetch('/v1/plans', { cacheTtl: 300000 }),
  getSubscription: () => apiFetch('/v1/subscription', { cacheTtl: 15000 }),

  subscribe: (subscriptionData) => apiFetch('/v1/subscription/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscriptionData),
  }),

  // Captured customer leads
  getCustomerLeads: (pageId, { status, cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/v1/pages/${pageId}/leads${qs}`);
  },
  getCustomerLead: (pageId, leadId) => apiFetch(`/v1/pages/${pageId}/leads/${leadId}`),
  updateCustomerLeadStatus: (pageId, leadId, status) => apiFetch(`/v1/pages/${pageId}/leads/${leadId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),

  // Captured customer orders
  getCustomerOrders: (pageId, { status, cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/v1/pages/${pageId}/orders${qs}`);
  },
  getCustomerOrder: (pageId, orderId) => apiFetch(`/v1/pages/${pageId}/orders/${orderId}`),
  updateCustomerOrderStatus: (pageId, orderId, status) => apiFetch(`/v1/pages/${pageId}/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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
    return apiFetch(`/v1/admin/customer-leads?${q}`);
  },
  adminCustomerOrders: ({ cursor, page_size, page_id, status } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (page_id) q.set('page_id', page_id);
    if (status) q.set('status', status);
    return apiFetch(`/v1/admin/customer-orders?${q}`);
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
