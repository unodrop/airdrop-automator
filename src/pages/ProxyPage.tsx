import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Trash2, Edit, RefreshCw, Globe, CheckCircle, XCircle, Loader2, Wifi, WifiOff, Link } from 'lucide-react';
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

interface ProxyIP {
  id: string;
  ip: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  username?: string;
  password?: string;
  country?: string;
  status: 'active' | 'inactive' | 'testing';
  wallet_bindings: string[];
  created_at: string;
  last_used?: string;
  ping_status?: 'idle' | 'testing' | 'success' | 'failed';
  response_time?: number; // ms
}

export function ProxyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [proxies, setProxies] = useState<ProxyIP[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [proxyText, setProxyText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // 加载代理列表
  const loadProxies = async () => {
    setIsLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const data = await invoke<ProxyIP[]>('get_proxies');
      // 为每个代理添加 ping_status 字段（本地状态）
      const proxiesWithPingStatus = data.map(p => ({
        ...p,
        ping_status: 'idle' as 'idle' | 'testing' | 'success' | 'failed',
        response_time: undefined as number | undefined,
      }));
      setProxies(proxiesWithPingStatus);
    } catch (error) {
      console.error('Failed to load proxies:', error);
      toast.error('加载失败', {
        description: '无法加载代理列表，请重试'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadProxies();
  }, []);

  // Ping 单个代理
  const handlePing = async (proxyId: string) => {
    setProxies(prev => prev.map(p => 
      p.id === proxyId ? { ...p, ping_status: 'testing' } : p
    ));

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [success, responseTime] = await invoke<[boolean, number | null]>('ping_proxy', { id: proxyId });
      
      setProxies(prev => prev.map(p => 
        p.id === proxyId 
          ? { 
              ...p, 
              ping_status: success ? 'success' : 'failed',
              response_time: responseTime || undefined,
              status: success ? 'active' : 'inactive'
            } 
          : p
      ));
    } catch (error) {
      console.error('Ping failed:', error);
      setProxies(prev => prev.map(p => 
        p.id === proxyId ? { ...p, ping_status: 'failed' } : p
      ));
    }
  };

  // 批量 Ping 所有代理
  const handlePingAll = async () => {
    const proxyIds = filteredProxies.map(p => p.id);

    // 依次测试每个代理
    for (const id of proxyIds) {
      await handlePing(id);
      // 稍微延迟避免过快
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  // 批量导入代理
  const handleBatchImport = async () => {
    if (!proxyText.trim()) {
      toast.error('请输入代理信息');
      return;
    }

    setIsImporting(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [successCount, failCount] = await invoke<[number, number]>('batch_add_proxies', {
        proxiesText: proxyText,
      });

      toast.success('导入完成', {
        description: `成功: ${successCount} 个，失败: ${failCount} 个`,
      });

      setProxyText('');
      setImportDialogOpen(false);
      loadProxies(); // 重新加载列表
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '请检查格式后重试',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProxies = proxies.filter(proxy => {
    const matchesSearch = 
      proxy.ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proxy.country?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proxy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: proxies.length,
    active: proxies.filter(p => p.status === 'active').length,
    inactive: proxies.filter(p => p.status === 'inactive').length,
    testing: proxies.filter(p => p.ping_status === 'testing').length,
  };

  const getProtocolBadge = (protocol: string) => {
    const colors = {
      http: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      https: 'bg-green-500/10 text-green-500 border-green-500/20',
      socks5: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[protocol as keyof typeof colors]}`}>
        {protocol.toUpperCase()}
      </span>
    );
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
              placeholder="搜索IP地址或国家..." 
            />
          </div>
          <Button 
            onClick={handlePingAll}
            disabled={isLoading || statusCounts.testing > 0}
            variant="outline"
            className="flex items-center gap-2 border-primary/30 hover:bg-primary/10"
          >
            <Wifi className="w-4 h-4" />
            <span>批量测试</span>
          </Button>
          <Button 
            onClick={loadProxies}
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
            <Plus className="w-4 h-4" />
            <span>批量导入</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-lg bg-accent hover:bg-accent/80">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Filter Bar */}
          <div className="flex items-center gap-4 mb-6">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-accent border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态 ({statusCounts.all})</SelectItem>
                <SelectItem value="active">在线 ({statusCounts.active})</SelectItem>
                <SelectItem value="inactive">离线 ({statusCounts.inactive})</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <div className="text-sm text-muted-foreground">
              共 {filteredProxies.length} 个代理
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-accent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">代理地址</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">协议</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">国家</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">认证</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">绑定钱包</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Ping</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">加载中...</p>
                    </td>
                  </tr>
                ) : filteredProxies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' ? '没有找到匹配的代理' : '暂无代理IP'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        点击"添加代理"按钮开始添加
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProxies.map((proxy) => (
                    <tr key={proxy.id} className="hover:bg-accent/50 transition-colors">
                      {/* 代理地址 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono font-medium text-foreground">
                            {proxy.ip}:{proxy.port}
                          </span>
                        </div>
                      </td>

                      {/* 协议 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getProtocolBadge(proxy.protocol)}
                      </td>

                      {/* 国家 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-foreground">
                          {proxy.country || '-'}
                        </span>
                      </td>

                      {/* 认证 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {proxy.username ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-primary" />
                            <span className="text-sm text-foreground">{proxy.username}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">无</span>
                        )}
                      </td>

                      {/* 绑定钱包 */}
                      <td className="px-6 py-4">
                        {proxy.wallet_bindings.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {proxy.wallet_bindings.slice(0, 2).map((wallet, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-accent rounded text-xs font-mono text-muted-foreground"
                              >
                                {wallet}
                              </span>
                            ))}
                            {proxy.wallet_bindings.length > 2 && (
                              <span className="px-2 py-0.5 bg-accent rounded text-xs text-muted-foreground">
                                +{proxy.wallet_bindings.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">未绑定</span>
                        )}
                      </td>

                      {/* 状态 */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {proxy.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                            <Wifi className="w-3 h-3" />
                            在线
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                            <WifiOff className="w-3 h-3" />
                            离线
                          </span>
                        )}
                      </td>

                      {/* Ping */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {proxy.ping_status === 'testing' ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground">测试中...</span>
                          </div>
                        ) : proxy.ping_status === 'success' ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">
                              {proxy.response_time}ms
                            </span>
                          </div>
                        ) : proxy.ping_status === 'failed' ? (
                          <div className="flex items-center justify-center gap-2">
                            <XCircle className="w-4 h-4 text-destructive" />
                            <span className="text-xs text-destructive">失败</span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePing(proxy.id)}
                            className="h-7 px-2 text-xs"
                          >
                            <Wifi className="w-3 h-3 mr-1" />
                            测试
                          </Button>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
        </div>
      </div>

      {/* 批量导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>批量导入代理IP</DialogTitle>
            <DialogDescription>
              每行一个代理，支持两种格式：
              <br />
              <code className="text-xs bg-accent px-2 py-1 rounded mt-2 inline-block">ip:port:protocol</code>
              <br />
              <code className="text-xs bg-accent px-2 py-1 rounded mt-1 inline-block">ip:port:protocol:username:password</code>
              <br />
              <span className="text-xs text-muted-foreground mt-2 inline-block">
                协议支持: http, https, socks5
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Textarea
                value={proxyText}
                onChange={(e) => setProxyText(e.target.value)}
                placeholder="192.168.1.100:8080:http&#10;10.0.0.50:1080:socks5:user:pass&#10;45.76.123.45:3128:https"
                className="min-h-[300px] font-mono text-sm bg-accent border-border"
                disabled={isImporting}
              />
              <p className="text-xs text-muted-foreground mt-2">
                共 {proxyText.split('\n').filter(line => line.trim()).length} 行
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setImportDialogOpen(false);
                  setProxyText('');
                }}
                disabled={isImporting}
              >
                取消
              </Button>
              <Button
                onClick={handleBatchImport}
                disabled={isImporting || !proxyText.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
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
