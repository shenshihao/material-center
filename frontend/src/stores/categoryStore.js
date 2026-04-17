import { create } from 'zustand';
import client from '../api/client';

const useCategoryStore = create((set, get) => ({
  tree: [],
  activeId: null, // null = all
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    try {
      const res = await client.get('/categories');
      set({ tree: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActive: (id) => set({ activeId: id }),

  createCategory: async (data) => {
    const res = await client.post('/categories', data);
    await get().fetchCategories();
    return res.data;
  },

  updateCategory: async (id, data) => {
    await client.put(`/categories/${id}`, data);
    await get().fetchCategories();
  },

  deleteCategory: async (id, reassignTo) => {
    const url = reassignTo ? `/categories/${id}?reassign_to=${reassignTo}` : `/categories/${id}`;
    await client.delete(url);
    if (get().activeId === id) set({ activeId: null });
    await get().fetchCategories();
  },

  reorder: async (orders) => {
    await client.put('/categories/reorder', { orders });
    await get().fetchCategories();
  },

  // Flat list helper
  getFlatList: () => {
    const flat = [];
    const walk = (nodes, depth = 0) => {
      nodes.forEach(n => {
        flat.push({ ...n, depth });
        if (n.children?.length) walk(n.children, depth + 1);
      });
    };
    walk(get().tree);
    return flat;
  },
}));

export default useCategoryStore;
