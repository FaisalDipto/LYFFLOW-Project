import React, { useState, useEffect } from 'react';
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
  
  // Create Product Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    category: '',
    tags: '',
    variants: '',
    availability: true
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Import CSV State
  const [csvFile, setCsvFile] = useState(null);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchProducts = async () => {
    if (!selectedNamespaceId) return;
    setLoading(true);
    try {
      const data = await apiService.getProducts(selectedNamespaceId);
      setProducts(data.items || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load products: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedNamespaceId]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!selectedNamespaceId) {
      addToast('Please select a namespace first', 'error');
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('code', formData.code);
    data.append('description', formData.description);
    data.append('price', formData.price);
    if (formData.category) data.append('category', formData.category);
    if (formData.tags) data.append('tags', formData.tags);
    if (formData.variants) data.append('variants', formData.variants);
    data.append('availability', formData.availability);

    for (let i = 0; i < selectedFiles.length; i++) {
      data.append('files', selectedFiles[i]);
    }

    try {
      await apiService.createProduct(selectedNamespaceId, data);
      addToast('Product created successfully!', 'success');
      setShowCreateModal(false);
      setFormData({ name: '', code: '', description: '', price: '', category: '', tags: '', variants: '', availability: true });
      setSelectedFiles([]);
      fetchProducts();
    } catch (err) {
      addToast('Failed to create product: ' + err.message, 'error');
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
      setTimeout(fetchProducts, 3000); // Check for results after a bit
    } catch (err) {
      addToast('Failed to import CSV: ' + err.message, 'error');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiService.deleteProduct(selectedNamespaceId, productId);
      addToast('Product deleted successfully', 'success');
      fetchProducts();
    } catch (err) {
      addToast('Failed to delete product: ' + err.message, 'error');
    }
  };

  return (
    <div className="animate-fade-in-up mt-6">
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg shadow-black/5 transform transition-all duration-300 pointer-events-auto bg-white border-l-4 ${toast.type === 'error' ? 'border-red-500 text-red-600' : 'border-emerald-500 text-emerald-600'}`}>
            <span className="material-symbols-outlined">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Products Inventory</h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-sm border border-slate-200"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold text-sm shadow-sm"
          >
            <Plus size={16} /> Create Product
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-5 text-[10px] font-black tracking-[0.2em] text-emerald-700 uppercase bg-emerald-50 border-b border-emerald-100 shadow-sm">
          <div className="col-span-3 pl-6 flex items-center">Product Name</div>
          <div className="col-span-2 flex items-center">Code</div>
          <div className="col-span-2 flex items-center">Price</div>
          <div className="col-span-2 flex items-center">Status</div>
          <div className="col-span-2 flex items-center">Assets</div>
          <div className="col-span-1 text-right pr-6 flex items-center justify-end">Actions</div>
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
              <div key={product.product_id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-emerald-50/30 transition-all group duration-300">
                <div className="col-span-3 pl-6 font-bold text-sm text-slate-800 truncate pr-4 group-hover:text-emerald-700 transition-colors">
                  {product.name}
                </div>
                <div className="col-span-2 text-sm text-slate-500 font-mono text-xs bg-slate-100 px-2 py-1 rounded-md inline-block w-fit border border-slate-200 shadow-sm">
                  {product.code || 'N/A'}
                </div>
                <div className="col-span-2 text-sm font-black text-slate-700">
                  ${product.price}
                </div>
                <div className="col-span-2 flex items-center">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${product.availability ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {product.availability ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
                <div className="col-span-2 flex gap-1.5 items-center">
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
                <div className="col-span-1 text-right pr-6 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDeleteProduct(product.product_id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-2xl font-black font-['Epilogue'] tracking-tight text-slate-900">Create New Product</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              <form id="createProductForm" onSubmit={handleCreateProduct} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product Name *</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Premium T-Shirt" />
                  </div>
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product Code *</label>
                    <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. SKU-12345" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Price *</label>
                    <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. 29.99" />
                  </div>
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Category</label>
                    <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Apparel" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Description *</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none" placeholder="Detailed product description..."></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="space-y-2 w-full">
                    <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Tags (comma separated)</label>
                    <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="cotton, summer, blue" />
                  </div>
                  <div className="space-y-2 w-full flex flex-col justify-center">
                    <div className="flex items-center justify-between pt-6">
                      <label className="text-sm font-bold text-slate-700">In Stock / Available</label>
                      <div 
                        className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${formData.availability ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        onClick={() => setFormData({...formData, availability: !formData.availability})}
                      >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.availability ? 'translate-x-6' : ''}`}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase flex justify-between">
                    <span>Product Assets (Max 3)</span>
                    <span>{selectedFiles.length} / 3 selected</span>
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
                        if (e.target.files.length > 3) {
                          addToast('You can only select a maximum of 3 files.', 'error');
                          return;
                        }
                        setSelectedFiles(Array.from(e.target.files));
                      }}
                    />
                  </label>
                  {selectedFiles.length > 0 && (
                    <div className="flex gap-4 flex-wrap mt-4">
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
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button form="createProductForm" type="submit" className="px-6 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                Save Product
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

    </div>
  );
};

export default ProductsTab;
