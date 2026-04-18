import { useState } from 'react';
import { Heart, Trash2, CheckCircle2, Circle, FileImage, Film, FileText, File, Archive } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';

const FILE_ICONS = {
  image: <FileImage size={18} className="text-star" />,
  video: <Film size={18} className="text-nebula" />,
  pdf: <FileText size={18} className="text-red-400" />,
  doc: <FileText size={18} className="text-blue-400" />,
  excel: <FileText size={18} className="text-emerald-400" />,
  ppt: <FileText size={18} className="text-orange-400" />,
  text: <FileText size={18} className="text-stardust-secondary" />,
  zip: <Archive size={18} className="text-galaxy" />,
  other: <File size={18} className="text-stardust-muted" />,
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

export default function ListCard({ material, onOpen, lastSelected, setLastSelected, style }) {
  const { selected, toggleSelect, updateMaterial, deleteMaterial } = useMaterialStore();
  const isSelected = selected.has(material.id);
  const [imgError, setImgError] = useState(false);
  const mimeCategory = getMimeCategory(material.mime_type);
  const isImage = mimeCategory === 'image';

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

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 animate-fade-in
        ${isSelected
          ? 'bg-star/5 border border-star/30 ring-1 ring-star/20'
          : 'bg-cosmic-nebula/30 border border-cosmic-border/50 hover:bg-cosmic-dust/50 hover:border-star/20'
        }`}
      style={style}
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-cosmic-void">
        {isImage && !imgError ? (
          <img
            src={`/files/${material.thumbnail_path || material.file_path}`}
            alt={material.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {FILE_ICONS[mimeCategory] || FILE_ICONS.other}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-stardust-primary text-xs font-medium truncate">{material.name}</p>
        <p className="text-stardust-muted/60 text-[10px] mt-0.5 truncate">
          {material.category_name || '未分类'} · {formatSize(material.file_size)}
        </p>
      </div>

      {/* File type badge */}
      <span className="px-2 py-0.5 rounded-md bg-cosmic-void/60 border border-cosmic-border/30 text-[9px] font-mono font-semibold uppercase text-stardust-muted/70 flex-shrink-0">
        {mimeCategory}
      </span>

      {/* Favorite */}
      {material.is_favorite === 1 && (
        <Heart size={12} className="text-nebula fill-nebula flex-shrink-0" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleFavorite}
          className="p-1.5 rounded-lg hover:bg-cosmic-dust/50 transition-colors"
        >
          <Heart size={12} className={material.is_favorite ? 'text-nebula fill-nebula' : 'text-stardust-muted'} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <Trash2 size={12} className="text-stardust-muted hover:text-red-400" />
        </button>
      </div>

      {/* Checkbox */}
      <button
        onClick={handleCheckbox}
        className={`p-1 rounded-lg transition-all ${isSelected || selected.size > 0 ? 'opacity-100' : 'opacity-0'}`}
      >
        {isSelected
          ? <CheckCircle2 size={16} className="text-star" />
          : <Circle size={16} className="text-stardust-muted" />
        }
      </button>
    </div>
  );
}
