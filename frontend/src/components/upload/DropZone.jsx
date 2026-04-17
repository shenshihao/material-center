import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, FileImage, Film, FileText, File, Loader2 } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';
import useCategoryStore from '../../stores/categoryStore';

function getFileIcon(file) {
  const type = file.type || '';
  if (type.startsWith('image/')) return <FileImage size={18} className="text-cyan-400" />;
  if (type.startsWith('video/')) return <Film size={18} className="text-violet-400" />;
  if (type.includes('pdf')) return <FileText size={18} className="text-red-400" />;
  if (type.includes('word') || type.includes('document')) return <FileText size={18} className="text-blue-400" />;
  return <File size={18} className="text-zinc-400" />;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function DropZone({ onClose, initialFiles }) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState(initialFiles || []);
  const [error, setError] = useState('');
  const { activeId } = useCategoryStore();
  const { uploading, uploadProgress, uploadFiles } = useMaterialStore();
  const inputRef = useRef();

  const addFiles = (newFiles) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const unique = Array.from(newFiles).filter(f => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    setError('');
    try {
      await uploadFiles(files, activeId);
      onClose?.();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg mx-4 bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Upload size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-text-primary">上传素材</h2>
              <p className="text-text-muted text-xs mt-0.5">支持批量上传多种文件格式</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop area */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden
              ${isDragging
                ? 'border-accent bg-accent/10 scale-[1.02]'
                : 'border-surface-muted hover:border-surface-muted hover:bg-surface-hover'
              }`}
          >
            {/* Background gradient when dragging */}
            {isDragging && (
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5" />
            )}

            <div className="relative">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300
                ${isDragging ? 'bg-accent/20 scale-110' : 'bg-surface-hover'}`}>
                <Upload size={28} className={isDragging ? 'text-accent' : 'text-text-muted'} />
              </div>
              <p className="text-text-primary text-sm font-medium mb-1">
                {isDragging ? '松开以上传文件' : '拖拽文件到此处'}
              </p>
              <p className="text-text-muted text-xs">
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

          {/* File list */}
          {files.length > 0 && (
            <div className="max-h-56 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-text-muted text-xs font-medium">
                  已选择 {files.length} 个文件
                </span>
                <button
                  onClick={() => setFiles([])}
                  className="text-text-muted hover:text-red-400 text-xs transition-colors"
                >
                  清空全部
                </button>
              </div>

              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 bg-surface-elevated rounded-xl border border-surface-border/50 group"
                >
                  <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(f)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm truncate font-medium">{f.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">{formatSize(f.size)}</p>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="w-7 h-7 flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  上传中...
                </span>
                <span className="text-text-muted tabular-nums">{uploadProgress.total || 0}%</span>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-300 shadow-glow-sm"
                  style={{ width: `${uploadProgress.total || 0}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-surface-border bg-surface-elevated/50">
          <button
            onClick={onClose}
            className="btn-ghost px-5"
            disabled={uploading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!files.length || uploading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 px-6"
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>上传中...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>开始上传 {files.length > 0 ? `(${files.length})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
