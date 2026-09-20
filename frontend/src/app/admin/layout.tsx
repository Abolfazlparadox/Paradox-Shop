'use client';

import React, { useState } from 'react';
import { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CommandPalette } from '@/components/admin/CommandPalette';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-bg-primary text-fg-primary flex selection:bg-accent selection:text-accent-fg antialiased font-sans transition-colors">
        {/* Persistent Collapsible Sidebar on Desktop / Slide-over Drawer on Mobile */}
        <AdminSidebar
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 overflow-y-auto min-w-0">
            {children}
          </main>
        </div>

        {/* Global Cmd+K Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </AdminAuthGuard>
  );
}
