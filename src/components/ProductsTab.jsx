import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/api';
import { Upload, Plus, Trash2, Edit3, Image as ImageIcon, FileText, Video, ExternalLink } from 'lucide-react';

const FallbackImage = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`} title={alt}>
        <ImageIcon size={16} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
    />
  );
};

const ProductsTab = ({ selectedNamespaceId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Delete Confirm State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, productId: null });
  const [editingProductId, setEditingProductId] = useState(null);
  
  // Create Product Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    currency: 'USD',
    category: '',
    tags: '',
    variants: '',
    availability: true
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAssets, setExistingAssets] = useState([]);

  // Import CSV State
  const [csvFile, setCsvFile] = useState(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'csv', 'manual'

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBatches, setHistoryBatches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyCursors, setHistoryCursors] = useState([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Batch Detail State
  const [selectedBatchDetail, setSelectedBatchDetail] = useState(null);
  const [loadingBatchDetail, setLoadingBatchDetail] = useState(false);

  // Pagination State
  const [history, setHistory] = useState([null]); // Array of cursors
  const [currentIndex, setCurrentIndex] = useState(0); // Current page index
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const PAGE_SIZE = 10;

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchProducts = async (cursor = null) => {
    if (!selectedNamespaceId) return;
    setLoading(true);
    try {
      let isActiveParam = null;
      if (activeFilter === 'active') isActiveParam = true;
      if (activeFilter === 'inactive') isActiveParam = false;
      
      const data = await apiService.getProducts(selectedNamespaceId, cursor, PAGE_SIZE, isActiveParam, sourceFilter);
      setProducts(data.items || []);
      setHasMore(data.pagination?.has_more || false);
      setNextCursor(data.pagination?.next_cursor || null);
    } catch (err) {
      console.error(err);
      addToast('Failed to load products: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryBatches = async (cursor = null) => {
    if (!selectedNamespaceId) return;
    setLoadingHistory(true);
    try {
      // Assuming we just fetch all history (no status filter for now, or could add one later)
      const data = await apiService.getImportCsvHistory(selectedNamespaceId, null, cursor, PAGE_SIZE);
      setHistoryBatches(data.batches || []);
      setHistoryHasMore(data.pagination?.has_more || false);
      setHistoryCursor(data.pagination?.next_cursor || null);
    } catch (err) {
      console.error(err);
      addToast('Failed to load import history: ' + err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchBatchDetail = async (batchId) => {
    if (!selectedNamespaceId) return;
    setLoadingBatchDetail(true);
    try {
      const data = await apiService.getImportBatch(selectedNamespaceId, batchId);
      setSelectedBatchDetail(data);
    } catch (err) {
      console.error(err);
      addToast('Failed to load batch details: ' + err.message, 'error');
    } finally {
      setLoadingBatchDetail(false);
    }
  };

  useEffect(() => {
    setHistory([null]);
    setCurrentIndex(0);
    fetchProducts(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNamespaceId, activeFilter, sourceFilter]);

  const handleEditProductClick = async (product) => {
    setEditingProductId(product.product_id);
    
    // Parse currency and price if price contains a space (e.g., "USD 29.99")
    let parsedPrice = product.price || '';
    let parsedCurrency = 'USD';
    
    if (typeof parsedPrice === 'string' && parsedPrice.includes(' ')) {
      const parts = parsedPrice.split(' ');
      if (parts.length >= 2 && /^[A-Z]{3}$/.test(parts[0])) {
        parsedCurrency = parts[0];
        parsedPrice = parts.slice(1).join(' ');
      }
    }

    setFormData({
      name: product.name || '',
      code: product.code || '',
      description: product.description || '',
      price: parsedPrice,
      currency: parsedCurrency,
      category: product.category || '',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
      variants: product.variants || product.variant || '',
      availability: product.availability !== false
    });
    setSelectedFiles([]);
    setExistingAssets(product.primary_assets || product.assets || []);
    setShowCreateModal(true);

    try {
      const detail = await apiService.getProductDetail(selectedNamespaceId, product.product_id);
      setFormData(prev => ({
        ...prev,
        description: detail.description || prev.description,
        category: detail.category || prev.category,
        tags: Array.isArray(detail.tags) ? detail.tags.join(', ') : (detail.tags || prev.tags),
        variants: detail.variants || prev.variants
      }));
      if (detail.assets || detail.primary_assets) {
        setExistingAssets(detail.assets || detail.primary_assets);
      }
    } catch (err) {
      console.error("Failed to fetch full details for edit", err);
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!selectedNamespaceId) {
      addToast('Please select a namespace first', 'error');
      return;
    }

    try {
      if (editingProductId) {
        const updateData = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          price: `${formData.currency} ${formData.price}`.trim(),
          category: formData.category || "",
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          variants: formData.variants || "",
          availability: formData.availability !== false
        };
        
        console.log("=== SENDING UPDATE PAYLOAD ===");
        console.log(JSON.stringify(updateData, null, 2));
        
        await apiService.updateProduct(selectedNamespaceId, editingProductId, updateData);
        
        // Optimistic UI Update to make it instantly appear on the table
        setProducts(prevProducts => prevProducts.map(p => 
          p.product_id === editingProductId ? { ...p, ...updateData } : p
        ));
        
        if (selectedFiles && selectedFiles.length > 0) {
          const fileData = new FormData();
          for (let i = 0; i < selectedFiles.length; i++) {
            fileData.append('files', selectedFiles[i]);
          }
          await apiService.addProductAssets(selectedNamespaceId, editingProductId, fileData);
        }
        
        addToast('Product updated successfully!', 'success');
      } else {
        const createData = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          price: `${formData.currency} ${formData.price}`.trim(),
          category: formData.category || "",
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          variants: formData.variants || "",
          availability: formData.availability !== false
        };

        const newProduct = await apiService.createProduct(selectedNamespaceId, createData);
        const newProductId = newProduct.product_id || newProduct.id;
        
        // Optimistic UI Update for creation
        setProducts(prevProducts => [{ ...createData, product_id: newProductId || Date.now().toString() }, ...prevProducts]);
        
        if (selectedFiles && selectedFiles.length > 0 && newProductId) {
          const fileData = new FormData();
          for (let i = 0; i < selectedFiles.length; i++) {
            fileData.append('files', selectedFiles[i]);
          }
          await apiService.addProductAssets(selectedNamespaceId, newProductId, fileData);
        }
        
        addToast('Product created successfully!', 'success');
      }
      
      setShowCreateModal(false);
      setFormData({ name: '', code: '', description: '', price: '', currency: 'USD', category: '', tags: '', variants: '', availability: true });
      setSelectedFiles([]);
      setExistingAssets([]);
      setEditingProductId(null);
      fetchProducts(history[currentIndex]);
    } catch (err) {
      addToast(`Failed to ${editingProductId ? 'update' : 'create'} product: ` + err.message, 'error');
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      addToast('Please select a CSV file', 'error');
      return;
    }

    const data = new FormData();
    data.append('file', csvFile);

    try {
      await apiService.importProductsCsv(selectedNamespaceId, data);
      addToast('CSV Import started in the background!', 'success');
      setShowImportModal(false);
      setCsvFile(null);
      setTimeout(() => {
        setHistory([null]);
        setCurrentIndex(0);
        fetchProducts(null);
      }, 3000); // Check for results after a bit
    } catch (err) {
      addToast('Failed to import CSV: ' + err.message, 'error');
    }
  };
  const handleViewProduct = async (productId) => {
    try {
      setLoadingDetail(true);
      setShowDetailModal(true);
      const detail = await apiService.getProductDetail(selectedNamespaceId, productId);
      setSelectedProductDetail(detail);
    } catch (err) {
      addToast('Failed to fetch product details: ' + err.message, 'error');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    setDeleteConfirmModal({ show: true, productId });
  };

  const executeDeleteProduct = async () => {
    const { productId } = deleteConfirmModal;
    if (!productId) return;

    // Optimistic UI update
    setProducts(prev => prev.filter(p => p.product_id !== productId));
    setDeleteConfirmModal({ show: false, productId: null });

    try {
      await apiService.deleteProduct(selectedNamespaceId, productId);
      addToast('Product deleted successfully', 'success');
    } catch (err) {
      addToast('Failed to delete product: ' + err.message, 'error');
      fetchProducts(history[currentIndex]); // Refresh table to restore product if delete failed
    }
  };

  const handleSetPrimaryAsset = async (assetId) => {
    if (!editingProductId) return;
    try {
      await apiService.setPrimaryAsset(selectedNamespaceId, editingProductId, assetId);
      addToast('Primary asset updated successfully', 'success');
      
      const selectedAsset = existingAssets.find(a => a.id === assetId);

      setExistingAssets(prev => prev.map(asset => ({
        ...asset,
        is_primary: asset.id === assetId
      })));
      
      if (selectedAsset) {
        setProducts(prevProducts => prevProducts.map(p => {
          if (p.product_id === editingProductId) {
            return { 
              ...p, 
              primary_assets: [{...selectedAsset, is_primary: true}] 
            };
          }
          return p;
        }));
      }
    } catch (err) {
      addToast('Failed to set primary asset: ' + err.message, 'error');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!editingProductId) return;
    try {
      await apiService.deleteProductAsset(selectedNamespaceId, editingProductId, assetId);
      addToast('Asset deleted successfully', 'success');
      
      setExistingAssets(prev => prev.filter(asset => asset.id !== assetId));
      
      setProducts(prevProducts => prevProducts.map(p => {
        if (p.product_id === editingProductId) {
          return { 
            ...p, 
            primary_assets: p.primary_assets?.filter(a => a.id !== assetId) || []
          };
        }
        return p;
      }));
    } catch (err) {
      addToast('Failed to delete asset: ' + err.message, 'error');
    }
  };

  return (
    <>
      <div className="animate-fade-in-up mt-6 p-8 rounded-[40px] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-2xl shadow-emerald-500/20 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-yellow-300 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-300 opacity-30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner border border-white/30">
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">Products Inventory</h2>
              <p className="text-white/80 font-medium text-sm mt-1">Manage your storefront items</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <select 
                value={activeFilter} 
                onChange={(e) => setActiveFilter(e.target.value)}
                style={{ backgroundImage: 'none' }}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all font-bold text-sm border border-white/20 shadow-lg outline-none cursor-pointer"
              >
                <option value="all" className="text-slate-800 font-semibold">All Status</option>
                <option value="active" className="text-slate-800 font-semibold">Active</option>
                <option value="inactive" className="text-slate-800 font-semibold">Inactive</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
            <div className="relative">
              <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                style={{ backgroundImage: 'none' }}
                className="appearance-none pl-4 pr-10 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all font-bold text-sm border border-white/20 shadow-lg outline-none cursor-pointer"
              >
                <option value="all" className="text-slate-800 font-semibold">All Sources</option>
                <option value="manual" className="text-slate-800 font-semibold">Manual</option>
                <option value="csv" className="text-slate-800 font-semibold">CSV Import</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70">
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </div>
            </div>
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md text-white rounded-xl hover:bg-white/20 transition-all font-bold text-sm border border-white/20 shadow-lg"
            >
              <Upload size={16} /> Import CSV
            </button>
            <button 
              onClick={() => {
                setEditingProductId(null);
                setFormData({ name: '', code: '', description: '', price: '', currency: 'USD', category: '', tags: '', variants: '', availability: true });
                setSelectedFiles([]);
                setExistingAssets([]);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-xl"
            >
              <Plus size={16} /> Create Product
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto w-full no-scrollbar">
            <div className="min-w-[900px] w-full">
              <div className="grid grid-cols-[3fr_2fr_2fr_2fr_2fr_2fr_100px] gap-4 p-5 text-[10px] font-black tracking-[0.2em] text-emerald-700 uppercase bg-emerald-50 border-b border-emerald-100 shadow-sm">
                <div className="pl-6 flex items-center">Product Name</div>
                <div className="flex items-center">Code</div>
                <div className="flex items-center">Variant</div>
                <div className="flex items-center">Price</div>
                <div className="flex items-center">Status</div>
                <div className="flex items-center">Assets</div>
                <div className="text-right pr-6 flex items-center justify-end">Actions</div>
              </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center bg-slate-50/50">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-500 shadow-inner">
                <span className="material-symbols-outlined text-3xl">add_shopping_cart</span>
              </div>
              <h3 className="text-slate-800 font-black text-lg mb-1">No products found</h3>
              <p className="text-slate-500 font-medium text-sm max-w-sm">Create your first product or import a CSV to populate your inventory.</p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.product_id} onClick={() => handleViewProduct(product.product_id)} className="grid grid-cols-[3fr_2fr_2fr_2fr_2fr_2fr_100px] gap-4 p-5 items-center hover:bg-emerald-50/30 transition-all group duration-300 cursor-pointer">
                <div className="pl-6 font-bold text-sm text-slate-800 truncate pr-4 group-hover:text-emerald-700 transition-colors">
                  {product.name}
                </div>
                <div className="text-sm text-slate-500 font-mono text-xs bg-slate-100 px-2 py-1 rounded-md inline-block w-fit border border-slate-200 shadow-sm">
                  {product.code || 'N/A'}
                </div>
                <div className="text-sm text-slate-500 truncate pr-2 font-medium">
                  {product.variants || product.variant || '-'}
                </div>
                <div className="font-semibold text-slate-700">
                  {product.price}
                </div>
                <div className="flex items-center">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${product.availability ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {product.availability ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
                <div className="flex gap-1.5 items-center">
                  {product.primary_assets && product.primary_assets.length > 0 ? (
                    product.primary_assets.map((asset, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden shadow-sm group-hover:border-emerald-200 transition-colors" title={asset.original_filename}>
                        {asset.file_type === 'image' ? (
                          <FallbackImage src={asset.url?.startsWith('http') ? asset.url : `https://api.lyfflow.com${asset.url?.startsWith('/') ? '' : '/'}${asset.url}`} alt={asset.original_filename} className="w-full h-full object-cover" />
                        ) : asset.file_type === 'video' ? (
                          <Video size={14} className="text-emerald-500" />
                        ) : (
                          <FileText size={14} className="text-blue-500" />
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">0 assets</span>
                  )}
                </div>
                <div className="text-right pr-6 flex items-center justify-end gap-2 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleEditProductClick(product); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors" title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.product_id); }} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && products.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Page {currentIndex + 1}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (currentIndex === 0) return;
                  const prevIndex = currentIndex - 1;
                  setCurrentIndex(prevIndex);
                  fetchProducts(history[prevIndex]);
                }}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span> Prev
              </button>
              <button 
                onClick={() => {
                  if (!hasMore || !nextCursor) return;
                  const newHistory = history.slice(0, currentIndex + 1);
                  newHistory.push(nextCursor);
                  setHistory(newHistory);
                  setCurrentIndex(currentIndex + 1);
                  fetchProducts(nextCursor);
                }}
                disabled={!hasMore}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
              >
                Next <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}

            </div>
          </div>
        </div>
      </div>
</div>

      {/* Portals for Modals and Toasts */}
      {createPortal(
        <>
          <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map(toast => (
              <div key={toast.id} className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg shadow-black/5 transform transition-all duration-300 pointer-events-auto bg-white border-l-4 ${toast.type === 'error' ? 'border-red-500 text-red-600' : 'border-emerald-500 text-emerald-600'}`}>
                <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
                <p className="font-bold text-sm tracking-tight">{toast.message}</p>
              </div>
            ))}
          </div>

      {/* Create / Edit Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-2xl font-black font-['Epilogue'] tracking-tight text-slate-900">{editingProductId ? 'Edit Product' : 'Create New Product'}</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto overflow-x-hidden p-6 flex-1 no-scrollbar">
              <form id="createProductForm" onSubmit={handleSubmitProduct} className="space-y-4 sm:px-8">
                <div className="flex flex-col sm:flex-row w-full">
                  <div className="space-y-2 w-full sm:w-1/2 sm:pr-4 mb-4 sm:mb-0">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product Name *</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Premium T-Shirt" />
                  </div>
                  <div className="space-y-2 w-full sm:w-1/2 sm:pl-4">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product Code *</label>
                    <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. SKU-12345" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full">
                  <div className="space-y-2 w-full sm:w-1/2 sm:pr-4 mb-4 sm:mb-0">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Price *</label>
                    <div className="flex items-stretch w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                      <select 
                        value={formData.currency} 
                        onChange={e => setFormData({...formData, currency: e.target.value})} 
                        className="bg-slate-100 border-r border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="BDT">BDT</option>
                        <option value="INR">INR</option>
                        <option value="AUD">AUD</option>
                        <option value="CAD">CAD</option>
                        <option value="JPY">JPY</option>
                      </select>
                      <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none" placeholder="E.g. 29.99" />
                    </div>
                  </div>
                  <div className="space-y-2 w-full sm:w-1/2 sm:pl-4">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Category</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Apparel" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Description *</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none" placeholder="Detailed product description..."></textarea>
                </div>

                <div className="flex flex-col sm:flex-row w-full">
                  <div className="space-y-2 w-full sm:w-1/2 sm:pr-4 mb-4 sm:mb-0">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Variants</label>
                    <input type="text" value={formData.variants} onChange={e => setFormData({...formData, variants: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Red, XL" />
                  </div>
                  <div className="space-y-2 w-full sm:w-1/2 sm:pl-4">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Tags (comma separated)</label>
                    <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="cotton, summer, blue" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm font-bold text-slate-700">In Stock / Available</label>
                  <div 
                    className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${formData.availability ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    onClick={() => setFormData({...formData, availability: !formData.availability})}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.availability ? 'translate-x-6' : ''}`}></div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase flex justify-between">
                    <span>Product Assets (Max 3)</span>
                    <span>{selectedFiles.length + existingAssets.length} / 3 total</span>
                  </label>
                  <label className="w-full h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all">
                    <span className="material-symbols-outlined text-slate-400 mb-1">upload_file</span>
                    <span className="text-xs font-semibold text-slate-500">Click to select files (Images, PDF, Video)</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*,video/mp4,application/pdf"
                      className="hidden" 
                      onChange={e => {
                        if (e.target.files.length + existingAssets.length > 3) {
                          addToast('You can only have a maximum of 3 files total.', 'error');
                          return;
                        }
                        setSelectedFiles(Array.from(e.target.files));
                      }}
                    />
                  </label>
                  
                  {/* Display Existing Assets */}
                  {existingAssets.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Currently Uploaded</p>
                      <div className="flex gap-4 flex-wrap">
                        {existingAssets.map((asset, idx) => (
                          <div key={asset.id || idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center group" title={asset.original_filename}>
                            {asset.file_type === 'image' || asset.mime_type?.includes('image') ? (
                              <FallbackImage src={asset.url?.startsWith('http') ? asset.url : `https://api.lyfflow.com${asset.url?.startsWith('/') ? '' : '/'}${asset.url}`} className="w-full h-full object-cover" />
                            ) : asset.file_type === 'video' || asset.mime_type?.includes('video') ? (
                              <Video size={20} className="text-emerald-500" />
                            ) : (
                              <FileText size={20} className="text-blue-500" />
                            )}
                            
                            {/* Primary Badge */}
                            {asset.is_primary && (
                              <div className="absolute top-1 left-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm z-10" title="Primary Asset">
                                <span className="material-symbols-outlined text-[10px] block">star</span>
                              </div>
                            )}

                            {/* Delete Asset Button (Always in top right) */}
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/90 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm z-20 opacity-0 group-hover:opacity-100"
                              title="Delete Asset"
                            >
                              <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                            </button>

                            {/* Hover Overlay for Primary Action */}
                            {!asset.is_primary && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-10">
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); handleSetPrimaryAsset(asset.id); }}
                                  className="w-7 h-7 rounded-full bg-white/20 text-white hover:bg-yellow-400 flex items-center justify-center transition-colors shadow-sm"
                                  title="Set as Primary"
                                >
                                  <span className="material-symbols-outlined text-[16px]">star</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display Newly Selected Files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Files to Upload</p>
                      <div className="flex gap-4 flex-wrap">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          {f.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(f)} alt={f.name} className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm" />
                          ) : f.type.startsWith('video/') ? (
                            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm"><Video size={24} className="text-slate-400" /></div>
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm"><FileText size={24} className="text-slate-400" /></div>
                          )}
                          <span className="text-[10px] text-slate-500 truncate w-20 text-center font-medium">{f.name}</span>
                        </div>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button form="createProductForm" type="submit" className="px-6 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                {editingProductId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-black font-['Epilogue'] tracking-tight text-slate-900">Import CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Import History</h4>
                  <p className="text-xs text-slate-500">View past batch uploads</p>
                </div>
                <button 
                  onClick={() => {
                    setShowImportModal(false);
                    setHistoryCursors([null]);
                    setHistoryIndex(0);
                    fetchHistoryBatches(null);
                    setShowHistoryModal(true);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  View History
                </button>
              </div>

              <form id="importCsvForm" onSubmit={handleImportCsv} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Select CSV File</label>
                  <label className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all">
                    <span className="material-symbols-outlined text-emerald-500 mb-2 text-3xl">csv</span>
                    <span className="text-sm font-semibold text-slate-600">{csvFile ? csvFile.name : 'Click to browse'}</span>
                    <input 
                      type="file" 
                      accept=".csv"
                      className="hidden" 
                      onChange={e => {
                        if (e.target.files.length > 0) {
                          setCsvFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-semibold mb-1">Required CSV Columns:</p>
                  <p>name, code, description, price</p>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button form="importCsvForm" type="submit" className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2" disabled={!csvFile}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowDetailModal(false); setSelectedProductDetail(null); }}></div>
          <div className="bg-slate-50 border border-slate-200/60 rounded-[32px] shadow-[0_30px_100px_-15px_rgba(0,0,0,0.6)] ring-1 ring-slate-900/5 w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="overflow-y-auto flex-1 bg-slate-50/50 relative">
              <button onClick={() => { setShowDetailModal(false); setSelectedProductDetail(null); }} className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/20 shadow-xl">
                <span className="material-symbols-outlined">close</span>
              </button>

              {loadingDetail || !selectedProductDetail ? (
                <div className="flex flex-col items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                  <p className="text-slate-500 font-medium animate-pulse">Loading details...</p>
                </div>
              ) : (
                <>
                  {/* Hero Banner */}
                  <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-10 pt-16 pb-20 relative overflow-hidden shrink-0">
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-500/20 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex flex-wrap gap-3 mb-2">
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-emerald-300 border border-emerald-400/30 font-mono text-xs font-bold rounded-lg shadow-lg">
                          {selectedProductDetail.code || 'NO CODE'}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg border backdrop-blur-md ${selectedProductDetail.availability ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                          {selectedProductDetail.availability ? 'Available' : 'Out of Stock'}
                        </span>
                      </div>
                      
                      <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-2xl">{selectedProductDetail.name}</h1>
                      
                      {selectedProductDetail.category && (
                        <span className="w-fit px-4 py-1.5 bg-blue-500/20 backdrop-blur-md text-blue-300 border border-blue-500/30 text-xs font-bold rounded-full shadow-md mt-2">
                          {selectedProductDetail.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Content Area */}
                  <div className="p-10 relative z-20 -mt-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-2 space-y-6">
                        
                        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border border-slate-200/60 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-400 to-teal-500"></div>
                          <h4 className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-emerald-500">subject</span>
                            Description
                          </h4>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                            {selectedProductDetail.description || <span className="text-slate-400 italic">No description provided.</span>}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[32px] shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                              <span className="material-symbols-outlined text-[120px]">payments</span>
                            </div>
                            <h4 className="text-xs font-bold tracking-[0.2em] text-emerald-100 uppercase mb-2">Price</h4>
                            <div className="text-5xl font-black drop-shadow-md">{selectedProductDetail.price}</div>
                          </div>

                          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border border-slate-200/60 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform">
                            <h4 className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-2 flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg text-blue-500">calendar_month</span>
                              Created
                            </h4>
                            <div className="text-xl font-bold text-slate-700 mt-4">
                              {new Date(selectedProductDetail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        {(selectedProductDetail.tags?.length > 0 || selectedProductDetail.variants) && (
                          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border border-slate-200/60 shadow-xl shadow-slate-200/50 space-y-6">
                            {selectedProductDetail.tags?.length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-4 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-lg text-indigo-500">sell</span>
                                  Tags
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedProductDetail.tags.map((tag, idx) => (
                                    <span key={idx} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 text-sm font-bold rounded-xl">#{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedProductDetail.variants && (
                              <div>
                                <h4 className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-4 mt-6 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-lg text-orange-500">style</span>
                                  Variants
                                </h4>
                                <p className="text-slate-700 text-lg font-medium">{selectedProductDetail.variants}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-1 space-y-4">
                        <h4 className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-6 flex items-center gap-2 pl-2 mt-4">
                          <span className="material-symbols-outlined text-lg">perm_media</span>
                          Media Assets
                        </h4>
                        {selectedProductDetail.assets && selectedProductDetail.assets.length > 0 ? (
                          <div className="grid grid-cols-1 gap-6">
                            {selectedProductDetail.assets.map((asset, idx) => (
                              <div key={idx} className={`relative group rounded-[24px] overflow-hidden border-2 border-white shadow-xl shadow-slate-200/50 bg-white aspect-square hover:-translate-y-2 transition-all duration-300 ${idx % 2 === 0 ? '-rotate-2' : 'rotate-2'}`}>
                                {asset.file_type === 'image' ? (
                                  <FallbackImage 
                                    src={asset.url?.startsWith('http') ? asset.url : `https://api.lyfflow.com${asset.url?.startsWith('/') ? '' : '/'}${asset.url}`} 
                                    alt={asset.original_filename} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-6 text-center">
                                    {asset.file_type === 'video' ? <Video size={48} className="text-emerald-400 mb-4" /> : <FileText size={48} className="text-blue-400 mb-4" />}
                                    <span className="text-xs font-bold truncate w-full px-2 text-slate-600">{asset.original_filename}</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                  <span className="text-white text-sm font-bold truncate">{asset.original_filename}</span>
                                  <span className="text-emerald-400 text-[10px] mt-1 font-black uppercase tracking-widest">{asset.file_type}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] border border-dashed border-slate-300 shadow-sm p-10 text-center flex flex-col items-center justify-center aspect-square">
                            <ImageIcon size={48} className="text-slate-300 mb-4" />
                            <span className="text-sm font-bold text-slate-500">No assets attached</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hacker Terminal Metadata Section */}
                    <div className="mt-12 bg-[#0A0A0A] rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden relative">
                      <div className="flex items-center gap-3 px-6 py-4 bg-[#111] border-b border-slate-800/80 relative z-10">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <span className="ml-2 text-[11px] text-slate-400 font-bold font-mono tracking-widest uppercase">sys_meta.json</span>
                      </div>
                      
                      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 font-mono">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Product ID</span>
                          <span className="text-emerald-400 text-xs truncate" title={selectedProductDetail.product_id}>{selectedProductDetail.product_id || 'NULL'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Namespace ID</span>
                          <span className="text-emerald-400 text-xs truncate" title={selectedProductDetail.namespace_id}>{selectedProductDetail.namespace_id || 'NULL'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pinecone Vector ID</span>
                          <span className="text-emerald-400 text-xs truncate" title={selectedProductDetail.pinecone_vector_id}>{selectedProductDetail.pinecone_vector_id || 'NOT_SYNCED'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Import Source</span>
                          <span className="text-teal-400 text-xs uppercase font-bold">{selectedProductDetail.import_source || 'UNKNOWN'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Import Batch ID</span>
                          <span className="text-emerald-400 text-xs truncate" title={selectedProductDetail.import_batch_id}>{selectedProductDetail.import_batch_id || 'NULL'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Last Updated</span>
                          <span className="text-blue-400 text-xs">
                            {selectedProductDetail.updated_at ? new Date(selectedProductDetail.updated_at).toLocaleString() : 'NULL'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 bg-white shrink-0 flex justify-end">
              <button onClick={() => { setShowDetailModal(false); setSelectedProductDetail(null); }} className="px-8 py-2.5 rounded-[12px] font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Delete Confirmation Modal */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirmModal({ show: false, productId: null })}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Delete Product?</h3>
              <p className="text-slate-500 font-medium text-sm mb-8">This action cannot be undone. This product will be permanently removed from your inventory.</p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteConfirmModal({ show: false, productId: null })} 
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDeleteProduct} 
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-black font-['Epilogue'] tracking-tight text-slate-900">CSV Import History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : selectedBatchDetail ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-4">
                    <button 
                      onClick={() => setSelectedBatchDetail(null)}
                      className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                      Back to History
                    </button>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-lg font-black text-slate-800 mb-1">Batch Details</h4>
                        <p className="text-sm text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">{selectedBatchDetail.batch_id}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                        selectedBatchDetail.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                        selectedBatchDetail.status === 'failed' ? 'bg-red-100 text-red-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {selectedBatchDetail.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Total Rows</p>
                        <p className="text-xl font-black text-slate-800">{selectedBatchDetail.total_rows}</p>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-xs text-emerald-600 font-semibold mb-1">Success</p>
                        <p className="text-xl font-black text-emerald-700">{selectedBatchDetail.processed_rows}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-xs text-red-600 font-semibold mb-1">Failed</p>
                        <p className="text-xl font-black text-red-700">{selectedBatchDetail.failed_rows}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-500 font-semibold mb-1">Filename</p>
                        <p className="text-sm font-bold text-slate-800 truncate" title={selectedBatchDetail.filename}>{selectedBatchDetail.filename || 'N/A'}</p>
                      </div>
                    </div>

                    {selectedBatchDetail.error_log && selectedBatchDetail.error_log.length > 0 && (
                      <div>
                        <h5 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                          Error Log
                        </h5>
                        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                            {JSON.stringify(selectedBatchDetail.error_log, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : historyBatches.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">history</span>
                  <p>No import history found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyBatches.map(batch => (
                    <div 
                      key={batch.batch_id} 
                      onClick={() => fetchBatchDetail(batch.batch_id)}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {batch.batch_id.split('-')[0]}...
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                            batch.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                            batch.status === 'failed' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {batch.status}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm mb-2 group-hover:text-emerald-600 transition-colors">{batch.filename || 'Unknown File'}</p>
                        <div className="text-xs text-slate-500 flex gap-4">
                          <span><strong>Total:</strong> {batch.total_rows}</span>
                          <span className="text-emerald-600"><strong>Success:</strong> {batch.processed_rows}</span>
                          <span className="text-red-500"><strong>Failed:</strong> {batch.failed_rows}</span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400 flex flex-col items-end gap-2">
                        <div>
                          <p>Started: {new Date(batch.created_at).toLocaleString()}</p>
                          {batch.completed_at && <p>Ended: {new Date(batch.completed_at).toLocaleString()}</p>}
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-emerald-500 transition-colors">chevron_right</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => {
                        const prevCursor = historyCursors[historyIndex - 1];
                        setHistoryIndex(prev => prev - 1);
                        fetchHistoryBatches(prevCursor);
                      }}
                      disabled={historyIndex === 0}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm font-medium text-slate-500">Page {historyIndex + 1}</span>
                    <button
                      onClick={() => {
                        if (historyCursors.length <= historyIndex + 1) {
                          setHistoryCursors(prev => [...prev, historyCursor]);
                        }
                        setHistoryIndex(prev => prev + 1);
                        fetchHistoryBatches(historyCursor);
                      }}
                      disabled={!historyHasMore}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>,
        document.body
      )}

    </>
  );
};

export default ProductsTab;
