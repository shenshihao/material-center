import { create } from 'zustand';
import client from '../api/client';

const useMaterialStore = create((set, get) => ({
  items: [],
  selected: new Set(),
  loading: false,
  uploading: false,
  uploadProgress: {}, // { filename: percent }

  filters: {
    categoryId: null,
    search: '',
    type: 'all',
    sort: 'sort_order',
    order: 'desc',
    favorite: null,
  },
  pagination: { page: 1, limit: 40, total: 0 },

  setFilter: (patch) => {
    set(s => ({
      filters: { ...s.filters, ...patch },
      pagination: { ...s.pagination, page: 1 },
    }));
    get().fetchMaterials();
  },

  setPage: (page) => {
    set(s => ({ pagination: { ...s.pagination, page } }));
    get().fetchMaterials();
  },

  fetchMaterials: async () => {
    const { filters, pagination } = get();
    set({ loading: true });
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sort,
        order: filters.order,
      };
      if (filters.categoryId !== null) params.category_id = filters.categoryId;
      if (filters.search) params.search = filters.search;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.favorite !== null) params.favorite = filters.favorite;

      const res = await client.get('/materials', { params });
      set({
        items: res.data,
        pagination: { ...get().pagination, total: res.meta.total },
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  uploadFiles: async (files, categoryId) => {
    set({ uploading: true, uploadProgress: {} });
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (categoryId) formData.append('category_id', categoryId);

    try {
      await client.post('/materials/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 100);
          set({ uploadProgress: { total: pct } });
        },
      });
      set({ uploading: false, uploadProgress: {} });
      await get().fetchMaterials();
    } catch (err) {
      set({ uploading: false, uploadProgress: {} });
      throw err;
    }
  },

  updateMaterial: async (id, data) => {
    await client.put(`/materials/${id}`, data);
    set(s => ({
      items: s.items.map(m => m.id === id ? { ...m, ...data } : m),
    }));
  },

  deleteMaterial: async (id) => {
    await client.delete(`/materials/${id}`);
    set(s => ({
      items: s.items.filter(m => m.id !== id),
      selected: new Set([...s.selected].filter(x => x !== id)),
      pagination: { ...s.pagination, total: s.pagination.total - 1 },
    }));
  },

  batchAction: async (action, extra = {}) => {
    const ids = [...get().selected];
    if (!ids.length) return;
    await client.post('/materials/batch', { ids, action, ...extra });
    set({ selected: new Set() });
    await get().fetchMaterials();
  },

  toggleSelect: (id, shiftKey, lastSelected) => {
    const { items, selected } = get();
    const newSelected = new Set(selected);
    if (shiftKey && lastSelected !== null) {
      const idxA = items.findIndex(m => m.id === lastSelected);
      const idxB = items.findIndex(m => m.id === id);
      const [from, to] = idxA < idxB ? [idxA, idxB] : [idxB, idxA];
      items.slice(from, to + 1).forEach(m => newSelected.add(m.id));
    } else {
      newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    }
    set({ selected: newSelected });
  },

  selectAll: () => {
    const { items, selected } = get();
    if (selected.size === items.length) {
      set({ selected: new Set() });
    } else {
      set({ selected: new Set(items.map(m => m.id)) });
    }
  },

  clearSelection: () => set({ selected: new Set() }),
}));

export default useMaterialStore;
