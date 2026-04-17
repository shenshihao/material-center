import { useState } from 'react';
import { Heart, Trash2, CheckCircle2, Circle, FileText, Film, FileImage, File, Archive, Download, Eye } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';

const FILE_ICONS = {
  image: <FileImage size={28} className="text-cyan-400" />,
  video: <Film size={28} className="text-violet-400" />,
  pdf:   <FileText size={28} className="text-red-400" />,
  doc:   <FileText size={28} className="text-blue-400" />,
  excel: <FileText size={28} className="text-emerald-400" />,
  ppt:   <FileText size={28} className="text-orange-400" />,
  text:  <FileText size={28} className="text-zinc-400" />,
  zip:   <Archive size={28} className="text-amber-400" />,
  other: <File size={28} className="text-zinc-500" />,
};

function getMimeCategory(mime) {
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'excel';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return 'ppt';
  if (mime.startsWith('text/')) return 'text';
  if (mime.includes('zip')) return 'zip';
  return 'other';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function MaterialCard({ material, onOpen, lastSelected, setLastSelected }) {
  const { selected, toggleSelect, updateMaterial, deleteMaterial } = useMaterialStore();
  const isSelected = selected.has(material.id);
  const isImage = getMimeCategory(material.mime_type) === 'image';
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || selected.size > 0) {
      toggleSelect(material.id, e.shiftKey, lastSelected);
      setLastSelected(material.id);
    } else {
      onOpen(material);
    }
  };

  const handleCheckbox = (e) => {
    e.stopPropagation();
    toggleSelect(material.id, e.shiftKey, lastSelected);
    setLastSelected(material.id);
  };

  const handleFavorite = async (e) => {
    e.stopPropagation();
    await updateMaterial(material.id, { is_favorite: material.is_favorite ? 0 : 1 });
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (confirm(`确认删除「${material.name}」？此操作不可恢复。`)) {
      await deleteMaterial(material.id);
    }
  };

  const fileExt = material.original_name?.split('.').pop()?.slice(0, 5).toUpperCase() || '';
  const mimeCategory = getMimeCategory(material.mime_type);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300
        ${isSelected
          ? 'border-accent/50 ring-2 ring-accent/20 bg-accent/5 shadow-glow-sm'
          : 'border-surface-border bg-surface-card hover:border-surface-muted'
        }`}
      style={{
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* Image or icon container */}
      <div className="aspect-square bg-gradient-to-br from-surface to-surface-card flex items-center justify-center overflow-hidden relative">
        {isImage && !imgError ? (
          <img
            src={`/files/${material.file_path}`}
            alt={material.name}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${isImage ? 'from-cyan-500/20' : 'from-surface-hover'} to-surface border border-surface-border`}>
              {FILE_ICONS[mimeCategory] || FILE_ICONS.other}
            </div>
            <span className="text-text-muted/60 text-xs font-mono font-medium tracking-wider">
              {fileExt}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Selection checkbox */}
        <button
          onClick={handleCheckbox}
          className={`absolute top-3 left-3 z-20 transition-all duration-200
            ${isSelected || selected.size > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        >
          <div className={`p-1 rounded-lg backdrop-blur-sm transition-all
            ${isSelected ? 'bg-accent shadow-glow-sm' : 'bg-black/40 hover:bg-black/60'}`}>
            {isSelected
              ? <CheckCircle2 size={18} className="text-surface" />
              : <Circle size={18} className="text-white/80" />
            }
          </div>
        </button>

        {/* Favorite indicator */}
        {material.is_favorite === 1 && (
          <div className="absolute top-3 right-12 z-20">
            <div className="p-1.5 rounded-lg bg-rose-500/20 backdrop-blur-sm">
              <Heart size={14} className="text-rose-400 fill-rose-400" />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          className={`absolute top-3 right-3 z-20 flex gap-1.5 transition-all duration-300
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        >
          <button
            onClick={handleFavorite}
            className="p-2 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <Heart
              size={14}
              className={material.is_favorite ? 'text-rose-400 fill-rose-400' : 'text-white/80'}
            />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg bg-black/40 hover:bg-red-500/60 backdrop-blur-sm transition-colors"
          >
            <Trash2 size={14} className="text-white/80" />
          </button>
        </div>

        {/* File type badge */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-text-muted/80 text-[10px] font-mono font-medium tracking-wider uppercase">
            {mimeCategory}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 bg-surface-card border-t border-surface-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-text-primary text-xs font-medium truncate leading-tight">
              {material.name}
            </p>
            <p className="text-text-muted/70 text-[10px] mt-1 truncate">
              {material.category_name || '未分类'}
            </p>
          </div>
          <span className="text-text-muted/60 text-[10px] tabular-nums flex-shrink-0 mt-0.5">
            {formatSize(material.file_size)}
          </span>
        </div>
      </div>
    </div>
  );
}
