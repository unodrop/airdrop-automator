import { useState } from 'react';
import {
  ExternalLink,
  Settings2,
  Plus,
  Play,
  Pause,
  Terminal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ScriptProject {
  id: string;
  name: string;
  logo: string;
  description: string;
  status: 'active' | 'inactive';
  website: string;
  category: string;
}

export function ScriptPage() {
  const navigate = useNavigate();

  // 脚本项目列表
  const [projects] = useState<ScriptProject[]>([
    {
      id: 'pharos',
      name: 'Pharos Testnet',
      logo: '💡',
      description: '自动化执行 Pharos 测试网任务',
      status: 'inactive',
      website: 'https://pharos.xyz',
      category: '自动化脚本'
    },
    // {
    //   id: 'yom',
    //   name: 'YOM',
    //   logo: '🪙',
    //   description: '自动化执行 YOM 相关任务',
    //   status: 'inactive',
    //   website: 'https://yom.io',
    //   category: '自动化脚本'
    // }
  ]);

  const handleToggleProject = (projectId: string) => {
    if (projectId === 'pharos') {
      navigate('/scripts/pharos');
      return;
    }
    console.log('Toggle project:', projectId);
  };

  const handleConfigProject = (projectId: string) => {
    console.log('Config project:', projectId);
    // TODO: 实现配置项目逻辑
  };

  const handleOpenWebsite = (website: string) => {
    window.open(website, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Terminal className="w-7 h-7 text-primary" />
              脚本
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              自动化脚本任务管理
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-all duration-200 cursor-pointer group"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{project.logo}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-xs text-gray-500">{project.category}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  project.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {project.status === 'active' ? '运行中' : '未启动'}
                </span>
              </div>

              {/* Project Description */}
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {project.description}
              </p>

              {/* Project Actions */}
              <div className="flex items-center gap-2">
                {project.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleProject(project.id)}
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Pause className="w-3.5 h-3.5 mr-1.5" />
                    停止
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleToggleProject(project.id)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    {project.id === 'pharos' ? '打开' : '启动'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleConfigProject(project.id)}
                  className="hover:bg-white/10"
                  title="配置"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenWebsite(project.website)}
                  className="hover:bg-white/10"
                  title="访问官网"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State - 如果将来支持用户添加项目 */}
        {projects.length === 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-12 text-center">
            <Terminal className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">暂无脚本</p>
            <p className="text-sm text-gray-500 mb-6">
              点击下方按钮添加您的第一个脚本
            </p>
            <Button
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加项目
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
