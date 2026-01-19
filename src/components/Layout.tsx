import { useState, useEffect } from 'react';
import { 
  Wallet, 
  Settings, 
  Network, 
  LogOut,
  Shield,
  Activity,
  HardDrive,
  UserPlus,
  LayoutDashboard,
  CircleDot
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n/I18nContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  disabled?: boolean;
}

interface SystemInfo {
  cpu_usage: number;
  memory_total: number;
  memory_used: number;
  network_speed: number;
  public_ip: string;
  proxy_enabled: boolean;
  proxy_ip?: string;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'accounts'; // default to accounts if path is /
  
  const { logout } = useAuth();
  const t = useTranslation();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    cpu_usage: 0,
    memory_total: 0,
    memory_used: 0,
    network_speed: 0,
    public_ip: '获取中...',
    proxy_enabled: false,
  });

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setShowLogoutDialog(false);
    }
  };

  // 获取系统信息
  const fetchSystemInfo = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke<SystemInfo>('get_system_info');
      setSystemInfo(info);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  // 定时获取系统信息
  useEffect(() => {
    fetchSystemInfo(); // 立即获取一次
    const interval = setInterval(fetchSystemInfo, 2000); // 每2秒更新一次
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { name: t('sidebar.accounts'), icon: Wallet, path: 'accounts' },
    { name: t('sidebar.registrator'), icon: UserPlus, path: 'registrator', disabled: true },
    { name: t('sidebar.depin'), icon: Network, path: 'depin' },
  ];

  const maintenanceItems: NavItem[] = [
    { name: t('sidebar.settings'), icon: Settings, path: 'settings' },
  ];

  const handleNavigation = (path: string) => {
    navigate(`/${path}`);
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">{t('app.name')}</span>
                  <span className="truncate text-xs text-muted-foreground">{t('app.subtitle')}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      onClick={() => !item.disabled && handleNavigation(item.path)}
                      isActive={currentPath === item.path || (currentPath === 'pharos' && item.path === 'depin')}
                      tooltip={item.name}
                      disabled={item.disabled}
                      className={
                        item.disabled 
                          ? 'opacity-40 cursor-not-allowed' 
                          : (currentPath === item.path || (currentPath === 'pharos' && item.path === 'depin'))
                            ? 'bg-primary/10 text-primary font-medium' 
                            : ''
                      }
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>{t('sidebar.maintenance')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {maintenanceItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      onClick={() => handleNavigation(item.path)}
                      isActive={currentPath === item.path}
                      tooltip={item.name}
                      className={currentPath === item.path ? 'bg-primary/10 text-primary font-medium' : ''}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogoutClick}
                size="lg" 
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group cursor-pointer"
                tooltip={t('sidebar.logout')}
                asChild={false}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:bg-destructive group-hover:text-destructive-foreground transition-colors">
                  <Shield className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">{t('sidebar.adminUser')}</span>
                  <span className="truncate text-xs text-primary group-hover:text-destructive">{t('app.version')}</span>
                </div>
                <LogOut className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col min-h-0 bg-[#0d1a0d] overflow-hidden">
            {children}
          </div>

          {/* Footer Status Bar */}
          <footer className="h-8 border-t border-border bg-sidebar px-6 flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0">
            <div className="flex items-center gap-4">
              {/* 网络状态 */}
              <div className="flex items-center gap-1.5">
                {systemInfo.proxy_enabled ? (
                  <Shield className="w-3 h-3 text-primary" />
                ) : (
                  <CircleDot className="w-3 h-3 text-primary animate-pulse" />
                )}
                <span className="whitespace-nowrap">
                  {systemInfo.proxy_enabled ? `代理: ${systemInfo.proxy_ip || '已启用'}` : `IP: ${systemInfo.public_ip}`}
                </span>
              </div>
              
              {/* 网速 */}
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3" />
                <span className="whitespace-nowrap">
                  {systemInfo.network_speed > 0 
                    ? `${(systemInfo.network_speed / 1024 / 1024).toFixed(2)} MB/s`
                    : '0 KB/s'
                  }
                </span>
              </div>
              
            </div>
            <div className="flex items-center gap-4">
              {/* CPU */}
              <div className="flex items-center gap-1.5">
                <span className={`whitespace-nowrap ${systemInfo.cpu_usage > 80 ? 'text-destructive' : systemInfo.cpu_usage > 50 ? 'text-yellow-500' : ''}`}>
                  {t('footer.cpu')}: {systemInfo.cpu_usage.toFixed(1)}%
                </span>
              </div>
              
              {/* RAM */}
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3" />
                <span className={`whitespace-nowrap ${(systemInfo.memory_used / systemInfo.memory_total) > 0.8 ? 'text-destructive' : ''}`}>
                  {t('footer.ram')}: {(systemInfo.memory_used / 1024 / 1024 / 1024).toFixed(1)}GB / {(systemInfo.memory_total / 1024 / 1024 / 1024).toFixed(1)}GB
                </span>
              </div>
              
              <span className="text-primary whitespace-nowrap">{t('footer.lastSynced')}: {t('footer.justNow')}</span>
            </div>
          </footer>
        </div>
      </SidebarInset>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sidebar.logout')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sidebar.logoutConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoutConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
