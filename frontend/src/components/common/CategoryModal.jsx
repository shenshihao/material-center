import { useState } from 'react';
import { X, Folder, Palette } from 'lucide-react';
import useCategoryStore from '../../stores/categoryStore';

const PRESET_COLORS = [
  '#f59e0b', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export default function CategoryModal({ initial, onClose }) {
  const { createCategory, updateCategory, getFlatList } = useCategoryStore();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [color, setColor] = useState(initial?.color || '#f59e0b');
  const [parentId, setParentId] = useState(initial?.parent_id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = getFlatList().filter(c => c.id !== initial?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('分类名称不能为空'); return; }
    setLoading(true);
    setError('');
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        parent_id: parentId === '' ? null : Number(parentId),
      };
      if (initial) {
        await updateCategory(initial.id, data);
      } else {
        await createCategory(data);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
              <Folder size={18} style={{ color }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-text-primary">
                {initial ? '编辑分类' : '新建分类'}
              </h2>
              <p className="text-text-muted text-xs mt-0.5">
                {initial ? '修改分类信息' : '创建一个新的素材分类'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-text-muted text-xs mb-2 font-medium tracking-wide">
              分类名称 <span className="text-red-400">*</span>
            </label>
            <input
              className="input w-full h-11"
              placeholder="例如：工作截图"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Parent */}
          {categories.length > 0 && (
            <div>
              <label className="block text-text-muted text-xs mb-2 font-medium tracking-wide">
                父分类（可选）
              </label>
              <select
                className="input w-full h-11"
                value={parentId}
                onChange={e => setParentId(e.target.value)}
              >
                <option value="">无（顶级分类）</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{'　'.repeat(c.depth)}{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-text-muted text-xs mb-2 font-medium tracking-wide">
              描述（可选）
            </label>
            <input
              className="input w-full"
              placeholder="简短描述这个分类的用途"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-text-muted text-xs mb-3 font-medium tracking-wide flex items-center gap-2">
              <Palette size={13} />
              标识颜色
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-xl border-2 transition-all duration-200 hover:scale-110
                    ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-xl border-2 border-surface-muted cursor-pointer bg-transparent"
                title="自定义颜色"
              />
            </div>
          </div>

          {/* Preview */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border/50"
            style={{ backgroundColor: `${color}08` }}
          >
            <span
              className="w-3.5 h-3.5 rounded-full shadow-sm"
              style={{ background: color }}
            />
            <Folder size={16} className="text-text-secondary" />
            <span className="text-text-primary text-sm font-medium">
              {name || '分类名称'}
            </span>
            {description && (
              <span className="text-text-muted text-xs truncate ml-auto">
                {description}
              </span>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-surface-border bg-surface-elevated/50">
          <button type="button" onClick={onClose} className="btn-ghost px-5" disabled={loading}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            {loading ? '保存中...' : initial ? '保存更改' : '创建分类'}
          </button>
        </div>
      </div>
    </div>
  );
}
