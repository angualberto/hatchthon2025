'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] transition-colors">
      {/* Background effects with Petrobras colors */}
      <div className="fixed inset-0 z-0">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-primary)]/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-[var(--color-secondary)]/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(0 129 64)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
          }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="pl-64">
        <Header />
        <main className="relative z-10 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
