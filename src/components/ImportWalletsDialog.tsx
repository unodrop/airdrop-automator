import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, CheckCircle2, XCircle, Upload, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface ImportWalletsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResultItem {
  index: number;
  success: boolean;
  address: string | null;
  message: string;
  private_key_preview: string;
}

export function ImportWalletsDialog({ open, onOpenChange, onSuccess }: ImportWalletsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultItem[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ total: number; successful: number; failed: number } | null>(null);
  const [previewStats, setPreviewStats] = useState<{
    totalInFile: number;
    uniqueInFile: number;
    newToImport: number;
    duplicates: number;
  } | null>(null);
  const [walletsToImport, setWalletsToImport] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    setPreviewStats(null);
    setWalletsToImport([]);
    
    try {
      const text = await file.text();
      let walletsData;
      try {
        walletsData = JSON.parse(text);
      } catch (e) {
        toast.error('文件格式错误', { description: '不是有效的 JSON 文件' });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (!Array.isArray(walletsData)) {
        toast.error('格式错误', { description: 'JSON 根元素必须是数组' });
        setSelectedFile(null);
        return;
      }

      if (walletsData.length === 0) {
        toast.error('文件内容为空');
        setSelectedFile(null);
        return;
      }

      // 1. 文件内去重
      const uniqueMap = new Map();
      walletsData.forEach((w: any) => {
        if (w.address && typeof w.address === 'string') {
          uniqueMap.set(w.address.toLowerCase(), w);
        }
      });
      const uniqueInFile = Array.from(uniqueMap.values());

      // 2. 获取本地钱包
      const { invoke } = await import('@tauri-apps/api/core');
      const existingWallets = await invoke<any[]>('get_wallets');
      const existingAddresses = new Set(existingWallets.map(w => w.address.toLowerCase()));

      // 3. 筛选新增钱包
      const newWallets = uniqueInFile.filter(w => !existingAddresses.has(w.address.toLowerCase()));

      setPreviewStats({
        totalInFile: walletsData.length,
        uniqueInFile: uniqueInFile.length,
        newToImport: newWallets.length,
        duplicates: uniqueInFile.length - newWallets.length
      });
      setWalletsToImport(newWallets);

    } catch (err) {
      console.error('Analysis failed:', err);
      toast.error('文件解析失败');
      setSelectedFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        toast.error('请选择 JSON 格式的文件');
        return;
      }
      setSelectedFile(file);
      // Reset states
      setImportResults(null);
      setStats(null);
      setProgress(0);
      
      analyzeFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('请先选择文件');
      return;
    }

    if (walletsToImport.length === 0) {
      toast.error('没有可导入的新钱包');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setImportResults(null);
    setStats(null);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const result = await invoke<{
        total: number;
        successful: number;
        failed: number;
        results: ImportResultItem[];
      }>('batch_import_wallets', {
        walletsToImport: walletsToImport,
      });

      clearInterval(progressInterval);
      setProgress(100);

      setStats({
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      });
      setImportResults(result.results);

      if (result.successful > 0) {
        toast.success('批量导入完成', {
          description: `成功: ${result.successful} | 失败: ${result.failed}`
        });
        
        // 如果全部成功，2秒后自动关闭
        if (result.failed === 0) {
          setTimeout(() => {
            handleClose();
            onSuccess?.();
          }, 2000);
        }
      } else {
        toast.error('导入失败', {
          description: '所有钱包均导入失败，请检查文件内容'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : '发生未知错误';
      toast.error('导入失败', {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSelectedFile(null);
      setImportResults(null);
      setPreviewStats(null);
      setWalletsToImport([]);
      setProgress(0);
      setStats(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">批量导入钱包文件</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            请上传此前导出的钱包数据文件 (JSON 格式)。系统将自动解析并导入其中的钱包信息。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              选择文件 <span className="text-destructive">*</span>
            </Label>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                selectedFile ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
              onClick={() => !isLoading && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              
              {selectedFile ? (
                <>
                  <FileJson className="w-10 h-10 text-primary mb-3" />
                  <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-4 text-xs text-primary hover:text-primary/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isLoading}
                  >
                    重新选择
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-foreground">点击上传或拖拽文件到此处</p>
                  <p className="text-xs text-muted-foreground mt-1">支持 JSON 格式文件</p>
                </>
              )}
            </div>
          </div>

          {/* Analysis Stats */}
          {!stats && (isAnalyzing ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>正在分析文件...</span>
            </div>
          ) : previewStats ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-accent rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">文件总数</p>
                <p className="text-2xl font-bold text-foreground">{previewStats.totalInFile}</p>
                {previewStats.totalInFile !== previewStats.uniqueInFile && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                        (文件内重复 {previewStats.totalInFile - previewStats.uniqueInFile})
                    </p>
                )}
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-xs text-destructive">已存在/重复</p>
                <p className="text-2xl font-bold text-destructive">{previewStats.duplicates}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-primary">新增待导入</p>
                <p className="text-2xl font-bold text-primary">{previewStats.newToImport}</p>
              </div>
            </div>
          ) : null)}

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">导入进度</span>
                <span className="text-primary font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Import Results Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-accent rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">总计</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-primary">成功</p>
                <p className="text-2xl font-bold text-primary">{stats.successful}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-xs text-destructive">失败</p>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>
            </div>
          )}

          {/* Import Results List */}
          {importResults && importResults.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">导入结果详情</Label>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 p-3 bg-accent rounded-lg border border-border">
                {importResults.map((result) => (
                  <div
                    key={result.index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      result.success
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-destructive/5 border-destructive/20'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          #{result.index}
                        </span>
                        {result.address && (
                            <span className="text-xs font-mono text-foreground break-all">
                                {result.address}
                            </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${result.success ? 'text-primary' : 'text-destructive'}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Warning */}
          <div className="flex items-start gap-3 p-4 bg-accent rounded-lg border border-border">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">安全提示</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>仅支持导入由本应用导出的 JSON 钱包文件</li>
                <li>导入过程中会对私钥进行校验和重新加密</li>
                <li>系统已自动过滤文件内重复及本地已存在的钱包</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {importResults ? '关闭' : '取消'}
          </Button>
          {!importResults && (
            <Button
              onClick={handleImport}
              disabled={isLoading || !selectedFile || isAnalyzing || walletsToImport.length === 0}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              开始导入 {walletsToImport.length > 0 && `(${walletsToImport.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
