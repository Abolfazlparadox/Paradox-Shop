'use client';

import React, { useState } from 'react';
import { AddressCard } from '@/features/address/components/AddressCard';
import { AddressModal } from '@/features/address/components/AddressModal';
import { useAddresses, useDeleteAddress } from '@/features/address/queries/useAddresses';
import { Button } from '@/components/ui/Button';
import { Address } from '@/types/api';
import { Plus, MapPin, Loader2 } from 'lucide-react';

export default function AddressesDashboardPage() {
  const { data, isLoading } = useAddresses();
  const deleteMutation = useDeleteAddress();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const addresses = data?.results || [];

  const handleEdit = (addr: Address) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this shipping address?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <h2 className="text-xl font-bold font-display text-fg-primary">
            Saved Delivery Addresses
          </h2>
          <p className="text-xs text-fg-secondary font-mono">
            Manage your destination coordinates and contact profiles
          </p>
        </div>

        <Button size="sm" onClick={handleCreate} leftIcon={<Plus className="w-3.5 h-3.5" />} className="text-xs">
          Add New Address
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-fg-muted">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          <span className="text-xs font-mono">Loading address directory...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && addresses.length === 0 && (
        <div className="p-12 bg-bg-elevated border border-border-subtle rounded-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-fg-muted mx-auto">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold font-display text-fg-primary">
              No Addresses Saved
            </h3>
            <p className="text-xs text-fg-secondary max-w-xs mx-auto">
              Save your primary shipping address for faster one-click checkout.
            </p>
          </div>
          <Button size="sm" onClick={handleCreate} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add First Address
          </Button>
        </div>
      )}

      {/* Grid of Addresses */}
      {!isLoading && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        addressToEdit={editingAddress}
      />
    </div>
  );
}
