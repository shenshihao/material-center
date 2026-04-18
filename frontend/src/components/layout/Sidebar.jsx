import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, BarChart2, Heart, Folder, FolderOpen,
  Plus, ChevronRight, Trash2, Pencil, MoreHorizontal,
  Sparkles, Image, FileText, Film, File
} from 'lucide-react';
import useCategoryStore from '../../stores/categoryStore';
import useMaterialStore from '../../stores/materialStore';
import CategoryModal from '../common/CategoryModal';

export default function Sidebar() {
  const { tree, activeId, fetchCategories, setActive, deleteCategory } = useCategoryStore();
  const { setFilter, filters } = useMaterialStore();
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

  const isAllActive = activeId === null && !filters.favorite;
  const isFavActive = filters.favorite === 1;

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
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 text-sm
          ${activeId === node.id
            ? 'bg-star/10 text-star border border-star/20 shadow-star-sm'
            : 'text-stardust-secondary hover:bg-cosmic-dust hover:text-stardust-primary border border-transparent hover:border-cosmic-border'
          }
          ${depth > 0 ? 'ml-3' : ''}`}
        onClick={() => handleSelect(node.id)}
      >
        {/* Expand chevron */}
        {node.children?.length > 0 ? (
          <button
            onClick={(e) => toggleExpand(node.id, e)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-cosmic-muted transition-colors"
          >
            {expanded.has(node.id) ? <ChevronRight size={12} className="rotate-90" /> : <ChevronRight size={12} />}
          </button>
        ) : <span className="w-5" />}

        {/* Category dot with glow */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all group-hover:scale-125"
          style={{
            background: node.color || '#00f5d4',
            boxShadow: activeId === node.id ? `0 0 8px ${node.color || '#00f5d4'}` : 'none'
          }}
        />

        {/* Name */}
        <span className="flex-1 truncate font-medium text-xs tracking-wide">{node.name}</span>

        {/* Count */}
        <span className="text-stardust-muted text-[10px] tabular-nums font-mono">
          {node.material_count || 0}
        </span>

        {/* Actions dropdown */}
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${menuOpen === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === node.id ? null : node.id); }}
            className="p-1.5 rounded-lg hover:bg-cosmic-muted text-stardust-muted hover:text-stardust-primary transition-all"
          >
            <MoreHorizontal size={12} />
          </button>
          {menuOpen === node.id && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-cosmic-nebula border border-cosmic-border rounded-xl shadow-glass py-1 text-xs z-50 animate-scale-in">
              <button
                className="w-full text-left px-3 py-2 hover:bg-cosmic-dust text-stardust-secondary hover:text-stardust-primary flex items-center gap-2 transition-colors"
                onClick={(e) => { e.stopPropagation(); setEditTarget(node); setModalOpen(true); setMenuOpen(null); }}
              >
                <Pencil size={11} /> 编辑分类
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-cosmic-dust text-nebula hover:text-nebula-bright flex items-center gap-2 transition-colors"
                onClick={(e) => { e.stopPropagation(); deleteCategory(node.id); setMenuOpen(null); }}
              >
                <Trash2 size={11} /> 删除分类
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
    <aside className="w-56 h-full flex flex-col relative z-20">
      {/* Glass panel */}
      <div className="flex-1 flex flex-col bg-cosmic-deep/80 backdrop-blur-xl border-r border-cosmic-border/50 shadow-glass">

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-5 py-5 border-b border-cosmic-border/30">
          {/* Glowing logo mark */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-star to-nebula flex items-center justify-center shadow-star-sm">
              <Sparkles size={18} className="text-cosmic-void" />
            </div>
            {/* Animated ring */}
            <div className="absolute inset-0 rounded-xl border border-star/30 animate-pulse-glow" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-stardust-primary text-sm tracking-wide">星河素材</h1>
            <p className="text-stardust-muted text-[10px] font-mono tracking-wider">MATERIAL CENTER</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {/* Main nav items */}
          <div className="space-y-1">
            <button
              onClick={() => handleNavSpecial('all')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-300
                ${isAllActive
                  ? 'bg-star/10 text-star border border-star/20 shadow-star-sm'
                  : 'text-stardust-secondary hover:bg-cosmic-dust hover:text-stardust-primary border border-transparent'
                }`}
            >
              <LayoutGrid size={15} />
              <span>全部素材</span>
              <Sparkles size={10} className="ml-auto text-star/60" />
            </button>

            <button
              onClick={() => handleNavSpecial('favorites')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-300
                ${isFavActive
                  ? 'bg-nebula/10 text-nebula border border-nebula/20 shadow-nebula'
                  : 'text-stardust-secondary hover:bg-cosmic-dust hover:text-stardust-primary border border-transparent'
                }`}
            >
              <Heart size={15} className={isFavActive ? 'text-nebula' : ''} />
              <span>我的收藏</span>
            </button>

            <NavLink
              to="/dashboard"
              className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-all duration-300
                ${isActive
                  ? 'bg-galaxy/10 text-galaxy border border-galaxy/20'
                  : 'text-stardust-secondary hover:bg-cosmic-dust hover:text-stardust-primary border border-transparent'
                }`}
            >
              <BarChart2 size={15} />
              <span>统计概览</span>
            </NavLink>
          </div>

          {/* Divider with glow */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gradient-to-r from-transparent via-cosmic-border/50 to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-cosmic-deep text-stardust-muted text-[10px] font-mono tracking-widest">分类</span>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-1">
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-[11px] text-stardust-muted hover:text-star transition-colors"
            >
              <Plus size={12} />
              <span>新建分类</span>
            </button>

            {renderCategories(tree)}

            {tree.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-cosmic-dust/50 flex items-center justify-center">
                  <Folder size={22} className="text-stardust-muted/50" />
                </div>
                <p className="text-stardust-muted text-xs">暂无分类</p>
                <p className="text-stardust-muted/50 text-[10px] mt-1">点击上方创建第一个分类</p>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="relative px-5 py-4 border-t border-cosmic-border/30">
          <div className="absolute inset-0 bg-gradient-to-t from-cosmic-deep to-transparent pointer-events-none" />
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-star animate-pulse" />
            <p className="text-stardust-muted/60 text-[10px] font-mono tracking-wide">
              本地存储 · 安全私密
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
