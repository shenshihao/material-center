import { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle, FileImage, Film, FileText, File, Loader2, Plus, ChevronDown, Sparkles, Check } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';
import useCategoryStore from '../../stores/categoryStore';

function getFileIcon(file) {
  const type = file.type || '';
  if (type.startsWith('image/')) return <FileImage size={18} className="text-star" />;
  if (type.startsWith('video/')) return <Film size={18} className="text-nebula" />;
  if (type.includes('pdf')) return <FileText size={18} className="text-red-400" />;
  if (type.includes('word') || type.includes('document')) return <FileText size={18} className="text-blue-400" />;
  return <File size={18} className="text-stardust-muted" />;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024). toFixed(1) + ' MB';
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
      <div className={`px-5 py-3.5 rounded-2xl shadow-glass backdrop-blur-xl border flex items-center gap-3
        ${type === 'success' ? 'bg-star/10 border-star/30 text-star' : 'bg-nebula/10 border-nebula/30 text-nebula'}`}>
        {type === 'success' ? <CheckCircle size={18} /> : <Sparkles size={18} />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

export default function DropZone({ onClose, initialFiles }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState(initialFiles || []);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const { tree, fetchCategories, createCategory } = useCategoryStore();
  const { uploading, uploadProgress, uploadFiles, aiAnalyzing } = useMaterialStore();
  const inputRef = useRef();
  const dropdownRef = useRef();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addFiles = (newFiles) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const unique = Array.from(newFiles).filter(f => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      await createCategory({ name: newCategoryName.trim(), color: '#00f5d4' });
      setNewCategoryName('');
      await fetchCategories();
      setToastMessage('分类创建成功！');
      setShowToast(true);
    } catch (err) {
      setError('创建分类失败');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    setError('');
    try {
      const response = await uploadFiles(files, selectedCategoryId);
      // Check if AI tags were generated
      const aiTagCount = response?.data?.reduce((count, m) => count + (m.aiTags?.length || 0), 0) || 0;
      const message = aiTagCount > 0
        ? `成功上传 ${files.length} 个文件，AI 自动生成 ${aiTagCount} 个标签！`
        : `成功上传 ${files.length} 个文件！`;
      setToastMessage(message);
      setShowToast(true);
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err.message || '上传失败');
    }
  };

  const flattenCategories = (nodes, depth = 0) => {
    let result = [];
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (node.children?.length) {
        result = result.concat(flattenCategories(node.children, depth + 1));
      }
    }
    return result;
  };

  const flatTree = flattenCategories(tree);

  return (
    <>
      {showToast && <Toast message={toastMessage} onClose={() => setShowToast(false)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-void/90 backdrop-blur-2xl animate-fade-in">
        {/* Animated background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-star/5 blur-3xl animate-drift" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-nebula/5 blur-3xl animate-drift" style={{ animationDelay: '-8s' }} />
        </div>

        <div className="relative w-full max-w-xl mx-4 bg-cosmic-deep border border-cosmic-border/50 rounded-3xl shadow-glass overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-5 border-b border-cosmic-border/30">
            {/* Glowing accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-star/50 to-transparent" />

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-star/20 to-nebula/20 border border-star/20 flex items-center justify-center">
                <Upload size={20} className="text-star" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-stardust-primary">上传素材</h2>
                <p className="text-stardust-muted text-xs mt-0.5">支持批量上传多种文件格式</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-stardust-muted hover:text-stardust-primary hover:bg-cosmic-dust rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Drop area */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden
                ${isDragging
                  ? 'border-star bg-star/5 scale-[1.01]'
                  : 'border-cosmic-border/50 hover:border-cosmic-border hover:bg-cosmic-dust/20'
                }`}
            >
              {/* Animated background when dragging */}
              {isDragging && (
                <div className="absolute inset-0 bg-gradient-to-br from-star/10 via-transparent to-nebula/10" />
              )}

              <div className="relative">
                <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300
                  ${isDragging ? 'bg-star/20 scale-110 shadow-star-sm' : 'bg-cosmic-dust/50'}`}>
                  <Upload size={26} className={isDragging ? 'text-star' : 'text-stardust-muted'} />
                </div>
                <p className="text-stardust-primary text-sm font-medium mb-1.5">
                  {isDragging ? '松开以上传文件' : '拖拽文件到此处'}
                </p>
                <p className="text-stardust-muted text-xs">
                  或点击选择文件 · 支持图片、视频、文档等
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-stardust-secondary text-xs font-medium">选择分类</label>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={dropdownRef}>
                  <button
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-secondary text-sm hover:border-star/30 transition-all"
                  >
                    <span>{selectedCategoryId === null ? '选择已有分类...' : flatTree.find(c => c.id === selectedCategoryId)?.name || '选择分类'}</span>
                    <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-cosmic-nebula border border-cosmic-border rounded-xl shadow-glass py-2 z-50 max-h-48 overflow-y-auto animate-scale-in">
                      <button
                        onClick={() => { setSelectedCategoryId(null); setShowCategoryDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2
                          ${selectedCategoryId === null ? 'text-star bg-star/10' : 'text-stardust-secondary hover:bg-cosmic-dust'}`}
                      >
                        <span>不选择分类</span>
                        {selectedCategoryId === null && <Check size={12} className="ml-auto" />}
                      </button>
                      {flatTree.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => { setSelectedCategoryId(cat.id); setShowCategoryDropdown(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2
                            ${selectedCategoryId === cat.id ? 'text-star bg-star/10' : 'text-stardust-secondary hover:bg-cosmic-dust'}
                            ${cat.depth > 0 ? 'ml-4' : ''}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: cat.color || '#00f5d4' }}
                          />
                          <span>{cat.name}</span>
                          {selectedCategoryId === cat.id && <Check size={12} className="ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-px bg-cosmic-border/50" />

                {/* New category input */}
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="新建分类名称"
                    className="flex-1 px-4 py-3 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-sm placeholder:text-stardust-muted/50 focus:outline-none focus:border-star/50 transition-all"
                  />
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || isCreatingCategory}
                    className="px-4 py-3 rounded-xl bg-star/10 border border-star/20 text-star text-xs font-medium hover:bg-star/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  >
                    {isCreatingCategory ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>创建</span>
                  </button>
                </div>
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-stardust-muted text-xs font-mono">
                    已选择 {files.length} 个文件
                  </span>
                  <button
                    onClick={() => setFiles([])}
                    className="text-stardust-muted hover:text-nebula text-xs transition-colors"
                  >
                    清空全部
                  </button>
                </div>

                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 bg-cosmic-dust/20 rounded-xl border border-cosmic-border/30 group"
                  >
                    <div className="w-9 h-9 bg-cosmic-nebula/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getFileIcon(f)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-stardust-primary text-xs truncate font-medium">{f.name}</p>
                      <p className="text-stardust-muted text-[10px] mt-0.5 font-mono">{formatSize(f.size)}</p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                        className="w-7 h-7 flex items-center justify-center text-stardust-muted hover:text-nebula hover:bg-nebula/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stardust-secondary flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-star" />
                    上传中...
                  </span>
                  <span className="text-stardust-muted tabular-nums font-mono">{uploadProgress.total || 0}%</span>
                </div>
                <div className="h-2 bg-cosmic-dust rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-star to-nebula rounded-full transition-all duration-300 shadow-star-sm"
                    style={{ width: `${uploadProgress.total || 0}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 bg-nebula/10 border border-nebula/20 rounded-xl">
                <p className="text-nebula text-xs">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-cosmic-border/30 bg-cosmic-nebula/30">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-stardust-secondary text-xs font-medium hover:bg-cosmic-dust transition-all border border-cosmic-border/30"
              disabled={uploading}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!files.length || uploading}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-star to-nebula text-cosmic-void text-xs font-semibold shadow-star-sm hover:shadow-star transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>上传中...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>开始上传 {files.length > 0 ? `(${files.length})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
