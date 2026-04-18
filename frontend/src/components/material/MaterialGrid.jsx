import { useState, useCallback, useMemo } from 'react';
import { Loader2, ImageOff, Download, CheckSquare, Square, Layers, Sparkles, Grid2X2, List, BookOpen } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';
import MaterialCard from './MaterialCard';
import LightboxViewer from './LightboxViewer';
import ListCard from './ListCard';
import StoryCard from './StoryCard';

// Simple masonry layout using CSS columns
export default function MaterialGrid() {
  const { items, loading, pagination, setPage, selected, selectAll } = useMaterialStore();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [lastSelected, setLastSelected] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'story'

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
        <div className="relative mb-6">
          <Loader2 size={48} className="text-star animate-spin" />
          <div className="absolute inset-0 bg-star/20 rounded-full blur-2xl animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-stardust-muted">
          <Sparkles size={16} className="text-star animate-pulse" />
          <span className="text-sm">正在连接星河...</span>
        </div>
      </div>
    );
  }

  if (!loading && !items.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 animate-fade-in">
        <div className="relative mb-8">
          {/* Glow effect behind icon */}
          <div className="absolute inset-0 bg-star/10 rounded-full blur-2xl scale-150" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-cosmic-dust to-cosmic-nebula border border-cosmic-border/50 flex items-center justify-center">
            <ImageOff size={36} className="text-stardust-muted/40" />
          </div>
          {/* Floating sparkles */}
          <div className="absolute -top-2 -right-2 w-4 h-4">
            <Sparkles size={14} className="text-star/60 animate-twinkle" />
          </div>
          <div className="absolute -bottom-1 -left-3 w-3 h-3">
            <Sparkles size={10} className="text-nebula/60 animate-twinkle" style={{ animationDelay: '1s' }} />
          </div>
        </div>
        <h3 className="text-stardust-primary text-xl font-display font-medium mb-3 tracking-wide">星河流淌之处</h3>
        <p className="text-stardust-muted text-sm max-w-sm leading-relaxed">
          暂无素材静静漂浮，拖拽文件到此处或点击上方"上传素材"按钮，开始收集你的第一颗星辰
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
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl transition-all border
            ${allSelected
              ? 'bg-star/10 text-star border-star/20 hover:bg-star/15'
              : 'bg-cosmic-dust/30 text-stardust-secondary border-cosmic-border/50 hover:bg-cosmic-dust/50 hover:border-star/30'
            }`}
        >
          {allSelected
            ? <CheckSquare size={15} className="text-star" />
            : <Square size={15} />
          }
          <span>{allSelected ? '取消全选' : '全选'}</span>
        </button>

        <div className="flex items-center gap-4">
          <span className="text-stardust-muted/70 text-xs tabular-nums font-mono">
            共 {pagination.total} 项 · 第 {pagination.page}/{totalPages} 页
          </span>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50">
            <button
              onClick={() => setViewMode('grid')}
              title="网格视图"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-star/10 text-star shadow-star-sm' : 'text-stardust-muted hover:text-stardust-secondary'}`}
            >
              <Grid2X2 size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="列表视图"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-star/10 text-star shadow-star-sm' : 'text-stardust-muted hover:text-stardust-secondary'}`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('story')}
              title="故事视图"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'story' ? 'bg-star/10 text-star shadow-star-sm' : 'text-stardust-muted hover:text-stardust-secondary'}`}
            >
              <BookOpen size={14} />
            </button>
          </div>
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50 hover:bg-cosmic-dust/50 hover:border-star/30 hover:text-star transition-all"
          >
            <Download size={14} />
            <span>下载全部</span>
          </button>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading && items.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-stardust-muted text-xs">
            <Loader2 size={12} className="animate-spin text-star" />
            <span>加载中...</span>
          </div>
        )}

        {/* CSS Masonry using columns */}
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 space-y-4">
          {items.map((material, index) => (
            <div
              key={material.id}
              className="break-inside-avoid animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            >
              <MaterialCard
                material={material}
                onOpen={handleOpen}
                lastSelected={lastSelected}
                setLastSelected={setLastSelected}
              />
            </div>
          ))}
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="flex flex-col gap-2">
            {items.map((material, index) => (
              <ListCard
                key={material.id}
                material={material}
                onOpen={handleOpen}
                lastSelected={lastSelected}
                setLastSelected={setLastSelected}
                style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
              />
            ))}
          </div>
        )}

        {/* Story View */}
        {viewMode === 'story' && (
          <div className="flex flex-col gap-6">
            {items
              .filter(m => m.mime_type?.startsWith('image/'))
              .map((material, index) => (
                <StoryCard
                  key={material.id}
                  material={material}
                  onOpen={handleOpen}
                  style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                />
              ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pb-6">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50
                hover:bg-cosmic-dust/50 hover:border-star/30 hover:text-star
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-cosmic-border/50 disabled:hover:text-stardust-secondary transition-all"
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
                    className={`w-9 h-9 rounded-lg text-xs font-mono font-medium transition-all
                      ${pagination.page === pageNum
                        ? 'bg-star/10 text-star border border-star/20 shadow-star-sm'
                        : 'text-stardust-secondary hover:bg-cosmic-dust/50 hover:border-star/30'
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
              className="px-4 py-2 text-xs font-medium rounded-xl bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50
                hover:bg-cosmic-dust/50 hover:border-star/30 hover:text-star
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-cosmic-border/50 disabled:hover:text-stardust-secondary transition-all"
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
