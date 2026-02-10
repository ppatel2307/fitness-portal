/**
 * Dashboard layout wrapper
 * Includes sidebar navigation and main content area
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
