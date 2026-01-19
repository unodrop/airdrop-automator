import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: {
    address: string;
    name: string;
  } | null;
  onSuccess?: () => void;
}

export function DeleteConfirmDialog({ open, onOpenChange, wallet, onSuccess }: DeleteConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!wallet) return;

    setIsLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const success = await invoke<boolean>('delete_wallet', {
        address: wallet.address,
      });

      if (success) {
        toast.success('删除成功', {
          description: '钱包已从列表中移除'
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error('删除失败', {
          description: '未找到该钱包'
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : '发生未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            确认删除
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            此操作无法撤销。请确认您要删除此钱包。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 钱包信息 */}
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">账户名称：</span>
              <span className="text-sm font-bold text-foreground">{wallet?.name}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-muted-foreground">钱包地址：</span>
              <span className="text-xs font-mono text-muted-foreground break-all select-all">
                {wallet?.address}
              </span>
            </div>
          </div>

          {/* 警告信息 */}
          <div className="flex items-start gap-3 p-4 bg-accent rounded-lg border border-border">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">重要提示：</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>删除后无法恢复钱包信息</li>
                <li>请确保已备份私钥</li>
                <li>绑定的社交账户不会被删除</li>
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
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
