import { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, RefreshCw, Sparkles, Image, Film, FileText, File, X, Search, SlidersHorizontal, Check } from 'lucide-react';
import useMaterialStore from '../stores/materialStore';
import useCategoryStore from '../stores/categoryStore';
import MaterialGrid from '../components/material/MaterialGrid';
import DropZone from '../components/upload/DropZone';

const TYPE_FILTERS = [
  { value: 'all', label: '全部', icon: <Sparkles size={14} /> },
  { value: 'image', label: '图片', icon: <Image size={14} /> },
  { value: 'video', label: '视频', icon: <Film size={14} /> },
  { value: 'pdf', label: 'PDF', icon: <FileText size={14} /> },
  { value: 'doc', label: '文档', icon: <File size={14} /> },
];

const SORT_OPTIONS = [
  { value: 'name', label: '名称' },
  { value: 'created_at', label: '上传时间' },
  { value: 'file_size', label: '大小' },
];

export default function GalleryPage() {
  const { fetchMaterials, uploading, selected, pagination, filters, setFilter } = useMaterialStore();
  const { activeId, tree } = useCategoryStore();
  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFiles, setDragFiles] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchMaterials();
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

  // Search handler with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilter({ search: value });
    }, 300);
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
        <div className="absolute inset-0 z-50 bg-cosmic-void/95 backdrop-blur-xl border-4 border-dashed border-star/50 flex flex-col items-center justify-center animate-fade-in">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-star/20 to-nebula/20 border border-star/30 flex items-center justify-center backdrop-blur-sm animate-float">
              <Upload size={40} className="text-star" />
            </div>
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-3xl border-2 border-star/30 animate-ping" />
          </div>
          <p className="text-star text-2xl font-display font-semibold tracking-wide mb-2">松开上传文件</p>
          <p className="text-stardust-muted text-sm">支持图片、视频、文档等多种格式</p>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 bg-cosmic-deep/80 backdrop-blur-xl border-b border-cosmic-border/30 relative z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title section */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="font-display font-semibold text-stardust-primary text-lg tracking-wide">
                  {getCategoryLabel()}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-stardust-muted text-xs tabular-nums font-mono">
                    {pagination.total} 项素材
                  </span>
                  {selected.size > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-star/10 text-star text-xs font-medium animate-scale-in border border-star/20">
                      已选 {selected.size}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              {/* Search bar */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search size={14} className="text-stardust-muted group-focus-within:text-star transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="搜索素材..."
                  className="w-52 pl-9 pr-4 py-2.5 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-xs placeholder:text-stardust-muted/50 focus:outline-none focus:border-star/50 focus:bg-cosmic-dust/50 transition-all"
                />
                {searchValue && (
                  <button
                    onClick={() => { setSearchValue(''); setFilter({ search: '' }); }}
                    className="absolute inset-y-0 right-3 flex items-center"
                  >
                    <X size={12} className="text-stardust-muted hover:text-stardust-primary" />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all
                    ${showSortMenu ? 'bg-star/10 text-star border border-star/20' : 'bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50 hover:border-star/30 hover:text-stardust-primary'}`}
                >
                  <SlidersHorizontal size={14} />
                  <span>{SORT_OPTIONS.find(o => o.value === filters.sort)?.label || '排序'}</span>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-2 w-36 bg-cosmic-nebula border border-cosmic-border rounded-xl shadow-glass py-1.5 z-50 animate-scale-in">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilter({ sort: opt.value });
                          setShowSortMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors
                          ${filters.sort === opt.value ? 'text-star bg-star/10' : 'text-stardust-secondary hover:bg-cosmic-dust hover:text-stardust-primary'}`}
                      >
                        <span>{opt.label}</span>
                        {filters.sort === opt.value && <Check size={12} />}
                      </button>
                    ))}
                    <div className="border-t border-cosmic-border/50 my-1" />
                    <button
                      onClick={() => {
                        setFilter({ order: filters.order === 'desc' ? 'asc' : 'desc' });
                        setShowSortMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-stardust-muted hover:text-stardust-primary transition-colors"
                    >
                      <span>{filters.order === 'desc' ? '降序 ↓' : '升序 ↑'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-all ${showFilters ? 'bg-star/10 text-star border border-star/20' : 'bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50 hover:border-star/30'}`}
              >
                <SlidersHorizontal size={16} />
              </button>

              {/* Refresh */}
              <button
                onClick={fetchMaterials}
                className="p-2.5 rounded-xl bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50 hover:border-star/30 hover:text-star transition-all"
                title="刷新"
              >
                <RefreshCw size={16} className="hover:animate-spin" />
              </button>

              {/* Upload button */}
              <button
                onClick={() => { setDragFiles(null); setShowUpload(true); }}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-star to-nebula text-cosmic-void text-xs font-semibold shadow-star-sm hover:shadow-star transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-cosmic-void/30 border-t-cosmic-void rounded-full animate-spin" />
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>上传素材</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Type filter pills */}
          {showFilters && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-cosmic-border/30 animate-slide-up">
              {TYPE_FILTERS.map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setFilter({ type: filter.value })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all
                    ${filters.type === filter.value
                      ? 'bg-star/10 text-star border border-star/20 shadow-star-sm'
                      : 'bg-cosmic-dust/30 text-stardust-secondary border border-cosmic-border/50 hover:border-star/30 hover:text-stardust-primary'
                    }`}
                >
                  {filter.icon}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <MaterialGrid />

      {/* Upload modal */}
      {showUpload && (
        <DropZone
          initialFiles={dragFiles}
          onClose={() => { setShowUpload(false); setDragFiles(null); }}
        />
      )}

      {/* Click outside to close sort menu */}
      {showSortMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
      )}
    </div>
  );
}
