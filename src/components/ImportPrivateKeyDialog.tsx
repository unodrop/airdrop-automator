import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface ImportPrivateKeyDialogProps {
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

export function ImportPrivateKeyDialog({ open, onOpenChange, onSuccess }: ImportPrivateKeyDialogProps) {
  const [privateKeys, setPrivateKeys] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateKeys, setShowPrivateKeys] = useState(true);
  const [importResults, setImportResults] = useState<ImportResultItem[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{ total: number; successful: number; failed: number } | null>(null);

  const countValidKeys = (): number => {
    return privateKeys.split('\n').filter(line => line.trim().length > 0).length;
  };

  const handleImport = async () => {
    const keys = privateKeys.split('\n').filter(line => line.trim().length > 0);
    
    if (keys.length === 0) {
      toast.error('请输入至少一个私钥');
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
      }>('batch_import_private_keys', {
        privateKeys: keys,
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
          description: '所有私钥均导入失败，请检查格式'
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
      setPrivateKeys('');
      setImportResults(null);
      setProgress(0);
      setStats(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">批量导入私钥</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            每行输入一个私钥，支持批量导入。私钥将被安全加密存储到本地。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Private Keys Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="privateKeys" className="text-sm font-medium text-foreground">
                私钥列表 <span className="text-destructive">*</span>
                {countValidKeys() > 0 && (
                  <span className="ml-2 text-xs text-primary">
                    ({countValidKeys()} 个私钥)
                  </span>
                )}
              </Label>
              <button
                type="button"
                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                disabled={isLoading}
              >
                {showPrivateKeys ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    隐藏
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    显示
                  </>
                )}
              </button>
            </div>
            <Textarea
              id="privateKeys"
              value={privateKeys}
              onChange={(e) => setPrivateKeys(e.target.value)}
              placeholder="每行输入一个私钥 (64位十六进制字符串，可带0x前缀)&#10;0x1234567890abcdef...&#10;abcdef1234567890...&#10;0x9876543210fedcba..."
              className={`min-h-[200px] font-mono text-sm resize-none ${!showPrivateKeys ? 'text-security-disc' : ''}`}
              disabled={isLoading}
            />
          </div>

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
              <Label className="text-sm font-medium text-foreground">导入结果</Label>
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
                        <span className="text-xs font-mono text-muted-foreground">
                          {result.private_key_preview}
                        </span>
                      </div>
                      {result.address && (
                        <p className="text-xs font-mono text-foreground mt-1 break-all">
                          {result.address}
                        </p>
                      )}
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
                <li>请勿在不安全的网络环境下导入私钥</li>
                <li>私钥将被加密存储在本地</li>
                <li>账户名称将自动生成（基于地址）</li>
                <li>请妥善保管您的数据文件</li>
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
              disabled={isLoading || countValidKeys() === 0}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              导入 {countValidKeys() > 0 && `(${countValidKeys()})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
