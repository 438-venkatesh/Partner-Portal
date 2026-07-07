import React from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Calendar,
  Users,
  Layers,
  Settings,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  DollarSign,
  UserCircle,
  LogOut,
  Bell,
  Files,
  Handshake,
  ListChecks,
  Package,
  Truck,
} from 'lucide-react';
import { usePartnerAuthStore } from '@/lib/stores/partnerAuthStore';
import { partnerDashboardApi } from '@/lib/api/partnerDashboard';
import { partnerNotificationsApi } from '@/lib/api/partnerNotifications';
import { partnerAuthApi } from '@/lib/api/partnerAuth';
import {
  hasServicePartnerClientPortal,
  hasSupplierPortalNav,
  hasLogisticsPortalNav,
  hasGenericOnboardingNav,
} from '@/lib/partnerTypeFlags';
import { partnerTypeLabel } from '@/lib/partnerOnboardingStages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function sectionKey(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}

export function PartnerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { user, logout } = usePartnerAuthStore();

  const { data: orgData } = useQuery({
    queryKey: ['partner-organization'],
    queryFn: () => partnerAuthApi.getOrganization(),
    staleTime: 5 * 60_000,
  });

  const partnerType = orgData?.organization?.partnerType ?? user?.partnerType;
  const showClientManagement = hasServicePartnerClientPortal(partnerType);
  const showSupplierNav = hasSupplierPortalNav(partnerType);
  const showLogisticsNav = hasLogisticsPortalNav(partnerType);
  const showGenericOnboarding = hasGenericOnboardingNav(partnerType);

  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => ({
    overview: true,
    client_management: true,
    supplier: true,
    logistics: true,
    workspace: true,
    compliance: true,
    organization: true,
  }));

  const handleLogout = () => {
    logout();
    navigate({ to: '/partner/login' });
  };

  const { data: stats } = useQuery({
    queryKey: ['partner-dashboard-stats'],
    queryFn: () => partnerDashboardApi.getStats(),
    enabled: showClientManagement,
  });

  const { data: notifData, refetch: refetchNotifs } = useQuery({
    queryKey: ['partner-notifications'],
    queryFn: () => partnerNotificationsApi.list(),
    refetchInterval: 60_000,
  });

  const unreadCount = notifData?.unreadCount ?? 0;

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { to: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/partner/revenue', label: 'Deals & revenue', icon: DollarSign },
      ],
    },
    ...(showClientManagement
      ? [
          {
            title: 'Client Management',
            items: [
              { to: '/partner/tenants', label: 'Tenants', icon: Building2 },
              {
                to: '/partner/timelines',
                label: 'Service Timelines',
                icon: Calendar,
                badge: stats?.overdueItems ? stats.overdueItems : undefined,
              },
              { to: '/partner/services', label: 'Services', icon: Layers },
            ],
          } as NavSection,
        ]
      : []),
    ...(showSupplierNav
      ? [
          {
            title: 'Supplier',
            items: [
              { to: '/partner/onboarding', label: 'Supplier onboarding', icon: ListChecks },
              {
                to: '/partner/onboarding/supplier/catalog',
                label: 'Product catalog',
                icon: Package,
              },
            ],
          } as NavSection,
        ]
      : []),
    ...(showLogisticsNav
      ? [
          {
            title: 'Logistics',
            items: [
              { to: '/partner/onboarding', label: 'Logistics onboarding', icon: ListChecks },
            ],
          } as NavSection,
        ]
      : []),
    {
      title: showClientManagement ? 'Compliance' : 'Workspace',
      items: [
        { to: '/partner/documents', label: 'Documents', icon: Files },
        { to: '/partner/agreements', label: 'Agreements', icon: Handshake },
      ],
    },
    {
      title: 'Organization',
      items: [
        { to: '/partner/employees', label: 'Employees', icon: Users },
        ...(showGenericOnboarding
          ? [{ to: '/partner/onboarding', label: 'Onboarding', icon: ListChecks }]
          : []),
        { to: '/partner/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/partner/dashboard') {
      return pathname === path;
    }
    if (path === '/partner/onboarding') {
      return (
        pathname === '/partner/onboarding' ||
        (pathname.startsWith('/partner/onboarding/') && !pathname.includes('/supplier/catalog'))
      );
    }
    if (path === '/partner/onboarding/supplier/catalog') {
      return pathname.startsWith('/partner/onboarding/supplier/catalog');
    }
    return pathname.startsWith(path);
  };

  const typeLabel = partnerType ? partnerTypeLabel(partnerType) : null;

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
      <div className="h-16 border-b border-gray-300 flex items-center justify-between px-4 bg-white flex-shrink-0 gap-2">
        <Link to="/partner/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity min-w-0">
          <Building2 className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <span className="font-bold text-lg text-gray-900 truncate">Partner Portal</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="relative flex-shrink-0" aria-label="Notifications">
              <Bell className="h-5 w-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!notifData?.notifications?.length && (
              <div className="px-2 py-3 text-sm text-muted-foreground">No notifications yet.</div>
            )}
            {notifData?.notifications?.map((n) => (
              <DropdownMenuItem
                key={n.notificationId}
                className="flex flex-col items-start gap-1 cursor-pointer whitespace-normal"
                onClick={async () => {
                  if (!n.isRead) {
                    try {
                      await partnerNotificationsApi.markRead(n.notificationId);
                      await refetchNotifs();
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              >
                <span className="font-medium text-sm">{n.title}</span>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-[10px] text-muted-foreground">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 border-b border-gray-300 bg-white flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <UserCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.partnerName || 'Partner'}</p>
            {typeLabel && (
              <p className="text-[10px] text-blue-600 font-medium truncate mt-0.5">{typeLabel}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 bg-white">
        <nav className="space-y-1 px-2">
          {navSections.map((section) => {
            const key = sectionKey(section.title);
            const SectionIcon =
              section.title === 'Supplier'
                ? Package
                : section.title === 'Logistics'
                  ? Truck
                  : null;
            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {SectionIcon && <SectionIcon className="h-4 w-4 text-gray-500" />}
                    {section.title}
                  </span>
                  {expandedSections[key] ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                {expandedSections[key] && (
                  <div className="mt-1 space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to);
                      return (
                        <Link key={`${section.title}-${item.to}-${item.label}`} to={item.to as '/'}>
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
                            {item.badge != null && item.badge > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
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
