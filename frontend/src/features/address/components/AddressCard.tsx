'use client';

import React from 'react';
import { Address } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { MapPin, Phone, User, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (addressId: string) => void;
  isSelected?: boolean;
  onSelect?: (address: Address) => void;
  isSelectable?: boolean;
  className?: string;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  isSelectable = false,
  className,
}: AddressCardProps) {
  return (
    <div
      onClick={() => isSelectable && onSelect && onSelect(address)}
      className={cn(
        'p-5 rounded-lg border transition-all text-start relative',
        isSelectable ? 'cursor-pointer focus-ring' : '',
        isSelected
          ? 'bg-bg-elevated border-accent shadow-card ring-1 ring-accent'
          : 'bg-bg-secondary/60 border-border-subtle hover:border-border-accent',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-display text-fg-primary uppercase tracking-wider">
            {address.title}
          </span>
          {address.is_default && (
            <Badge variant="mono" size="sm">
              Default
            </Badge>
          )}
        </div>

        {/* Edit & Delete Actions */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(address);
              }}
              className="p-1 text-fg-muted hover:text-fg-primary transition-colors focus-ring rounded-sm"
              aria-label={`Edit address ${address.title}`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(address.id);
              }}
              className="p-1 text-fg-muted hover:text-status-error transition-colors focus-ring rounded-sm"
              aria-label={`Delete address ${address.title}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Recipient details */}
      <div className="space-y-1.5 text-xs text-fg-secondary">
        <div className="flex items-center gap-2 font-medium text-fg-primary">
          <User className="w-3.5 h-3.5 text-fg-muted shrink-0" />
          <span>{address.recipient_name}</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Phone className="w-3.5 h-3.5 text-fg-muted shrink-0" />
          <span>{address.recipient_phone}</span>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <MapPin className="w-3.5 h-3.5 text-fg-muted shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-fg-primary">
              {address.province}, {address.city}
            </span>
            <p className="text-fg-secondary mt-0.5 line-clamp-2">{address.address_line}</p>
            <span className="font-mono text-[10px] text-fg-muted block mt-0.5">
              Postal Code: {address.postal_code}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
