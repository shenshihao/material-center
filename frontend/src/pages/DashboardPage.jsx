import { useEffect, useState } from 'react';
import { Image, Video, FileText, File, Database, Heart, FolderOpen, TrendingUp, Clock, ArrowUpRight } from 'lucide-react';
import client from '../api/client';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

const TYPE_CONFIG = {
  image: { icon: Image, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: '图片' },
  video: { icon: Video, color: 'text-violet-400', bg: 'bg-violet-500/10', label: '视频' },
  pdf:   { icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10', label: 'PDF' },
  doc:   { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '文档' },
  other: { icon: File, color: 'text-zinc-400', bg: 'bg-zinc-500/10', label: '其他' },
};

const STAT_CONFIG = [
  { key: 'total_count', label: '总素材数', icon: Database, color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'total_size', label: '总存储空间', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', format: 'size' },
  { key: 'favorites_count', label: '收藏素材', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { key: 'uncategorized_count', label: '未分类素材', icon: FolderOpen, color: 'text-amber-400', bg: 'bg-amber-500/10' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/stats').then(r => {
      setStats(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          <Database size={40} className="text-accent animate-pulse" />
        </div>
        <p className="text-text-muted text-sm mt-4">加载统计数据...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-text-muted">加载失败</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-5 border-b border-surface-border bg-surface-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-text-primary text-lg">统计概览</h1>
            <p className="text-text-muted text-xs mt-0.5">素材管理数据分析</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
          {STAT_CONFIG.map(stat => {
            const Icon = stat.icon;
            const value = stat.format === 'size' ? formatSize(stats[stat.key]) : stats[stat.key];
            return (
              <div key={stat.key} className="card-elevated p-5 rounded-2xl border border-surface-border/50 group hover:border-surface-border transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon size={18} className={stat.color} />
                  </div>
                  <ArrowUpRight size={16} className="text-text-muted/30 group-hover:text-accent/50 transition-colors" />
                </div>
                <p className="text-text-muted text-xs font-medium tracking-wide mb-1">{stat.label}</p>
                <p className={`text-2xl font-display font-bold ${stat.color}`}>{value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* By type */}
          {stats.by_type?.length > 0 && (
            <div className="card-elevated p-6 rounded-2xl border border-surface-border/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center">
                  <Image size={16} className="text-text-muted" />
                </div>
                <h2 className="font-display font-semibold text-text-primary">文件类型分布</h2>
              </div>

              <div className="space-y-4">
                {stats.by_type.map(t => {
                  const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.other;
                  const Icon = config.icon;
                  const pct = stats.total_count > 0 ? Math.round((t.count / stats.total_count) * 100) : 0;
                  return (
                    <div key={t.type} className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={16} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-text-secondary text-sm font-medium">{config.label}</span>
                          <span className="text-text-muted text-xs tabular-nums">{t.count} 项 · {formatSize(t.size)}</span>
                        </div>
                        <div className="h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${config.bg.replace('bg-', 'bg-').replace('/10', '/30')}`}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: config.color.replace('text-', '').includes('cyan') ? '#22d3ee' :
                                config.color.replace('text-', '').includes('violet') ? '#a78bfa' :
                                  config.color.replace('text-', '').includes('red') ? '#f87171' :
                                    config.color.replace('text-', '').includes('blue') ? '#60a5fa' : '#a1a1aa'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* By category */}
          {stats.by_category?.length > 0 && (
            <div className="card-elevated p-6 rounded-2xl border border-surface-border/50">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center">
                  <FolderOpen size={16} className="text-text-muted" />
                </div>
                <h2 className="font-display font-semibold text-text-primary">分类统计 TOP 10</h2>
              </div>

              <div className="space-y-3">
                {stats.by_category.slice(0, 10).map((c, i) => {
                  const pct = stats.total_count > 0 ? Math.round((c.count / stats.total_count) * 100) : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center flex-shrink-0 text-text-muted text-xs font-mono">
                        {i + 1}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: c.color || '#f59e0b' }}
                      />
                      <span className="text-text-secondary text-sm truncate flex-1">{c.name}</span>
                      <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden flex-shrink-0">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: c.color || '#f59e0b' }}
                        />
                      </div>
                      <span className="text-text-muted text-xs tabular-nums w-8 text-right flex-shrink-0">{c.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent uploads */}
        {stats.recent_uploads?.length > 0 && (
          <div className="card-elevated p-6 rounded-2xl border border-surface-border/50">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center">
                <Clock size={16} className="text-text-muted" />
              </div>
              <h2 className="font-display font-semibold text-text-primary">最近上传</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recent_uploads.map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-hover/50 border border-surface-border/30 hover:bg-surface-hover transition-colors"
                >
                  <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-surface">
                    {m.mime_type?.startsWith('image/') ? (
                      <img
                        src={`/files/originals/${m.id}`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <File size={16} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm truncate font-medium">{m.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-text-muted text-xs">{formatSize(m.file_size)}</span>
                      <span className="text-text-muted/30">·</span>
                      <span className="text-text-muted text-xs">{m.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
