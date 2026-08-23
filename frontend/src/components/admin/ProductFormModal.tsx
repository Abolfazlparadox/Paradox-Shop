'use client';

import React, { useState, useEffect } from 'react';
import { AdminProduct, AdminProductVariant } from '@/types/admin';
import { formatCurrency } from '@/lib/utils/format';
import { X, Plus, Trash2, Image as ImageIcon, Sparkles, Tag, Layers, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { notify } from '@/stores/notifications';

interface ProductFormModalProps {
  product: AdminProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AdminProduct>) => Promise<void>;
}

export function ProductFormModal({ product, isOpen, onClose, onSave }: ProductFormModalProps) {
  const isEditing = Boolean(product?.id);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryName, setCategoryName] = useState('Horology');
  const [basePrice, setBasePrice] = useState<number>(10000000);
  const [stock, setStock] = useState<number>(10);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>(['/images/products/chrono.png']);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [variants, setVariants] = useState<AdminProductVariant[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setCategoryName(product.category.name);
      setBasePrice(product.base_price);
      setStock(product.stock);
      setShortDescription(product.short_description || '');
      setDescription(product.description || '');
      setImages(product.images.length ? product.images : ['/images/products/chrono.png']);
      setVariants(product.variants || []);
    } else {
      setName('');
      setSlug('');
      setCategoryName('Horology');
      setBasePrice(12000000);
      setStock(15);
      setShortDescription('');
      setDescription('');
      setImages(['/images/products/chrono.png']);
      setVariants([]);
    }
  }, [product, isOpen]);

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
    const newVariant: AdminProductVariant = {
      id: `var-${Date.now()}`,
      sku: `${slug.toUpperCase().slice(0, 8)}-V${variants.length + 1}`,
      name: 'Custom Edition',
      final_price: basePrice,
      stock: 5,
      attributes: { edition: 'Standard' },
      is_active: true,
    };
    setVariants([...variants, newVariant]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
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
        id: product?.id,
        name,
        slug,
        category: {
          id: `cat-${categoryName.toLowerCase().replace(/\s+/g, '-')}`,
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        },
        base_price: Number(basePrice),
        stock: Number(stock),
        short_description: shortDescription,
        description,
        primary_image: images[0] || '/images/products/chrono.png',
        images,
        variants,
      });
      notify.success('Catalog Updated', `Artifact "${name}" was saved successfully.`);
      onClose();
    } catch {
      notify.error('Save Failed', 'Could not persist artifact details.');
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
                Define master horological and engineered luxury product parameters
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
                  Atelier Category
                </label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
                >
                  <option value="Horology">Horology</option>
                  <option value="Leather Goods">Leather Goods</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Fragrance">Fragrance</option>
                  <option value="Eyewear">Eyewear</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  Base Price (Toman) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg-secondary mb-1">
                  Total Inventory Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Descriptions Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-muted pb-1 border-b border-border-subtle">
              2. Atelier Narrative & Specifications
            </h4>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Short Teaser Description
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief engineered summary for catalog cards"
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Full Architectural Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive technical and material craftsmanship details..."
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Gallery Media */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-muted">
                3. Gallery Visual Artifacts ({images.length})
              </h4>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl bg-bg-secondary border border-border-subtle overflow-hidden group flex items-center justify-center"
                >
                  <img src={img} alt="Product visual" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-rose-950/80 text-rose-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Image URL path..."
                  className="px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500 w-48"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-3 py-2 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-xs font-mono text-cyan-600 dark:text-cyan-300 transition-colors"
                >
                  Add Image
                </button>
              </div>
            </div>
          </div>

          {/* Variants & SKU Matrix */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fg-muted">
                4. Editions & SKU Variants ({variants.length})
              </h4>
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="p-4 rounded-xl bg-bg-secondary/30 border border-dashed border-border-subtle text-center text-xs text-fg-muted font-mono">
                No sub-variants configured. Base price and stock apply directly to master SKU.
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-bg-secondary/60 border border-border-subtle grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                  >
                    <div>
                      <label className="text-[10px] font-mono text-fg-muted">Variant Name</label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].name = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs text-fg-primary font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-fg-muted">SKU Code</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].sku = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-fg-muted">Price (Toman)</label>
                      <input
                        type="number"
                        value={v.final_price}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx].final_price = Number(e.target.value);
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary"
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-mono text-fg-muted">Stock</label>
                        <input
                          type="number"
                          value={v.stock}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].stock = Number(e.target.value);
                            setVariants(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle bg-bg-secondary/60">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSaving}
            className="text-xs bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Save Changes' : 'Publish to Catalog'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
