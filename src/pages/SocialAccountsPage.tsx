import { useState, useEffect } from 'react';
import { Search, MoreVertical, Trash2, RefreshCw, Loader2, AlertCircle, Mail, MessageCircle, CheckCircle, XCircle, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface SocialAccount {
  platform: string;
  username: string;
  encrypted_token: string;
  wallet_address: string;
  verified: boolean;
  created_at: string;
}

interface WalletAccount {
  name: string;
  address: string;
  encrypted_key: string;
  created_at: string;
}

export function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [socialText, setSocialText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [socialsData, walletsData] = await Promise.all([
        invoke<SocialAccount[]>('get_social_accounts'),
        invoke<WalletAccount[]>('get_wallets')
      ]);
      setAccounts(socialsData);
      setWallets(walletsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('加载失败', {
        description: '无法加载数据，请重试'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (platform: string, username: string) => {
    if (!confirm(`确定要删除 ${platform} 账户 ${username} 吗？`)) {
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_social_account', { platform, username });
      toast.success('删除成功');
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 批量导入社交账号
  const handleBatchImport = async () => {
    if (!socialText.trim()) {
      toast.error('请输入社交账号信息');
      return;
    }

    if (!selectedWallet) {
      toast.error('请选择要绑定的钱包');
      return;
    }

    setIsImporting(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // 解析输入的社交账号（格式：platform:username:token）
      const lines = socialText.split('\n').filter(line => line.trim());
      const socialAccounts: SocialAccount[] = lines.map(line => {
        const [platform, username, token] = line.split(':').map(s => s.trim());
        return {
          platform: platform.toLowerCase(),
          username,
          encrypted_token: token,
          wallet_address: selectedWallet,
          verified: false,
          created_at: new Date().toISOString(),
        };
      });

      const result = await invoke<any>('batch_import_social_accounts', {
        accounts: socialAccounts,
      });

      toast.success('导入完成', {
        description: `成功: ${result.successful} 个，失败: ${result.failed} 个`,
      });

      setSocialText('');
      setSelectedWallet('');
      setImportDialogOpen(false);
      loadData(); // 重新加载列表
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '请检查格式后重试',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getWalletName = (address: string) => {
    const wallet = wallets.find(w => w.address === address);
    return wallet ? wallet.name : '未知钱包';
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.wallet_address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || account.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const platformConfig: Record<string, { name: string; icon: string | React.ComponentType<{className?: string}>; color: string }> = {
    twitter: { name: 'Twitter', icon: '𝕏', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    discord: { name: 'Discord', icon: 'D', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
    email: { name: 'Email', icon: Mail, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    telegram: { name: 'Telegram', icon: MessageCircle, color: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  };

  const platformCounts = {
    all: accounts.length,
    twitter: accounts.filter(a => a.platform === 'twitter').length,
    discord: accounts.filter(a => a.platform === 'discord').length,
    email: accounts.filter(a => a.platform === 'email').length,
    telegram: accounts.filter(a => a.platform === 'telegram').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-border bg-sidebar/50 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-accent border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" 
              placeholder="搜索用户名或钱包地址..." 
            />
          </div>
          <Button 
            onClick={loadData}
            disabled={isLoading}
            variant="ghost"
            size="icon"
            className="rounded-lg bg-accent hover:bg-accent/80"
            title="刷新列表"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20"
          >
            <Upload className="w-4 h-4" />
            <span>批量导入</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg bg-accent hover:bg-accent/80">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Filter Bar */}
          <div className="flex items-center gap-4 mb-6">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[180px] bg-accent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台 ({platformCounts.all})</SelectItem>
                <SelectItem value="twitter">Twitter ({platformCounts.twitter})</SelectItem>
                <SelectItem value="discord">Discord ({platformCounts.discord})</SelectItem>
                <SelectItem value="email">Email ({platformCounts.email})</SelectItem>
                <SelectItem value="telegram">Telegram ({platformCounts.telegram})</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <div className="text-sm text-muted-foreground">
              共 {filteredAccounts.length} 个账户
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">平台</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">用户名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">绑定钱包</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">创建时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">加载中...</p>
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || platformFilter !== 'all' ? '没有找到匹配的账户' : '暂无社交账号'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        在钱包编辑页面添加社交账号
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account, index) => {
                    const config = platformConfig[account.platform as keyof typeof platformConfig];
                    const IconComponent = typeof config.icon === 'string' ? null : config.icon;
                    
                    return (
                      <tr key={`${account.platform}-${account.username}-${index}`} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.color}`}>
                            {IconComponent ? (
                              <IconComponent className="w-4 h-4" />
                            ) : (
                              <span className="text-sm font-bold">{config.icon as string}</span>
                            )}
                            <span className="text-sm font-medium">{config.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-foreground">{account.username}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{getWalletName(account.wallet_address)}</p>
                            <p className="text-xs text-muted-foreground font-mono break-all select-all">
                              {account.wallet_address}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {account.verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                              <CheckCircle className="w-3 h-3" />
                              已验证
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                              <XCircle className="w-3 h-3" />
                              未验证
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(account.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(account.platform, account.username)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 批量导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>批量导入社交账号</DialogTitle>
            <DialogDescription>
              每行一个账号，格式：
              <br />
              <code className="text-xs bg-accent px-2 py-1 rounded mt-2 inline-block">platform:username:token</code>
              <br />
              <span className="text-xs text-muted-foreground mt-2 inline-block">
                平台支持: twitter, discord, email, telegram
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 选择钱包 */}
            <div>
              <label className="text-sm font-medium mb-2 block">绑定到钱包</label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger className="bg-accent border-border">
                  <SelectValue placeholder="选择要绑定的钱包" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.address} value={wallet.address} className="font-mono text-xs">
                      {wallet.name} ({wallet.address})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 输入社交账号 */}
            <div>
              <label className="text-sm font-medium mb-2 block">社交账号列表</label>
              <Textarea
                value={socialText}
                onChange={(e) => setSocialText(e.target.value)}
                placeholder="twitter:username1:auth_token_123&#10;discord:username2:auth_token_456&#10;email:user@example.com:auth_token_789"
                className="min-h-[300px] font-mono text-sm bg-accent border-border"
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground mt-2">
                共 {socialText.split('\n').filter(line => line.trim()).length} 行
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(false);
                  setSocialText('');
                  setSelectedWallet('');
                }}
                disabled={isImporting}
              >
                取消
              </Button>
              <Button
                onClick={handleBatchImport}
                disabled={isImporting || !socialText.trim() || !selectedWallet}
                className="bg-primary hover:bg-primary/90"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    开始导入
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
