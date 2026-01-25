import { useState, useRef, useEffect } from 'react';
import { 
  Play, Loader2, Save, Trash2, Plus, Edit, FileText, 
  Settings, Terminal, Activity, CheckCircle, XCircle, Clock, 
  AlertTriangle, Download, RotateCcw, Monitor, Shield,
  Layers, Users,  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// --- Types (Kept same) ---
interface Campaign { id: string; name: string; }
interface ReferralLink { id: string; url: string; }
interface AccountStatus {
  address: string;
  campaign: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  action: string;
  result: string;
}
interface LogEvent {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function GalxePage() {
  // --- State (Kept same) ---
  const [activeTab, setActiveTab] = useState('config');
  const [captchaService, setCaptchaService] = useState('2captcha');
  const [apiKey, setApiKey] = useState('');
  const [threadCount, setThreadCount] = useState(1);
  const [skipCount, setSkipCount] = useState(0);
  const [maxRetries, setMaxRetries] = useState(2);
  const [accountIntervalMin, setAccountIntervalMin] = useState(30);
  const [accountIntervalMax, setAccountIntervalMax] = useState(60);
  const [taskIntervalMin, setTaskIntervalMin] = useState(4);
  const [taskIntervalMax, setTaskIntervalMax] = useState(10);
  const [randomOrder, setRandomOrder] = useState(false);
  const [mockTwitter, setMockTwitter] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([]);
  const [accountStatuses, setAccountStatuses] = useState<AccountStatus[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleStart = () => {
    if (!isRunning) {
        setIsRunning(true);
        setActiveTab('monitor');
        addLog('System started initialization...', 'info');
        toast.success('Tasks execution started');
    } else {
        setIsRunning(false);
        addLog('System stopped by user', 'warning');
        toast.info('Tasks execution stopped');
    }
  };

  const handleSaveConfig = () => {
    toast.success('Configuration saved successfully');
  };

  const addLog = (message: string, type: LogEvent['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: Date.now(), message, type }]);
  };

  // --- Components Helpers ---

  // Helper for Stat Cards
  const StatCard = ({ title, value, icon: Icon, colorClass, subValue }: any) => (
    <Card className="shadow-sm border-border/50 bg-card/50">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${colorClass}`}>{value}</span>
            {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
          </div>
        </div>
        <div className={`p-2 rounded-full bg-background border border-border/50 ${colorClass.replace('text-', 'text-opacity-80 ')}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-screen bg-muted/10 overflow-y-auto font-sans">
      
      {/* --- Top Bar --- */}
      <header className="h-14 border-b bg-background/80 backdrop-blur-sm px-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none">Galxe Automation</h1>
            <p className="text-[10px] text-muted-foreground mt-1">Task Orchestrator v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'monitor' && (
            <div className="flex items-center gap-1 mr-2">
               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Export Logs">
                 <Download className="w-4 h-4" />
               </Button>
            </div>
          )}
          
          <Separator orientation="vertical" className="h-6" />

          <Button 
            onClick={handleStart}
            size="sm"
            className={`min-w-[120px] shadow-sm transition-all ${
              isRunning 
                ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200 border" 
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isRunning ? (
                <>
                    <Pause className="w-4 h-4 mr-2 fill-current" /> Stop Process
                </>
            ) : (
                <>
                    <Play className="w-4 h-4 mr-2 fill-current" /> Start Task
                </>
            )}
          </Button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col gap-4">
            
            {/* Tabs Navigation */}
            <div className="shrink-0 flex ">
                <TabsList className="grid w-[400px] grid-cols-2 shadow-sm bg-background border p-0">
                    <TabsTrigger value="config" className="flex gap-2 border-none data-[state=active]:border-none">
                        <Settings className="w-4 h-4" /> Configuration
                    </TabsTrigger>
                    <TabsTrigger value="monitor" className="flex gap-2 border-none data-[state=active]:border-none">
                        <Monitor className="w-4 h-4" /> Live Monitor
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* --- CONFIGURATION TAB --- */}
            <TabsContent value="config" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
                <div className="grid grid-cols-12 gap-4 h-full">
                    
                    {/* Left Column: Data Inputs (7/12) */}
                    <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
                        
                        {/* Campaign List */}
                        <Card className="flex-1 flex flex-col shadow-sm border-border/60 py-0">
                            <CardHeader className="px-4 py-3 border-b bg-muted/20 items-center content-center grid-rows-[auto]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-500"><FileText className="w-4 h-4" /></div>
                                        <CardTitle className="text-sm font-medium">Target Campaigns</CardTitle>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Plus className="w-3 h-3" /> Add</Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <ScrollArea className="flex-1 bg-background/50">
                                <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px] border-2 border-dashed border-muted m-4 rounded-xl">
                                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center mb-3">
                                        <Layers className="w-6 h-6 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">No campaigns loaded</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[250px]">
                                        Add campaign IDs manually or import from a file to start
                                    </p>
                                    <Button variant="outline" size="sm" className="mt-4">Import List</Button>
                                </div>
                            </ScrollArea>
                        </Card>

                        {/* Secondary Inputs Grid */}
                        <div className="grid grid-cols-2 gap-4 h-[220px] shrink-0">
                            {/* Referrals */}
                            <Card className="flex flex-col shadow-sm border-border/60">
                                <CardHeader className="px-4 py-3 border-b bg-muted/20 items-center content-center grid-rows-[auto]">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <RotateCcw className="w-3.5 h-3.5" /> Referrals
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 p-0 flex items-center justify-center">
                                    <span className="text-xs text-muted-foreground italic">No links configured</span>
                                </CardContent>
                            </Card>

                            {/* Survey Config */}
                            <Card className="flex flex-col shadow-sm border-border/60">
                                <CardHeader className="px-4 py-3 border-b bg-muted/20 items-center content-center grid-rows-[auto]">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" /> Survey Answers
                                        </CardTitle>
                                        <Badge variant="outline" className="text-[10px] font-normal">Optional</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-4 flex flex-col justify-center gap-2">
                                    <Button variant="secondary" size="sm" className="w-full text-xs justify-start">
                                        <Edit className="w-3 h-3 mr-2" /> Configure Mapping
                                    </Button>
                                    <Button variant="outline" size="sm" className="w-full text-xs justify-start">
                                        <Download className="w-3 h-3 mr-2" /> Load CSV
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Right Column: Settings (5/12) */}
                    <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 h-full">
                        
                        {/* Execution Parameters */}
                        <Card className="shadow-sm border-border/60 py-0">
                            <CardHeader className="px-4 py-3 border-b bg-muted/20 items-center content-center grid-rows-[auto]">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Settings className="w-4 h-4" /> Runtime Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-6">
                                {/* Concurrency */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-foreground/80">Concurrency & Retries</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Threads</span>
                                            <Input type="number" value={threadCount} onChange={e => setThreadCount(Number(e.target.value))} className="h-8 text-xs font-mono" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Skip</span>
                                            <Input type="number" value={skipCount} onChange={e => setSkipCount(Number(e.target.value))} className="h-8 text-xs font-mono" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Retries</span>
                                            <Input type="number" value={maxRetries} onChange={e => setMaxRetries(Number(e.target.value))} className="h-8 text-xs font-mono" />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Delays */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-semibold text-foreground/80">Time Delays (Seconds)</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="text-[10px] text-muted-foreground">Account Delay</span>
                                            <div className="flex items-center gap-2">
                                                <Input className="h-8 text-xs text-center" value={accountIntervalMin} onChange={e => setAccountIntervalMin(Number(e.target.value))} placeholder="Min" />
                                                <span className="text-muted-foreground">-</span>
                                                <Input className="h-8 text-xs text-center" value={accountIntervalMax} onChange={e => setAccountIntervalMax(Number(e.target.value))} placeholder="Max" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-[10px] text-muted-foreground">Task Delay</span>
                                            <div className="flex items-center gap-2">
                                                <Input className="h-8 text-xs text-center" value={taskIntervalMin} onChange={e => setTaskIntervalMin(Number(e.target.value))} placeholder="Min" />
                                                <span className="text-muted-foreground">-</span>
                                                <Input className="h-8 text-xs text-center" value={taskIntervalMax} onChange={e => setTaskIntervalMax(Number(e.target.value))} placeholder="Max" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Toggles */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-2 rounded border bg-background/50">
                                        <Label htmlFor="random" className="text-xs cursor-pointer flex-1">Randomize Execution Order</Label>
                                        <Checkbox id="random" checked={randomOrder} onCheckedChange={(c) => setRandomOrder(!!c)} />
                                    </div>
                                    <div className="flex items-center justify-between p-2 rounded border bg-background/50">
                                        <Label htmlFor="twitter" className="text-xs cursor-pointer flex-1">Mock Twitter/X Actions</Label>
                                        <Checkbox id="twitter" checked={mockTwitter} onCheckedChange={(c) => setMockTwitter(!!c)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Captcha Settings */}
                        <Card className="shadow-sm border-border/60 flex-1 py-0">
                            <CardHeader className="px-4 py-3 border-b bg-muted/20 items-center content-center grid-rows-[auto]">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Captcha Solver
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <RadioGroup value={captchaService} onValueChange={setCaptchaService} className="grid grid-cols-3 gap-2">
                                    {['2captcha', 'capsolver', 'self'].map((service) => (
                                        <div key={service}>
                                            <RadioGroupItem value={service} id={service} className="peer sr-only" />
                                            <Label
                                                htmlFor={service}
                                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
                                            >
                                                <span className="text-xs font-semibold capitalize">{service}</span>
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                                
                                <div className="space-y-2">
                                    <Label className="text-xs">API Key</Label>
                                    <Input 
                                        type="password" 
                                        value={apiKey} 
                                        onChange={e => setApiKey(e.target.value)} 
                                        className="h-8 text-xs font-mono" 
                                        placeholder="Enter your service API key..."
                                    />
                                </div>

                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 flex gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                                    <p className="text-[10px] text-yellow-700 dark:text-yellow-400">
                                        Ensure sufficient balance in your captcha service account before starting large batches.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <Button className="w-full h-8 text-xs" onClick={handleSaveConfig}>
                                        <Save className="w-3 h-3 mr-2" /> Save & Apply Config
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            {/* --- MONITOR TAB --- */}
            <TabsContent value="monitor" className="flex-1 flex flex-col min-h-0 mt-0 gap-4 data-[state=inactive]:hidden">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                    <StatCard title="Total Tasks" value="0" icon={Layers} colorClass="text-foreground" />
                    <StatCard title="Success Rate" value="0%" icon={CheckCircle} colorClass="text-green-500" subValue="(0/0)" />
                    <StatCard title="Failures" value="0" icon={XCircle} colorClass="text-red-500" />
                    <StatCard title="Runtime" value="00:00:00" icon={Clock} colorClass="text-blue-500" />
                </div>

                {/* Main Monitor Area */}
                <div className="flex-1 flex gap-4 min-h-0">
                    
                    {/* Left: Accounts Table */}
                    <Card className="flex-[2] flex flex-col min-w-0 border-border/60 shadow-sm overflow-hidden py-0">
                        <CardHeader className="px-4 py-3 border-b bg-muted/20 shrink-0 items-center content-center grid-rows-[auto]">
                            <div className="flex items-center justify-between h-full">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Account Status
                                </CardTitle>
                                <Badge variant="secondary" className="font-mono text-[10px]">0 Active</Badge>
                            </div>
                        </CardHeader>
                        <div className="flex-1 overflow-auto bg-background">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent border-b border-border">
                                        <TableHead className="w-[50px] text-xs h-9">#</TableHead>
                                        <TableHead className="text-xs h-9">Wallet Address</TableHead>
                                        <TableHead className="text-xs h-9">Campaign</TableHead>
                                        <TableHead className="w-[100px] text-xs h-9">Status</TableHead>
                                        <TableHead className="text-xs h-9">Last Action</TableHead>
                                        <TableHead className="text-xs h-9 text-right">Result</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {accountStatuses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-[300px] text-center">
                                                <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                    <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center">
                                                        <Activity className="w-6 h-6 opacity-40" />
                                                    </div>
                                                    <p className="text-sm">No active execution threads</p>
                                                    <Button variant="outline" size="sm" onClick={() => setActiveTab('config')} className="mt-2">
                                                        Configure Tasks
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        accountStatuses.map((status, i) => (
                                            <TableRow key={i} className="group hover:bg-muted/30">
                                                <TableCell className="text-xs font-mono text-muted-foreground">{i + 1}</TableCell>
                                                <TableCell className="text-xs font-mono font-medium">{status.address}</TableCell>
                                                <TableCell className="text-xs max-w-[120px] truncate" title={status.campaign}>{status.campaign}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`
                                                        h-5 text-[10px] font-normal gap-1
                                                        ${status.status === 'success' ? 'border-green-500/30 text-green-600 bg-green-500/5' :
                                                          status.status === 'failed' ? 'border-red-500/30 text-red-600 bg-red-500/5' :
                                                          status.status === 'running' ? 'border-blue-500/30 text-blue-600 bg-blue-500/5' :
                                                          'border-gray-500/30 text-gray-500'}
                                                    `}>
                                                        {status.status === 'running' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                                        {status.status.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{status.action}</TableCell>
                                                <TableCell className="text-xs font-mono text-right">{status.result}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>

                    {/* Right: Live Logs */}
                    <Card className="flex-1 flex flex-col min-w-[350px] border-border/60 shadow-sm overflow-hidden bg-[#0f1115] border-0 ring-1 ring-border/50 py-0">
                        <CardHeader className="px-3 py-2 border-b border-white/10 bg-[#15171b] shrink-0 min-h-[49px] justify-center flex flex-col">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xs font-medium text-gray-300 flex items-center gap-2">
                                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                                    System Logs
                                </CardTitle>
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live" />
                                    <span className="text-[10px] text-gray-500 font-mono">LIVE</span>
                                </div>
                            </div>
                        </CardHeader>
                        <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
                                    <Terminal className="w-8 h-8 opacity-20" />
                                    <span>Waiting for system events...</span>
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className="flex gap-2 group hover:bg-white/5 px-1.5 py-0.5 -mx-1.5 rounded transition-colors">
                                        <span className="text-gray-500 shrink-0 select-none">
                                            {new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                        </span>
                                        <div className="flex gap-2 items-start">
                                            <span className={`text-[10px] uppercase font-bold mt-[1px]
                                                ${log.type === 'error' ? 'text-red-500' : 
                                                log.type === 'success' ? 'text-green-500' : 
                                                log.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}
                                            `}>
                                                {log.type.slice(0,4)}
                                            </span>
                                            <span className={`break-all leading-relaxed
                                                ${log.type === 'error' ? 'text-red-300' : 
                                                log.type === 'success' ? 'text-green-300' : 
                                                log.type === 'warning' ? 'text-yellow-300' : 'text-gray-300'}
                                            `}>
                                                {log.message}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
