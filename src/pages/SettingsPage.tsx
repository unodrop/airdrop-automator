import { Save, RefreshCw, Download, Upload, Bell, Shield, Database, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function SettingsPage() {
  return (
    <>
      {/* Header */}
      <header className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 whitespace-nowrap">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            系统设置
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-foreground px-4 py-2 rounded-lg text-sm font-bold">
            <RefreshCw className="w-4 h-4" />
            <span>重置默认</span>
          </Button>
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20">
            <Save className="w-4 h-4" />
            <span>保存设置</span>
          </Button>
        </div>
      </header>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* General Settings */}
          <div className="bg-sidebar rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">常规设置</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="app-name" className="text-sm font-medium text-foreground">应用名称</Label>
                  <Input id="app-name" defaultValue="Airdrop Manager" className="bg-accent border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version" className="text-sm font-medium text-foreground">版本</Label>
                  <Input id="version" defaultValue="v2.4.0 PRO" disabled className="bg-accent border-border text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-endpoint" className="text-sm font-medium text-foreground">API 端点</Label>
                <Input id="api-endpoint" defaultValue="https://api.example.com/v1" className="bg-accent border-border text-foreground" />
              </div>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">自动更新</span>
                  <span className="text-xs text-muted-foreground">启用后自动检查并安装更新</span>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </button>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Network Settings */}
          <div className="bg-sidebar rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">网络设置</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rpc-url" className="text-sm font-medium text-foreground">RPC URL</Label>
                  <Input id="rpc-url" defaultValue="https://mainnet.infura.io/v3/..." className="bg-accent border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chain-id" className="text-sm font-medium text-foreground">Chain ID</Label>
                  <Input id="chain-id" defaultValue="1" type="number" className="bg-accent border-border text-foreground" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gas-limit" className="text-sm font-medium text-foreground">Gas Limit</Label>
                  <Input id="gas-limit" defaultValue="21000" type="number" className="bg-accent border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gas-price" className="text-sm font-medium text-foreground">Gas Price (Gwei)</Label>
                  <Input id="gas-price" defaultValue="35" type="number" className="bg-accent border-border text-foreground" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">使用 Flashbots</span>
                  <span className="text-xs text-muted-foreground">通过 Flashbots 发送交易以避免 MEV</span>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </button>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Notification Settings */}
          <div className="bg-sidebar rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">通知设置</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">任务完成通知</span>
                  <span className="text-xs text-muted-foreground">任务执行完成时发送通知</span>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">错误警报</span>
                  <span className="text-xs text-muted-foreground">任务执行失败时发送警报</span>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Telegram 通知</span>
                  <span className="text-xs text-muted-foreground">通过 Telegram Bot 发送通知</span>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent">
                  <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram-token" className="text-sm font-medium text-foreground">Telegram Bot Token</Label>
                <Input id="telegram-token" placeholder="输入 Bot Token" className="bg-accent border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram-chat" className="text-sm font-medium text-foreground">Telegram Chat ID</Label>
                <Input id="telegram-chat" placeholder="输入 Chat ID" className="bg-accent border-border text-foreground" />
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Backup & Restore */}
          <div className="bg-sidebar rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">备份与恢复</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-accent hover:bg-accent/80 text-foreground">
                  <Download className="w-4 h-4 mr-2" />
                  导出配置
                </Button>
                <Button variant="outline" className="flex-1 bg-accent hover:bg-accent/80 text-foreground">
                  <Upload className="w-4 h-4 mr-2" />
                  导入配置
                </Button>
              </div>
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-1">数据安全提示</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      请定期备份您的配置和私钥数据。导出的文件包含敏感信息，请妥善保管。建议使用加密存储。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-sidebar rounded-xl border border-border p-6">
            <h3 className="text-xl font-bold text-foreground mb-6">系统信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between p-3 bg-card rounded-lg">
                <span className="text-muted-foreground">操作系统</span>
                <span className="text-foreground font-medium">macOS 14.0</span>
              </div>
              <div className="flex justify-between p-3 bg-card rounded-lg">
                <span className="text-muted-foreground">Tauri 版本</span>
                <span className="text-foreground font-medium">v2.0.0</span>
              </div>
              <div className="flex justify-between p-3 bg-card rounded-lg">
                <span className="text-muted-foreground">Node 版本</span>
                <span className="text-foreground font-medium">v20.10.0</span>
              </div>
              <div className="flex justify-between p-3 bg-card rounded-lg">
                <span className="text-muted-foreground">数据库版本</span>
                <span className="text-foreground font-medium">SQLite 3.45.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
