import { Search, Settings, Bell, Play, FileText, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function AirdropProjectPage() {
  const projects = [
    {
      id: 1,
      name: 'ZkSync Era',
      category: 'Layer 2',
      status: 'ready',
      progress: 80,
      completed: 12,
      total: 15,
      lastRun: '2h ago'
    },
    {
      id: 2,
      name: 'Scroll',
      category: 'Layer 2',
      status: 'ready',
      progress: 25,
      completed: 4,
      total: 15,
      lastRun: '5h ago'
    },
    {
      id: 3,
      name: 'Linea',
      category: 'Layer 2',
      status: 'ready',
      progress: 100,
      completed: 15,
      total: 15,
      lastRun: 'Yesterday'
    },
    {
      id: 4,
      name: 'Berachain',
      category: 'Testnet',
      status: 'queued',
      progress: 0,
      completed: 0,
      total: 20,
      lastRun: 'N/A'
    }
  ];

  return (
    <>
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-sidebar px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            <div className="size-8 flex items-center justify-center bg-primary/20 rounded-lg shrink-0">
              <span className="text-2xl">🚀</span>
            </div>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-foreground whitespace-nowrap">空投执行器</h1>
          </div>
          <div className="flex-1 max-w-xl">
            <div className="relative flex items-center w-full">
              <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
              <Input 
                className="w-full h-10 pl-10 pr-4 rounded-lg border-none bg-accent text-foreground focus:ring-2 focus:ring-primary placeholder:text-muted-foreground text-sm" 
                placeholder="搜索项目、账户或协议..." 
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-10 rounded-lg bg-accent text-foreground hover:bg-primary/20 hover:text-primary">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-10 rounded-lg bg-accent text-foreground hover:bg-primary/20 hover:text-primary relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-sidebar"></span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Filters & Stats */}
        <div className="px-6 pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-card rounded-xl">
            <Button variant="default" size="sm" className="bg-primary text-primary-foreground shadow-sm">
              全部
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-accent">
              Layer 2
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-accent">
              DeFi
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:bg-accent">
              测试网
            </Button>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">成功率</p>
              <p className="text-lg font-bold text-primary">98.2%</p>
            </div>
            <div className="text-center border-l border-border pl-6">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">活跃机器人</p>
              <p className="text-lg font-bold text-foreground">12/15</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">执行网格</h2>
          <Button variant="ghost" className="flex items-center gap-2 text-primary hover:underline text-sm font-medium">
            <RefreshCw className="w-4 h-4" />
            刷新状态
          </Button>
        </div>

        {/* Project Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
            {projects.map((project) => (
              <div key={project.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-background flex items-center justify-center text-2xl">
                      {project.category === 'Testnet' ? '🧪' : '🔷'}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{project.name}</h3>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                        project.category === 'Testnet' 
                          ? 'bg-yellow-400/10 text-yellow-500 ring-yellow-400/20'
                          : 'bg-primary/10 text-primary ring-primary/20'
                      }`}>
                        {project.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <span className={`size-2 rounded-full ${
                        project.status === 'ready' ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                      }`}></span>
                      <span className={`text-xs font-medium ${
                        project.status === 'ready' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {project.status === 'ready' ? '就绪' : '排队中'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">最后: {project.lastRun}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">任务完成</span>
                    <span className="text-foreground font-medium">{project.completed}/{project.total}</span>
                  </div>
                  <div className="w-full bg-background rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-lg flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" />
                    立即运行
                  </Button>
                  <Button variant="outline" size="icon" className="size-10 bg-accent hover:bg-accent/80 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Terminal */}
        <div className="h-48 mx-6 mb-6 border-t border-border bg-black flex flex-col rounded-t-xl overflow-hidden shrink-0">
          <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm text-primary">▶</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">实时终端输出</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
                清除
              </button>
              <button className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
                复制
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs custom-scrollbar">
            <p className="text-muted-foreground"><span className="text-primary">[14:20:11]</span> [SYSTEM] 初始化安全执行环境...</p>
            <p className="text-muted-foreground"><span className="text-primary">[14:20:12]</span> [WALLET] 钱包 01 已连接到 ZkSync Era 主网</p>
            <p className="text-muted-foreground"><span className="text-primary">[14:20:15]</span> [ACTION] 执行 "Swap: ETH → USDC" on SyncSwap</p>
            <p className="text-primary"><span className="text-primary">[14:20:22]</span> [SUCCESS] 交易 0x4f...a1 已确认. Gas 消耗: 0.00042 ETH</p>
            <p className="text-muted-foreground"><span className="text-primary">[14:20:25]</span> [INFO] 等待冷却期 (10 秒)...</p>
            <p className="text-muted-foreground animate-pulse">_</p>
          </div>
        </div>
      </main>
    </>
  );
}
