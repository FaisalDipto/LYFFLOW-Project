import React, { useState, useEffect, useCallback } from 'react';
import { Users, Phone, Mail, Calendar, ChevronRight, Filter, Loader2, X, ShoppingCart, Target, Truck } from 'lucide-react';
import { apiService } from '../services/api';

const LEAD_STATUSES = ['new', 'contacted', 'converted', 'cancelled'];
const ORDER_STATUSES = [
  'new', 'pending', 'delivered_approval_pending', 'partial_delivered_approval_pending',
  'cancelled_approval_pending', 'unknown_approval_pending', 'delivered',
  'partial_delivered', 'cancelled', 'hold', 'in_review', 'unknown'
];

const normalizeRecord = (record, type) => ({
  ...record,
  id: type === 'lead'
    ? (record.customer_lead_id || record.lead_id)
    : (record.customer_order_id || record.order_id),
  type,
});

const CustomerRecords = ({ pages, recordType }) => {
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

  const closeRecordModal = () => {
    setSelectedRecord(null);
    setSteadfastPrefill(null);
    setSteadfastPrefillError('');
    setIsSteadfastPrefillLoading(false);
    setSteadfastPlacement(null);
    setSteadfastPlacementError('');
    setIsSteadfastPlacing(false);
  };

  const handleLoadSteadfastPrefill = async () => {
    if (!selectedRecord?.id || selectedRecord.type !== 'order') return;

    setIsSteadfastPrefillLoading(true);
    setSteadfastPrefillError('');
    try {
      const response = await apiService.getSteadfastOrderPrefill(selectedRecord.id);
      setSteadfastPrefill(response?.data || response);
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
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
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
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 capitalize">
                          {getTypeIcon(record.type)}
                          {record.type}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-500 font-mono">
                          {record.type === 'order' ? (record.order_id || record.id) : record.id}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border capitalize ${getStatusColor(record.status)}`}>
                          {record.status?.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500 font-medium">
                        {new Date(record.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg">
                          <ChevronRight size={18} />
                        </button>
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
                <h3 className="text-xl font-black text-slate-800">{selectedRecord.contact_name || 'Customer Details'}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 capitalize">
                    {getTypeIcon(selectedRecord.type)} {selectedRecord.type}
                  </div>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-sm text-slate-500 flex items-center gap-1.5">
                    <Calendar size={14} /> {new Date(selectedRecord.created_at).toLocaleString()}
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
              <button 
                onClick={closeRecordModal}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerRecords;
