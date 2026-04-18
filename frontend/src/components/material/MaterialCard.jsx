import { useState } from 'react';
import { Heart, Trash2, CheckCircle2, Circle, FileText, Film, FileImage, File, Archive, Download, Eye, Sparkles } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';

const FILE_ICONS = {
  image: <FileImage size={24} className="text-star" />,
  video: <Film size={24} className="text-nebula" />,
  pdf: <FileText size={24} className="text-red-400" />,
  doc: <FileText size={24} className="text-blue-400" />,
  excel: <FileText size={24} className="text-emerald-400" />,
  ppt: <FileText size={24} className="text-orange-400" />,
  text: <FileText size={24} className="text-stardust-secondary" />,
  zip: <Archive size={24} className="text-galaxy" />,
  other: <File size={24} className="text-stardust-muted" />,
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
      className={`group relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-500
        ${isSelected
          ? 'ring-2 ring-star/50 bg-star/5 shadow-star-sm scale-[1.02]'
          : 'bg-cosmic-nebula/50 hover:bg-cosmic-dust/80 border border-cosmic-border/50 hover:border-star/30'
        }`}
      style={{
        transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: isHovered
          ? isSelected
            ? '0 0 30px -5px rgba(0, 245, 212, 0.3), 0 20px 40px -10px rgba(0, 0, 0, 0.5)'
            : '0 20px 40px -10px rgba(0, 0, 0, 0.5)'
          : '0 8px 20px -5px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Image or icon container */}
      <div className="aspect-square relative overflow-hidden">
        {/* Background gradient for non-images */}
        <div className="absolute inset-0 bg-gradient-to-br from-cosmic-void via-cosmic-deep to-cosmic-nebula" />

        {isImage && !imgError ? (
          <>
            <img
              src={`/files/${material.file_path}`}
              alt={material.name}
              className="w-full h-full object-cover transition-transform duration-700"
              style={{ transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}
              onError={() => setImgError(true)}
              loading="lazy"
            />
            {/* Image overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-cosmic-void/80 via-transparent to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <div className={`p-4 rounded-2xl bg-cosmic-dust/50 border border-cosmic-border/30 backdrop-blur-sm transition-all duration-300 ${isHovered ? 'scale-110 border-star/30' : ''}`}>
              {FILE_ICONS[mimeCategory] || FILE_ICONS.other}
            </div>
            <span className="text-stardust-muted/60 text-[10px] font-mono font-medium tracking-widest">
              {fileExt}
            </span>
          </div>
        )}

        {/* Animated border glow on hover */}
        <div
          className={`absolute inset-0 rounded-2xl transition-opacity duration-500 pointer-events-none
            ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,212,0.1), rgba(247,37,133,0.1), rgba(255,214,10,0.1))',
            padding: '1px',
          }}
        >
          <div className="w-full h-full rounded-2xl bg-transparent" />
        </div>

        {/* Selection checkbox */}
        <button
          onClick={handleCheckbox}
          className={`absolute top-3 left-3 z-20 transition-all duration-300
            ${isSelected || selected.size > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
        >
          <div className={`p-1.5 rounded-xl backdrop-blur-md transition-all
            ${isSelected ? 'bg-star shadow-star-sm' : 'bg-cosmic-void/60 hover:bg-cosmic-void/80 border border-cosmic-border/50'}`}>
            {isSelected
              ? <CheckCircle2 size={16} className="text-cosmic-void" />
              : <Circle size={16} className="text-stardust-secondary" />
            }
          </div>
        </button>

        {/* Favorite indicator */}
        {material.is_favorite === 1 && (
          <div className="absolute top-3 right-12 z-20">
            <div className="p-1.5 rounded-xl bg-nebula/20 backdrop-blur-md border border-nebula/30">
              <Heart size={12} className="text-nebula fill-nebula" />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div
          className={`absolute top-3 right-3 z-20 flex gap-1.5 transition-all duration-300
          ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
        >
          <button
            onClick={handleFavorite}
            className="p-2 rounded-xl bg-cosmic-void/60 hover:bg-cosmic-void/80 backdrop-blur-md border border-cosmic-border/30 transition-all hover:border-nebula/50"
          >
            <Heart
              size={12}
              className={material.is_favorite ? 'text-nebula fill-nebula' : 'text-stardust-secondary'}
            />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl bg-cosmic-void/60 hover:bg-red-500/60 backdrop-blur-md border border-cosmic-border/30 transition-all hover:border-red-500/50"
          >
            <Trash2 size={12} className="text-stardust-secondary" />
          </button>
        </div>

        {/* File type badge */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="px-2.5 py-1 rounded-lg bg-cosmic-void/60 backdrop-blur-md border border-cosmic-border/30 text-[9px] font-mono font-semibold tracking-widest uppercase text-stardust-secondary/80">
            {mimeCategory}
          </span>
        </div>

        {/* Click hint */}
        {isHovered && isImage && (
          <div className="absolute bottom-3 right-3 z-10 animate-fade-in">
            <div className="px-2.5 py-1 rounded-lg bg-star/20 backdrop-blur-md border border-star/30 flex items-center gap-1.5">
              <Eye size={10} className="text-star" />
              <span className="text-[9px] font-medium text-star">点击放大</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-3.5 bg-cosmic-nebula/80 backdrop-blur-sm border-t border-cosmic-border/30">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-stardust-primary text-[11px] font-medium truncate leading-tight tracking-wide">
              {material.name}
            </p>
            <p className="text-stardust-muted/70 text-[9px] mt-1.5 truncate">
              {material.category_name || '未分类'}
            </p>
          </div>
          <span className="text-stardust-muted/60 text-[9px] tabular-nums font-mono flex-shrink-0 mt-0.5">
            {formatSize(material.file_size)}
          </span>
        </div>
      </div>
    </div>
  );
}
