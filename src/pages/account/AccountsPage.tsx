import { useState, useEffect } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { Search, Key, MoreVertical, Edit, Trash2, Copy, AlertCircle, RefreshCw, Plus, Loader2, Download, KeyRound, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImportPrivateKeyDialog } from '@/components/ImportPrivateKeyDialog';
import { ImportWalletsDialog } from '@/components/ImportWalletsDialog';
import { EditWalletDialog } from '@/components/EditWalletDialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface WalletAccount {
  name: string;
  address: string;
  encrypted_key: string;
  encrypted_mnemonic?: string;  // 加密后的助记词（创建的钱包才有）
  created_at: string;
}

export function AccountsPage() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importWalletDialogOpen, setImportWalletDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<{address: string; name: string} | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createCount, setCreateCount] = useState('1');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // 加载钱包和社交账户列表
  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const wallets = await invoke<WalletAccount[]>('get_wallets');
      setAccounts(wallets);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError(err instanceof Error ? err.message : '加载账户失败');
      toast.error('加载失败', {
        description: '无法加载账户列表，请重试'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 批量创建钱包
  const handleCreateWallets = async () => {
    const count = parseInt(createCount);
    
    if (isNaN(count) || count < 1 || count > 100) {
      toast.error('请输入有效的数量（1-100）');
      return;
    }

    setIsCreating(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        total: number;
        successful: number;
        failed: number;
        results: Array<{
          index: number;
          success: boolean;
          address: string | null;
          message: string;
          private_key_preview: string;
        }>;
      }>('batch_create_wallets', { count });

      toast.success('创建完成', {
        description: `成功创建 ${result.successful} 个钱包${result.failed > 0 ? `，失败 ${result.failed} 个` : ''}`,
        duration: 4000,
      });

      setCreateCount('1');
      setCreateDialogOpen(false);
      loadAccounts(); // 重新加载列表
    } catch (error) {
      console.error('Create wallets failed:', error);
      toast.error('创建失败', {
        description: error instanceof Error ? error.message : '请重试',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // 打开编辑对话框
  const handleEdit = (account: WalletAccount) => {
    setSelectedWallet({
      address: account.address,
      name: account.name,
    });
    setEditDialogOpen(true);
  };

  // 打开删除确认对话框
  const handleDelete = (account: WalletAccount) => {
    setSelectedWallet({
      address: account.address,
      name: account.name,
    });
    setDeleteDialogOpen(true);
  };

  // 复制地址
  const handleCopy = async (address: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('copy_to_clipboard', { text: address });
      toast.success('已复制', {
        description: '地址已复制到剪贴板'
      });
    } catch (err) {
      toast.error('复制失败', {
        description: err instanceof Error ? err.message : '无法访问剪贴板'
      });
    }
  };

  // 复制私钥（直接解密并复制）
  const handleCopyPrivateKey = async (address: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const privateKey = await invoke<string>('get_wallet_private_key', {
        address: address
      });
      await invoke('copy_to_clipboard', { text: privateKey });
      toast.success('私钥已复制', {
        description: '请妥善保管，切勿泄露给他人'
      });
    } catch (error: any) {
      toast.error('复制失败', {
        description: error.toString()
      });
    }
  };

  // 导出钱包
  const handleExport = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      const exportedWallets = await invoke<Array<{
        name: string;
        address: string;
        private_key: string;
        mnemonic: string | null;
        created_at: string;
      }>>('export_wallets', { addresses: null }); // null 表示导出全部

      if (exportedWallets.length === 0) {
        toast.error('没有可导出的钱包');
        return;
      }

      // 创建 JSON 内容
      const jsonContent = JSON.stringify(exportedWallets, null, 2);
      
      // 打开保存对话框
      const filePath = await save({
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }],
        defaultPath: `wallets_${new Date().toISOString().split('T')[0]}.json`
      });

      if (!filePath) {
        return; // 用户取消
      }

      // 写入文件
      await writeTextFile(filePath, jsonContent);

      toast.success('导出成功', {
        description: `已导出 ${exportedWallets.length} 个钱包到文件`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('导出失败', {
        description: error instanceof Error ? error.message : '请重试',
      });
    }
  };

  // 格式化时间
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAddresses(filteredAccounts.map(acc => acc.address));
    } else {
      setSelectedAddresses([]);
    }
  };

  // 单选
  const handleSelectOne = (address: string, checked: boolean) => {
    if (checked) {
      setSelectedAddresses(prev => [...prev, address]);
    } else {
      setSelectedAddresses(prev => prev.filter(addr => addr !== address));
    }
  };

  // 打开批量删除确认对话框
  const handleBatchDelete = () => {
    if (selectedAddresses.length === 0) {
      toast.error('请先选择要删除的钱包');
      return;
    }
    setBatchDeleteDialogOpen(true);
  };

  // 确认批量删除
  const confirmBatchDelete = async () => {
    setIsBatchDeleting(true);
    setBatchDeleteDialogOpen(false);
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      let successCount = 0;
      let failCount = 0;

      // 依次删除每个钱包
      for (const address of selectedAddresses) {
        try {
          const success = await invoke<boolean>('delete_wallet', { address });
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
        }
      }

      toast.success('批量删除完成', {
        description: `成功删除 ${successCount} 个钱包${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
      });

      setSelectedAddresses([]);
      loadAccounts();
    } catch (error) {
      console.error('Batch delete failed:', error);
      toast.error('批量删除失败');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadAccounts();
  }, []);

  // 过滤账户
  const filteredAccounts = accounts.filter(account =>
    account.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              placeholder="搜索钱包地址或账户名..." 
            />
          </div>
          <Button 
            onClick={loadAccounts}
            disabled={isLoading}
            variant="ghost"
            size="icon"
            className="rounded-lg bg-accent hover:bg-accent/80"
            title="刷新列表"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={handleBatchDelete}
            disabled={selectedAddresses.length === 0 || isBatchDeleting}
            variant="destructive"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
          >
            {isBatchDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>删除中...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>批量删除</span>
              </>
            )}
          </Button>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>创建钱包</span>
          </Button>
          <Button 
            onClick={() => setImportWalletDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2 border-primary/30 text-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all hover:bg-primary/10"
          >
            <Upload className="w-4 h-4" />
            <span>导入文件</span>
          </Button>
          <Button 
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2 border-primary/30 text-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all hover:bg-primary/10"
          >
            <Key className="w-4 h-4" />
            <span>导入私钥</span>
          </Button>
          <Button 
            onClick={handleExport}
            disabled={accounts.length === 0}
            variant="outline"
            className="flex items-center gap-2 border-border text-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all hover:bg-accent"
          >
            <Download className="w-4 h-4" />
            <span>导出</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg bg-accent hover:bg-accent/80">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
      {/* Table Container */}
      <div className="flex-1 p-8 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 bg-sidebar rounded-xl border border-border overflow-hidden flex flex-col min-h-0">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">
                    <input 
                      className="rounded border-border bg-transparent text-primary focus:ring-primary cursor-pointer" 
                      type="checkbox"
                      checked={filteredAccounts.length > 0 && selectedAddresses.length === filteredAccounts.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">钱包地址</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">社交账户</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">代理 IP</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">状态</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="size-4 bg-accent rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-accent"></div>
                          <div className="flex flex-col gap-2">
                            <div className="h-4 w-32 bg-accent rounded"></div>
                            <div className="h-3 w-20 bg-accent rounded"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-accent rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-20 bg-accent rounded"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-16 bg-accent rounded-full"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <div className="size-8 bg-accent rounded"></div>
                          <div className="size-8 bg-accent rounded"></div>
                          <div className="size-8 bg-accent rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredAccounts.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="size-16 rounded-full bg-accent flex items-center justify-center">
                          {searchQuery ? (
                            <Search className="w-8 h-8 text-muted-foreground" />
                          ) : (
                            <Key className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-bold text-foreground mb-1">
                            {searchQuery ? '未找到匹配的账户' : '还没有钱包账户'}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery 
                              ? '尝试使用不同的搜索关键词' 
                              : '点击"导入私钥"按钮开始添加钱包'}
                          </p>
                          {!searchQuery && (
                            <Button 
                              onClick={() => setImportDialogOpen(true)}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              <Key className="w-4 h-4 mr-2" />
                              导入私钥
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.address} className="hover:bg-card/50 transition-colors group">
                      <td className="px-6 py-4">
                        <input 
                          className="rounded border-border bg-transparent text-primary focus:ring-primary cursor-pointer" 
                          type="checkbox"
                          checked={selectedAddresses.includes(account.address)}
                          onChange={(e) => handleSelectOne(account.address, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {account.address.slice(2, 4).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground">{account.name}</span>
                            <span className="text-xs font-mono text-muted-foreground break-all select-all">
                              {account.address}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              创建于 {formatDate(account.created_at)}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleCopy(account.address)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-primary hover:bg-primary/10 rounded shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">-</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">-</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <span className="size-1.5 rounded-full bg-primary"></span>
                          已导入
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-amber-500 transition-colors"
                            title="复制私钥"
                            onClick={() => handleCopyPrivateKey(account.address)}
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="编辑"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="删除"
                            onClick={() => handleDelete(account)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!isLoading && filteredAccounts.length > 0 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                共 {filteredAccounts.length} 个账户
                {searchQuery && ` (从 ${accounts.length} 个中筛选)`}
              </span>
              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Import Private Key Dialog */}
      <ImportPrivateKeyDialog 
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          // 重新加载钱包列表
          loadAccounts();
        }}
      />

      {/* Import Wallets Dialog */}
      <ImportWalletsDialog 
        open={importWalletDialogOpen}
        onOpenChange={setImportWalletDialogOpen}
        onSuccess={loadAccounts}
      />

      {/* Edit Wallet Dialog */}
      <EditWalletDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        wallet={selectedWallet}
        onSuccess={loadAccounts}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        wallet={selectedWallet}
        onSuccess={loadAccounts}
      />

      {/* Toast notifications */}
      {/* 创建钱包对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>创建新钱包</DialogTitle>
            <DialogDescription>
              系统将自动生成助记词并创建钱包，助记词会安全加密存储。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">创建数量</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={createCount}
                onChange={(e) => setCreateCount(e.target.value)}
                placeholder="输入要创建的钱包数量"
                className="bg-accent border-border"
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                每个钱包都会生成独立的12词助记词
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreateCount('1');
                }}
                disabled={isCreating}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateWallets}
                disabled={isCreating || !createCount}
                className="bg-primary hover:bg-primary/90"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    开始创建
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认对话框 */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">确认批量删除</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              确定要删除选中的 <span className="text-primary font-bold">{selectedAddresses.length}</span> 个钱包吗？
              <br />
              <span className="text-destructive">此操作不可恢复，请谨慎操作。</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setBatchDeleteDialogOpen(false)}
              className="bg-accent hover:bg-accent/80 text-foreground border-border"
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBatchDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
