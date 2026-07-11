import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/api';

export default function CheckpointerDebugModal({ conversationId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'messages' | 'configs'
  const [expandedMsgIds, setExpandedMsgIds] = useState(new Set());
  const [visibleMsgLimit, setVisibleMsgLimit] = useState(30);
  const [traceFilterType, setTraceFilterType] = useState('all');
  const [traceSearch, setTraceSearch] = useState('');

  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    apiService.adminGetCheckpointerState(conversationId)
      .then(res => {
        const payload = res?.data || res;
        setData(payload);
      })
      .catch(err => {
        setError(err.message || 'Failed to load checkpointer state.');
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  const toggleMsgExpand = (id) => {
    setExpandedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!conversationId) return null;

  const state = data?.state || {};
  const messages = Array.isArray(state.messages) ? state.messages : [];
  const toolsUsed = Array.isArray(state.tools_used) ? state.tools_used : [];
  const knowledgeSource = Array.isArray(state.knowledge_source) ? state.knowledge_source : [];
  const nextActions = Array.isArray(data?.next) ? data.next : [];

  const fmtNum = (n) => (n || 0).toLocaleString();

  const safeStr = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  };

  const renderMsgContent = (content) => {
    if (content === null || content === undefined || content === '') {
      return <span className="text-slate-400 italic">No text content</span>;
    }
    if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
      return <span>{String(content)}</span>;
    }
    if (Array.isArray(content)) {
      return (
        <div className="space-y-2">
          {content.map((item, idx) => (
            <div key={idx} className="overflow-x-auto">
              {typeof item === 'object' && item !== null ? (
                item.type === 'image_url' || item.image_url ? (
                  <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">image</span>
                      Multimodal Image Input
                    </p>
                    {item.image_url?.url && (
                      <img
                        src={item.image_url.url}
                        alt="Multimodal content"
                        className="max-h-56 rounded-lg border border-slate-300 shadow-sm object-contain bg-white"
                      />
                    )}
                    <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto bg-white p-2 rounded border border-slate-200">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ) : item.type === 'text' && item.text ? (
                  <p className="whitespace-pre-wrap">{item.text}</p>
                ) : (
                  <pre className="text-[11px] font-mono bg-slate-100 p-2.5 rounded-lg overflow-x-auto border border-slate-200 text-slate-700">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                )
              ) : (
                renderMsgContent(item)
              )}
            </div>
          ))}
        </div>
      );
    }
    if (typeof content === 'object') {
      if (content.type === 'image_url' || content.image_url) {
        return (
          <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 space-y-1.5">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">image</span>
              Multimodal Image Object
            </p>
            {content.image_url?.url && (
              <img
                src={content.image_url.url}
                alt="Multimodal content"
                className="max-h-56 rounded-lg border border-slate-300 shadow-sm object-contain bg-white"
              />
            )}
            <pre className="text-[10px] font-mono text-slate-600 overflow-x-auto bg-white p-2 rounded border border-slate-200">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        );
      }
      return (
        <pre className="text-[11px] font-mono bg-slate-100 p-2.5 rounded-lg overflow-x-auto border border-slate-200 text-slate-700">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    }
    return <span>{String(content)}</span>;
  };

  const filteredMessages = messages.filter((msg) => {
    if (traceFilterType !== 'all' && (msg.type || 'ai') !== traceFilterType) return false;
    if (traceSearch.trim()) {
      const q = traceSearch.toLowerCase();
      const contentStr = safeStr(msg.content).toLowerCase();
      const nameStr = safeStr(msg.name).toLowerCase();
      const toolStr = Array.isArray(msg.tool_calls) ? JSON.stringify(msg.tool_calls).toLowerCase() : '';
      if (!contentStr.includes(q) && !nameStr.includes(q) && !toolStr.includes(q)) return false;
    }
    return true;
  });

  const displayedMessages = filteredMessages.slice(0, visibleMsgLimit);

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <span className="material-symbols-outlined text-[22px]">memory</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Checkpointer State Debugger</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-mono text-indigo-300">
                  ID: {conversationId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Thread: {data?.thread_id || state.conversation_id || '—'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200"
            title="Close debugger"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-sm'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            Overview & Tokens
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'messages'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-sm'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">forum</span>
            Messages Trace ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab('configs')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'configs'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-sm'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">settings_applications</span>
            Configs & Metadata
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <span className="material-symbols-outlined animate-spin text-[32px] text-indigo-500">progress_activity</span>
              <p className="text-sm font-semibold">Inspecting checkpointer snapshot...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex flex-col items-center justify-center text-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-[36px]">error</span>
              <div>
                <p className="font-bold text-base">Failed to fetch Checkpointer State</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          ) : !data ? (
            <div className="text-center py-16 text-slate-400 font-medium">No checkpointer state available for this conversation.</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Model / Engine</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 truncate">{state.model_name || 'Default Model'}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">Req: {state.request_id || '—'}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Tokens</p>
                      <p className="text-lg font-black text-indigo-600 mt-1">{fmtNum(state.total_tokens)}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">In: {fmtNum(state.input_tokens)} · Out: {fmtNum(state.output_tokens)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Human Handover</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                          state.is_human_needed
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {state.is_human_needed ? 'support_agent' : 'smart_toy'}
                          </span>
                          {state.is_human_needed ? 'Human Needed' : 'Automated'}
                        </span>
                      </div>
                      {state.human_handover_reason && (
                        <p className="text-[11px] text-amber-700 mt-1.5 truncate" title={state.human_handover_reason}>
                          Reason: {state.human_handover_reason}
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Namespace / Page</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 truncate">{state.namespace || 'default'}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">Page ID: {state.page_id || '—'}</p>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-indigo-500">summarize</span>
                        Conversation Checkpoint Summary
                      </span>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl font-sans border border-slate-150">
                      {state.summary || 'No conversation summary has been generated for this state yet.'}
                    </div>
                    {state.handover_message && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <strong>Handover Message: </strong> {state.handover_message}
                      </div>
                    )}
                  </div>

                  {/* Next Execution Step & Tools Used Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Next Steps */}
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-emerald-500">skip_next</span>
                        Next Checkpoint Actions ({nextActions.length})
                      </h4>
                      {nextActions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No pending actions queued in checkpointer graph.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {nextActions.map((act, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              {safeStr(act)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tools & Knowledge Sources */}
                    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-blue-500">home_repair_service</span>
                        Tools & Knowledge Sources Used
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Tools ({toolsUsed.length})</p>
                          {toolsUsed.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No specific tools invoked yet</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {toolsUsed.map((t, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-medium">
                                  {safeStr(t)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Knowledge Sources ({knowledgeSource.length})</p>
                          {knowledgeSource.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No external knowledge sources retrieved</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {knowledgeSource.map((ks, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-mono text-xs font-medium">
                                  {safeStr(ks)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: MESSAGES TRACE */}
              {activeTab === 'messages' && (
                <div className="space-y-4 animate-fade-in">
                  {/* Trace Control Bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5 overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mr-1">Filter:</span>
                      {['all', 'human', 'ai', 'tool'].map(t => (
                        <button
                          key={t}
                          onClick={() => { setTraceFilterType(t); setVisibleMsgLimit(30); }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                            traceFilterType === t
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t === 'all' ? `All (${messages.length})` : t}
                        </button>
                      ))}
                    </div>

                    <div className="w-full md:w-64 shrink-0">
                      <div className="relative w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                        <input
                          type="text"
                          placeholder="Search trace content or tool..."
                          value={traceSearch}
                          onChange={(e) => { setTraceSearch(e.target.value); setVisibleMsgLimit(30); }}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
                      No messages matching your current filter in this checkpointer state.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {displayedMessages.map((msg, idx) => {
                          const isExpanded = expandedMsgIds.has(msg.id || idx);
                          const hasToolCalls = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
                          const hasInvalidCalls = Array.isArray(msg.invalid_tool_calls) && msg.invalid_tool_calls.length > 0;
                          const hasTokens = msg.usage_metadata && (msg.usage_metadata.total_tokens > 0 || msg.usage_metadata.input_tokens > 0);

                          const typeColor =
                            msg.type === 'human'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : msg.type === 'tool'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300';

                          return (
                            <div key={msg.id || idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                              {/* Message Row Header */}
                              <div
                                onClick={() => toggleMsgExpand(msg.id || idx)}
                                className="px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-150 transition-colors select-none"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide border flex items-center gap-1 shrink-0 ${typeColor}`}>
                                    <span className="material-symbols-outlined text-[14px]">
                                      {msg.type === 'human' ? 'person' : msg.type === 'tool' ? 'build' : 'smart_toy'}
                                    </span>
                                    {safeStr(msg.type || 'AI')}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-800 truncate">
                                        {safeStr(msg.name || (msg.type === 'human' ? 'User Input' : 'Agent Response'))}
                                      </span>
                                      {msg.tool_call_id && (
                                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]" title="Ref Tool Call ID">
                                          Ref: {safeStr(msg.tool_call_id)}
                                        </span>
                                      )}
                                      {msg.status && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                          {safeStr(msg.status)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                                      ID: {safeStr(msg.id || `msg_${idx}`)} {msg.artifact ? `· Artifact: ${safeStr(msg.artifact)}` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {hasTokens && (
                                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold">
                                      {fmtNum(msg.usage_metadata.total_tokens)} toks
                                    </span>
                                  )}
                                  {hasToolCalls && (
                                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">handyman</span>
                                      {msg.tool_calls.length} Tool Call{msg.tool_calls.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {hasInvalidCalls && (
                                    <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">error</span>
                                      Invalid Tool
                                    </span>
                                  )}
                                  <span className={`material-symbols-outlined text-slate-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                    expand_more
                                  </span>
                                </div>
                              </div>

                              {/* Message Body preview if collapsed or full if expanded */}
                              <div className="p-5 space-y-4">
                                <div className="text-sm text-slate-800 font-sans whitespace-pre-wrap break-words leading-relaxed bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/60">
                                  {renderMsgContent(msg.content)}
                                </div>

                                {/* Tool Calls Details */}
                                {hasToolCalls && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[15px]">build_circle</span>
                                      Invoked Tool Calls
                                    </p>
                                    {msg.tool_calls.map((tc, tIdx) => (
                                      <div key={tIdx} className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs space-y-2">
                                        <div className="flex items-center justify-between font-bold text-indigo-900">
                                          <span className="font-mono text-sm">{safeStr(tc.name)}</span>
                                          <span className="text-[11px] text-indigo-600 font-mono">ID: {safeStr(tc.id || '—')} ({safeStr(tc.type || 'function')})</span>
                                        </div>
                                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100 font-mono text-[11px] text-slate-700 overflow-x-auto">
                                          {typeof tc.args === 'object' ? JSON.stringify(tc.args, null, 2) : safeStr(tc.args || '{}')}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Invalid Tool Calls Details */}
                                {hasInvalidCalls && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[15px]">report_problem</span>
                                      Invalid Tool Calls
                                    </p>
                                    {msg.invalid_tool_calls.map((itc, iIdx) => (
                                      <div key={iIdx} className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between font-bold text-red-900">
                                          <span className="font-mono text-sm">{safeStr(itc.name || 'Unknown Tool')}</span>
                                          <span className="text-[11px] text-red-600 font-mono">ID: {safeStr(itc.id || '—')}</span>
                                        </div>
                                        <div className="text-red-700 font-semibold">Error: {safeStr(itc.error || 'Failed validation')}</div>
                                        <div className="bg-white p-2.5 rounded-lg border border-red-100 font-mono text-[11px] text-slate-700 overflow-x-auto">
                                          Args: {typeof itc.args === 'object' ? JSON.stringify(itc.args, null, 2) : safeStr(itc.args || '')}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Expanded Metadata Block */}
                                {isExpanded && (
                                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                    {msg.response_metadata && Object.keys(msg.response_metadata).length > 0 && (
                                      <div className="bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Response Metadata</p>
                                        <pre className="text-[11px] leading-tight">{JSON.stringify(msg.response_metadata, null, 2)}</pre>
                                      </div>
                                    )}
                                    {msg.usage_metadata && Object.keys(msg.usage_metadata).length > 0 && (
                                      <div className="bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Token Usage Metadata</p>
                                        <pre className="text-[11px] leading-tight">{JSON.stringify(msg.usage_metadata, null, 2)}</pre>
                                      </div>
                                    )}
                                    {msg.additional_kwargs && Object.keys(msg.additional_kwargs).length > 0 && (
                                      <div className="bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto col-span-full">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Additional Kwargs</p>
                                        <pre className="text-[11px] leading-tight">{JSON.stringify(msg.additional_kwargs, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Control */}
                      {filteredMessages.length > visibleMsgLimit && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                          <span className="text-xs font-bold text-slate-600">
                            Showing <span className="text-indigo-600 font-mono font-black">{displayedMessages.length}</span> of <span className="font-mono font-black">{filteredMessages.length}</span> messages in trace
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setVisibleMsgLimit(prev => prev + 30)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">add_circle</span>
                              Load 30 More Messages
                            </button>
                            <button
                              onClick={() => setVisibleMsgLimit(filteredMessages.length)}
                              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            >
                              Load All ({filteredMessages.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: CONFIGS & METADATA */}
              {activeTab === 'configs' && (
                <div className="space-y-6 animate-fade-in font-mono">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">settings</span>
                      Checkpoint Config (`checkpoint_config`)
                    </h4>
                    <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto leading-relaxed">
                      {JSON.stringify(data?.checkpoint_config || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">data_object</span>
                      Metadata (`metadata`)
                    </h4>
                    <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto leading-relaxed">
                      {JSON.stringify(data?.metadata || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">precision_manufacturing</span>
                      Agent Configuration (`state.agent_config`)
                    </h4>
                    <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto leading-relaxed">
                      {JSON.stringify(state.agent_config || {}, null, 2)}
                    </pre>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                    <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <span className="material-symbols-outlined text-[16px] text-indigo-600">tune</span>
                      Conversation Configuration (`state.conversation_config`)
                    </h4>
                    <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto leading-relaxed">
                      {JSON.stringify(state.conversation_config || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {data && `Snapshot fetched from endpoint: /v1/admin/user/get-checkpointer-state/${conversationId}`}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            Close Debugger
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
