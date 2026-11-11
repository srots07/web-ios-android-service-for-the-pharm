"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  RefreshCw,
  FileText,
  FileCheck,
  Archive,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  ExternalLink,
  Download,
  Trash2,
} from "lucide-react";
import { productsApi, documentsApi, ProductItem, ProductDocumentItem, extractErrorMessage } from "@/lib/api";
import { ConfirmDialog } from "@/components/forms";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [managingDocsProduct, setManagingDocsProduct] = useState<ProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create/Edit Form state
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Tablets");
  const [formPackSize, setFormPackSize] = useState("");
  const [formDosageForm, setFormDosageForm] = useState("");
  const [formStrength, setFormStrength] = useState("");
  const [formComposition, setFormComposition] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStorage, setFormStorage] = useState("");
  const [formShelfLife, setFormShelfLife] = useState("");
  const [formStatus, setFormStatus] = useState("Published");
  const [submitting, setSubmitting] = useState(false);

  // Document upload form
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("Certificate of Analysis");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.listAdmin({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setProducts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      setError(extractErrorMessage(err, "Could not retrieve pharmaceutical formulations."));
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const resetForm = () => {
    setFormSku("");
    setFormName("");
    setFormCategory("Tablets");
    setFormPackSize("");
    setFormDosageForm("");
    setFormStrength("");
    setFormComposition("");
    setFormDescription("");
    setFormStorage("");
    setFormShelfLife("");
    setFormStatus("Published");
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (product: ProductItem) => {
    setEditingProduct(product);
    setFormSku(product.sku);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPackSize(product.pack_size);
    setFormDosageForm(product.dosage_form || "");
    setFormStrength(product.strength || "");
    setFormComposition(product.composition || "");
    setFormDescription(product.description || "");
    setFormStorage(product.storage_conditions || "");
    setFormShelfLife(product.shelf_life || "");
    setFormStatus(product.status || "Published");
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      await productsApi.create({
        sku: formSku,
        name: formName,
        category: formCategory,
        pack_size: formPackSize,
        dosage_form: formDosageForm,
        strength: formStrength,
        composition: formComposition,
        description: formDescription,
        storage_conditions: formStorage,
        shelf_life: formShelfLife,
        status: formStatus as any,
      });
      setActionSuccess(`Formulation '${formName}' created successfully.`);
      setShowCreateModal(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to create formulation."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);
    try {
      await productsApi.update(editingProduct.id, {
        sku: formSku,
        name: formName,
        category: formCategory,
        pack_size: formPackSize,
        dosage_form: formDosageForm,
        strength: formStrength,
        composition: formComposition,
        description: formDescription,
        storage_conditions: formStorage,
        shelf_life: formShelfLife,
        status: formStatus as any,
      });
      setActionSuccess(`Formulation '${formName}' updated successfully.`);
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to update formulation."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (product: ProductItem) => {
    setError(null);
    setActionSuccess(null);
    try {
      if (product.is_published) {
        await productsApi.archive(product.id);
        setActionSuccess(`Formulation ${product.sku} archived.`);
      } else {
        await productsApi.publish(product.id);
        setActionSuccess(`Formulation ${product.sku} published to public catalogue.`);
      }
      fetchProducts();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Action failed."));
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    setError(null);
    try {
      await productsApi.delete(deletingProduct.id);
      setActionSuccess(`Formulation ${deletingProduct.name} (${deletingProduct.sku}) and all associated records permanently removed.`);
      setDeletingProduct(null);
      fetchProducts();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to delete product formulation."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveDocument = async (docId: string | number) => {
    if (!managingDocsProduct) return;
    setError(null);
    try {
      await productsApi.removeDocument(managingDocsProduct.id, String(docId));
      setActionSuccess("Technical document detached successfully.");
      const updatedP = await productsApi.get(managingDocsProduct.id);
      setManagingDocsProduct(updatedP);
      fetchProducts();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to detach document."));
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingDocsProduct) return;
    setUploadingDoc(true);
    setError(null);
    setActionSuccess(null);
    try {
      let filePath = `/dossiers/${managingDocsProduct.sku.toLowerCase()}-specs.pdf`;
      let fileSize = 1048576;

      // Real multipart file upload if a file was selected
      if (docFile) {
        const uploadRes = await documentsApi.upload(docFile, docType);
        filePath = uploadRes.download_url;
        fileSize = uploadRes.file_size;
      }

      await productsApi.attachDocument(managingDocsProduct.id, {
        title: docTitle,
        document_type: docType,
        file_path: filePath,
        file_size: fileSize,
      });

      setActionSuccess(`Document '${docTitle}' attached successfully.`);
      setDocTitle("");
      setDocFile(null);

      // Refresh managing product details
      const updatedP = await productsApi.get(managingDocsProduct.id);
      setManagingDocsProduct(updatedP);
      fetchProducts();
    } catch (err: any) {
      setError(extractErrorMessage(err, "Failed to attach document."));
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              Module W07
            </span>
            <span className="text-xs text-muted-foreground">PostgreSQL Persistence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Pharmaceutical Product Catalogue
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage pharmaceutical formulations, technical dossiers, regulatory classifications and public sync.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            New Formulation
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Formulations</p>
            <Package className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Live on Public Web</p>
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {products.filter((p) => p.is_published).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Archived Records</p>
            <Archive className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {products.filter((p) => p.status === "Archived").length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Categories Active</p>
            <Layers className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">5 Formats</p>
        </div>
      </div>

      {/* Action / Error Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-inset ring-rose-600/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search formulation by SKU, name, or composition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
            >
              <option value="">All Categories</option>
              <option value="Tablets">Tablets</option>
              <option value="Syrups / Susp.">Syrups / Susp.</option>
              <option value="Paediatric Drops">Paediatric Drops</option>
              <option value="Capsules">Capsules</option>
              <option value="Oil Filled Capsules">Oil Filled Capsules</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="Published">Published (Public Catalogue)</option>
              <option value="Draft">Draft Formulations</option>
              <option value="Archived">Archived Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">SKU & Formulation</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Dosage & Strength</th>
                <th className="px-4 py-3">Packaging</th>
                <th className="px-4 py-3">Catalogue Status</th>
                <th className="px-4 py-3">Dossiers</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                    <p className="mt-2 text-xs">Querying pharmaceutical catalogue...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium">No formulations found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-mono text-xs font-bold border border-emerald-200">
                          {p.sku.split("-")[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{p.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{p.dosage_form || "Standard Dose"}</p>
                      <p>{p.strength || "Standard Formulation"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{p.pack_size}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "Published"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "Draft"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <button
                        onClick={() => setManagingDocsProduct(p)}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{p.documents?.length || 0} Dossiers</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          Specs
                        </button>
                        <button
                          onClick={() => handleTogglePublish(p)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                            p.is_published
                              ? "text-slate-600 hover:bg-slate-100"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {p.is_published ? "Archive" : "Publish"}
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          title="Delete Formulation"
                          className="rounded-md p-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{products.length}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> formulations
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Formulation Modal */}
      {(showCreateModal || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  {editingProduct ? `Edit Formulation: ${editingProduct.sku}` : "Register New Formulation"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete technical specification for pharmaceutical manufacture and commercial listing.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingProduct(null);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Formulation Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Daily Multivitamin Plus"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Unique SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                    placeholder="e.g. TAB-007"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Pharmaceutical Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="Tablets">Tablets</option>
                    <option value="Syrups / Susp.">Syrups / Susp.</option>
                    <option value="Paediatric Drops">Paediatric Drops</option>
                    <option value="Capsules">Capsules</option>
                    <option value="Oil Filled Capsules">Oil Filled Capsules</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Pack Size & Packaging *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPackSize}
                    onChange={(e) => setFormPackSize(e.target.value)}
                    placeholder="e.g. 60 Tablets / HDPE Bottle"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Dosage Form
                  </label>
                  <input
                    type="text"
                    value={formDosageForm}
                    onChange={(e) => setFormDosageForm(e.target.value)}
                    placeholder="e.g. Film-coated Tablet, Oral Suspension"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Strength / Potency
                  </label>
                  <input
                    type="text"
                    value={formStrength}
                    onChange={(e) => setFormStrength(e.target.value)}
                    placeholder="e.g. 500mg, 1000 IU"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Active Ingredients & Composition
                  </label>
                  <input
                    type="text"
                    value={formComposition}
                    onChange={(e) => setFormComposition(e.target.value)}
                    placeholder="e.g. Calcium Carbonate 500mg, Vitamin D3 400 IU"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Clinical Indications & Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe clinical rationale, absorption properties, and target indications..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Storage Conditions
                  </label>
                  <input
                    type="text"
                    value={formStorage}
                    onChange={(e) => setFormStorage(e.target.value)}
                    placeholder="Store below 25°C in a dry place."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Shelf Life
                  </label>
                  <input
                    type="text"
                    value={formShelfLife}
                    onChange={(e) => setFormShelfLife(e.target.value)}
                    placeholder="24 Months, 36 Months"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingProduct(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProduct ? "Save Specification" : "Register Formulation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technical Documents & Dossiers Modal */}
      {managingDocsProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  Technical Dossiers: {managingDocsProduct.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground">SKU: {managingDocsProduct.sku}</p>
              </div>
              <button
                onClick={() => setManagingDocsProduct(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Existing Documents List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Attached Regulatory Dossiers</h4>
              {managingDocsProduct.documents && managingDocsProduct.documents.length > 0 ? (
                <div className="divide-y divide-border rounded-xl border border-border bg-muted/20">
                  {managingDocsProduct.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        <div>
                          <p className="font-medium text-foreground">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          title="Detach Document"
                          className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No technical files or COA certificates currently attached.
                </p>
              )}
            </div>

            {/* Attach Document Form */}
            <form onSubmit={handleAddDocument} className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <h4 className="text-xs font-semibold uppercase text-foreground">Attach New Technical Dossier</h4>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Certificate of Analysis (COA) Batch 2026-A"
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="Certificate of Analysis">Certificate of Analysis (COA)</option>
                    <option value="Stability Study">Stability Study</option>
                    <option value="SmPC Summary">SmPC Summary</option>
                    <option value="Regulatory Dossier">Regulatory Dossier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Upload Technical Document (PDF/DOCX/PNG, max 10MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {docFile && (
                    <p className="mt-1 text-[11px] text-emerald-600 font-mono">
                      Selected: {docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Attach to Formulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingProduct}
        title="Delete Pharmaceutical Formulation"
        message={`Are you sure you want to permanently delete "${deletingProduct?.name}" (${deletingProduct?.sku})? This will delete all attached technical dossiers and cannot be undone.`}
        confirmLabel="Delete Formulation"
        destructive
        loading={isDeleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />
    </div>
  );
}

