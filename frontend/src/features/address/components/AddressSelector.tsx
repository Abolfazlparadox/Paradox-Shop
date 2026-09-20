'use client';

import React, { useState } from 'react';
import { Address } from '@/types/api';
import { AddressCard } from './AddressCard';
import { AddressModal } from './AddressModal';
import { useAddresses, useDeleteAddress } from '../queries/useAddresses';
import { Button } from '@/components/ui/Button';
import { Plus, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface AddressSelectorProps {
  selectedAddressId: string | null;
  onSelectAddress: (address: Address) => void;
  className?: string;
}

export function AddressSelector({
  selectedAddressId,
  onSelectAddress,
  className,
}: AddressSelectorProps) {
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
    if (confirm('Are you sure you want to remove this delivery address?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-fg-muted font-semibold">
          Select Delivery Destination
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreate}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="text-xs"
        >
          Add New Address
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-10 text-fg-muted">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          <span className="text-xs font-mono">Loading saved addresses...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && addresses.length === 0 && (
        <div className="p-8 border border-dashed border-border-subtle rounded-lg text-center bg-bg-secondary/30 space-y-3">
          <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-fg-muted mx-auto">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold font-display text-fg-primary">
              No Shipping Addresses Saved
            </h4>
            <p className="text-xs text-fg-secondary max-w-xs mx-auto">
              Please add a delivery destination address to proceed with your order.
            </p>
          </div>
          <Button size="sm" onClick={handleCreate} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add Delivery Address
          </Button>
        </div>
      )}

      {/* Address Cards Grid */}
      {!isLoading && addresses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <AddressCard
                key={addr.id}
                address={addr}
                isSelectable
                isSelected={isSelected}
                onSelect={(selected) => onSelectAddress(selected)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        addressToEdit={editingAddress}
        onSuccess={(saved) => {
          onSelectAddress(saved);
        }}
      />
    </div>
  );
}
