import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiService } from '../services/api';
import { API_BASE } from '../config/env';
import { useBusiness } from '../context/BusinessContext';
import { Upload, Plus, Trash2, Edit3, Image as ImageIcon, FileText, Video, ExternalLink, Search, X } from 'lucide-react';
import ProductPrice from './products/ProductPrice';
import VariantEditor from './products/VariantEditor';
import {
  PRODUCT_TYPES, STOCK_STATUSES, isOnSale, newRowKey, normalizeStockStatus, parseOptionValues, stockLabel, toAmount, variantTitle,
} from '../utils/productPricing';

// Products are priced in the business currency; the API no longer takes one per product.
const DEFAULT_CURRENCY = 'BDT';

// Form state. Prices and quantities stay strings while typing; options keep the
// comma list as typed (valuesText). See VariantEditor for the row shapes.
const emptyProductForm = () => ({
  name: '', code: '', description: '', category: '', tags: '',
  regular_price: '', sale_price: '', product_type: 'simple',
  stock_status: 'in_stock', stock_quantity: '', availability: true,
  options: [], variants: [],
});

const amountText = (value) => (toAmount(value) === null ? '' : String(toAmount(value)));
const quantityText = (value) => (value === null || value === undefined ? '' : String(value));

// A saved variant as an editable form row.
const variantToRow = (variant) => ({
  key: variant.variant_id || newRowKey(),
  variant_id: variant.variant_id,
  sku: variant.sku || '',
  title: variant.title || '',
  option_values: variant.option_values || {},
  regular_price: amountText(variant.regular_price),
  sale_price: amountText(variant.sale_price),
  stock_quantity: quantityText(variant.stock_quantity),
  stock_status: normalizeStockStatus(variant.stock_status),
});

// A form row as the API's variant body (create, or the fields compared for an update).
const rowToVariant = (row, options, index) => {
  const quantity = row.stock_quantity === '' ? null : Number.parseInt(row.stock_quantity, 10);
  return {
    sku: row.sku.trim(),
    title: (row.title.trim() || variantTitle(row.option_values, options) || row.sku.trim()),
    option_values: row.option_values || {},
    regular_price: toAmount(row.regular_price) ?? 0,
    sale_price: toAmount(row.sale_price),
    stock_quantity: Number.isFinite(quantity) ? quantity : null,
    track_inventory: Number.isFinite(quantity),
    stock_status: row.stock_status,
    position: index,
  };
};

const VARIANT_COMPARED_FIELDS = ['sku', 'title', 'regular_price', 'sale_price', 'stock_quantity', 'track_inventory', 'stock_status', 'position'];

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

// `toolbarStart`: controls the parent puts at the left of the toolbar row (the
// catalog picker on the Knowledge page); the product controls sit on the right.
const ProductsTab = ({ selectedNamespaceId, toolbarStart = null }) => {
  // Members can browse products and import history; writes are admin+.
  const { canManage, business } = useBusiness();
  const currency = business?.currency || DEFAULT_CURRENCY;
  // Variants as loaded for the product being edited, to work out what changed on save.
  const originalVariantsRef = useRef([]);
  const [priceError, setPriceError] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Shown under the Product Code field when the API answers 409 (code already used
  // in this namespace). Cleared when the code changes or the form reopens.
  const [codeError, setCodeError] = useState('');
  const codeInputRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  
  // Delete Confirm State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, productId: null });
  const [editingProductId, setEditingProductId] = useState(null);
  
  // Create Product Form State
  const [formData, setFormData] = useState(emptyProductForm);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAssets, setExistingAssets] = useState([]);

  // Import CSV State
  const [csvFile, setCsvFile] = useState(null);

  // Filter State
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'available' | 'unavailable'
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'csv', 'manual'
  // What's typed, and the debounced value that's actually searched.
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyBatches, setHistoryBatches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyCursors, setHistoryCursors] = useState([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Batch Detail State
  const [selectedBatchDetail, setSelectedBatchDetail] = useState(null);
  const [, setLoadingBatchDetail] = useState(false);

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
      // 'all' sends no availability parameter, so both kinds come back.
      const availability = availabilityFilter === 'all' ? null : availabilityFilter === 'available';
      const data = await apiService.getProducts(selectedNamespaceId, cursor, PAGE_SIZE, availability, sourceFilter, searchQuery);
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

  const fetchHistoryBatches = async (cursor = null, statusOverride = null) => {
    if (!selectedNamespaceId) return;
    setLoadingHistory(true);
    try {
      const statusToUse = statusOverride !== null ? statusOverride : historyStatusFilter;
      const data = await apiService.getImportCsvHistory(selectedNamespaceId, statusToUse, cursor, PAGE_SIZE);
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

  // Search once typing pauses, rather than on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setHistory([null]);
    setCurrentIndex(0);
    fetchProducts(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNamespaceId, availabilityFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    if (showHistoryModal) {
      setHistoryCursors([null]);
      setHistoryIndex(0);
      fetchHistoryBatches(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyStatusFilter]);

  const handleEditProductClick = async (product) => {
    setEditingProductId(product.product_id);
    originalVariantsRef.current = [];
    // List fields first so the form opens at once; the detail fills in the rest.
    setFormData({
      ...emptyProductForm(),
      name: product.name || '',
      code: product.code || '',
      regular_price: amountText(product.regular_price),
      sale_price: amountText(product.sale_price),
      product_type: product.product_type === 'variable' ? 'variable' : 'simple',
      stock_status: normalizeStockStatus(product.stock_status),
      stock_quantity: quantityText(product.stock_quantity),
      availability: product.availability !== false,
    });
    setSelectedFiles([]);
    setExistingAssets(product.primary_assets || product.assets || []);
    setCodeError('');
    setPriceError('');
    setShowCreateModal(true);

    try {
      const detail = await apiService.getProductDetail(selectedNamespaceId, product.product_id);
      const variants = Array.isArray(detail.variants) ? detail.variants : [];
      originalVariantsRef.current = variants;
      setFormData(prev => ({
        ...prev,
        description: detail.description || prev.description,
        category: detail.category || prev.category,
        tags: Array.isArray(detail.tags) ? detail.tags.join(', ') : (detail.tags || prev.tags),
        product_type: detail.product_type === 'variable' || variants.length > 0 ? 'variable' : prev.product_type,
        regular_price: amountText(detail.regular_price ?? prev.regular_price),
        sale_price: amountText(detail.sale_price),
        stock_status: normalizeStockStatus(detail.stock_status ?? prev.stock_status),
        stock_quantity: quantityText(detail.stock_quantity ?? prev.stock_quantity),
        options: (Array.isArray(detail.options) ? detail.options : []).map(option => ({
          key: newRowKey(), name: option.name || '', valuesText: (option.values || []).join(', '),
        })),
        variants: variants.map(variantToRow),
      }));
      if (detail.assets || detail.primary_assets) {
        setExistingAssets(detail.assets || detail.primary_assets);
      }
    } catch (err) {
      console.error("Failed to fetch full details for edit", err);
    }
  };

  // Brings the product's variants in line with the form: new rows are created,
  // changed ones patched, removed ones deleted. Returns the error messages.
  const syncVariants = async (productId, rows, options) => {
    const errors = [];
    const originals = originalVariantsRef.current;
    const keptIds = new Set(rows.map(row => row.variant_id).filter(Boolean));
    for (const original of originals) {
      if (keptIds.has(original.variant_id)) continue;
      try { await apiService.deleteProductVariant(selectedNamespaceId, productId, original.variant_id); }
      catch (err) { errors.push(`${original.sku}: ${err.message}`); }
    }
    for (const [index, row] of rows.entries()) {
      const body = rowToVariant(row, options, index);
      try {
        if (!row.variant_id) {
          await apiService.createProductVariant(selectedNamespaceId, productId, body);
          continue;
        }
        const before = rowToVariant(variantToRow(originals.find(item => item.variant_id === row.variant_id) || {}), options, index);
        const changes = Object.fromEntries(VARIANT_COMPARED_FIELDS.filter(field => body[field] !== before[field]).map(field => [field, body[field]]));
        if (JSON.stringify(body.option_values) !== JSON.stringify(before.option_values)) changes.option_values = body.option_values;
        if (Object.keys(changes).length > 0) await apiService.updateProductVariant(selectedNamespaceId, productId, row.variant_id, changes);
      } catch (err) {
        errors.push(`${body.sku || `Variant ${index + 1}`}: ${err.message}`);
      }
    }
    return errors;
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!selectedNamespaceId) {
      addToast('Please select a namespace first', 'error');
      return;
    }
    setCodeError('');
    setPriceError('');

    const regularPrice = toAmount(formData.regular_price);
    const salePrice = toAmount(formData.sale_price);
    if (salePrice !== null && regularPrice !== null && salePrice >= regularPrice) {
      setPriceError('The sale price must be lower than the regular price.');
      return;
    }
    const isVariable = formData.product_type === 'variable';
    const options = isVariable
      ? formData.options.map(option => ({ name: option.name.trim(), values: parseOptionValues(option.valuesText) })).filter(option => option.name && option.values.length)
      : [];
    const variantRows = isVariable ? formData.variants : [];
    if (isVariable && variantRows.length === 0) {
      addToast('Add at least one variant, or make this a simple product.', 'error');
      return;
    }
    const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const stockQuantity = formData.stock_quantity === '' ? null : Number.parseInt(formData.stock_quantity, 10);
    // Simple products carry their own stock; a variable product's stock is per variant.
    const stockFields = isVariable ? {} : { stock_status: formData.stock_status, stock_quantity: Number.isFinite(stockQuantity) ? stockQuantity : null };

    try {
      let variantErrors = [];
      if (editingProductId) {
        const updateData = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          category: formData.category || null,
          tags,
          product_type: formData.product_type,
          regular_price: regularPrice ?? 0,
          sale_price: salePrice,
          options,
          availability: formData.availability !== false,
          ...stockFields,
        };

        await apiService.updateProduct(selectedNamespaceId, editingProductId, updateData);
        if (isVariable) variantErrors = await syncVariants(editingProductId, variantRows, options);

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
        // Multipart: tags as a comma list, options and variants as JSON.
        const createData = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          regular_price: String(regularPrice ?? 0),
          sale_price: salePrice === null ? null : String(salePrice),
          product_type: formData.product_type,
          category: formData.category || null,
          tags: tags.join(', ') || null,
          options: options.length ? JSON.stringify(options) : null,
          variants: isVariable ? JSON.stringify(variantRows.map((row, index) => rowToVariant(row, options, index))) : null,
          availability: formData.availability !== false,
        };

        const newProduct = await apiService.createProduct(selectedNamespaceId, createData);
        const newProductId = newProduct.product_id || newProduct.id;

        // Create can't take stock fields; set them straight after when they're not the defaults.
        if (newProductId && !isVariable && (stockFields.stock_quantity !== null || stockFields.stock_status !== 'in_stock')) {
          await apiService.updateProduct(selectedNamespaceId, newProductId, stockFields);
        }

        // Optimistic UI Update for creation
        setProducts(prevProducts => [{ ...createData, sale_price: salePrice, ...stockFields, product_id: newProductId || Date.now().toString() }, ...prevProducts]);

        if (selectedFiles && selectedFiles.length > 0 && newProductId) {
          const fileData = new FormData();
          for (let i = 0; i < selectedFiles.length; i++) {
            fileData.append('files', selectedFiles[i]);
          }
          await apiService.addProductAssets(selectedNamespaceId, newProductId, fileData);
        }

        addToast('Product created successfully!', 'success');
      }
      if (variantErrors.length > 0) {
        addToast(`Product saved, but ${variantErrors.length} variant change${variantErrors.length === 1 ? '' : 's'} failed: ${variantErrors[0]}`, 'error');
      }

      setShowCreateModal(false);
      setFormData(emptyProductForm());
      setSelectedFiles([]);
      setExistingAssets([]);
      setEditingProductId(null);
      fetchProducts(history[currentIndex]);
    } catch (err) {
      // 409: the code is already used by another product in this namespace. Say so on
      // the field and keep the form open, rather than a generic failure toast.
      if (err.status === 409) {
        const code = formData.code.trim();
        setCodeError(code
          ? `Product code "${code}" is already used in this catalog. Enter a different code.`
          : 'This product code is already used in this catalog. Enter a different code.');
        codeInputRef.current?.focus();
        return;
      }
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
      setActiveAssetIndex(0);
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
      <div className="products-tab w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {toolbarStart && <div className="flex min-w-0 flex-wrap items-center gap-2">{toolbarStart}</div>}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="relative w-full sm:w-[420px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setSearchInput(''); }}
                placeholder="Search products by name, code, brand, or category"
                aria-label="Search products"
                className="products-filter-select products-search-input h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                aria-label="Filter by availability"
                style={{ backgroundImage: 'none' }}
                className="products-filter-select h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer appearance-none pl-3 pr-9 outline-none"
              >
                <option value="all">All products</option>
                <option value="available">Available (In Stock)</option>
                <option value="unavailable">Unavailable (Out of Stock)</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">expand_more</span>
            </div>
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                aria-label="Filter by source"
                style={{ backgroundImage: 'none' }}
                className="products-filter-select h-10 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer appearance-none pl-3 pr-9 outline-none"
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="csv">CSV Import</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">expand_more</span>
            </div>
            {canManage ? (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="products-import-button h-10 rounded-lg border border-solid border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 inline-flex items-center gap-2 px-3.5"
            >
              <Upload size={16} /> Import CSV
            </button>
            ) : (
            <button
              type="button"
              onClick={() => {
                setHistoryCursors([null]);
                setHistoryIndex(0);
                fetchHistoryBatches(null);
                setShowHistoryModal(true);
              }}
              className="products-import-button h-10 rounded-lg border border-solid border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 inline-flex items-center gap-2 px-3.5"
            >
              <FileText size={16} /> Import history
            </button>
            )}
            {canManage && <button
              type="button"
              onClick={() => {
                setEditingProductId(null);
                setFormData(emptyProductForm());
                setSelectedFiles([]);
                setExistingAssets([]);
                setCodeError('');
                setPriceError('');
                originalVariantsRef.current = [];
                setShowCreateModal(true);
              }}
              className="page-stats-action inline-flex h-10 items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:border-emerald-600 hover:bg-emerald-600"
            >
              <Plus size={16} /> Create Product
            </button>}
          </div>
        </div>

        {/* Data Table */}
        <div className="products-table animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto w-full no-scrollbar">
            <div className="min-w-[1040px] w-full">
              <div className="products-table-header grid grid-cols-[2.6fr_1.4fr_1.1fr_1.8fr_1.5fr_1.5fr_1.4fr_100px] gap-4 p-5 text-[10px] font-black tracking-[0.2em] text-emerald-700 uppercase bg-emerald-50 border-b border-emerald-100 shadow-sm">
                <div className="pl-6 flex items-center">Product Name</div>
                <div className="flex items-center">Code</div>
                <div className="flex items-center">Type</div>
                <div className="flex items-center">Price</div>
                <div className="flex items-center">Stock</div>
                <div className="flex items-center">Status</div>
                <div className="flex items-center">Assets</div>
                <div className="text-right pr-6 flex items-center justify-end">Actions</div>
              </div>

        <div className="products-table-body divide-y divide-slate-100">
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
              <p className="text-slate-500 font-medium text-sm max-w-sm">
                {searchQuery
                  ? <>Nothing matches &ldquo;{searchQuery}&rdquo;. Try a different name, code, brand, or category.</>
                  : 'Create your first product or import a CSV to populate your inventory.'}
              </p>
            </div>
          ) : (
            products.map((product) => (
              <div key={product.product_id} onClick={() => handleViewProduct(product.product_id)} className="products-table-row grid grid-cols-[2.6fr_1.4fr_1.1fr_1.8fr_1.5fr_1.5fr_1.4fr_100px] gap-4 p-5items-center hover:bg-emerald-50/30 transition-all group duration-300 cursor-pointer">
                <div className="pl-6 font-bold text-sm text-slate-800 truncate pr-4 group-hover:text-emerald-700 transition-colors">
                  {product.name}
                </div>
                <div className="text-sm text-slate-500 font-mono text-xs bg-slate-100 px-2 py-1 rounded-md inline-block w-fit border border-slate-200 shadow-sm">
                  {product.code || 'N/A'}
                </div>
                <div className="text-sm text-slate-500 truncate pr-2 font-medium">
                  {product.product_type === 'variable' ? 'Variable' : product.product_type ? product.product_type.charAt(0).toUpperCase() + product.product_type.slice(1) : 'Simple'}
                </div>
                <div>
                  <ProductPrice regularPrice={product.regular_price} salePrice={product.sale_price} currency={product.currency || currency} size="sm" />
                </div>
                <div className="text-sm font-medium text-slate-600">
                  <span className={normalizeStockStatus(product.stock_status) === 'out_of_stock' ? 'text-red-600' : normalizeStockStatus(product.stock_status) === 'on_backorder' ? 'text-amber-600' : ''}>{stockLabel(product.stock_status)}</span>
                  {product.stock_quantity !== null && product.stock_quantity !== undefined && <span className="text-slate-400"> · {product.stock_quantity}</span>}
                </div>
                <div className="flex items-center">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${product.availability ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                    {product.availability ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex gap-1.5 items-center">
                  {product.primary_assets && product.primary_assets.length > 0 ? (
                    product.primary_assets.map((asset, i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden shadow-sm group-hover:border-emerald-200 transition-colors" title={asset.original_filename}>
                        {asset.file_type === 'image' ? (
                          <FallbackImage src={asset.url?.startsWith('http') ? asset.url : `${API_BASE}${asset.url?.startsWith('/') ? '' : '/'}${asset.url}`} alt={asset.original_filename} className="w-full h-full object-cover" />
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
                  {canManage && <>
                  <button onClick={(e) => { e.stopPropagation(); handleEditProductClick(product); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors" title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.product_id); }} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                  </>}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && products.length > 0 && (
          <div className="products-pagination p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
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
                className="products-pagination-button px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
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
                className="products-pagination-button px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
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
          <div className={`bg-white rounded-3xl shadow-2xl w-full ${formData.product_type === 'variable' ? 'max-w-4xl' : 'max-w-3xl'} relative z-10 overflow-hidden flex flex-col max-h-[94vh] transition-[max-width] duration-200`}>
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-2xl font-black font-['Epilogue'] tracking-tight text-slate-900">{editingProductId ? 'Edit Product' : 'Create New Product'}</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="overflow-y-auto overflow-x-hidden p-6 flex-1 no-scrollbar">
              <form id="createProductForm" onSubmit={handleSubmitProduct} className="space-y-4 sm:px-8">
                {/* Name, code, prices, type and category: kept tight so the description gets the room. */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row w-full">
                    <div className="space-y-1 w-full sm:w-1/2 sm:pr-3 mb-3 sm:mb-0">
                      <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product Name *</label>
                      <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Premium T-Shirt" />
                    </div>
                    <div className="space-y-1 w-full sm:w-1/2 sm:pl-3">
                      <label htmlFor="product-code" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product Code *</label>
                      <input
                        id="product-code"
                        ref={codeInputRef}
                        type="text"
                        required
                        value={formData.code}
                        onChange={e => { setFormData({...formData, code: e.target.value}); if (codeError) setCodeError(''); }}
                        aria-invalid={codeError ? 'true' : undefined}
                        aria-describedby={codeError ? 'product-code-error' : undefined}
                        className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 transition-all ${codeError ? 'product-code-invalid border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-emerald-500'}`}
                        placeholder="E.g. SKU-12345"
                      />
                      {codeError && (
                        <p id="product-code-error" role="alert" className="product-code-error m-0 text-xs font-semibold text-red-600">{codeError}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row w-full">
                    <div className="space-y-1 w-full sm:w-1/2 sm:pr-3 mb-3 sm:mb-0">
                      <label htmlFor="product-regular-price" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Regular price *</label>
                      <div className="flex items-stretch w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                        <span className="flex items-center bg-slate-100 border-r border-slate-200 px-3 text-sm font-bold text-slate-600">{currency}</span>
                        <input id="product-regular-price" type="number" min="0" step="0.01" required value={formData.regular_price} onChange={e => { setFormData({...formData, regular_price: e.target.value}); if (priceError) setPriceError(''); }} className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none" placeholder="E.g. 1200" />
                      </div>
                    </div>
                    <div className="space-y-1 w-full sm:w-1/2 sm:pl-3">
                      <label htmlFor="product-sale-price" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Sale price</label>
                      <div className={`flex items-stretch w-full bg-slate-50 border rounded-xl overflow-hidden focus-within:ring-2 transition-all ${priceError ? 'product-code-invalid border-red-400 focus-within:ring-red-500' : 'border-slate-200 focus-within:ring-emerald-500'}`}>
                        <span className="flex items-center bg-slate-100 border-r border-slate-200 px-3 text-sm font-bold text-slate-600">{currency}</span>
                        <input id="product-sale-price" type="number" min="0" step="0.01" value={formData.sale_price} onChange={e => { setFormData({...formData, sale_price: e.target.value}); if (priceError) setPriceError(''); }} aria-invalid={priceError ? 'true' : undefined} aria-describedby={priceError ? 'product-price-error' : 'product-sale-hint'} className="w-full bg-transparent px-3 py-2 text-sm font-semibold text-slate-700 outline-none" placeholder="Optional" />
                      </div>
                      {priceError
                        ? <p id="product-price-error" role="alert" className="product-code-error m-0 text-xs font-semibold text-red-600">{priceError}</p>
                        : <p id="product-sale-hint" className="m-0 text-[11px] text-slate-500">{isOnSale(formData.regular_price, formData.sale_price) ? 'Shown as the selling price, with the regular price struck through.' : 'Leave empty when the product isn\'t on sale.'}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row w-full">
                    <div className="space-y-1 w-full sm:w-1/2 sm:pr-3 mb-3 sm:mb-0">
                      <label htmlFor="product-type" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Product type</label>
                      <select id="product-type" value={formData.product_type} onChange={e => setFormData({...formData, product_type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                        {PRODUCT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1 w-full sm:w-1/2 sm:pl-3">
                      <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Category</label>
                      <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="E.g. Apparel" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="product-description" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Description *</label>
                  <textarea id="product-description" required rows={8} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="block w-full min-h-[10rem] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium leading-6 text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500 transition-[box-shadow] resize-y" placeholder="Detailed product description..."></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Tags (comma separated)</label>
                  <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="cotton, summer, blue" />
                </div>

                {formData.product_type === 'variable' ? (
                  <VariantEditor
                    options={formData.options}
                    variants={formData.variants}
                    onOptionsChange={options => setFormData(prev => ({ ...prev, options }))}
                    onVariantsChange={variants => setFormData(prev => ({ ...prev, variants }))}
                    productCode={formData.code}
                    defaultPrice={formData.regular_price}
                    currency={currency}
                  />
                ) : (
                  <div className="flex flex-col sm:flex-row w-full">
                    <div className="space-y-2 w-full sm:w-1/2 sm:pr-4 mb-4 sm:mb-0">
                      <label htmlFor="product-stock-status" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Stock status</label>
                      <select id="product-stock-status" value={formData.stock_status} onChange={e => setFormData({...formData, stock_status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all">
                        {STOCK_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 w-full sm:w-1/2 sm:pl-4">
                      <label htmlFor="product-stock-quantity" className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Stock quantity</label>
                      <input id="product-stock-quantity" type="number" min="0" step="1" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="Leave empty if not tracked" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm font-bold text-slate-700">Available to customers</label>
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
                        const newFiles = Array.from(e.target.files);
                        if (newFiles.length === 0) return;

                        setSelectedFiles(prev => {
                          const combined = [...prev];
                          for (const nf of newFiles) {
                            if (!combined.some(ex => ex.name === nf.name && ex.size === nf.size)) {
                              combined.push(nf);
                            }
                          }
                          if (combined.length + existingAssets.length > 3) {
                            addToast('You can only have a maximum of 3 files total.', 'error');
                            return combined.slice(0, Math.max(0, 3 - existingAssets.length));
                          }
                          return combined;
                        });
                        e.target.value = '';
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
                              <FallbackImage src={asset.url?.startsWith('http') ? asset.url : `${API_BASE}${asset.url?.startsWith('/') ? '' : '/'}${asset.url}`} className="w-full h-full object-cover" />
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
                        <div key={i} className="flex flex-col items-center gap-2 relative group">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm z-20"
                            title="Remove File"
                          >
                            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                          </button>
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
                    <FileText className="mb-2 h-8 w-8 text-emerald-500" strokeWidth={1.8} aria-hidden="true" />
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

      {/* Product Detail Modal (Luxury Minimalist Editorial Redesign) */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowDetailModal(false); setSelectedProductDetail(null); }}></div>
          <div className="bg-[#f9f9fb] border border-slate-200/80 rounded-3xl shadow-[0_30px_100px_-15px_rgba(0,0,0,0.5)] w-full max-w-[800px] relative z-10 flex flex-col max-h-[92vh] overflow-hidden selection:bg-slate-900 selection:text-white">
            
            {/* Breadcrumb Header Bar */}
            <div className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-slate-200/60 bg-white/80 backdrop-blur-md shrink-0">
              <div className="flex items-center space-x-2 text-slate-500 font-mono text-[11px] font-bold uppercase tracking-widest">
                <span>Knowledge</span>
                <span className="text-slate-300">/</span>
                <span>Products</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-black truncate max-w-[200px] sm:max-w-md">{selectedProductDetail?.name || 'Detail'}</span>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedProductDetail(null); }} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-2xs">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {loadingDetail || !selectedProductDetail ? (
              <div className="flex flex-col items-center justify-center h-96 p-12 bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-4"></div>
                <p className="text-slate-500 font-bold font-mono text-xs tracking-widest uppercase animate-pulse">Loading editorial catalog view...</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 py-8 md:py-10 px-6 sm:px-10 bg-[#f9f9fb]">
                {/* Product Details Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  
                  {/* Left Column: Product Imagery */}
                  <div className="lg:col-span-5 flex flex-col space-y-4 max-w-[280px] w-full mx-auto lg:mx-0">
                    {/* Main Image */}
                    <div className="relative w-full aspect-square max-h-[280px] bg-[#eeeef0] rounded-2xl overflow-hidden group border border-slate-200/80 shadow-inner flex items-center justify-center">
                      {selectedProductDetail.assets && selectedProductDetail.assets.length > 0 ? (
                        (() => {
                          const activeAsset = selectedProductDetail.assets[activeAssetIndex] || selectedProductDetail.assets[0];
                          if (activeAsset.file_type === 'image') {
                            const imgUrl = activeAsset.url?.startsWith('http') ? activeAsset.url : `${API_BASE}${activeAsset.url?.startsWith('/') ? '' : '/'}${activeAsset.url}`;
                            return (
                              <FallbackImage
                                src={imgUrl}
                                alt={activeAsset.original_filename || selectedProductDetail.name}
                                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                              />
                            );
                          } else {
                            return (
                              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                                {activeAsset.file_type === 'video' ? <Video size={64} className="text-emerald-600 mb-4 animate-pulse" /> : <FileText size={64} className="text-blue-600 mb-4" />}
                                <span className="font-bold text-base text-slate-800 mb-1">{activeAsset.original_filename}</span>
                                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">{activeAsset.file_type} ASSET</span>
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                          <ImageIcon size={64} className="text-slate-300 mb-3" />
                          <span className="text-sm font-bold text-slate-500">No product image uploaded</span>
                          <span className="text-xs text-slate-400 mt-1">Upload files when editing to preview studio imagery</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail Grid */}
                    {selectedProductDetail.assets && selectedProductDetail.assets.length > 1 && (
                      <div className="grid grid-cols-4 gap-3 sm:gap-4">
                        {selectedProductDetail.assets.map((asset, idx) => {
                          const isSelected = idx === (activeAssetIndex || 0);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveAssetIndex(idx)}
                              className={`relative w-full aspect-square bg-[#eeeef0] rounded-xl overflow-hidden transition-all duration-200 flex items-center justify-center ${isSelected ? 'opacity-100 ring-2 ring-slate-900 shadow-md scale-[0.98] border-2 border-white' : 'opacity-60 hover:opacity-100 border border-slate-200'}`}
                            >
                              {asset.file_type === 'image' ? (
                                <FallbackImage
                                  src={asset.url?.startsWith('http') ? asset.url : `${API_BASE}${asset.url?.startsWith('/') ? '' : '/'}${asset.url}`}
                                  alt={asset.original_filename}
                                  className="w-full h-full object-cover object-center"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-2 text-slate-500">
                                  {asset.file_type === 'video' ? <Video size={24} className="text-emerald-600" /> : <FileText size={24} className="text-blue-600" />}
                                  <span className="text-[10px] font-mono truncate w-full text-center mt-1">{asset.file_type}</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Product Information */}
                  <div className="lg:col-span-7 flex flex-col pt-2 lg:pt-0 text-left">
                    
                    {/* Header Info */}
                    <div className="mb-6 sm:mb-8">
                      {/* Status & Tags */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2 bg-[#eeeef0] py-1 px-3 rounded-md border border-slate-200/60">
                          <span className={`w-2 h-2 rounded-full border ${selectedProductDetail.availability ? 'bg-[#1a1c1d] border-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-600 border-red-800'}`}></span>
                          <span className="font-mono text-[11px] font-bold text-slate-700 uppercase tracking-widest">{selectedProductDetail.availability ? 'Available' : 'Unavailable'} · {stockLabel(selectedProductDetail.stock_status)}{selectedProductDetail.stock_quantity !== null && selectedProductDetail.stock_quantity !== undefined ? ` (${selectedProductDetail.stock_quantity})` : ''}</span>
                        </div>
                        <div className="flex space-x-2">
                          <span className="px-2.5 py-1 bg-[#e2e2e4] border border-slate-300/50 font-mono text-[10px] font-bold text-slate-900 uppercase tracking-widest rounded-md">
                            {selectedProductDetail.category || 'GENERAL CATALOG'}
                          </span>
                        </div>
                      </div>
                      
                      <h1 className="text-3xl sm:text-4xl lg:text-[42px] leading-tight font-bold text-slate-900 mb-3 tracking-tight">{selectedProductDetail.name}</h1>
                      
                      {/* Price & SKU Box */}
                      <div className="flex items-baseline justify-between mb-6 bg-[#f3f3f5] p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div>
                          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">PRICE</div>
                          <ProductPrice regularPrice={selectedProductDetail.regular_price} salePrice={selectedProductDetail.sale_price} currency={selectedProductDetail.currency || currency} size="lg" />
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">SKU / REF</div>
                          <span className="text-sm font-mono font-bold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">{selectedProductDetail.code || 'NO CODE'}</span>
                        </div>
                      </div>
                      
                      {/* Description Block */}
                      <div className="mb-6">
                        <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2">DESCRIPTION</div>
                        <p className="text-sm text-slate-600 leading-relaxed p-5 bg-[#f3f3f5] border border-slate-200/80 rounded-2xl whitespace-pre-wrap">
                          {selectedProductDetail.description || 'An architectural approach to catalog structure. Cut and formatted cleanly for seamless retrieval by autonomous agents and users.'}
                        </p>
                      </div>
                    </div>

                    {/* Product Tags / Attributes Block */}
                    <div className="space-y-6">
                      <div className="p-5 bg-[#f3f3f5] border border-slate-200/80 rounded-2xl">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-mono text-[11px] font-bold text-slate-900 uppercase tracking-widest">PRODUCT ATTRIBUTES & TAGS</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedProductDetail.category && (
                            <span className="px-2.5 py-1 bg-white border border-slate-200/80 font-mono text-[10px] font-bold text-slate-800 uppercase tracking-widest rounded-md shadow-2xs">CATEGORY: {selectedProductDetail.category}</span>
                          )}
                          <span className="px-2.5 py-1 bg-white border border-slate-200/80 font-mono text-[10px] font-bold text-slate-800 uppercase tracking-widest rounded-md shadow-2xs">SOURCE: {selectedProductDetail.import_source || 'MANUAL'}</span>
                          {(selectedProductDetail.options || []).map(option => (
                            <span key={option.name} className="px-2.5 py-1 bg-white border border-slate-200/80 font-mono text-[10px] font-bold text-slate-800 uppercase tracking-widest rounded-md shadow-2xs">{option.name}: {(option.values || []).join(', ')}</span>
                          ))}
                          {selectedProductDetail.tags && selectedProductDetail.tags.map((tag, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200/80 font-mono text-[10px] font-bold text-slate-800 uppercase tracking-widest rounded-md shadow-2xs">#{tag}</span>
                          ))}
                          {(!selectedProductDetail.tags || selectedProductDetail.tags.length === 0) && !(selectedProductDetail.options || []).length && (
                            <span className="px-2.5 py-1 bg-white/60 border border-slate-200 font-mono text-[10px] font-semibold text-slate-400 uppercase tracking-widest rounded-md">STANDARD SPEC</span>
                          )}
                        </div>
                      </div>

                      {/* Variants of a variable product */}
                      {(selectedProductDetail.variants || []).length > 0 && (
                        <div className="product-variants-panel p-5 bg-[#f3f3f5] border border-slate-200/80 rounded-2xl">
                          <div className="mb-3 font-mono text-[11px] font-bold text-slate-900 uppercase tracking-widest">VARIANTS ({selectedProductDetail.variants.length})</div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                              <thead>
                                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  <th scope="col" className="pb-2 pr-3">Variant</th>
                                  <th scope="col" className="pb-2 pr-3">SKU</th>
                                  <th scope="col" className="pb-2 pr-3">Price</th>
                                  <th scope="col" className="pb-2">Stock</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/70">
                                {selectedProductDetail.variants.map(variant => (
                                  <tr key={variant.variant_id || variant.sku}>
                                    <td className="py-2 pr-3 font-semibold text-slate-800">{variant.title || variantTitle(variant.option_values, selectedProductDetail.options) || '—'}</td>
                                    <td className="py-2 pr-3 font-mono text-slate-600">{variant.sku}</td>
                                    <td className="py-2 pr-3"><ProductPrice regularPrice={variant.regular_price} salePrice={variant.sale_price} currency={selectedProductDetail.currency || currency} size="sm" /></td>
                                    <td className="py-2 text-slate-600">{stockLabel(variant.stock_status)}{variant.stock_quantity !== null && variant.stock_quantity !== undefined ? ` · ${variant.stock_quantity}` : ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Details & Fit / Composition & Care Editorial Specs */}
                      {/* <div className="space-y-3">
                        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                          <div className="font-mono text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-1.5">DETAILS & FIT / SPECIFICATIONS</div>
                          <p className="text-xs text-slate-600 leading-relaxed font-mono">
                            Regular fit, true to catalog spec. Structured metadata layout with fast indexing (`{selectedProductDetail.product_id}`). Namespace ID: `{selectedProductDetail.namespace_id || 'Global'}`.
                          </p>
                        </div>
                        
                        <div className="p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                          <div className="font-mono text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-1.5">VECTOR SYNC & LIFECYCLE</div>
                          <p className="text-xs text-slate-600 leading-relaxed font-mono">
                            Pinecone Vector ID: <span className="text-emerald-700 font-bold">{selectedProductDetail.pinecone_vector_id || 'NOT_SYNCED'}</span> {'•'} Last Updated: {selectedProductDetail.updated_at ? new Date(selectedProductDetail.updated_at).toLocaleString() : 'Just now'}
                          </p>
                        </div>
                      </div> */}
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Footer Action Bar */}
            <div className="px-6 sm:px-10 py-4 border-t border-slate-200/60 bg-white/80 backdrop-blur-md shrink-0 flex justify-between items-center">
              <div className="text-[11px] font-mono text-slate-400 font-semibold truncate max-w-xs sm:max-w-md">
                {/* ID: {selectedProductDetail?.product_id || 'N/A'} */}
              </div>
              <div className="flex gap-3">
                {/* <button
                  type="button"
                  onClick={() => {
                    const productToEdit = productsList.find(p => p.product_id === selectedProductDetail.product_id) || selectedProductDetail;
                    setShowDetailModal(false);
                    handleEditProductClick(productToEdit);
                  }}
                  className="px-5 py-2 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 transition-all font-mono uppercase tracking-wider"
                >
                  Edit Product
                </button> */}
                <button
                  type="button"
                  onClick={() => { setShowDetailModal(false); setSelectedProductDetail(null); }}
                  className="px-6 py-2 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all font-mono uppercase tracking-wider"
                >
                  Close View
                </button>
              </div>
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
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black font-['Epilogue'] tracking-tight text-slate-900">CSV Import History</h3>
                {!selectedBatchDetail && (
                  <select 
                    value={historyStatusFilter} 
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-semibold text-xs border border-slate-200 outline-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                )}
              </div>
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


