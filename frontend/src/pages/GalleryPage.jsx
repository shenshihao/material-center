import { useEffect, useState, useCallback } from 'react';
import { Upload, RefreshCw, Sparkles, Archive } from 'lucide-react';
import useMaterialStore from '../stores/materialStore';
import useCategoryStore from '../stores/categoryStore';
import MaterialGrid from '../components/material/MaterialGrid';
import SearchBar from '../components/common/SearchBar';
import BatchActionBar from '../components/common/BatchActionBar';
import DropZone from '../components/upload/DropZone';

export default function GalleryPage() {
  const { fetchMaterials, uploading, selected, pagination, filters } = useMaterialStore();
  const { activeId, tree } = useCategoryStore();
  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFiles, setDragFiles] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Global drag-over handler
  const handleWindowDragOver = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  }, []);
  const handleWindowDragLeave = useCallback((e) => {
    if (!e.relatedTarget) setIsDragOver(false);
  }, []);
  const handleWindowDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      setDragFiles(Array.from(e.dataTransfer.files));
      setShowUpload(true);
    }
  }, []);

  // Get current category label
  const getCategoryLabel = () => {
    if (filters.favorite === 1) return '我的收藏';
    if (activeId === null) return '全部素材';
    const flat = [];
    const walk = (nodes) => nodes.forEach(n => { flat.push(n); if (n.children) walk(n.children); });
    walk(tree);
    return flat.find(c => c.id === activeId)?.name || '素材';
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden relative"
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-surface/95 backdrop-blur-md border-4 border-dashed border-accent rounded-none flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <div className="relative">
            <Upload size={64} className="text-accent mb-6 animate-float" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-ping" />
          </div>
          <p className="text-accent text-2xl font-display font-semibold tracking-tight">松开上传文件</p>
          <p className="text-text-muted text-sm mt-2">支持图片、视频、文档等多种格式</p>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display font-semibold text-text-primary text-lg tracking-tight">
              {getCategoryLabel()}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-text-muted text-xs tabular-nums">
                {pagination.total} 项素材
              </span>
              {selected.size > 0 && (
                <span className="badge animate-scale-in">
                  已选 {selected.size}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SearchBar />

          <button
            onClick={fetchMaterials}
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-accent hover:bg-surface-hover rounded-xl transition-all duration-200"
            title="刷新"
          >
            <RefreshCw size={16} className="hover:animate-spin" />
          </button>

          <button
            onClick={() => { setDragFiles(null); setShowUpload(true); }}
            className="btn-primary flex items-center gap-2.5 px-5 h-10"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                <span>上传中...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>上传素材</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <MaterialGrid />

      {/* Batch action bar */}
      <BatchActionBar />

      {/* Upload modal */}
      {showUpload && (
        <DropZone
          initialFiles={dragFiles}
          onClose={() => { setShowUpload(false); setDragFiles(null); }}
        />
      )}
    </div>
  );
}
