import { useState } from 'react';
import { Mail, Play, Pause, Plus, Trash2, CheckCircle2, Clock, Activity } from 'lucide-react';
import { useTranslation } from '@/i18n/I18nContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface EmailTask {
  id: string;
  name: string;
  provider: string; // Gmail, Outlook, etc.
  count: number;
  created: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
  created_at: string;
}

export function EmailRegistratorPage() {
  const t = useTranslation();
  const [tasks, setTasks] = useState<EmailTask[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    provider: 'gmail',
    count: 10,
  });

  const handleCreateTask = () => {
    if (!newTask.name || newTask.count < 1) {
      toast.error('请填写完整信息');
      return;
    }

    const task: EmailTask = {
      id: Date.now().toString(),
      name: newTask.name,
      provider: newTask.provider,
      count: newTask.count,
      created: 0,
      status: 'idle',
      created_at: new Date().toISOString(),
    };

    setTasks([...tasks, task]);
    setShowCreateDialog(false);
    setNewTask({ name: '', provider: 'gmail', count: 10 });
    toast.success(t('registrator.taskCreated'));
  };

  const handleStartTask = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'running' as const } : t
    ));
    toast.success(t('registrator.taskStarted'));
  };

  const handlePauseTask = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: 'paused' as const } : t
    ));
    toast.success(t('registrator.taskPaused'));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    toast.success(t('registrator.taskDeleted'));
  };

  const getStatusIcon = (status: EmailTask['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4 text-green-500 animate-pulse" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: EmailTask['status']) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'paused':
        return t('registrator.paused');
      case 'completed':
        return t('registrator.completed');
      default:
        return t('registrator.pending');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Mail className="w-7 h-7 text-primary" />
              {t('registrator.emailTitle')}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {t('registrator.emailSubtitle')}
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('registrator.createTask')}
          </Button>
        </div>

        {/* Tasks List */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t('registrator.taskList')}
            </h2>
          </div>

          {tasks.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">{t('registrator.noTasks')}</p>
              <p className="text-sm text-gray-500 mb-6">
                {t('registrator.noTasksDesc')}
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="outline"
                className="border-primary/50 text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('registrator.createFirstTask')}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Task Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getStatusIcon(task.status)}
                        </div>
                        <div>
                          <h3 className="text-base font-medium text-white">
                            {task.name}
                          </h3>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <span className="capitalize">{task.provider}</span>
                            <span>·</span>
                            <span>{t('registrator.target')}: {task.count} {t('common.count')}</span>
                            <span>·</span>
                            <span>{t('registrator.created')}: {task.created} {t('common.count')}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(task.created_at).toLocaleString()}
                        </span>
                        <span className={`flex items-center gap-1.5 ${
                          task.status === 'running' ? 'text-green-400' :
                          task.status === 'paused' ? 'text-yellow-400' :
                          task.status === 'completed' ? 'text-primary' :
                          'text-gray-500'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {getStatusText(task.status)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-300"
                            style={{ width: `${(task.created / task.count) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-[3rem] text-right">
                          {Math.round((task.created / task.count) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      {task.status === 'running' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseTask(task.id)}
                          className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <Pause className="w-4 h-4 mr-1.5" />
                          {t('registrator.pause')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStartTask(task.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={task.status === 'completed'}
                        >
                          <Play className="w-4 h-4 mr-1.5" />
                          {task.status === 'paused' ? t('registrator.continue') : '启动'}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTask(task.id)}
                        className="hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#0f1f0f] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              {t('registrator.createTask')}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('registrator.emailSubtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Name */}
            <div className="space-y-2">
              <Label htmlFor="task-name" className="text-gray-300">
                {t('registrator.taskName')}
              </Label>
              <Input
                id="task-name"
                placeholder={t('registrator.taskNamePlaceholder')}
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Email Provider */}
            <div className="space-y-2">
              <Label htmlFor="provider" className="text-gray-300">
                {t('registrator.emailProvider')}
              </Label>
              <Select
                value={newTask.provider}
                onValueChange={(value) => setNewTask({ ...newTask, provider: value })}
              >
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1f0f] border-white/10">
                  <SelectItem value="gmail">{t('registrator.gmail')}</SelectItem>
                  <SelectItem value="outlook">{t('registrator.outlook')}</SelectItem>
                  <SelectItem value="yahoo">{t('registrator.yahoo')}</SelectItem>
                  <SelectItem value="protonmail">{t('registrator.protonmail')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Count */}
            <div className="space-y-2">
              <Label htmlFor="count" className="text-gray-300">
                {t('registrator.registerCount')}
              </Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="1000"
                value={newTask.count}
                onChange={(e) => setNewTask({ ...newTask, count: parseInt(e.target.value) || 0 })}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-white/10 text-gray-300 hover:bg-white/5"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateTask}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {t('registrator.createTask')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
