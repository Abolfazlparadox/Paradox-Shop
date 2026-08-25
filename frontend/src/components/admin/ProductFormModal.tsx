'use client';

import React, { useState, useEffect } from 'react';
import { useAdminCategories } from '@/hooks/useAdminData';
import { AdminProduct, AdminProductVariant } from '@/types/api';
import { formatCurrency } from '@/lib/utils/format';
import { X, Plus, Trash2, Image as ImageIcon, Sparkles, Tag, Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { notify } from '@/stores/notifications';

interface ProductFormModalProps {
  product: AdminProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export function ProductFormModal({ product, isOpen, onClose, onSave }: ProductFormModalProps) {
  const isEditing = Boolean(product?.id);
  const { data: categories = [] } = useAdminCategories();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [basePrice, setBasePrice] = useState<number>(10000000);
  const [stock, setStock] = useState<number>(10);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>(['/images/products/chrono.png']);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [variants, setVariants] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setCategoryId(product.category?.id || (categories[0]?.id || ''));
      setBasePrice(Number(product.base_price || 0));
      setStock(product.stock || 10);
      setShortDescription(product.short_description || '');
      setDescription(product.description || '');
      setImages(product.images?.map((i) => i.image) || ['/images/products/chrono.png']);
      setVariants(product.variants || []);
    } else {
      setName('');
      setSlug('');
      setCategoryId(categories[0]?.id || '');
      setBasePrice(12000000);
      setStock(15);
      setShortDescription('');
      setDescription('');
      setImages(['/images/products/chrono.png']);
      setVariants([]);
    }
  }, [product, isOpen, categories]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleAddVariant = () => {
    const newVariant = {
      sku: `${(slug || 'PX').toUpperCase().slice(0, 8)}-V${variants.length + 1}`,
      name: 'Custom Edition',
      final_price: basePrice,
      stock: 5,
      attributes: { edition: 'Standard' },
      is_active: true,
    };
    setVariants([...variants, newVariant]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      notify.error('Validation Error', 'Product title and slug are required.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        slug,
        category: categoryId || undefined,
        base_price: Number(basePrice),
        product_type: 'simple',
        stock: Number(stock),
        short_description: shortDescription,
        description,
        is_active: true,
        variants: variants.length > 0 ? variants : undefined,
      });
      notify.success('Catalog Updated', `Artifact "${name}" was saved successfully.`);
      onClose();
    } catch (err: any) {
      notify.error('Save Failed', err?.response?.data?.detail || 'Could not persist artifact details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary my-8 max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-fg-primary">
                {isEditing ? `Edit Artifact: ${product?.name}` : 'Create New Atelier Artifact'}
              </h3>
              <p className="text-xs text-fg-muted font-mono">
                Define master luxury product parameters and variant matrix
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* General Information Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-muted pb-1 border-b border-border-subtle">
              1. General Details & Identification
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  Artifact Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Chrono Minimalist Titanium Watch"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  URL Slug / Handle *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. chrono-minimalist-titanium-watch"
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  Base Price (Rial) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={1000}
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  Standard Reserve Units
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Short Teaser / Synopsis
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="High-density aerospace titanium alloy casing with sapphire crystal."
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Comprehensive Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Full narrative, technical specifications, materials origin, and craftsmanship notes..."
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500 resize-none font-sans"
              />
            </div>
          </div>

          {/* Variants Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-muted">
                2. Variant SKUs ({variants.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
                className="text-[11px] font-mono border-border-subtle text-cyan-600 dark:text-cyan-400 cursor-pointer"
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Add Variant SKU
              </Button>
            </div>

            {variants.length === 0 ? (
              <div className="py-4 text-center text-xs text-fg-muted font-mono bg-bg-secondary/30 rounded-xl border border-dashed border-border-subtle">
                Standard single-variant item. Click &quot;Add Variant SKU&quot; to configure sizing, colors, or editions.
              </div>
            ) : (
              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                      <input
                        type="text"
                        placeholder="SKU"
                        value={v.sku}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].sku = e.target.value;
                          setVariants(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Edition Name"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].name = e.target.value;
                          setVariants(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={v.final_price || v.price_override || basePrice}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].price_override = Number(e.target.value);
                          setVariants(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={v.stock}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].stock = Number(e.target.value);
                          setVariants(updated);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Bottom Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="text-xs bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold cursor-pointer"
            >
              {isEditing ? 'Save Changes' : 'Publish to Catalog'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
