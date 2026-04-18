import { useState } from 'react';
import { Trash2, FolderInput, Heart, HeartOff, X, Hash, Loader2, Download, CheckSquare, Sparkles } from 'lucide-react';
import useMaterialStore from '../../stores/materialStore';
import useCategoryStore from '../../stores/categoryStore';
import client from '../../api/client';

export default function BatchActionBar() {
  const { selected, clearSelection, batchAction, fetchMaterials } = useMaterialStore();
  const { getFlatList } = useCategoryStore();
  const [moving, setMoving] = useState(false);
  const [targetCat, setTargetCat] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [startNum, setStartNum] = useState(1);
  const [digits, setDigits] = useState(3);
  const [prefix, setPrefix] = useState('');
  const [renameError, setRenameError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const count = selected.size;
  if (!count) return null;

  const categories = getFlatList();

  const handleDelete = async () => {
    if (!confirm(`确认删除选中的 ${count} 个素材？此操作不可恢复。`)) return;
    await batchAction('delete');
  };

  const handleMove = async () => {
    await batchAction('move', { category_id: targetCat === '' ? null : Number(targetCat) });
    setMoving(false);
    setTargetCat('');
  };

  const handleRename = async () => {
    setRenaming(true);
    setRenameError('');
    try {
      const ids = [...selected];
      const res = await client.post('/materials/rename', {
        ids,
        start: startNum,
        digits: Number(digits),
        prefix,
      });
      setRenameModal(false);
      clearSelection();
      await fetchMaterials();
    } catch (err) {
      setRenameError(err.message);
    } finally {
      setRenaming(false);
    }
  };

  const handleDownload = async () => {
    if (!selected.size) return;
    setDownloading(true);
    try {
      const ids = [...selected];
      const res = await fetch('/api/v1/materials/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'download' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`下载失败: ${err.error?.message || err.message}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `素材_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`下载失败: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
        <div className="flex items-center gap-1 px-3 py-2.5 bg-cosmic-deep/95 backdrop-blur-2xl border border-cosmic-border/50 rounded-2xl shadow-glass">
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-cosmic-border/50">
            <CheckSquare size={15} className="text-star" />
            <span className="text-stardust-primary font-medium text-xs">
              <span className="text-star">{count}</span> 项已选
            </span>
          </div>

          {moving ? (
            <>
              {/* Move mode */}
              <select
                value={targetCat}
                onChange={(e) => setTargetCat(e.target.value)}
                className="h-8 px-3 text-xs bg-cosmic-dust/30 border border-cosmic-border/50 rounded-lg text-stardust-primary"
              >
                <option value="">未分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.name}</option>
                ))}
              </select>
              <button onClick={handleMove} className="px-4 py-1.5 text-xs font-medium rounded-lg bg-star/10 text-star border border-star/20 hover:bg-star/20 transition-all">确认移动</button>
              <button onClick={() => setMoving(false)} className="px-3 py-1.5 text-xs text-stardust-muted hover:text-stardust-primary transition-all">取消</button>
            </>
          ) : (
            <>
              {/* Action buttons */}
              <button
                onClick={() => setMoving(true)}
                className="flex items-center gap-2 px-3 py-2 text-stardust-secondary hover:text-stardust-primary hover:bg-cosmic-dust/50 rounded-lg text-xs transition-all"
              >
                <FolderInput size={14} />
                <span>移动</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-2 text-stardust-secondary hover:text-stardust-primary hover:bg-cosmic-dust/50 rounded-lg text-xs transition-all disabled:opacity-50"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>下载</span>
              </button>

              <button
                onClick={() => setRenameModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-stardust-secondary hover:text-stardust-primary hover:bg-cosmic-dust/50 rounded-lg text-xs transition-all"
              >
                <Hash size={14} />
                <span>序号命名</span>
              </button>

              <button
                onClick={() => batchAction('favorite')}
                className="flex items-center gap-2 px-3 py-2 text-stardust-secondary hover:text-nebula hover:bg-nebula/10 rounded-lg text-xs transition-all"
              >
                <Heart size={14} />
                <span>收藏</span>
              </button>

              <button
                onClick={() => batchAction('unfavorite')}
                className="flex items-center gap-2 px-3 py-2 text-stardust-secondary hover:text-stardust-primary hover:bg-cosmic-dust/50 rounded-lg text-xs transition-all"
              >
                <HeartOff size={14} />
                <span>取消收藏</span>
              </button>

              <div className="w-px h-5 bg-cosmic-border/50 mx-1" />

              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-nebula/80 hover:text-nebula hover:bg-nebula/10 rounded-lg text-xs transition-all"
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={clearSelection}
            className="flex items-center justify-center w-8 h-8 text-stardust-muted hover:text-stardust-primary hover:bg-cosmic-dust/50 rounded-lg transition-all ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cosmic-void/90 backdrop-blur-2xl animate-fade-in">
          <div className="w-full max-w-sm mx-4 bg-cosmic-deep border border-cosmic-border/50 rounded-2xl shadow-glass animate-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cosmic-border/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-star/10 rounded-lg flex items-center justify-center">
                  <Hash size={16} className="text-star" />
                </div>
                <h2 className="font-display font-semibold text-stardust-primary">序号重命名</h2>
              </div>
              <button onClick={() => setRenameModal(false)} className="text-stardust-muted hover:text-stardust-primary">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-stardust-secondary text-xs">
                将选中的 <span className="text-star font-semibold">{count}</span> 个素材重命名为序号格式
              </p>

              <div>
                <label className="block text-stardust-secondary text-xs mb-2 font-medium">前缀（可选）</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-xs placeholder:text-stardust-muted/40 focus:outline-none focus:border-star/50 transition-all"
                  placeholder="例如：截图_"
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stardust-secondary text-xs mb-2 font-medium">起始数字</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full h-10 px-3 rounded-lg bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-xs focus:outline-none focus:border-star/50 transition-all"
                    value={startNum}
                    onChange={e => setStartNum(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-stardust-secondary text-xs mb-2 font-medium">位数</label>
                  <select
                    className="w-full h-10 px-3 rounded-lg bg-cosmic-dust/30 border border-cosmic-border/50 text-stardust-primary text-xs focus:outline-none focus:border-star/50 transition-all"
                    value={digits}
                    onChange={e => setDigits(Number(e.target.value))}
                  >
                    <option value="1">1位（1,2,3）</option>
                    <option value="2">2位（01,02）</option>
                    <option value="3">3位（001,002）</option>
                    <option value="4">4位（0001）</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-cosmic-dust/20 rounded-xl px-4 py-3 border border-cosmic-border/30">
                <p className="text-stardust-muted text-[10px] mb-2 font-medium">预览</p>
                <div className="space-y-1">
                  {Array.from({ length: Math.min(3, count) }).map((_, i) => {
                    const n = startNum + i;
                    const padded = String(n).padStart(digits, '0');
                    return (
                      <p key={i} className="text-stardust-secondary text-[11px] font-mono">
                        {prefix}{padded}.png
                      </p>
                    );
                  })}
                  {count > 3 && <p className="text-stardust-muted text-[10px]">... 共 {count} 个</p>}
                </div>
              </div>

              {renameError && <p className="text-nebula text-xs">{renameError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-cosmic-border/30 bg-cosmic-nebula/20">
              <button onClick={() => setRenameModal(false)} className="px-4 py-2 text-xs text-stardust-muted hover:text-stardust-primary transition-all" disabled={renaming}>取消</button>
              <button
                onClick={handleRename}
                disabled={renaming}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-gradient-to-r from-star to-nebula text-cosmic-void shadow-star-sm hover:shadow-star transition-all disabled:opacity-50"
              >
                {renaming && <Loader2 size={12} className="animate-spin" />}
                {renaming ? '重命名中...' : '确认重命名'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
