import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Phone, Mail, Calendar, Eye, Pencil, Filter, Loader2, X, ShoppingCart, Target, Truck, MapPin, Copy, Check, Download, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { formatOrderAmount, parseOrderAmount, renderOrderSourceBadge } from './customerRecordUtils';
import DateRangeCalendar from './DateRangeCalendar';
import EditOrderModal from './EditOrderModal';
import RowActionsMenu from './RowActionsMenu';

const LEAD_STATUSES = ['new', 'contacted', 'converted', 'cancelled'];
const ORDER_STATUSES = [
  'new', 'pending', 'delivered_approval_pending', 'partial_delivered_approval_pending',
  'cancelled_approval_pending', 'unknown_approval_pending', 'delivered',
  'partial_delivered', 'cancelled', 'hold', 'in_review', 'unknown'
];

const ORDER_CREATORS = [
  { value: '', label: 'AI and manual' },
  { value: 'ai', label: 'AI only' },
  { value: 'manual', label: 'Manual only' },
];

const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const formatExportDate = (iso) => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const normalizeRecord = (record, type) => ({
  ...record,
  id: type === 'lead'
    ? (record.customer_lead_id || record.lead_id)
    : (record.customer_order_id || record.order_id),
  type,
});

const CustomerRecords = ({ pages, recordType, focusRequest }) => {
  const [selectedPageId, setSelectedPageId] = useState('');
  const [records, setRecords] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [steadfastPrefill, setSteadfastPrefill] = useState(null);
  const [isSteadfastPrefillLoading, setIsSteadfastPrefillLoading] = useState(false);
  const [steadfastPrefillError, setSteadfastPrefillError] = useState('');
  const [steadfastPlacement, setSteadfastPlacement] = useState(null);
  const [isSteadfastPlacing, setIsSteadfastPlacing] = useState(false);
  const [steadfastPlacementError, setSteadfastPlacementError] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportDone, setExportDone] = useState('');
  const [exportFilters, setExportFilters] = useState({ page_id: '', status: '', created_by: '', start_date: '', end_date: '' });
  const exportPanelRef = useRef(null);

  // The export panel seeds from whatever the list is currently showing, then the
  // user can widen or narrow it with the filters the list itself does not support.
  const openExportPanel = () => {
    setExportFilters({
      page_id: selectedPageId || '',
      status: filterStatus || '',
      created_by: '',
      start_date: '',
      end_date: '',
    });
    setExportError('');
    setExportDone('');
    setIsExportOpen(true);
  };

  useEffect(() => {
    if (!isExportOpen) return undefined;
    const handleClickOutside = (event) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    };
    const handleEscape = (event) => { if (event.key === 'Escape') setIsExportOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExportOpen]);

  const handleExport = async () => {
    if (exportFilters.start_date && exportFilters.end_date && exportFilters.start_date > exportFilters.end_date) {
      setExportError('The start date must not be after the end date.');
      return;
    }
    setExportError('');
    setExportDone('');
    setIsExporting(true);
    try {
      const { blob, filename } = await apiService.exportCustomerOrders({
        page_id: exportFilters.page_id || undefined,
        status: exportFilters.status || undefined,
        created_by: exportFilters.created_by || undefined,
        start_date: exportFilters.start_date || undefined,
        end_date: exportFilters.end_date || undefined,
      });
      saveBlob(blob, filename);
      setExportDone(filename);
    } catch (error) {
      console.error('Failed to export orders:', error);
      setExportError(error?.message || 'Could not generate the export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const fetchRecords = useCallback(async (cursor = null) => {
    if (!selectedPageId) return;
    
    if (cursor) {
      setIsPaginating(true);
    } else {
      setIsLoading(true);
      setRecords([]);
    }

    try {
      const request = recordType === 'lead' ? apiService.getCustomerLeads : apiService.getCustomerOrders;
      const response = await request({
        page_id: selectedPageId,
        status: filterStatus || undefined,
        cursor,
        page_size: 20,
      });
      const data = response?.data || response;
      const collection = recordType === 'lead'
        ? (data?.leads || data?.customer_leads)
        : (data?.orders || data?.customer_orders);
      const nextRecords = Array.isArray(collection)
        ? collection.map(record => normalizeRecord(record, recordType))
        : [];

      setRecords(prev => cursor ? [...prev, ...nextRecords] : nextRecords);
      setNextCursor(data?.pagination?.next_cursor || null);
      setHasMore(Boolean(data?.pagination?.has_more));
    } catch (error) {
      console.error(`Failed to fetch customer ${recordType}s:`, error);
    } finally {
      setIsLoading(false);
      setIsPaginating(false);
    }
  }, [selectedPageId, recordType, filterStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSelectRecord = async (record) => {
    setSteadfastPrefill(null);
    setSteadfastPrefillError('');
    setSteadfastPlacement(null);
    setSteadfastPlacementError('');
    setCopiedKey('');
    setSelectedRecord(record);
    setIsDetailLoading(true);
    try {
      const request = record.type === 'lead' ? apiService.getCustomerLead : apiService.getCustomerOrder;
      const response = await request(record.id);
      const data = response?.data || response;
      const detail = record.type === 'lead' ? (data?.lead || data) : (data?.order || data);
      setSelectedRecord(normalizeRecord(detail, record.type));
    } catch (error) {
      console.error(`Failed to fetch customer ${record.type} details:`, error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Deep link from a notification. The detail endpoint only needs the id, so the
  // record opens without waiting for the list request to come back.
  const handleSelectRecordRef = useRef(handleSelectRecord);
  handleSelectRecordRef.current = handleSelectRecord;

  useEffect(() => {
    if (!focusRequest?.recordId || focusRequest.recordType !== recordType) return;
    if (focusRequest.pageId) setSelectedPageId(focusRequest.pageId);
    handleSelectRecordRef.current({ id: focusRequest.recordId, type: recordType });
  }, [focusRequest, recordType]);

  const closeRecordModal = () => {
    setSelectedRecord(null);
    setSteadfastPrefill(null);
    setSteadfastPrefillError('');
    setIsSteadfastPrefillLoading(false);
    setSteadfastPlacement(null);
    setSteadfastPlacementError('');
    setIsSteadfastPlacing(false);
    setCopiedKey('');
  };

  const handleLoadSteadfastPrefill = async () => {
    if (!selectedRecord?.id || selectedRecord.type !== 'order') return;

    setIsSteadfastPrefillLoading(true);
    setSteadfastPrefillError('');
    try {
      const response = await apiService.getSteadfastOrderPrefill(selectedRecord.id);
      const rawPrefill = response?.data || response || {};
      const fallbackCod = parseOrderAmount(selectedRecord.total);
      setSteadfastPrefill({
        ...rawPrefill,
        recipient_name: rawPrefill.recipient_name || selectedRecord.contact_name || '',
        recipient_phone: rawPrefill.recipient_phone || selectedRecord.contact_phone || '',
        recipient_email: rawPrefill.recipient_email || selectedRecord.contact_email || '',
        recipient_address: rawPrefill.recipient_address || selectedRecord.delivery_address || '',
        cod_amount: rawPrefill.cod_amount !== undefined && rawPrefill.cod_amount !== '' && rawPrefill.cod_amount !== null
          ? rawPrefill.cod_amount
          : (fallbackCod !== null && fallbackCod >= 0 && fallbackCod < 1e9 ? fallbackCod : 0),
      });
      setSteadfastPlacement(null);
      setSteadfastPlacementError('');
    } catch (error) {
      console.error('Failed to load Steadfast order prefill:', error);
      setSteadfastPrefillError(error.message || 'Could not load the Steadfast order prefill.');
    } finally {
      setIsSteadfastPrefillLoading(false);
    }
  };

  const handleSteadfastFieldChange = (field, value) => {
    setSteadfastPrefill(current => ({ ...current, [field]: value }));
  };

  const handlePlaceSteadfastOrder = async (event) => {
    event.preventDefault();
    if (!selectedRecord?.id || !steadfastPrefill || steadfastPlacement) return;

    const confirmed = window.confirm(
      `Place order ${steadfastPrefill.invoice || selectedRecord.id} with Steadfast Courier? This will create a real consignment.`
    );
    if (!confirmed) return;

    const payload = {
      recipient_name: steadfastPrefill.recipient_name || '',
      recipient_phone: steadfastPrefill.recipient_phone || '',
      alternative_phone: steadfastPrefill.alternative_phone || '',
      recipient_email: steadfastPrefill.recipient_email || '',
      recipient_address: steadfastPrefill.recipient_address || '',
      cod_amount: Number(steadfastPrefill.cod_amount) || 0,
      note: steadfastPrefill.note || '',
      item_description: steadfastPrefill.item_description || '',
      total_lot: Number(steadfastPrefill.total_lot) || 0,
      delivery_type: Number(steadfastPrefill.delivery_type) || 0,
    };

    setIsSteadfastPlacing(true);
    setSteadfastPlacementError('');
    try {
      const response = await apiService.placeSteadfastOrder(selectedRecord.id, payload);
      setSteadfastPlacement(response?.data || response);
    } catch (error) {
      console.error('Failed to place Steadfast order:', error);
      setSteadfastPlacementError(error.message || 'Could not place the order with Steadfast Courier.');
    } finally {
      setIsSteadfastPlacing(false);
    }
  };

  const handleOrderSaved = (updated) => {
    if (!updated) return;
    const next = normalizeRecord(updated, 'order');
    const editedId = editingOrder?.id;
    setRecords(prev => prev.map(record => (record.id === editedId || record.id === next.id ? { ...record, ...next } : record)));
    setSelectedRecord(current => (current && (current.id === editedId || current.id === next.id) ? { ...current, ...next } : current));
    setEditingOrder(null);
  };

  const getRowActions = (record) => {
    const actions = [{ key: 'view', label: 'View', icon: Eye, onSelect: () => handleSelectRecord(record) }];
    if (record.type === 'order') {
      actions.push(
        { key: 'edit', label: 'Edit', icon: Pencil, onSelect: () => setEditingOrder(record) },
        // No delete endpoint yet; shown so the menu layout is final.
        { key: 'delete', label: 'Delete', icon: Trash2, tone: 'danger', disabled: true, hint: 'Soon' },
      );
    }
    return actions;
  };

  const handleUpdateStatus = async (recordId, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const request = selectedRecord.type === 'lead'
        ? apiService.updateCustomerLeadStatus
        : apiService.updateCustomerOrderStatus;
      const response = await request(recordId, newStatus);
      const data = response?.data || response;
      const updated = selectedRecord.type === 'lead' ? (data?.lead || data) : (data?.order || data);
      const updatedId = selectedRecord.type === 'lead'
        ? (updated?.customer_lead_id || updated?.lead_id)
        : (updated?.customer_order_id || updated?.order_id);
      setRecords(prev => prev.map(record => record.id === recordId ? { ...record, status: newStatus } : record));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(updatedId
          ? normalizeRecord(updated, selectedRecord.type)
          : { ...selectedRecord, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update record status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
      case 'hold':
      case 'in_review': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'contacted': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'converted':
      case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled':
      case 'cancelled_approval_pending': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const statusOptions = recordType === 'lead' ? LEAD_STATUSES : ORDER_STATUSES;

  const getTypeIcon = (type) => {
    return type === 'order' ? <ShoppingCart size={16} /> : <Target size={16} />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      <div className="p-6 md:p-8 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-emerald-500" />
            Customer {recordType === 'lead' ? 'Leads' : 'Orders'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage {recordType}s generated by your AI agents.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <select
              value={selectedPageId}
              onChange={e => {
                setSelectedPageId(e.target.value);
                closeRecordModal();
              }}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 text-slate-700 cursor-pointer p-0 pl-1 pr-8 outline-none"
            >
              <option value="" disabled>Select a page</option>
              {pages?.map(page => (
                <option key={page.page_id} value={page.page_id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-slate-700 cursor-pointer p-0 pl-1 pr-8"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </div>

          {recordType === 'order' && (
            <div className="relative" ref={exportPanelRef}>
              <button
                type="button"
                onClick={() => (isExportOpen ? setIsExportOpen(false) : openExportPanel())}
                aria-expanded={isExportOpen}
                aria-haspopup="dialog"
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                  isExportOpen
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                <Download size={16} />
                Export
              </button>

              {isExportOpen && (
                <div
                  role="dialog"
                  aria-label="Export orders to Excel"
                  className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] w-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="m-0 text-sm font-black text-slate-900">Export to Excel</p>
                      <p className="mb-0 mt-0.5 text-[11px] font-semibold leading-4 text-slate-500">Downloads an .xlsx of every matching order.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExportOpen(false)}
                      aria-label="Close export panel"
                      className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400" htmlFor="export-page">Page</label>
                      <select
                        id="export-page"
                        value={exportFilters.page_id}
                        onChange={(e) => setExportFilters(prev => ({ ...prev, page_id: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="">All pages</option>
                        {pages?.map(page => (
                          <option key={page.page_id} value={page.page_id}>{page.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400" htmlFor="export-status">Status</label>
                      <select
                        id="export-status"
                        value={exportFilters.status}
                        onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold capitalize text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="">All statuses</option>
                        {ORDER_STATUSES.map(status => (
                          <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400" htmlFor="export-created-by">Created by</label>
                      <select
                        id="export-created-by"
                        value={exportFilters.created_by}
                        onChange={(e) => setExportFilters(prev => ({ ...prev, created_by: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      >
                        {ORDER_CREATORS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Date range</span>
                        {(exportFilters.start_date || exportFilters.end_date) && (
                          <button
                            type="button"
                            onClick={() => setExportFilters(prev => ({ ...prev, start_date: '', end_date: '' }))}
                            className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 transition-colors hover:text-red-600"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <Calendar size={12} className="shrink-0 text-slate-400" />
                        {exportFilters.start_date
                          ? `${formatExportDate(exportFilters.start_date)} - ${exportFilters.end_date ? formatExportDate(exportFilters.end_date) : 'pick an end date'}`
                          : 'All dates'}
                      </p>

                      <DateRangeCalendar
                        startDate={exportFilters.start_date}
                        endDate={exportFilters.end_date}
                        maxDate={todayIso()}
                        onChange={({ start_date, end_date }) => setExportFilters(prev => ({ ...prev, start_date, end_date }))}
                      />
                    </div>
                    <p className="mb-0 text-[10px] font-semibold leading-4 text-slate-400">Dates are inclusive and read in UTC. Leave them empty to export everything.</p>
                  </div>

                  {exportError && (
                    <p className="mt-3 mb-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold leading-4 text-red-700">{exportError}</p>
                  )}
                  {exportDone && !exportError && (
                    <p className="mt-3 mb-0 flex items-start gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-4 text-emerald-700">
                      <Check size={13} className="mt-px shrink-0" />
                      <span className="min-w-0 break-all">Downloaded {exportDone}</span>
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {isExporting ? 'Preparing file...' : 'Download .xlsx'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {!selectedPageId ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border border-slate-200 rounded-3xl border-dashed">
            <Users className="opacity-20 mb-4" size={48} />
            <p className="font-medium text-slate-500">Select a page to view customer {recordType}s.</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border border-slate-200 rounded-3xl border-dashed">
            <Users className="opacity-20 mb-4" size={48} />
            <p className="font-medium text-slate-500">No {recordType}s found.</p>
            <p className="text-sm">Try adjusting the status filter or wait for the AI to capture new {recordType}s.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
                    {recordType === 'order' ? (
                      <>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                      </>
                    ) : (
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    )}
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(record => (
                    <tr 
                      key={record.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => handleSelectRecord(record)}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{record.contact_name || 'Unknown User'}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            {record.contact_email && <><Mail size={12}/> {record.contact_email}</>}
                            {record.contact_phone && <><span className="mx-1">•</span> <Phone size={12}/> {record.contact_phone}</>}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-500 font-mono">
                          {record.type === 'order' ? (record.order_id || record.id) : record.id}
                        </span>
                      </td>
                      {recordType === 'order' ? (
                        <>
                          <td className="p-4">
                            {renderOrderSourceBadge(record.created_by)}
                          </td>
                          <td className="p-4">
                            <span className="text-sm font-bold text-slate-800">
                              {formatOrderAmount(record.total)}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 capitalize">
                            {getTypeIcon(record.type)}
                            {record.type}
                          </div>
                        </td>
                      )}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border capitalize ${getStatusColor(record.status)}`}>
                          {record.status?.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 font-medium">
                        {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <RowActionsMenu
                          actions={getRowActions(record)}
                          label={`Actions for ${record.contact_name || record.order_id || record.id}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {hasMore && (
              <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/50">
                <button
                  onClick={() => fetchRecords(nextCursor)}
                  disabled={isPaginating}
                  className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm font-bold text-slate-700 hover:text-emerald-600 hover:border-emerald-200 transition-colors flex items-center gap-2"
                >
                  {isPaginating ? <Loader2 className="animate-spin" size={16} /> : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expanded Record Modal */}
      {selectedRecord && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-black text-slate-800">{selectedRecord.contact_name || 'Customer Details'}</h3>
                  {selectedRecord.type === 'order' && renderOrderSourceBadge(selectedRecord.created_by)}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 capitalize">
                    {getTypeIcon(selectedRecord.type)} {selectedRecord.type}
                  </div>
                  {selectedRecord.type === 'order' && (selectedRecord.order_id || selectedRecord.customer_order_id) && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                        {selectedRecord.order_id || selectedRecord.customer_order_id}
                      </span>
                    </>
                  )}
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Calendar size={14} /> {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
              <button 
                onClick={closeRecordModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
              {isDetailLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                  <Loader2 className="animate-spin mb-3" size={28} />
                  <p>Loading {selectedRecord.type} details...</p>
                </div>
              ) : (
                <>
              
              {/* Contact Info */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Contact Information</h4>
                {(selectedRecord.contact_email || selectedRecord.contact_phone) ? (
                  <>
                    {selectedRecord.contact_email && (
                      <div className="flex items-center gap-3 text-slate-700 font-medium">
                        <Mail className="text-emerald-500" size={18} />
                        {selectedRecord.contact_email}
                      </div>
                    )}
                    {selectedRecord.contact_phone && (
                      <div className="flex items-center gap-3 text-slate-700 font-medium">
                        <Phone className="text-emerald-500" size={18} />
                        {selectedRecord.contact_phone}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-500 italic">No contact information provided.</p>
                )}
              </div>

              {/* Delivery Address (If order) */}
              {selectedRecord.type === 'order' && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-500" />
                    Delivery Address
                  </h4>
                  {selectedRecord.delivery_address ? (
                    <p className="text-sm font-semibold text-slate-700 whitespace-pre-line leading-relaxed">
                      {selectedRecord.delivery_address}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No delivery address provided.</p>
                  )}
                </div>
              )}

              {/* Order Items (If order) */}
              {selectedRecord.type === 'order' && selectedRecord.order_items && selectedRecord.order_items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Order Items</h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 font-semibold text-slate-600">Item</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 text-center">Qty</th>
                          <th className="px-4 py-3 font-semibold text-slate-600 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecord.order_items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {item.name}
                              {item.note && <div className="text-xs text-slate-500 font-normal mt-0.5">{item.note}</div>}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                              ${Number(item.price || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Order Financial Summary */}
              {selectedRecord.type === 'order' && (selectedRecord.total !== undefined || selectedRecord.delivery_charge !== undefined || (selectedRecord.order_items && selectedRecord.order_items.length > 0)) && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    {selectedRecord.order_items && selectedRecord.order_items.length > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal</span>
                        <span className="font-semibold text-slate-700">
                          ${selectedRecord.order_items.reduce((sum, it) => sum + (Number(it.price || 0) * (Number(it.quantity) || 1)), 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedRecord.delivery_charge !== undefined && selectedRecord.delivery_charge !== null && selectedRecord.delivery_charge !== '' && (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery Charge</span>
                        <span className="font-semibold text-slate-700">
                          {formatOrderAmount(selectedRecord.delivery_charge)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                      <span className="font-black text-slate-800 text-base">Total</span>
                      <span className="font-black text-emerald-600 text-lg">
                        {formatOrderAmount(selectedRecord.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference & Context Details */}
              {selectedRecord.type === 'order' && (selectedRecord.conversation_id || selectedRecord.page_id || selectedRecord.updated_at) && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Reference Details</span>
                    {selectedRecord.updated_at && (
                      <span className="text-[11px] text-slate-400">
                        Updated: {new Date(selectedRecord.updated_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                    {selectedRecord.conversation_id && (
                      <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-400">Conversation:</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-slate-700 truncate max-w-[140px]" title={selectedRecord.conversation_id}>
                            {selectedRecord.conversation_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedRecord.conversation_id, 'conv_id')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy conversation ID"
                          >
                            {copiedKey === 'conv_id' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedRecord.customer_order_id && (
                      <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-400">Order UUID:</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-slate-700 truncate max-w-[140px]" title={selectedRecord.customer_order_id}>
                            {selectedRecord.customer_order_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedRecord.customer_order_id, 'order_uuid')}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Order UUID"
                          >
                            {copiedKey === 'order_uuid' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Steadfast Courier Prefill */}
              {selectedRecord.type === 'order' && (
                <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <Truck size={18} className="text-emerald-600" />
                        Steadfast Courier
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">Review the values prepared for this courier order.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadSteadfastPrefill}
                      disabled={isSteadfastPrefillLoading || isSteadfastPlacing || Boolean(steadfastPlacement)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSteadfastPrefillLoading && <Loader2 size={16} className="animate-spin" />}
                      {steadfastPlacement ? 'Order placed' : steadfastPrefill ? 'Refresh prefill' : 'Load courier prefill'}
                    </button>
                  </div>

                  {steadfastPrefillError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                      {steadfastPrefillError}
                    </p>
                  )}

                  {steadfastPrefill && (
                    <form onSubmit={handlePlaceSteadfastOrder} className="space-y-4">
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Invoice</p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                          {steadfastPrefill.invoice || 'Assigned by Steadfast'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          { field: 'recipient_name', label: 'Recipient', required: true },
                          { field: 'recipient_phone', label: 'Phone', required: true },
                          { field: 'alternative_phone', label: 'Alternative phone' },
                          { field: 'recipient_email', label: 'Email', type: 'email' },
                          { field: 'cod_amount', label: 'COD amount', type: 'number', min: 0, step: 'any', required: true },
                          { field: 'total_lot', label: 'Total lot', type: 'number', min: 0, step: 1, required: true },
                          { field: 'delivery_type', label: 'Delivery type', type: 'number', min: 0, step: 1, required: true },
                          { field: 'recipient_address', label: 'Address', required: true, multiline: true, fullWidth: true },
                          { field: 'item_description', label: 'Item description', multiline: true, fullWidth: true },
                          { field: 'note', label: 'Note', multiline: true, fullWidth: true },
                        ].map(({ field, label, type = 'text', min, step, required, multiline, fullWidth }) => {
                          const sharedProps = {
                            value: steadfastPrefill[field] ?? '',
                            onChange: event => handleSteadfastFieldChange(field, event.target.value),
                            disabled: isSteadfastPlacing || Boolean(steadfastPlacement),
                            required,
                            className: 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-500',
                          };

                          return (
                            <label key={field} className={`block ${fullWidth ? 'sm:col-span-2' : ''}`}>
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                {label}{required && <span className="text-red-500"> *</span>}
                              </span>
                              {multiline ? (
                                <textarea {...sharedProps} rows={2} />
                              ) : (
                                <input {...sharedProps} type={type} min={min} step={step} />
                              )}
                            </label>
                          );
                        })}
                      </div>

                      {steadfastPlacementError && (
                        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                          {steadfastPlacementError}
                        </p>
                      )}

                      {steadfastPlacement ? (
                        <div className="rounded-xl border border-emerald-300 bg-emerald-100/70 p-4 text-sm text-emerald-900">
                          <p className="font-black">{steadfastPlacement.message || 'Order placed successfully.'}</p>
                          {steadfastPlacement.consignment && (
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <p><span className="font-bold">Tracking:</span> {steadfastPlacement.consignment.tracking_code || 'Not provided'}</p>
                              <p><span className="font-bold">Consignment ID:</span> {steadfastPlacement.consignment.consignment_id ?? 'Not provided'}</p>
                              <p><span className="font-bold">Invoice:</span> {steadfastPlacement.consignment.invoice || 'Not provided'}</p>
                              <p><span className="font-bold">Status:</span> {steadfastPlacement.consignment.status || 'Not provided'}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isSteadfastPlacing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSteadfastPlacing && <Loader2 size={16} className="animate-spin" />}
                            {isSteadfastPlacing ? 'Placing order...' : 'Place order with Steadfast'}
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedRecord.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Notes</h4>
                  <p className="text-sm text-slate-700 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
                </>
              )}
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 bg-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-600">Status:</span>
                <select
                  value={selectedRecord.status}
                  onChange={(e) => handleUpdateStatus(selectedRecord.id, e.target.value)}
                  disabled={isUpdatingStatus || isDetailLoading}
                  className={`border-2 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${getStatusColor(selectedRecord.status)} ${isUpdatingStatus || isDetailLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {(selectedRecord.type === 'lead' ? LEAD_STATUSES : ORDER_STATUSES).map(status => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                {isUpdatingStatus && <Loader2 className="animate-spin text-slate-400" size={16} />}
              </div>
              <div className="flex items-center gap-2">
                {selectedRecord.type === 'order' && (
                  <button
                    type="button"
                    onClick={() => setEditingOrder(selectedRecord)}
                    disabled={isDetailLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 font-bold rounded-xl transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                )}
                <button 
                  onClick={closeRecordModal}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <EditOrderModal
          key={editingOrder.id}
          orderId={editingOrder.id}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={handleOrderSaved}
        />
      )}
    </div>
  );
};

export default CustomerRecords;
