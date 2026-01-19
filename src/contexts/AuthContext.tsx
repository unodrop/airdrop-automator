import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string, encryptionKey: string, remember: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 检查本地存储的认证状态
  useEffect(() => {
    const checkStoredAuth = () => {
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          // 检查会话是否有效（可以添加过期时间检查）
          if (session.authenticated && session.timestamp) {
            const now = Date.now();
            const sessionAge = now - session.timestamp;
            // 会话有效期：24小时
            if (sessionAge < 24 * 60 * 60 * 1000) {
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem('auth_session');
            }
          }
        } catch (e) {
          localStorage.removeItem('auth_session');
        }
      }
      setIsLoading(false);
    };

    checkStoredAuth();
  }, []);

  const login = async (
    username: string,
    password: string,
    encryptionKey: string,
    remember: boolean
  ): Promise<boolean> => {
    try {
      // TODO: 调用后端验证
      // const { invoke } = await import('@tauri-apps/api/core');
      // const result = await invoke('authenticate', { username, password, encryptionKey });

      // 模拟验证（实际应该调用后端）
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 简单验证（实际应该是加密验证）
      const isValid = username.length > 0 && password.length > 0 && encryptionKey.length > 0;

      if (isValid) {
        setIsAuthenticated(true);

        // 如果选择记住会话，保存到 localStorage
        if (remember) {
          const session = {
            authenticated: true,
            timestamp: Date.now(),
            username: username,
          };
          localStorage.setItem('auth_session', JSON.stringify(session));
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth_session');
    
    // 注意：不删除保存的凭据，以便下次自动填充
    // 如果用户想清除凭据，应该提供单独的"忘记密码"功能
  };

  const checkAuth = () => {
    return isAuthenticated;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
