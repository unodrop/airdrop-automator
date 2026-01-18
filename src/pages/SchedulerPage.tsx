import { Search, Plus, Play, Pause, Edit, Trash2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function SchedulerPage() {
  const tasks = [
    {
      id: 1,
      name: 'ZkSync Era Daily Check-in',
      script: 'zksync_checkin.py',
      schedule: '每天 08:00',
      nextRun: '明天 08:00',
      lastRun: '今天 08:00',
      status: 'active',
      accounts: 45
    },
    {
      id: 2,
      name: 'Galxe Twitter Follow',
      script: 'galxe_twitter.py',
      schedule: '每周一 10:00',
      nextRun: '2024-01-22 10:00',
      lastRun: '2024-01-15 10:00',
      status: 'active',
      accounts: 30
    },
    {
      id: 3,
      name: 'Proxy Health Check',
      script: 'proxy_check.py',
      schedule: '每小时',
      nextRun: '15:00',
      lastRun: '14:00',
      status: 'paused',
      accounts: 120
    }
  ];

  return (
    <>
      {/* Header */}
      <header className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 whitespace-nowrap">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            定时任务管理
          </h2>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              className="w-full bg-accent border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground" 
              placeholder="搜索任务或脚本..." 
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            <span>创建任务</span>
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="p-8 pb-0">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">总任务数</span>
            <span className="text-2xl font-bold mt-1 text-foreground">24</span>
          </div>
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">活跃任务</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">18</span>
              <span className="text-xs text-primary font-medium">75%</span>
            </div>
          </div>
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">今日执行</span>
            <span className="text-2xl font-bold mt-1 text-foreground">156</span>
          </div>
          <div className="bg-sidebar p-4 rounded-xl border border-border flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">成功率</span>
            <span className="text-2xl font-bold mt-1 text-primary">99.2%</span>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="flex-1 p-8 min-h-0 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-sidebar border border-border rounded-xl p-5 hover:border-primary/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground mb-1">{task.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{task.script}</p>
                </div>
                <div className="flex items-center gap-1">
                  {task.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                      活跃
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-muted-foreground"></span>
                      暂停
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">执行计划</span>
                  <span className="text-foreground font-medium">{task.schedule}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">下次运行</span>
                  <span className="text-primary font-medium">{task.nextRun}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">上次运行</span>
                  <span className="text-foreground">{task.lastRun}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">账户数量</span>
                  <span className="text-foreground font-medium">{task.accounts} 个账户</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 bg-accent hover:bg-accent/80 text-foreground">
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </Button>
                {task.status === 'active' ? (
                  <Button variant="outline" size="sm" className="bg-accent hover:bg-accent/80 text-foreground">
                    <Pause className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary">
                    <Play className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="outline" size="sm" className="bg-destructive/10 hover:bg-destructive/20 text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Execution History */}
        <div className="mt-8 bg-sidebar rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">最近执行记录</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">任务名称</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">执行时间</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">持续时间</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">结果</th>
                  <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">账户数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { task: 'ZkSync Era Daily Check-in', time: '今天 08:00', duration: '2m 34s', status: 'success', accounts: 45 },
                  { task: 'Proxy Health Check', time: '今天 14:00', duration: '45s', status: 'success', accounts: 120 },
                  { task: 'Galxe Twitter Follow', time: '昨天 10:00', duration: '5m 12s', status: 'partial', accounts: 30 },
                ].map((log, i) => (
                  <tr key={i} className="hover:bg-card/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{log.task}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{log.time}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{log.duration}</td>
                    <td className="px-6 py-4">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
                          部分成功
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{log.accounts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
