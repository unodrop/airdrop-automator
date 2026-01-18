import { Search, Settings, Bell, Play, MoreVertical, Pause, RefreshCw, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function GalxePage() {
  const campaigns = [
    {
      id: 1,
      name: 'Polygon zkEVM Saga',
      tasks: 'Twitter Follow • Discord • Swap',
      progress: 26,
      completed: 12,
      total: 45,
      status: 'active'
    },
    {
      id: 2,
      name: 'Linea Voyage: DeFi Week',
      tasks: 'LP • Swap • Bridge',
      progress: 66,
      completed: 30,
      total: 45,
      status: 'running'
    },
    {
      id: 3,
      name: 'Optimism RetroPGF',
      tasks: 'Voting • NFT Mint',
      progress: 11,
      completed: 5,
      total: 45,
      status: 'queued'
    }
  ];

  return (
    <>
      {/* Global Progress Bar */}
      <div className="w-full h-1 bg-background">
        <div className="h-full bg-primary w-2/3 shadow-[0_0_8px_rgba(25,174,25,0.6)]"></div>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 bg-sidebar shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-4 shrink-0">
            <div className="size-6 flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>
            <h2 className="text-foreground text-lg font-bold leading-tight tracking-[-0.015em] whitespace-nowrap">Galxe 自动化</h2>
          </div>
          <div className="flex flex-col min-w-40 h-10 max-w-64">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input 
                className="w-full h-full pl-10 pr-4 rounded-lg border-none bg-accent text-foreground focus:outline-0 focus:ring-0 placeholder:text-muted-foreground text-base" 
                placeholder="搜索账户..." 
              />
            </div>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <nav className="hidden md:flex items-center gap-6">
            <a className="text-primary text-sm font-semibold leading-normal" href="#">Dashboard</a>
            <a className="text-muted-foreground text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">账户</a>
            <a className="text-muted-foreground text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">活动</a>
            <a className="text-muted-foreground text-sm font-medium leading-normal hover:text-primary transition-colors" href="#">日志</a>
          </nav>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="rounded-lg h-10 w-10 bg-accent text-foreground hover:bg-primary/20">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-lg h-10 w-10 bg-accent text-foreground hover:bg-primary/20">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full p-6 space-y-6 overflow-y-auto custom-scrollbar min-h-0">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-muted-foreground text-sm font-medium leading-normal uppercase tracking-wider">总任务处理</p>
              <span className="text-2xl">✅</span>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">1,240</p>
              <p className="text-primary text-sm font-bold leading-normal">+12.5%</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-muted-foreground text-sm font-medium leading-normal uppercase tracking-wider">成功率</p>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">98.4%</p>
              <p className="text-primary text-sm font-bold leading-normal">+0.5%</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl p-6 border border-border bg-card shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-muted-foreground text-sm font-medium leading-normal uppercase tracking-wider">活跃工作者</p>
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse mt-2"></span>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-foreground tracking-tight text-3xl font-bold leading-tight">45/50</p>
              <p className="text-primary text-sm font-bold leading-normal">运行中</p>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-foreground text-xl font-bold leading-tight flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            活跃 Galxe 活动
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" className="px-4 py-2 bg-accent text-foreground rounded-lg text-sm font-bold hover:bg-accent/80">
              刷新网格
            </Button>
            <Button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90">
              添加新任务
            </Button>
          </div>
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex flex-col rounded-xl overflow-hidden border border-border bg-card transition-all hover:border-primary/50 group">
              <div className="relative w-full aspect-video bg-gradient-to-br from-primary/20 to-accent">
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white font-bold uppercase tracking-widest border border-white/10">
                  {campaign.status === 'running' ? '运行中' : campaign.status === 'active' ? '活跃' : '排队中'}
                </div>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <h3 className="text-foreground text-base font-bold leading-tight mb-1">{campaign.name}</h3>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-tighter">{campaign.tasks}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">账户进度</span>
                    <span className="text-primary">{campaign.completed} / {campaign.total} 完成</span>
                  </div>
                  <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full shadow-[0_0_8px_rgba(25,174,25,0.4)]" style={{ width: `${campaign.progress}%` }}></div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button className={`flex-1 h-10 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${
                    campaign.status === 'running'
                      ? 'bg-accent border border-primary text-primary hover:bg-primary/10'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}>
                    {campaign.status === 'running' ? (
                      <>
                        <Pause className="w-4 h-4" />
                        暂停批处理
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        批量执行
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="icon" className="w-10 h-10 rounded-lg border-border text-foreground hover:bg-accent">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Terminal Log Section */}
        <div className="flex flex-col rounded-xl border border-border bg-black overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1 ml-2">
                <span>▶</span>
                execution_log.sh
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-black/20 rounded px-2 py-1">
                <button className="text-[10px] font-bold text-primary uppercase">全部</button>
                <span className="text-muted-foreground">|</span>
                <button className="text-[10px] font-bold text-muted-foreground uppercase hover:text-white">错误</button>
                <span className="text-muted-foreground">|</span>
                <button className="text-[10px] font-bold text-muted-foreground uppercase hover:text-white">成功</button>
              </div>
            </div>
          </div>
          <div className="h-64 p-4 font-mono text-sm overflow-y-auto bg-black custom-scrollbar">
            <div className="space-y-1">
              <p className="text-slate-500"><span className="text-primary/70">[14:20:01]</span> <span className="text-blue-400">[System]</span> 初始化批处理 "Linea Voyage"...</p>
              <p className="text-slate-300"><span className="text-primary/70">[14:20:01]</span> <span className="text-yellow-400">[Account #04]</span> 通过 Galxe API 认证...</p>
              <p className="text-primary"><span className="text-primary/70">[14:20:05]</span> <span className="text-yellow-400">[Account #04]</span> 成功: 任务 "Follow @Galxe" 已验证.</p>
              <p className="text-slate-300"><span className="text-primary/70">[14:20:08]</span> <span className="text-yellow-400">[Account #05]</span> 在 Linea 主网上启动桥接交易...</p>
              <p className="text-red-400 font-bold"><span className="text-primary/70">[14:20:10]</span> <span className="text-yellow-400">[Account #05]</span> 错误: 代理超时 (192.168.1.1:8080). 5秒后重试...</p>
              <p className="text-slate-300"><span className="text-primary/70">[14:20:12]</span> <span className="text-yellow-400">[Account #06]</span> 成功铸造 NFT "Loyalty Pass". TX: 0x4f...a2b1</p>
              <p className="text-primary font-bold"><span className="text-primary/70">[14:20:18]</span> <span className="text-yellow-400">[Account #07]</span> Discord 加入: 服务器 "Linea" 成功.</p>
              <p className="text-slate-500 italic animate-pulse">_</p>
            </div>
          </div>
        </div>
      </main>

      {/* Global Toolbar */}
      <div className="fixed bottom-14 right-8 flex gap-3 z-40">
        <Button className="flex items-center gap-2 bg-destructive text-destructive-foreground px-5 py-2.5 rounded-full shadow-lg hover:bg-destructive/90 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />
          紧急停止
        </Button>
        <Button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-lg hover:opacity-90 font-bold text-sm">
          <RefreshCw className="w-4 h-4" />
          重试失败任务
        </Button>
      </div>
    </>
  );
}
