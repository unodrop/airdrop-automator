import { Search, Key, MoreVertical, Play, Edit, Trash2, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function AccountsPage() {
  const accounts = [
    {
      id: 1,
      address: '0x71C...3a4f',
      created: '2 days ago',
      socials: ['twitter', 'discord', 'email'],
      proxy: '192.168.1.1',
      location: 'United States, NY',
      status: 'live'
    },
    {
      id: 2,
      address: '0xde0...1234',
      created: '4 days ago',
      socials: ['twitter', 'email'],
      proxy: '88.99.100.1',
      location: 'Germany, Munich',
      status: 'dead'
    },
    {
      id: 3,
      address: '0x4b2...8f90',
      created: '1 week ago',
      socials: ['twitter', 'discord', 'telegram', 'email'],
      proxy: '45.11.22.33',
      location: 'Japan, Tokyo',
      status: 'live'
    }
  ];

  return (
    <>
      {/* Header */}
      <header className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h2 className="text-lg font-bold text-foreground whitespace-nowrap">账户管理</h2>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="w-full bg-accent border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" 
              placeholder="搜索钱包地址或代理IP..." 
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20">
            <Key className="w-4 h-4" />
            <span>导入私钥</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg bg-accent hover:bg-accent/80">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="p-8 pb-0">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">总钱包数</span>
            <span className="text-2xl font-bold mt-1 text-foreground">1,240</span>
          </div>
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">活跃代理</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">1,198</span>
              <span className="text-xs text-primary font-medium">96% 在线</span>
            </div>
          </div>
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Twitter 账户</span>
            <span className="text-2xl font-bold mt-1 text-foreground">982</span>
          </div>
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">今日运行</span>
            <span className="text-2xl font-bold mt-1 text-foreground">45</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 p-8 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 bg-sidebar rounded-xl border border-border overflow-hidden flex flex-col min-h-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">
                    <input className="rounded border-border bg-transparent text-primary focus:ring-primary" type="checkbox" />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">钱包地址</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">社交账户</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">代理 IP</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">状态</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-card/50 transition-colors group">
                    <td className="px-6 py-4">
                      <input className="rounded border-border bg-transparent text-primary focus:ring-primary" type="checkbox" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-accent flex items-center justify-center text-foreground font-bold text-xs">
                          {account.address.slice(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-mono font-medium text-foreground">{account.address}</span>
                          <span className="text-[10px] text-muted-foreground">Created {account.created}</span>
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-primary">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {account.socials.includes('twitter') && (
                          <div className="size-7 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center" title="Twitter Active">
                            𝕏
                          </div>
                        )}
                        {account.socials.includes('discord') && (
                          <div className="size-7 rounded bg-indigo-500/10 text-indigo-500 flex items-center justify-center" title="Discord Active">
                            D
                          </div>
                        )}
                        {account.socials.includes('telegram') && (
                          <div className="size-7 rounded bg-blue-400/10 text-blue-400 flex items-center justify-center" title="Telegram Active">
                            T
                          </div>
                        )}
                        {account.socials.includes('email') && (
                          <div className="size-7 rounded bg-orange-500/10 text-orange-500 flex items-center justify-center" title="Email Active">
                            @
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{account.proxy}</span>
                        <span className="text-[10px] text-muted-foreground">{account.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {account.status === 'live' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <span className="size-1.5 rounded-full bg-primary"></span>
                          在线
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                          <span className="size-1.5 rounded-full bg-destructive"></span>
                          离线
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">显示 1-10 / 共 1,240 账户</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8">
                <span>←</span>
              </Button>
              <Button variant="default" size="icon" className="size-8 bg-primary text-primary-foreground text-xs font-bold">
                1
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-xs">
                2
              </Button>
              <Button variant="ghost" size="icon" className="size-8 text-xs">
                3
              </Button>
              <span className="px-2 text-xs text-muted-foreground">...</span>
              <Button variant="ghost" size="icon" className="size-8 text-xs">
                124
              </Button>
              <Button variant="ghost" size="icon" className="size-8">
                <span>→</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
