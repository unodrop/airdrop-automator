import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, CheckCircle, XCircle, Terminal, Activity, Wallet, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';

interface WalletAccount {
  name: string;
  address: string;
}

interface TaskLog {
  address: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message: string;
  jwt?: string;
  startTime?: number;
  endTime?: number;
}

interface LogEvent {
  address: string;
  message: string;
  level: 'info' | 'success' | 'error';
  timestamp: number;
}

interface PharosStatusResponse {
    is_running: boolean;
    results: Record<string, any>;
}

import { Input } from '@/components/ui/input';

export function PharosPage() {
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [taskStates, setTaskStates] = useState<Record<string, TaskLog>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [realtimeLogs, setRealtimeLogs] = useState<LogEvent[]>([]);
  const [inviteCode, setInviteCode] = useState('S6NGMzXSCDBxhnwo');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const processedCount = Object.values(taskStates).filter(t => t.status !== 'pending').length;
  const totalCount = wallets.length;

  useEffect(() => {
    loadWallets();
    syncStatus();
    
    const savedCode = localStorage.getItem('pharos_invite_code');
    if (savedCode) {
        setInviteCode(savedCode);
    }

    // Listen for log events
    const unlistenLogs = listen<LogEvent>('pharos_log', (event) => {
        const payload = event.payload;
        addLog(payload.address, payload.message, payload.level, payload.timestamp);
        
        // Optimistic update for running/success/failure based on logs?
        // Actually, let's just refresh status periodically or infer from logs?
        // Or better, let backend emit "status_change" events.
        // For now, we can infer some state or just poll status occasionally.
        // Or rely on the log messages to update local state if we want instant feedback without polling.
        
        if (payload.message === "All tasks completed" || payload.message === "Tasks stopped by user") {
            setIsRunning(false);
            syncStatus(); // Final sync
        }
    });

    // Poll status every 2 seconds to keep UI in sync with backend state
    const interval = setInterval(syncStatus, 2000);

    return () => {
        unlistenLogs.then(f => f());
        clearInterval(interval);
    };
  }, []);

  const syncStatus = async () => {
    try {
        const status = await invoke<PharosStatusResponse>('get_pharos_status');
        setIsRunning(status.is_running);
        
        // Update task states based on backend results
        setTaskStates(prev => {
            const next = { ...prev };
            Object.entries(status.results).forEach(([address, result]: [string, any]) => {
                if (next[address]) {
                    next[address] = {
                        ...next[address],
                        status: result.success ? 'success' : (result.message === 'Running...' ? 'running' : 'failed'),
                        message: result.message,
                        jwt: result.jwt
                    };
                }
            });
            return next;
        });
    } catch (e) {
        console.error("Failed to sync status", e);
    }
  };

  const addLog = (address: string, message: string, level: string, timestamp: number) => {
    setRealtimeLogs(prev => [...prev, {
        address,
        message,
        level: level as 'info' | 'success' | 'error',
        timestamp
    }]);
  };

  const loadWallets = async () => {
    try {
      const result = await invoke<WalletAccount[]>('get_wallets');
      setWallets(result);
      
      // Initialize task states
      setTaskStates(prev => {
        const initialStates: Record<string, TaskLog> = {};
        result.forEach(w => {
            // Keep existing state if available
            if (prev[w.address]) {
                initialStates[w.address] = prev[w.address];
            } else {
                initialStates[w.address] = {
                    address: w.address,
                    status: 'pending',
                    message: 'Ready to start'
                };
            }
        });
        return initialStates;
      });
    } catch (err) {
      console.error('Failed to load wallets:', err);
      toast.error('Failed to load wallets');
    }
  };

  const handleStart = async () => {
    try {
        setIsRunning(true);
        setRealtimeLogs([]);
        // Reset local states to pending/running
        setTaskStates(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                next[key].status = 'pending';
                next[key].message = 'Pending...';
                next[key].jwt = undefined;
            });
            return next;
        });
        
        await invoke('start_pharos_tasks', { inviteCode });
        localStorage.setItem('pharos_invite_code', inviteCode);
        toast.success('Tasks started in background');
    } catch (e: any) {
        setIsRunning(false);
        toast.error('Failed to start tasks: ' + e.toString());
    }
  };

  const handleStop = async () => {
    try {
        await invoke('stop_pharos_tasks');
        toast.info('Stop signal sent');
    } catch (e: any) {
        toast.error('Failed to stop tasks: ' + e.toString());
    }
  };

  // Auto scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [realtimeLogs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'success': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0d1a0d]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-sidebar/50 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            Pharos Testnet Tasks
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Automated login and task execution for Pharos network
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 whitespace-nowrap">Invite Code:</span>
                <Input 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-48 h-9 bg-black/20 border-white/10 text-white text-sm"
                    placeholder="Enter invite code"
                    disabled={isRunning}
                />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 px-3 py-1.5 rounded-lg border border-white/5">
                <Wallet className="w-4 h-4" />
                <span>{wallets.length} Wallets</span>
            </div>
            {processedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 px-3 py-1.5 rounded-lg border border-white/5">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span>Processed: {processedCount} / {totalCount}</span>
                </div>
            )}
            <Button 
                onClick={isRunning ? handleStop : handleStart} 
                disabled={wallets.length === 0}
                variant={isRunning ? "destructive" : "default"}
                className={`shadow-lg min-w-[120px] ${isRunning ? 'shadow-red-500/20' : 'shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground'}`}
            >
            {isRunning ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Stop
                </>
            ) : (
                <>
                <Play className="mr-2 h-4 w-4" />
                Start All
                </>
            )}
            </Button>
        </div>
      </div>

      {/* Main Content Split View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Wallet List */}
        <div className="w-1/2 flex flex-col border-r border-border bg-card/30 min-w-0">
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
                <h3 className="font-medium text-sm text-muted-foreground">Task Status</h3>
                {isRunning && <Badge variant="outline" className="animate-pulse border-primary text-primary">Processing</Badge>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {wallets.map((wallet) => {
                        const state = taskStates[wallet.address];
                        return (
                            <div 
                                key={wallet.address} 
                                className={`
                                    p-4 rounded-xl border transition-all duration-200
                                    ${state?.status === 'running' ? 'bg-accent/50 border-primary/30 shadow-sm' : 'bg-card/50 border-border hover:bg-accent/30'}
                                `}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                            ${state?.status === 'success' ? 'bg-green-500/20 text-green-500' : 
                                              state?.status === 'failed' ? 'bg-red-500/20 text-red-500' : 
                                              state?.status === 'running' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted text-muted-foreground'}
                                        `}>
                                            {wallet.address.substring(2, 4).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-mono text-sm font-medium">{wallet.address.substring(0, 6)}...{wallet.address.substring(38)}</div>
                                            <div className="text-xs text-muted-foreground">{wallet.name}</div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 text-sm ${getStatusColor(state?.status || 'pending')}`}>
                                        {getStatusIcon(state?.status || 'pending')}
                                        <span className="capitalize">{state?.status || 'Pending'}</span>
                                    </div>
                                </div>
                                
                                {state?.message && (
                                    <div className="text-xs text-muted-foreground bg-black/20 rounded px-2 py-1.5 mt-2 truncate font-mono">
                                        {state.message}
                                    </div>
                                )}
                                
                                {state?.jwt && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-green-500 bg-green-500/10 px-2 py-1.5 rounded border border-green-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        <span className="truncate">JWT Obtained</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {wallets.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            No wallets found
                        </div>
                    )}
            </div>
        </div>

        {/* Right: Real-time Logs */}
        <div className="w-1/2 flex flex-col bg-[#0a0a0a] min-w-0">
            <div className="p-3 border-b border-white/10 bg-[#111] flex items-center justify-between shrink-0">
                <h3 className="font-mono text-sm text-gray-400 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Execution Logs
                </h3>
                <Badge variant="secondary" className="bg-white/10 text-gray-400 hover:bg-white/20 font-mono text-[10px]">
                    LIVE
                </Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                <div className="space-y-1.5">
                    {realtimeLogs.length === 0 ? (
                        <div className="text-gray-600 italic p-4 text-center">
                            Waiting for tasks to start...
                        </div>
                    ) : (
                        realtimeLogs.map((log, index) => (
                            <div key={index} className="flex gap-2 hover:bg-white/5 px-2 py-0.5 rounded -mx-2">
                                <span className="text-gray-600 shrink-0 select-none">
                                    [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                                </span>
                                <div className="flex-1 break-all min-w-0">
                                    <span className="text-gray-500 mr-2 select-all">
                                        [{log.address.substring(0, 6)}..]
                                    </span>
                                    <span className={`
                                        ${log.level === 'error' ? 'text-red-400' : 
                                          log.level === 'success' ? 'text-green-400' : 'text-gray-300'}
                                    `}>
                                        {log.message}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
