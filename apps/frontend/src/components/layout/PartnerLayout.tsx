import React from 'react';
import { ReactNode } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';
import { LogOut, Menu } from 'lucide-react';
import { PartnerSidebar } from './PartnerSidebar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface PartnerLayoutProps {
  children: ReactNode;
}

function getPartnerPageTitle(pathname: string): string {
  if (pathname === '/partner/dashboard') return 'Dashboard';
  if (pathname === '/partner/tenants' || pathname === '/partner/tenants/') return 'Tenants';
  if (pathname.startsWith('/partner/tenants/')) return 'Tenant detail';
  if (pathname === '/partner/timelines') return 'Service timelines';
  if (pathname === '/partner/timelines/new') return 'New timeline';
  if (pathname.includes('/partner/timelines/') && pathname.endsWith('/edit')) return 'Edit timeline';
  if (pathname === '/partner/services') return 'Services';
  if (pathname === '/partner/documents') return 'Documents';
  if (pathname === '/partner/agreements') return 'Agreements';
  if (pathname.startsWith('/partner/agreements/')) return 'Agreement';
  if (pathname === '/partner/employees') return 'Employees';
  if (pathname === '/partner/onboarding') return 'Onboarding';
  if (pathname === '/partner/settings') return 'Settings';
  return 'Partner Portal';
}

export function PartnerLayout({ children }: PartnerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = usePartnerAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const pageTitle = getPartnerPageTitle(location.pathname);

  const handleLogout = () => {
    logout();
    navigate({ to: '/partner/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar - Always visible on desktop (768px+) */}
      <aside className="hidden md:block w-64 flex-shrink-0 border-r border-gray-300 bg-white shadow-lg fixed left-0 top-0 bottom-0 z-40">
        <PartnerSidebar />
      </aside>

      {/* Mobile Sidebar - Sheet overlay */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md border border-gray-300"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <PartnerSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area - with margin for sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen md:ml-64">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-gray-300 bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold md:hidden">Partner Portal</h1>
            <h1 className="text-lg font-semibold hidden md:block text-gray-900">{pageTitle}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="flex items-center space-x-2 bg-white hover:bg-gray-100 border-gray-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
