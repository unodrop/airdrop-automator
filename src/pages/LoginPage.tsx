import { useState, useEffect } from 'react';
import { Lock, Mail, Key, LogIn, AlertCircle, Eye, EyeOff, Shield, HardDrive, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { login } = useAuth();
  const t = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [encryptionKey, setEncryptionKey] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMacLoading, setIsMacLoading] = useState(true);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{
    email: string;
    encrypted_password: string;
    encryption_key: string;
    mac_address: string;
    token?: string;
  } | null>(null);

  // 获取MAC地址和保存的登录信息
  useEffect(() => {
    const initialize = async () => {
      try {
        // 获取MAC地址
        const mac = await invoke<string>('get_device_mac_address');
        setMacAddress(mac);
        setIsMacLoading(false);

        // 获取保存的登录凭据
        const credentials = await invoke<{
          email: string;
          encrypted_password: string;
          encryption_key: string;
          mac_address: string;
          token?: string;
        } | null>('get_saved_credentials');

        if (credentials && credentials.mac_address === mac) {
          // MAC地址匹配，保存凭据并自动填充表单
          setSavedCredentials(credentials);
          setEmail(credentials.email);
          setEncryptionKey(credentials.encryption_key);
          // 显示占位符密码，表示已保存
          setPassword('••••••••••');
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        setMacAddress(t('login.macAddressError'));
        setIsMacLoading(false);
      }
    };

    initialize();
  }, [t]);

  // 生成加密密钥
  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    
    try {
      const key = await invoke<string>('generate_encryption_key');
      setEncryptionKey(key);
    } catch (error) {
      console.error('Failed to generate key:', error);
      toast.error(t('login.loginError'), {
        description: 'Failed to generate encryption key'
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Login form submitted');

    // 表单字段验证
    if (!email) {
      toast.error(t('login.fieldRequired'), {
        description: t('login.emailRequired'),
        duration: 3000,
      });
      return;
    }

    if (!password) {
      toast.error(t('login.fieldRequired'), {
        description: t('login.passwordRequired'),
        duration: 3000,
      });
      return;
    }

    if (!encryptionKey) {
      toast.error(t('login.fieldRequired'), {
        description: t('login.encryptionKeyRequired'),
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      let encryptedPassword: string;
      let token: string;

      // 检查是否使用保存的凭据（密码未修改）
      const isUsingSavedCredentials = 
        savedCredentials && 
        savedCredentials.email === email && 
        savedCredentials.encryption_key === encryptionKey &&
        password === '••••••••••'; // 占位符密码

      if (isUsingSavedCredentials) {
        // 使用保存的加密密码和token
        encryptedPassword = savedCredentials.encrypted_password;
        token = savedCredentials.token || 'mock_token_' + Date.now();
      } else {
        // 用户修改了密码或首次登录，重新加密
        encryptedPassword = await invoke<string>('encrypt_password', {
          password,
          key: encryptionKey,
        });

        // TODO: 调用登录接口（暂时跳过，直接模拟成功）
        // const loginResponse = await invoke('login_api', {
        //   email,
        //   encryptedPassword,
        //   encryptionKey,
        //   macAddress,
        // });
        
        // 模拟登录成功，生成临时token
        token = 'mock_token_' + Date.now();
        
        // 保存新的登录凭据
        try {
          await invoke('save_login_credentials', {
            email,
            encryptedPassword,
            encryptionKey,
            macAddress,
            token,
          });
        } catch (saveError) {
          console.error('Failed to save credentials:', saveError);
          // 不要throw，继续登录流程
        }
      }

      // 调用AuthContext的login
      const success = await login(email, password, encryptionKey, true);
      
      if (success) {
        navigate('/');
      } else {
        toast.error(t('login.loginFailed'), {
          description: t('login.loginFailedDesc'),
          duration: 4000,
        });
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      toast.error(t('login.loginError'), {
        description: t('login.loginErrorDesc'),
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
      
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">{t('app.name')}</h1>
          </div>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
            {t('app.version')}
          </span>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('login.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                {t('login.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  className="pl-10 bg-accent border-border text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t('login.password')}
                </Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {t('login.forgot')}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="pl-10 pr-10 bg-accent border-border text-foreground"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Local Encryption Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="encryption-key" className="text-sm font-medium text-foreground">
                    {t('login.encryptionKey')}
                  </Label>
                  <div className="group relative">
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
                      <div className="bg-popover border border-border rounded-lg p-3 text-xs text-muted-foreground whitespace-nowrap shadow-lg">
                        {t('login.encryptionKeyTooltip')}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  disabled={isGeneratingKey || isLoading}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingKey ? (
                    <>
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('login.generating')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>{t('login.generateKey')}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="encryption-key"
                  type={showKey ? 'text' : 'password'}
                  value={encryptionKey}
                  onChange={(e) => setEncryptionKey(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="pl-10 pr-10 bg-accent border-border text-foreground placeholder:text-muted-foreground font-mono"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Device MAC Address */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="mac-address" className="text-sm font-medium text-foreground">
                  {t('login.macAddress')}
                </Label>
                <div className="group relative">
                  <AlertCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50">
                    <div className="bg-popover border border-border rounded-lg p-3 text-xs text-muted-foreground whitespace-nowrap shadow-lg">
                      {t('login.macAddressTooltip')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="mac-address"
                  type="text"
                  value={isMacLoading ? t('login.detecting') : macAddress}
                  readOnly
                  className="pl-10 bg-accent/50 border-border text-foreground font-mono cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 rounded-lg shadow-lg shadow-primary/20 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('login.authenticating')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  <span>{t('login.unlockWorkspace')}</span>
                </div>
              )}
            </Button>
          </form>
        </div>

        {/* Security Info */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
            <span>{t('login.encryption')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span>{t('login.storage')}</span>
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}
