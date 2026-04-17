import { useState } from 'react';
import { Trash2, FolderInput, Heart, HeartOff, X, Hash, Loader2, Download, CheckSquare, Square } from 'lucide-react';
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
        <div className="flex items-center gap-2 px-4 py-3 bg-surface-elevated/95 backdrop-blur-xl border border-surface-border rounded-2xl shadow-2xl shadow-black/20">
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-surface-border">
            <CheckSquare size={16} className="text-accent" />
            <span className="text-text-primary font-medium text-sm">
              <span className="text-accent">{count}</span> 项已选
            </span>
          </div>

          {moving ? (
            <>
              {/* Move mode */}
              <select
                value={targetCat}
                onChange={(e) => setTargetCat(e.target.value)}
                className="input h-8 text-xs bg-surface border-surface-border/50 rounded-lg"
              >
                <option value="">未分类</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.name}</option>
                ))}
              </select>
              <button onClick={handleMove} className="btn-primary py-1.5 text-xs px-4">确认移动</button>
              <button onClick={() => setMoving(false)} className="btn-ghost py-1.5 text-xs px-3">取消</button>
            </>
          ) : (
            <>
              {/* Action buttons */}
              <button
                onClick={() => setMoving(true)}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg text-sm transition-all"
              >
                <FolderInput size={15} />
                <span>移动</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                <span>下载</span>
              </button>

              <button
                onClick={() => setRenameModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg text-sm transition-all"
              >
                <Hash size={15} />
                <span>序号命名</span>
              </button>

              <button
                onClick={() => batchAction('favorite')}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm transition-all"
              >
                <Heart size={15} />
                <span>收藏</span>
              </button>

              <button
                onClick={() => batchAction('unfavorite')}
                className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg text-sm transition-all"
              >
                <HeartOff size={15} />
                <span>取消收藏</span>
              </button>

              <div className="w-px h-6 bg-surface-border mx-1" />

              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm transition-all"
              >
                <Trash2 size={15} />
                <span>删除</span>
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onClick={clearSelection}
            className="flex items-center justify-center w-8 h-8 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm mx-4 bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Hash size={16} className="text-accent" />
                </div>
                <h2 className="font-display font-semibold text-text-primary">序号重命名</h2>
              </div>
              <button onClick={() => setRenameModal(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-text-secondary text-sm">
                将选中的 <span className="text-accent font-semibold">{count}</span> 个素材重命名为序号格式
              </p>

              <div>
                <label className="block text-text-muted text-xs mb-2 font-medium">前缀（可选）</label>
                <input
                  className="input w-full"
                  placeholder="例如：截图_"
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-muted text-xs mb-2 font-medium">起始数字</label>
                  <input
                    type="number"
                    min="1"
                    className="input w-full"
                    value={startNum}
                    onChange={e => setStartNum(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-text-muted text-xs mb-2 font-medium">位数</label>
                  <select
                    className="input w-full"
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
              <div className="bg-surface-elevated rounded-xl px-4 py-3 border border-surface-border/50">
                <p className="text-text-muted text-xs mb-2 font-medium">预览</p>
                <div className="space-y-1">
                  {Array.from({ length: Math.min(3, count) }).map((_, i) => {
                    const n = startNum + i;
                    const padded = String(n).padStart(digits, '0');
                    return (
                      <p key={i} className="text-text-secondary text-xs font-mono">
                        {prefix}{padded}.png
                      </p>
                    );
                  })}
                  {count > 3 && <p className="text-text-muted text-xs">... 共 {count} 个</p>}
                </div>
              </div>

              {renameError && <p className="text-red-400 text-sm">{renameError}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-surface-border bg-surface-elevated/50">
              <button onClick={() => setRenameModal(false)} className="btn-ghost px-5" disabled={renaming}>取消</button>
              <button
                onClick={handleRename}
                disabled={renaming}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {renaming && <Loader2 size={14} className="animate-spin" />}
                {renaming ? '重命名中...' : '确认重命名'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
