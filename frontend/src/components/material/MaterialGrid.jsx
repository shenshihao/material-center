import { useState, useCallback } from 'react';
import { Loader2, ImageOff, Download, CheckSquare, Square, Layers } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';
import MaterialCard from './MaterialCard';
import LightboxViewer from './LightboxViewer';

export default function MaterialGrid() {
  const { items, loading, pagination, setPage, selected, selectAll } = useMaterialStore();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lastSelected, setLastSelected] = useState(null);

  const allSelected = items.length > 0 && selected.size === items.length;

  const handleDownloadAll = async () => {
    try {
      const ids = items.map(m => m.id);
      const res = await fetch('/api/v1/materials/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'download' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`下载失败: ${err.error?.message || err.message}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `素材_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`下载失败: ${err.message}`);
    }
  };

  const imageItems = items.filter(m => m.mime_type?.startsWith('image/'));

  const handleOpen = useCallback((material) => {
    if (material.mime_type?.startsWith('image/')) {
      const idx = imageItems.findIndex(m => m.id === material.id);
      setLightboxIndex(idx >= 0 ? idx : null);
    } else {
      window.open(`/files/${material.file_path}`, '_blank');
    }
  }, [imageItems]);

  if (loading && !items.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          <Loader2 size={40} className="text-accent animate-spin" />
          <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl animate-pulse" />
        </div>
        <p className="text-text-muted text-sm mt-4">加载素材中...</p>
      </div>
    );
  }

  if (!loading && !items.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 animate-fade-in">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-surface-elevated border border-surface-border flex items-center justify-center">
            <ImageOff size={36} className="text-text-muted/40" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Layers size={14} className="text-accent/60" />
          </div>
        </div>
        <h3 className="text-text-primary text-lg font-display font-medium mb-2">暂无素材</h3>
        <p className="text-text-muted text-sm max-w-sm">
          拖拽文件到此处或点击上方"上传素材"按钮开始添加你的第一个素材
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header toolbar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={selectAll}
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface-card border border-surface-border/50 rounded-xl hover:bg-surface-hover hover:border-surface-border transition-all"
        >
          {allSelected
            ? <CheckSquare size={15} className="text-accent" />
            : <Square size={15} />
          }
          <span>{allSelected ? '取消全选' : '全选'}</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs tabular-nums">
            共 {pagination.total} 项 · 第 {pagination.page}/{totalPages} 页
          </span>
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text-primary bg-surface-card border border-surface-border/50 rounded-xl hover:bg-surface-hover hover:border-surface-border transition-all"
          >
            <Download size={15} />
            <span>下载全部</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading && items.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-text-muted text-sm">
            <Loader2 size={14} className="animate-spin" />
            <span>加载中...</span>
          </div>
        )}

        <div className="grid gap-4 animate-stagger" style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        }}>
          {items.map(material => (
            <MaterialCard
              key={material.id}
              material={material}
              onOpen={handleOpen}
              lastSelected={lastSelected}
              setLastSelected={setLastSelected}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 pb-6">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
              className="px-4 py-2 text-sm bg-surface-card border border-surface-border/50 rounded-xl
                text-text-secondary hover:text-text-primary hover:bg-surface-hover
                disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              上一页
            </button>

            <div className="flex items-center gap-1 px-3">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                      ${pagination.page === pageNum
                        ? 'bg-accent text-surface shadow-glow-sm'
                        : 'text-text-secondary hover:bg-surface-hover'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              disabled={pagination.page >= totalPages}
              onClick={() => setPage(pagination.page + 1)}
              className="px-4 py-2 text-sm bg-surface-card border border-surface-border/50 rounded-xl
                text-text-secondary hover:text-text-primary hover:bg-surface-hover
                disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <LightboxViewer
          images={imageItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
