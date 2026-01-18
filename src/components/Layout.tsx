import { 
  Wallet, 
  Settings, 
  Timer, 
  Rocket,
  LayoutDashboard,
  Star,
  CircleDot
} from 'lucide-react';
import { usePageContext } from '../App';
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

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
}

export function Layout({ children }: LayoutProps) {
  const { currentPage, setCurrentPage } = usePageContext();

  const navItems: NavItem[] = [
    { name: '账户管理', icon: Wallet, path: 'accounts' },
    { name: '空投项目', icon: Rocket, path: 'airdrop' },
    { name: 'Galxe 任务', icon: Star, path: 'galxe' },
    { name: '定时任务', icon: Timer, path: 'scheduler' },
  ];

  const maintenanceItems: NavItem[] = [
    { name: '系统设置', icon: Settings, path: 'settings' },
  ];

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
                  <span className="truncate font-bold">Airdrop Manager</span>
                  <span className="truncate text-xs text-muted-foreground">Automated Executor</span>
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
                      onClick={() => setCurrentPage(item.path)}
                      isActive={currentPage === item.path}
                      tooltip={item.name}
                      className={currentPage === item.path ? 'bg-primary/10 text-primary font-medium' : ''}
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
            <SidebarGroupLabel>维护</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {maintenanceItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      onClick={() => setCurrentPage(item.path)}
                      isActive={currentPage === item.path}
                      tooltip={item.name}
                      className={currentPage === item.path ? 'bg-primary/10 text-primary font-medium' : ''}
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
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="font-bold">A</span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">Admin User</span>
                  <span className="truncate text-xs text-primary">v2.4.0 PRO</span>
                </div>
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
              <div className="flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 text-primary animate-pulse" />
                <span className="whitespace-nowrap">Network: Connected</span>
              </div>
              <span className="whitespace-nowrap">Tauri Core: v2.0.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="whitespace-nowrap">CPU: 12%</span>
              <span className="whitespace-nowrap">RAM: 1.2GB / 8.0GB</span>
              <span className="text-primary whitespace-nowrap">Last synced: Just now</span>
            </div>
          </footer>
        </div>
      </SidebarInset>
    </>
  );
}
