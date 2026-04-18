import { useState, useRef } from 'react';
import { Heart, Trash2, CheckCircle2, Circle, Edit3, Save, X } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export default function StoryCard({ material, onOpen, style }) {
  const { updateMaterial, deleteMaterial } = useMaterialStore();
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(material.description || '');
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);
  const textareaRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMaterial(material.id, { description: desc });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDesc(material.description || '');
    setEditing(false);
  };

  const handleEdit = () => {
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleDelete = async () => {
    if (confirm(`确认删除「${material.name}」？此操作不可恢复。`)) {
      await deleteMaterial(material.id);
    }
  };

  const handleImageClick = () => {
    if (!editing) onOpen(material);
  };

  return (
    <div
      className="group flex animate-fade-in rounded-2xl overflow-hidden border border-cosmic-border/40 bg-cosmic-nebula/40 backdrop-blur-sm hover:border-star/20 transition-all duration-500"
      style={style}
    >
      {/* Image side */}
      <div
        className={`relative w-72 h-72 flex-shrink-0 cursor-pointer overflow-hidden ${editing ? 'opacity-60' : ''}`}
        onClick={handleImageClick}
      >
        {!imgError ? (
          <img
            src={`/files/${material.file_path}`}
            alt={material.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-cosmic-void flex items-center justify-center">
            <span className="text-stardust-muted/40 text-xs">图片加载失败</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-cosmic-void/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="px-3 py-1.5 rounded-xl bg-cosmic-void/80 backdrop-blur-md border border-cosmic-border/50 text-xs text-stardust-secondary">
            点击查看大图
          </span>
        </div>

        {/* Favorite */}
        {material.is_favorite === 1 && (
          <div className="absolute top-3 left-3">
            <div className="p-1.5 rounded-xl bg-nebula/20 backdrop-blur-md border border-nebula/30">
              <Heart size={12} className="text-nebula fill-nebula" />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-md bg-cosmic-void/70 backdrop-blur-md border border-cosmic-border/30 text-[9px] font-mono uppercase text-stardust-muted/70">
            {material.file_size ? formatSize(material.file_size) : ''}
          </span>
          {material.width && material.height && (
            <span className="px-2 py-0.5 rounded-md bg-cosmic-void/70 backdrop-blur-md border border-cosmic-border/30 text-[9px] font-mono text-stardust-muted/70">
              {material.width}×{material.height}
            </span>
          )}
        </div>
      </div>

      {/* Text side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="min-w-0">
            <p className="text-stardust-primary text-sm font-medium truncate">{material.name}</p>
            <p className="text-stardust-muted/50 text-[10px] mt-0.5 truncate">
              {material.category_name || '未分类'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {!editing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="p-2 rounded-xl hover:bg-cosmic-dust/50 transition-colors text-stardust-muted hover:text-star"
                  title="编辑故事"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-xl hover:bg-red-500/20 transition-colors text-stardust-muted hover:text-red-400"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => updateMaterial(material.id, { is_favorite: material.is_favorite ? 0 : 1 })}
                  className="p-2 rounded-xl hover:bg-cosmic-dust/50 transition-colors"
                  title={material.is_favorite ? '取消收藏' : '收藏'}
                >
                  <Heart size={14} className={material.is_favorite ? 'text-nebula fill-nebula' : 'text-stardust-muted'} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-2 rounded-xl bg-star/10 hover:bg-star/20 text-star transition-colors disabled:opacity-50"
                  title="保存"
                >
                  <Save size={14} />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-xl hover:bg-cosmic-dust/50 text-stardust-muted transition-colors"
                  title="取消"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-cosmic-border/50 via-star/20 to-transparent" />

        {/* Description content */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="为这张图片写一段故事或说明..."
              className="w-full h-full min-h-[180px] bg-cosmic-void/40 border border-cosmic-border/50 rounded-xl px-4 py-3 text-stardust-primary text-xs leading-relaxed resize-none focus:outline-none focus:border-star/40 placeholder:text-stardust-muted/40"
            />
          ) : (
            <div className="h-full min-h-[180px]">
              {desc ? (
                <p className="text-stardust-secondary/80 text-xs leading-relaxed whitespace-pre-wrap">{desc}</p>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Edit3 size={20} className="text-stardust-muted/30 mx-auto mb-2" />
                    <p className="text-stardust-muted/30 text-xs">暂无描述</p>
                    <p className="text-stardust-muted/20 text-[10px] mt-1">点击编辑按钮为图片添加故事</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {material.created_at && (
          <div className="px-5 pb-3">
            <span className="text-stardust-muted/30 text-[9px] font-mono">
              {new Date(material.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
