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
          .replace(/^-|-$/g, '')
      );
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddVariant = () => {
    const newVariant: AdminProductVariant = {
      id: `var-${Date.now()}`,
      sku: `PX-${(slug || 'ART').toUpperCase().slice(0, 8)}-${variants.length + 1}`,
      name: 'Custom Edition / Standard',
      final_price: basePrice,
      stock: 5,
      attributes: { edition: 'Standard' },
      is_active: true,
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: product?.id,
        name: name.trim(),
        slug: slug.trim() || `product-${Date.now()}`,
        category: {
          id: `cat-${categoryName.toLowerCase()}`,
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        },
        base_price: Number(basePrice),
        stock: Number(stock),
        short_description: shortDescription.trim(),
        description: description.trim(),
        primary_image: images[0] || '/images/products/chrono.png',
        images,
        variants,
      });

      notify.success(
        isEditing ? 'Artifact Synchronized' : 'Artifact Manifested',
        `${name} successfully recorded in catalog.`
      );
      onClose();
    } catch {
      notify.error('Catalog Error', 'Failed to save product specification.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col text-slate-200 my-8 max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold font-display text-white">
                {isEditing ? `Edit Artifact: ${product?.name}` : 'Manifest New Atelier Artifact'}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Configure commercial properties, pricing matrices, and inventory allocation
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Basic Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              Primary Specifications
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  Artifact Title
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Chrono Minimalist Titanium Edition"
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  URL Slug Identifier
                </label>
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="chrono-minimalist"
                  className="bg-slate-950/60 border-slate-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  Category
                </label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Horology">Horology</option>
                  <option value="Leather Goods">Leather Goods</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Fragrance">Fragrance</option>
                  <option value="Apparel">Apparel</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  Base Price (Toman)
                </label>
                <Input
                  type="number"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  className="bg-slate-950/60 border-slate-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300">
                  Initial Stock Reserve
                </label>
                <Input
                  type="number"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="bg-slate-950/60 border-slate-800 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300">
                Short Description / Teaser
              </label>
              <Input
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Precision engineered grade 5 titanium timepiece with sapphire crystal."
                className="bg-slate-950/60 border-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Media Images */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Media Assets & Gallery</span>
            </h4>

            <div className="flex gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Enter image URL (e.g. /images/products/chrono.png)"
                className="bg-slate-950/60 border-slate-800 text-xs flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddImage}
                className="text-xs font-mono border-slate-700 text-slate-300"
              >
                Add Image
              </Button>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300"
                >
                  <span className="truncate max-w-[200px]">{img}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="text-rose-400 hover:text-rose-300 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Variants Management */}
          <div className="space-y-3 pt-4 border-t border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-widest text-cyan-400 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>SKU Variants ({variants.length})</span>
              </h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddVariant}
                leftIcon={<Plus className="w-3 h-3" />}
                className="text-[11px] border-slate-700 text-cyan-300 hover:bg-slate-800"
              >
                Add SKU Variant
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className="text-slate-500 text-[11px]">
                No explicit variant matrix defined. Single SKU default will be generated.
              </p>
            ) : (
              <div className="space-y-2">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white">{v.name}</div>
                      <div className="text-[10px] text-slate-400">{v.sku} • {formatCurrency(v.final_price)} • {v.stock} in reserve</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(v.id)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isSaving}
              className="text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold"
            >
              {isEditing ? 'Save Changes' : 'Publish to Catalog'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
