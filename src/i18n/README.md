# i18n 使用指南

## 快速开始

### 在组件中使用翻译

```typescript
import { useTranslation } from '@/i18n/I18nContext';

function MyComponent() {
  const t = useTranslation();
  
  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('login.subtitle')}</p>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

## 常用翻译键

### 应用信息
```typescript
t('app.name')           // Airdrop Automator
t('app.subtitle')       // 自动化执行器 / Automated Executor
t('app.version')        // v2.4.0 SECURE
```

### 通用按钮和操作
```typescript
t('common.loading')     // 加载中... / Loading...
t('common.save')        // 保存 / Save
t('common.cancel')      // 取消 / Cancel
t('common.delete')      // 删除 / Delete
t('common.edit')        // 编辑 / Edit
t('common.add')         // 添加 / Add
t('common.search')      // 搜索 / Search
t('common.refresh')     // 刷新 / Refresh
t('common.confirm')     // 确认 / Confirm
```

### 侧边栏导航
```typescript
t('sidebar.accounts')   // 账号管理 / Accounts
t('sidebar.registrator')// 注册机 / Account Generator
t('sidebar.scripts')      // 脚本 / Scripts
t('sidebar.settings')   // 系统设置 / Settings
t('sidebar.logout')     // 退出登录 / Logout
```

## 变量插值

### 基本用法

```typescript
// 翻译文件中
{
  greeting: 'Hello {{name}}!'
}

// 组件中
t('greeting', { name: 'World' })
// 输出: Hello World!
```

### 数字变量

```typescript
// 翻译文件中
{
  accounts: {
    totalAccounts: '共 {{count}} 个账户',
    filteredAccounts: '共 {{count}} 个账户 (从 {{total}} 个中筛选)'
  }
}

// 组件中
t('accounts.totalAccounts', { count: 10 })
// 输出 (中文): 共 10 个账户
// 输出 (英文): 10 account(s) total

t('accounts.filteredAccounts', { count: 5, total: 10 })
// 输出 (中文): 共 5 个账户 (从 10 个中筛选)
// 输出 (英文): 5 account(s) (filtered from 10)
```

## 模块组织

### 按功能模块组织

```typescript
// 登录模块
t('login.title')
t('login.username')
t('login.password')
t('login.unlockWorkspace')

// 账号模块
t('accounts.title')
t('accounts.search')
t('accounts.totalWallets')

// 社交账号模块
t('social.title')
t('social.platform')
t('social.username')
```

## 最佳实践

### 1. 使用语义化的键名

✅ **好的命名**
```typescript
t('login.submit')
t('accounts.noAccounts')
t('common.loading')
```

❌ **不好的命名**
```typescript
t('button1')
t('text')
t('msg')
```

### 2. 保持翻译键的一致性

所有语言文件应该有相同的键结构：

```typescript
// zh-CN.ts
{
  login: {
    title: '安全访问',
    subtitle: '自动化执行需要身份验证'
  }
}

// en-US.ts
{
  login: {
    title: 'Secure Access',
    subtitle: 'Authentication required for automated execution'
  }
}
```

### 3. 复用通用文本

对于常用的文本（如"保存"、"取消"、"删除"等），使用 `common.*` 模块：

```typescript
// 不要重复定义
t('login.save')
t('accounts.save')
t('settings.save')

// 而是使用通用的
t('common.save')
```

### 4. 使用有意义的分组

```typescript
// 按页面分组
login.*
accounts.*
social.*
proxy.*

// 按功能分组
sidebar.*
footer.*
common.*

// 按组件分组
importKey.*
editWallet.*
deleteConfirm.*
```

## 调试技巧

### 检查当前语言

```typescript
import { useI18n } from '@/i18n/I18nContext';

function MyComponent() {
  const { locale, t } = useI18n();
  
  console.log('Current locale:', locale); // 'zh-CN' or 'en-US'
  
  return <div>{t('app.name')}</div>;
}
```

### 处理缺失的翻译

如果翻译键不存在，`t()` 函数会：
1. 在控制台输出警告
2. 返回翻译键本身作为后备值

```typescript
t('non.existent.key')
// 控制台: Warning: Translation key "non.existent.key" not found
// 返回: "non.existent.key"
```

## 常见问题

### Q: 如何手动切换语言？

A: 当前系统设计为自动检测系统语言，不支持手动切换。如果需要此功能，可以在 `I18nContext` 中添加 `setLocale` 函数。

### Q: 支持哪些语言？

A: 目前支持：
- 简体中文 (`zh-CN`)
- 英文 (`en-US`)

### Q: 如何添加新语言？

A: 参考 `I18N_SYSTEM.md` 中的"扩展指南"部分。

### Q: 变量插值支持什么类型？

A: 支持字符串和数字类型。所有变量都会被转换为字符串。

```typescript
t('message', { 
  text: 'hello',    // 字符串
  count: 42,        // 数字
  enabled: true     // 布尔值会转为 "true"
})
```

## 完整示例

```typescript
import { useState } from 'react';
import { useTranslation } from '@/i18n/I18n Context';
import { Button } from '@/components/ui/button';

function AccountList() {
  const t = useTranslation();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div>
      {/* 标题 */}
      <h1>{t('accounts.title')}</h1>
      
      {/* 搜索框 */}
      <input 
        placeholder={t('accounts.search')} 
        type="search"
      />
      
      {/* 加载状态 */}
      {isLoading && <p>{t('common.loading')}</p>}
      
      {/* 空状态 */}
      {!isLoading && accounts.length === 0 && (
        <div>
          <p>{t('accounts.noAccounts')}</p>
          <p>{t('accounts.noAccountsDesc')}</p>
        </div>
      )}
      
      {/* 统计信息 */}
      {accounts.length > 0 && (
        <p>{t('accounts.totalAccounts', { count: accounts.length })}</p>
      )}
      
      {/* 操作按钮 */}
      <div>
        <Button>{t('common.add')}</Button>
        <Button>{t('common.refresh')}</Button>
        <Button>{t('common.delete')}</Button>
      </div>
    </div>
  );
}
```

## 参考资源

- 完整文档：`I18N_SYSTEM.md`
- 翻译文件：`src/i18n/locales/`
- 配置文件：`src/i18n/config.ts`
- Context：`src/i18n/I18nContext.tsx`
