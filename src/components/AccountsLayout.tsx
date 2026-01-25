import { useState } from 'react';
import { Wallet, Users, Globe } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AccountsPage } from '@/pages/account/AccountsPage';
import { SocialAccountsPage } from '@/pages/account/SocialAccountsPage';
import { ProxyPage } from '@/pages/ProxyPage';

interface TabItem {
  id: string;
  name: string;
  icon: React.ElementType;
}

export function AccountsLayout() {
  const [activeTab, setActiveTab] = useState('wallets');

  const tabs: TabItem[] = [
    { id: 'wallets', name: '钱包', icon: Wallet },
    { id: 'social', name: '社交账号', icon: Users },
    { id: 'proxy', name: '代理IP', icon: Globe },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'wallets':
        return <AccountsPage />;
      case 'social':
        return <SocialAccountsPage />;
      case 'proxy':
        return <ProxyPage />;
      default:
        return <AccountsPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Main Header */}
      <header className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h2 className="text-lg font-bold text-foreground whitespace-nowrap">账号管理</h2>
        </div>
      </header>

      {/* Secondary Navigation Tabs */}
      <div className="border-b border-border bg-sidebar/50 shrink-0">
        <div className="flex items-center px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${isActive 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
