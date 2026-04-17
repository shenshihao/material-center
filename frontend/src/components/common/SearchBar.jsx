import { useState, useCallback, useRef } from 'react';
import { Search, X, Filter, ArrowUpDown } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';

const TYPES = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: '文档' },
  { value: 'other', label: '其他' },
];

const SORT_OPTIONS = [
  { value: 'sort_order_asc', label: '序号顺序（1→9）' },
  { value: 'sort_order_desc', label: '序号倒序' },
  { value: 'created_at_desc', label: '最新上传' },
  { value: 'created_at_asc', label: '最早上传' },
  { value: 'name_asc', label: '名称 A→Z' },
  { value: 'name_desc', label: '名称 Z→A' },
  { value: 'file_size_desc', label: '文件最大' },
  { value: 'file_size_asc', label: '文件最小' },
];

export default function SearchBar() {
  const { filters, setFilter } = useMaterialStore();
  const [input, setInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFilter({ search: val });
    }, 300);
  };

  const handleClear = () => {
    setInput('');
    setFilter({ search: '' });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Search input */}
      <div className="relative group">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/50 group-focus-within:text-accent transition-colors">
          <Search size={15} />
        </div>
        <input
          className="input pl-10 pr-10 w-64 h-10 bg-surface-elevated border-surface-border/50 focus:border-accent/50 rounded-xl"
          placeholder="搜索素材名称..."
          value={input}
          onChange={handleChange}
        />
        {input && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-0.5"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-elevated border border-surface-border/50 rounded-xl">
        {TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setFilter({ type: t.value })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${filters.type === t.value
                ? 'bg-accent text-surface shadow-glow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <select
        value={`${filters.sort}_${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split('_');
          setFilter({ sort, order });
        }}
        className="input h-10 text-xs px-3 bg-surface-elevated border-surface-border/50 rounded-xl cursor-pointer hover:border-surface-muted transition-colors"
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
