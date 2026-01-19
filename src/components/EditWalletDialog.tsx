import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wallet, Plus, Trash2, Mail, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface SocialAccount {
  platform: string;
  username: string;
  encrypted_token: string;
  wallet_address: string;
  verified: boolean;
  created_at: string;
}

interface EditWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: {
    address: string;
    name: string;
  } | null;
  onSuccess?: () => void;
}

export function EditWalletDialog({ open, onOpenChange, wallet, onSuccess }: EditWalletDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // 社交账户相关状态
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [addingSocial, setAddingSocial] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState<'twitter' | 'discord' | 'email' | 'telegram'>('twitter');
  const [newSocialUsername, setNewSocialUsername] = useState('');
  const [newSocialToken, setNewSocialToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // 加载钱包绑定的社交账户
  const loadSocialAccounts = async () => {
    if (!wallet) return;
    
    setIsLoadingSocial(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const allSocials = await invoke<SocialAccount[]>('get_social_accounts');
      const walletSocials = allSocials.filter(s => s.wallet_address === wallet.address);
      setSocialAccounts(walletSocials);
    } catch (error) {
      console.error('Failed to load social accounts:', error);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  // 同步钱包数据
  useEffect(() => {
    if (wallet) {
      setName(wallet.name);
      loadSocialAccounts();
    }
  }, [wallet]);

  const handleSubmit = async () => {
    if (!wallet) return;

    if (!name.trim()) {
      toast.error('请输入账户名称');
      return;
    }

    setIsLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const success = await invoke<boolean>('update_wallet_name', {
        address: wallet.address,
        newName: name.trim(),
      });

      if (success) {
        toast.success('更新成功', {
          description: '账户名称已更新'
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error('更新失败', {
          description: '未找到该钱包'
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('更新失败', {
        description: error instanceof Error ? error.message : '发生未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 添加社交账户
  const handleAddSocial = async () => {
    if (!wallet) return;

    if (!newSocialUsername.trim() || !newSocialToken.trim()) {
      toast.error('请填写完整信息');
      return;
    }

    setAddingSocial(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const success = await invoke<boolean>('import_social_account', {
        account: {
          platform: newSocialPlatform,
          username: newSocialUsername.trim(),
          encrypted_token: newSocialToken.trim(),
          wallet_address: wallet.address,
          verified: true,
          created_at: new Date().toISOString(),
        }
      });

      if (success) {
        toast.success('添加成功');
        setNewSocialUsername('');
        setNewSocialToken('');
        setShowToken(false);
        loadSocialAccounts();
      }
    } catch (error) {
      toast.error('添加失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setAddingSocial(false);
    }
  };

  // 删除社交账户
  const handleDeleteSocial = async (platform: string, username: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('delete_social_account', { platform, username });
      toast.success('删除成功');
      loadSocialAccounts();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setActiveTab('basic');
      setNewSocialUsername('');
      setNewSocialToken('');
      setShowToken(false);
      onOpenChange(false);
    }
  };

  const platformConfig: Record<string, { name: string; icon: string | React.ComponentType<{className?: string}>; color: string }> = {
    twitter: { name: 'Twitter', icon: '𝕏', color: 'text-blue-500' },
    discord: { name: 'Discord', icon: 'D', color: 'text-indigo-500' },
    email: { name: 'Email', icon: Mail, color: 'text-orange-500' },
    telegram: { name: 'Telegram', icon: MessageCircle, color: 'text-blue-400' },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            编辑钱包
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            修改钱包信息和管理绑定的社交账户。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-accent">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="social">
              社交账户 {socialAccounts.length > 0 && `(${socialAccounts.length})`}
            </TabsTrigger>
          </TabsList>

          {/* 基本信息标签 */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* 钱包地址（只读） */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium text-foreground">
                钱包地址
              </Label>
              <Input
                id="address"
                value={wallet?.address || ''}
                readOnly
                className="bg-accent border-border text-muted-foreground font-mono text-sm cursor-not-allowed"
              />
            </div>

            {/* 账户名称 */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                账户名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：主钱包、测试账户..."
                disabled={isLoading}
                className="bg-accent border-border text-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && activeTab === 'basic') {
                    handleSubmit();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                建议使用易于识别的名称
              </p>
            </div>
          </TabsContent>

          {/* 社交账户标签 */}
          <TabsContent value="social" className="space-y-4 mt-4">
            {/* 已绑定的社交账户列表 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                已绑定账户 ({socialAccounts.length})
              </Label>
              
              {isLoadingSocial ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : socialAccounts.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">暂无绑定的社交账户</p>
                  <p className="text-xs text-muted-foreground mt-1">点击下方"添加社交账户"按钮开始绑定</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {socialAccounts.map((social) => {
                    const config = platformConfig[social.platform as keyof typeof platformConfig];
                    const IconComponent = typeof config.icon === 'string' ? null : config.icon;
                    
                    return (
                      <div
                        key={`${social.platform}-${social.username}`}
                        className="flex items-center justify-between p-3 bg-accent rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`size-10 rounded-lg flex items-center justify-center ${config.color} bg-current/10`}>
                            {IconComponent ? (
                              <IconComponent className="w-5 h-5" />
                            ) : (
                              <span className="text-lg font-bold">{config.icon as string}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{social.username}</p>
                            <p className="text-xs text-muted-foreground">{config.name}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSocial(social.platform, social.username)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 添加新社交账户 */}
            <div className="space-y-3 p-4 bg-accent/50 rounded-lg border border-border">
              <Label className="text-sm font-medium text-foreground">添加社交账户</Label>
              
              {/* 平台选择 */}
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(platformConfig).map(([key, config]) => {
                  const IconComponent = typeof config.icon === 'string' ? null : config.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setNewSocialPlatform(key as any)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newSocialPlatform === key
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-accent hover:border-primary/50'
                      }`}
                    >
                      <div className={`size-8 mx-auto rounded flex items-center justify-center ${config.color} ${
                        newSocialPlatform === key ? 'bg-current/20' : 'bg-current/10'
                      }`}>
                        {IconComponent ? (
                          <IconComponent className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-bold">{config.icon as string}</span>
                        )}
                      </div>
                      <p className="text-xs mt-1 text-center text-foreground">{config.name}</p>
                    </button>
                  );
                })}
              </div>

              {/* 用户名 */}
              <div className="space-y-2">
                <Input
                  value={newSocialUsername}
                  onChange={(e) => setNewSocialUsername(e.target.value)}
                  placeholder={newSocialPlatform === 'email' ? 'Email 地址' : '用户名'}
                  disabled={addingSocial}
                  className="bg-card border-border"
                />
              </div>

              {/* Token */}
              <div className="space-y-2">
                <div className="relative">
                  <Textarea
                    value={newSocialToken}
                    onChange={(e) => setNewSocialToken(e.target.value)}
                    placeholder="Auth Token / Session String"
                    disabled={addingSocial}
                    className={`bg-card border-border min-h-[80px] ${showToken ? '' : 'text-security-disc'}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-2"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleAddSocial}
                disabled={addingSocial || !newSocialUsername.trim() || !newSocialToken.trim()}
                className="w-full gap-2"
              >
                {addingSocial ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                添加社交账户
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {activeTab === 'social' ? '关闭' : '取消'}
          </Button>
          {activeTab === 'basic' && (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              保存更改
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
