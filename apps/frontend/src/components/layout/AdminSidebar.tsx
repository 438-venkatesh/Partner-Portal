import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  Package,
  Truck,
  Home,
  UserCircle,
  LogOut,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  CreditCard,
  ClipboardCheck,
  BarChart3,
  Settings,
  UploadCloud,
  Compass,
  HeartPulse,
  Award,
  Layers,
  Share2,
  DollarSign,
  GraduationCap,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useNavigate } from '@tanstack/react-router';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout } = useAuthStore();
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    main: true,
    partner_management: true,
    suppliers: true,
    logistics: true,
  });

  const handleLogout = () => {
    logout();
    // Redirect to partners page after logout (or create an admin login page)
    navigate({ to: '/partners' });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { to: '/partners', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/revenue', label: 'Deals & revenue', icon: DollarSign },
        { to: '/enablement', label: 'Enablement', icon: GraduationCap },
        { to: '/comarketing', label: 'Co-marketing', icon: Megaphone },
        { to: '/compliance', label: 'Compliance', icon: ShieldCheck },
        { to: '/billing', label: 'Billing', icon: CreditCard },
      ],
    },
    {
      title: 'Partner management',
      items: [
        { to: '/partner-operations', label: 'Onboarding review', icon: ClipboardCheck },
        { to: '/onboarding/analytics', label: 'Onboarding analytics', icon: BarChart3 },
        { to: '/onboarding/settings', label: 'Onboarding settings', icon: Settings },
        { to: '/partners', label: 'All partners', icon: Users },
        { to: '/partners/health', label: 'Partner health', icon: HeartPulse },
        { to: '/partner-tiers', label: 'Tiers', icon: Award },
        { to: '/partner-segments', label: 'Segments', icon: Layers },
        { to: '/account-mapping', label: 'Account mapping', icon: Share2 },
        { to: '/partners/import', label: 'Bulk import', icon: UploadCloud },
        { to: '/directory', label: 'Partner directory', icon: Compass },
        { to: '/tenants', label: 'Tenants', icon: Building2 },
      ],
    },
    {
      title: 'Suppliers',
      items: [
        { to: '/suppliers', label: 'Dashboard', icon: Package },
        { to: '/suppliers/purchase-orders', label: 'Purchase Orders', icon: Package },
        { to: '/suppliers/invoices', label: 'Invoices', icon: Package },
      ],
    },
    {
      title: 'Logistics',
      items: [
        { to: '/logistics', label: 'Dashboard', icon: Truck },
        { to: '/logistics/shipments', label: 'Shipments', icon: Truck },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/partners' && pathname === '/partners') {
      return true;
    }
    return pathname.startsWith(path) && path !== '/partners';
  };

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
      {/* Logo/Header */}
      <div className="h-16 border-b border-gray-300 flex items-center px-4 bg-white flex-shrink-0">
        <Link to="/partners" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Home className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg text-gray-900">Operations Portal</span>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-300 bg-white flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <UserCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.role || 'Administrator'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto py-4 bg-white">
        <nav className="space-y-1 px-2">
          {navSections.map((section) => {
            const sectionKey = section.title.toLowerCase().replace(/\s+/g, '_');
            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span>{section.title}</span>
                  {expandedSections[sectionKey] ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {expandedSections[sectionKey] && (
                  <div className="mt-1 space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to);
                      return (
                        <Link key={item.to} to={item.to as any}>
                          <Button
                            type="button"
                            variant="ghost"
                            className={cn(
                              'w-full justify-start pl-8 text-sm',
                              active 
                                ? 'bg-blue-50 text-blue-700 font-medium hover:bg-blue-100' 
                                : 'text-gray-700 hover:bg-gray-100'
                            )}
                          >
                            <Icon className={cn('h-4 w-4 mr-2', active ? 'text-blue-600' : 'text-gray-500')} />
                            <span>{item.label}</span>
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Logout Button - Fixed at bottom */}
      <div className="p-4 border-t border-gray-300 bg-white flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start bg-white hover:bg-gray-100 text-gray-700 border-gray-300"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2 text-gray-600" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}

