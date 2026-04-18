import { useState } from 'react';
import { X, Folder, Palette, Sparkles } from 'lucide-react';
import useCategoryStore from '../../stores/categoryStore';

const PRESET_COLORS = [
  '#00f5d4', '#f72585', '#ffd60a', '#06b6d4', '#8b5cf6',
  '#22c55e', '#ef4444', '#f97316', '#3b82f6', '#ec4899',
];

export default function CategoryModal({ initial, onClose }) {
  const { createCategory, updateCategory, getFlatList } = useCategoryStore();
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [color, setColor] = useState(initial?.color || '#00f5d4');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-void/90 backdrop-blur-2xl animate-fade-in">
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-star/5 blur-3xl animate-drift" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full bg-nebula/5 blur-3xl animate-drift" style={{ animationDelay: '-6s' }} />
      </div>

      <div className="relative w-full max-w-md mx-4 bg-cosmic-deep border border-cosmic-border/50 rounded-3xl shadow-glass overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-cosmic-border/30">
          {/* Top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-star/50 to-transparent" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                <Folder size={18} style={{ color }} className="drop-shadow-lg" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-stardust-primary">
                  {initial ? '编辑分类' : '新建分类'}
                </h2>
                <p className="text-stardust-muted text-xs mt-0.5">
                  {initial ? '修改分类信息' : '创建一个新的素材分类'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-stardust-muted hover:text-stardust-primary hover:bg-cosmic-dust rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-stardust-secondary text-xs mb-2 font-medium tracking-wide">
              分类名称 <span className="text-nebula">*</span>
            </label>
            <input
              className="w-full h-11 px-4 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-sm placeholder:text-stardust-muted/40 focus:outline-none focus:border-star/50 focus:bg-cosmic-dust/50 transition-all"
              placeholder="例如：工作截图"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Parent */}
          {categories.length > 0 && (
            <div>
              <label className="block text-stardust-secondary text-xs mb-2 font-medium tracking-wide">
                父分类（可选）
              </label>
              <select
                className="w-full h-11 px-4 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-sm focus:outline-none focus:border-star/50 transition-all appearance-none cursor-pointer"
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                style={{ backgroundImage: 'none' }}
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
            <label className="block text-stardust-secondary text-xs mb-2 font-medium tracking-wide">
              描述（可选）
            </label>
            <input
              className="w-full h-11 px-4 rounded-xl bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-sm placeholder:text-stardust-muted/40 focus:outline-none focus:border-star/50 focus:bg-cosmic-dust/50 transition-all"
              placeholder="简短描述这个分类的用途"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-stardust-secondary text-xs mb-3 font-medium tracking-wide flex items-center gap-2">
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
                  style={{ background: c, boxShadow: color === c ? `0 0 12px ${c}60` : 'none' }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded-xl border-2 border-cosmic-border/50 cursor-pointer bg-transparent"
                title="自定义颜色"
              />
            </div>
          </div>

          {/* Preview */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}
          >
            <span
              className="w-3.5 h-3.5 rounded-full shadow-sm"
              style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
            />
            <Folder size={16} className="text-stardust-secondary" />
            <span className="text-stardust-primary text-sm font-medium">
              {name || '分类名称'}
            </span>
            {description && (
              <span className="text-stardust-muted text-xs truncate ml-auto">
                {description}
              </span>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 bg-nebula/10 border border-nebula/20 rounded-xl">
              <p className="text-nebula text-xs">{error}</p>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-cosmic-border/30 bg-cosmic-nebula/20">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-stardust-secondary text-xs font-medium hover:bg-cosmic-dust transition-all border border-cosmic-border/30" disabled={loading}>
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-star to-nebula text-cosmic-void text-xs font-semibold shadow-star-sm hover:shadow-star transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-cosmic-void/30 border-t-cosmic-void rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>{loading ? '保存中...' : initial ? '保存更改' : '创建分类'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
