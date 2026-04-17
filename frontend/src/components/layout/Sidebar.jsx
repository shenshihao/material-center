import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, BarChart2, Heart, Folder, FolderOpen,
  Plus, ChevronRight, ChevronDown, Trash2, Pencil, MoreHorizontal,
  Sparkles
} from 'lucide-react';
import useCategoryStore from '../../stores/categoryStore';
import useMaterialStore from '../../stores/materialStore';
import CategoryModal from '../common/CategoryModal';

export default function Sidebar() {
  const { tree, activeId, fetchCategories, setActive, deleteCategory } = useCategoryStore();
  const { setFilter } = useMaterialStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => { fetchCategories(); }, []);

  const handleSelect = (id) => {
    setActive(id);
    setFilter({ categoryId: id, favorite: null });
    navigate('/gallery');
  };

  const handleNavSpecial = (type) => {
    setActive(null);
    if (type === 'all') setFilter({ categoryId: null, favorite: null });
    if (type === 'favorites') setFilter({ categoryId: null, favorite: 1 });
    navigate('/gallery');
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderCategories = (nodes, depth = 0) => nodes.map(node => (
    <div key={node.id}>
      <div
        className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 text-sm
          ${activeId === node.id
            ? 'bg-accent/10 text-accent-light border border-accent/20'
            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent'
          }
          ${depth > 0 ? 'ml-3' : ''}`}
        onClick={() => handleSelect(node.id)}
      >
        {/* Expand chevron */}
        {node.children?.length > 0 ? (
          <button
            onClick={(e) => toggleExpand(node.id, e)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-surface-muted transition-colors"
          >
            {expanded.has(node.id) ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : <span className="w-5" />}

        {/* Category dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
          style={{ background: node.color || '#f59e0b' }}
        />

        {/* Name */}
        <span className="flex-1 truncate font-medium">{node.name}</span>

        {/* Count */}
        <span className="text-text-muted text-xs tabular-nums">
          {node.material_count || 0}
        </span>

        {/* Actions dropdown */}
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${menuOpen === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === node.id ? null : node.id); }}
            className="p-1.5 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text-primary transition-all"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen === node.id && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-surface-elevated border border-surface-border rounded-xl shadow-xl py-1.5 text-sm z-50 animate-scale-in">
              <button
                className="w-full text-left px-3 py-2 hover:bg-surface-hover text-text-secondary hover:text-text-primary flex items-center gap-2.5 transition-colors"
                onClick={(e) => { e.stopPropagation(); setEditTarget(node); setModalOpen(true); setMenuOpen(null); }}
              >
                <Pencil size={13} /> 编辑分类
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-surface-hover text-red-400 hover:text-red-300 flex items-center gap-2.5 transition-colors"
                onClick={(e) => { e.stopPropagation(); deleteCategory(node.id); setMenuOpen(null); }}
              >
                <Trash2 size={13} /> 删除分类
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {node.children?.length > 0 && expanded.has(node.id) && (
        <div className="mt-1 space-y-1 animate-fade-in">
          {renderCategories(node.children, depth + 1)}
        </div>
      )}
    </div>
  ));

  return (
    <aside className="w-60 h-full flex flex-col bg-surface-card border-r border-surface-border relative">
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 py-5 border-b border-surface-border">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-surface shadow-glow-sm">
            <LayoutGrid size={18} className="font-bold" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-surface-card animate-pulse" />
        </div>
        <div>
          <h1 className="font-display font-semibold text-text-primary text-sm tracking-tight">素材管理中心</h1>
          <p className="text-text-muted text-xs">Material Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main nav items */}
        <div className="space-y-1">
          <button
            onClick={() => handleNavSpecial('all')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${activeId === null && !useMaterialStore.getState().filters.favorite
                ? 'bg-accent/10 text-accent-light border border-accent/20'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent'
              }`}
          >
            <LayoutGrid size={16} />
            <span>全部素材</span>
            <Sparkles size={12} className="ml-auto text-accent/60" />
          </button>

          <button
            onClick={() => handleNavSpecial('favorites')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent transition-all duration-200"
          >
            <Heart size={16} className="text-rose-400/70" />
            <span>我的收藏</span>
          </button>

          <NavLink
            to="/dashboard"
            className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive
                ? 'bg-accent/10 text-accent-light border border-accent/20'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-transparent'
              }`}
          >
            <BarChart2 size={16} />
            <span>统计概览</span>
          </NavLink>
        </div>

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-border/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-surface-card text-text-muted text-xs font-medium tracking-wider">分类</span>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-1">
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-text-muted hover:text-accent transition-colors"
          >
            <Plus size={13} />
            <span>新建分类</span>
          </button>

          {renderCategories(tree)}

          {tree.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Folder size={28} className="text-text-muted/50 mx-auto mb-3" />
              <p className="text-text-muted text-xs">暂无分类</p>
              <p className="text-text-muted/50 text-xs mt-1">点击上方创建第一个分类</p>
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="relative px-5 py-4 border-t border-surface-border">
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card to-transparent pointer-events-none" />
        <p className="text-text-muted/60 text-xs text-center font-medium tracking-wide">
          本地存储 · 安全私密
        </p>
      </div>

      {/* Category modal */}
      {modalOpen && (
        <CategoryModal
          initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </aside>
  );
}
