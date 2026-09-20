'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Address, AddressRequest } from '@/types/api';
import { useCreateAddress, useUpdateAddress } from '../queries/useAddresses';
import { AlertCircle } from 'lucide-react';

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  addressToEdit?: Address | null;
  onSuccess?: (address: Address) => void;
}

export function AddressModal({
  isOpen,
  onClose,
  addressToEdit,
  onSuccess,
}: AddressModalProps) {
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();

  const [title, setTitle] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (addressToEdit) {
      setTitle(addressToEdit.title);
      setRecipientName(addressToEdit.recipient_name);
      setRecipientPhone(addressToEdit.recipient_phone);
      setProvince(addressToEdit.province);
      setCity(addressToEdit.city);
      setPostalCode(addressToEdit.postal_code);
      setAddressLine(addressToEdit.address_line);
      setIsDefault(addressToEdit.is_default);
    } else {
      setTitle('Home');
      setRecipientName('');
      setRecipientPhone('');
      setProvince('Tehran');
      setCity('Tehran');
      setPostalCode('');
      setAddressLine('');
      setIsDefault(false);
    }
    setErrorMessage(null);
  }, [addressToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: AddressRequest = {
      title: title.trim(),
      recipient_name: recipientName.trim(),
      recipient_phone: recipientPhone.trim(),
      province: province.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      address_line: addressLine.trim(),
      is_default: isDefault,
    };

    try {
      if (addressToEdit) {
        const res = await updateMutation.mutateAsync({ id: addressToEdit.id, data: payload });
        onSuccess && onSuccess(res);
      } else {
        const res = await createMutation.mutateAsync(payload);
        onSuccess && onSuccess(res);
      }
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to save address.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      setErrorMessage(msg);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={addressToEdit ? 'Edit Shipping Address' : 'Add Delivery Address'}
      description="Enter precision destination coordinates and contact information."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMessage && (
          <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2.5 text-status-error text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Address Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Studio, Home, Office"
            required
            className="text-xs h-9"
          />
          <Input
            label="Recipient Full Name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Abolfazl Paradox"
            required
            className="text-xs h-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Recipient Phone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="09123456789"
            required
            className="text-xs h-9 font-mono"
          />
          <Input
            label="Province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="Tehran"
            required
            className="text-xs h-9"
          />
          <Input
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Tehran"
            required
            className="text-xs h-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-fg-secondary mb-1.5 font-medium">
              Detailed Address Line
            </label>
            <textarea
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="Street, Building No, Unit..."
              required
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-md bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors resize-none"
            />
          </div>
          <div>
            <Input
              label="Postal Code (10 digits)"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="1234567890"
              required
              className="text-xs h-9 font-mono"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 pt-1 text-xs text-fg-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-border-subtle text-accent focus:ring-accent w-4 h-4 bg-bg-secondary"
          />
          <span>Set as default shipping address</span>
        </label>

        <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isPending}>
            {addressToEdit ? 'Save Changes' : 'Create Address'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
