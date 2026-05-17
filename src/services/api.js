/**
 * API Service for interacting with the LYFFLOW Backend
 */

// Since we setup a proxy in Vite, we can just use relative paths locally
// In production, this might need to be an absolute URL if the frontend and backend servers differ
const API_BASE = '';

// Set to true to test frontend without a running backend
const MOCK_MODE = window.location.search.includes('mock=true');

const mockData = {
  '/api/user/': { user: { id: 'mock_123', first_name: 'Demo', last_name: 'User', display_name: 'Demo User', email: 'demo@lyfflow.com' } },
  '/api/pages': [
    { page_id: 'page_1', name: 'Lyfflow Demo Page', category: 'Software', followers: 1250, agent_name: 'SalesBot' }
  ],
  '/api/agents': [
    { agent_id: 'agent_1', name: 'SalesBot', role: 'Sales' },
    { agent_id: 'agent_2', name: 'SupportBot', role: 'Support' }
  ],
  '/api/subscription': { is_active: true, plan: { plan_name: 'Enterprise', price: 99 } },
  '/api/page/page_1/conversations': {
    conversations: [
      { id: 'conv_1', name: 'John Doe', snippet: 'Hello, I need help with my order.', updated_time: new Date().toISOString() },
      { id: 'conv_2', name: 'Jane Smith', snippet: 'Is the product in stock?', updated_time: new Date().toISOString() }
    ]
  },
  '/api/page/page_1/conversation/conv_1': {
    messages: [
      { id: 'm1', message: 'Hello, I need help with my order.', role: 'user', created_at: new Date(Date.now() - 100000).toISOString() },
      { id: 'm2', message: 'Sure, I can help with that. What is your order number?', role: 'agent', created_at: new Date(Date.now() - 50000).toISOString() }
    ]
  },
  '/api/page/page_1/conversation/conv_2': {
    messages: [
      { id: 'm3', message: 'Is the product in stock?', role: 'user', created_at: new Date(Date.now() - 200000).toISOString() }
    ]
  }
};

/**
 * Helper to perform fetch requests with default headers
 */
const apiFetch = async (endpoint, options = {}) => {
  if (MOCK_MODE) {
    console.log(`[MOCK API] ${options.method || 'GET'} ${endpoint}`);
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

  const headers = { ...options.headers };
  // If the body is FormData, let the browser set the Content-Type with the correct boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else {
    delete headers['Content-Type'];
  }

  const mergedOptions = {
    ...options,
    credentials: 'include', // Important: Ensures cookies/sessions are sent with every request
    headers,
  };

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
    } catch (e) {
      // Ignore parsing errors for non-JSON responses
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  // Parse JSON response body if content-type matches
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

export const apiService = {
  // Returns current logged-in user details
  getUserProfile: () => apiFetch('/api/user/'),

  // Explicit logout
  logout: () => apiFetch('/api/logout'),

  // Gets the connected Facebook Pages
  getPages: () => apiFetch('/api/pages'),

  // Knowledge Base
  getKnowledge: (pageId) => apiFetch(`/api/knowledge/${pageId}`),

  getKnowledgeItem: (pageId, knowledgeId) => apiFetch(`/api/knowledge/${pageId}/${knowledgeId}`),

  createKnowledge: (pageId, payload) => apiFetch(`/api/knowledge/${pageId}/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  uploadKnowledgeFiles: (pageId, formData) => apiFetch(`/api/knowledge/${pageId}/upload`, {
    method: 'POST',
    body: formData,
  }),

  editKnowledge: (pageId, knowledgeId, updateData) => apiFetch(`/api/knowledge/${pageId}/${knowledgeId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  }),

  deleteKnowledge: (pageId, knowledgeId) => apiFetch(`/api/knowledge/${pageId}/${knowledgeId}`, {
    method: 'DELETE',
  }),

  // Agent Management
  getAgents: () => apiFetch('/api/agents'),

  // Returns paginated activity log for a specific agent
  getAgentActivity: (agentId, cursor = null, page_size = null) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/api/agent/${agentId}/agent_activity${qs}`);
  },

  createAgent: (agentData) => apiFetch('/api/agent/create', {
    method: 'POST',
    body: JSON.stringify(agentData),
  }),

  updateAgent: (agentId, agentData) => apiFetch(`/api/agent/update/${agentId}`, {
    method: 'PATCH',
    body: JSON.stringify(agentData),
  }),

  deleteAgent: (agentId) => apiFetch(`/api/agent/delete?agent_id=${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  }),

  assignAgentToPage: (pageId, agentId) => apiFetch(`/api/page/${pageId}/assign-agent`, {
    method: 'PATCH',
    body: JSON.stringify({ agent_id: agentId }),
  }),

  unassignAgentFromPage: (pageId) => apiFetch(`/api/page/${pageId}/unassign-agent`, {
    method: 'PATCH',
  }),

  // Profile
  getProfilePic: (userId) => apiFetch(`/api/user/profile_pic/${userId}`),
  updateUserProfile: (profileData) => apiFetch('/api/user/profile/update', {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  }),

  // Conversations
  getPageDetails: (pageId, cursor = null, page_size = null) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/api/page/${pageId}/conversations${qs}`);
  },
  getConversationDetails: (pageId, conversationId, cursor = null, page_size = null) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch(`/api/page/${pageId}/conversation/${conversationId}${qs}`);
  },
  replyToConversation: (pageId, conversationId, message) => apiFetch(`/api/facebook/${pageId}/messenger/${conversationId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  // Returns basic info for a conversation (name, is_human_needed, updated_time)
  getConversationInfo: (conversationId) => apiFetch(`/api/conversations/${conversationId}/info`),

  // Returns basic info for a specific message (role, has_attachment, is_ai_msg, created_at)
  getMessageInfo: (conversationId, messageId) => apiFetch(`/api/conversations/${conversationId}/messages/${messageId}/info`),

  setConversationPauseStatus: (pageId, conversationId, pauseStatus) => apiFetch(`/api/agent/page/${pageId}/conversation/${conversationId}/pause`, {
    method: 'PATCH',
    body: JSON.stringify({ pause_status: pauseStatus }),
  }),

  // Auth / Reauth
  getFacebookReauthUrl: () => apiFetch('/api/auth/facebook/reauth'),

  // General AI Chat
  aiChat: (prompt) => apiFetch(`/api/chat?prompt=${encodeURIComponent(prompt)}`, {
    method: 'POST',
  }),

  // Leads
  createLead: (leadData) => apiFetch('/api/leads/create', {
    method: 'POST',
    body: JSON.stringify(leadData),
  }),

  // Feedback
  submitFeedback: (feedbackData) => apiFetch('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData),
  }),

  // Subscriptions
  getPlans: () => apiFetch('/api/plans'),
  getSubscription: () => apiFetch('/api/subscription'),

  subscribe: (subscriptionData) => apiFetch('/api/subscription/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscriptionData),
  }),

  // Admin
  adminLogin: (credentials) => apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify(credentials) }),
  adminMe: () => apiFetch('/api/admin/me'),
  adminDashboard: () => apiFetch('/api/admin/dashboard'),
  adminUsers: ({ cursor, page_size, status, search } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (status) q.set('status', status);
    if (search) q.set('search', search);
    return apiFetch(`/api/admin/users?${q}`);
  },
  adminChangeUserStatus: (userId, status) => apiFetch(`/api/admin/users/${userId}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  }),
  adminSubscriptions: ({ cursor, page_size, plan_type, active_only } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (plan_type) q.set('plan_type', plan_type);
    if (active_only !== undefined) q.set('active_only', active_only);
    return apiFetch(`/api/admin/subscriptions?${q}`);
  },
  adminRevenue: () => apiFetch('/api/admin/revenue'),
  adminAgents: ({ cursor, page_size, user_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    return apiFetch(`/api/admin/agents?${q}`);
  },
  adminPages: ({ cursor, page_size, user_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (user_id) q.set('user_id', user_id);
    return apiFetch(`/api/admin/pages?${q}`);
  },
  adminConversations: ({ cursor, page_size, page_id } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (page_id) q.set('page_id', page_id);
    return apiFetch(`/api/admin/conversations?${q}`);
  },
  adminFeedbacks: ({ cursor, page_size, type } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    if (type) q.set('type', type);
    return apiFetch(`/api/admin/feedbacks?${q}`);
  },
  adminLeads: ({ cursor, page_size } = {}) => {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    if (page_size) q.set('page_size', page_size);
    return apiFetch(`/api/admin/leads?${q}`);
  },
  adminActivityStats: (start_date, end_date) => {
    const q = new URLSearchParams();
    if (start_date) q.set('start_date', start_date);
    if (end_date) q.set('end_date', end_date);
    return apiFetch(`/api/admin/activity/stats?${q}`);
  },
  adminActivityDaily: (start_date, end_date) => {
    const q = new URLSearchParams();
    if (start_date) q.set('start_date', start_date);
    if (end_date) q.set('end_date', end_date);
    return apiFetch(`/api/admin/activity/daily?${q}`);
  },
};
