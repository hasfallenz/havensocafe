"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MenuItemData, CategoryItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { MenuFormModal } from "@/components/management/MenuFormModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Plus, Edit2, Trash2, Search, Coffee, Tags, Check, X } from "lucide-react";

export default function MenuManagementPage() {
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Item Form Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);

  // Category Form Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");

  const loadData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/categories"),
      ]);
      const menuJson = await menuRes.json();
      const catJson = await catRes.json();

      if (menuJson.success) setMenuItems(menuJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Item (Create or Edit)
  const handleSaveItem = async (formData: Partial<MenuItemData>) => {
    try {
      if (formData.id) {
        // Update
        const res = await fetch(`/api/menu/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setMenuItems((prev) =>
            prev.map((i) => (i.id === formData.id ? json.data : i))
          );
        }
      } else {
        // Create
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (json.success) {
          setMenuItems((prev) => [json.data, ...prev]);
        }
      }
    } catch (e) {
      console.error("Save menu item error:", e);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setMenuItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      console.error("Delete menu item error:", e);
    }
  };

  // Save Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    try {
      const slug = categorySlug.trim() || categoryName.toLowerCase().replace(/\s+/g, "-");
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName.trim(),
          slug,
          displayOrder: categories.length + 1,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCategories((prev) => [...prev, json.data]);
        setIsCategoryModalOpen(false);
        setCategoryName("");
        setCategorySlug("");
      }
    } catch (e) {
      console.error("Create category error:", e);
    }
  };

  const filteredItems = menuItems.filter((i) => {
    const matchesCat =
      selectedCategoryFilter === "all" || i.category?.slug === selectedCategoryFilter;
    const matchesSearch =
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            Menu & Kategori (Menu Management)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Atur katalog menu cafe, harga, varian, dan ketersediaan live
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "items" ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Menu</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsCategoryModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "items"
              ? "bg-zinc-900 text-white shadow-xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>Menu Items ({menuItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "categories"
              ? "bg-zinc-900 text-white shadow-xs"
              : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Kategori ({categories.length})</span>
        </button>
      </div>

      {/* Items View */}
      {activeTab === "items" && (
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedCategoryFilter === "all"
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === c.slug
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama menu..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Menu Items Table */}
          <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Menu</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Harga</th>
                    <th className="py-3 px-4">Stok & Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400">
                        Tidak ada menu yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 shrink-0">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-zinc-900 block">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-zinc-500 line-clamp-1">
                                {item.description}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-700">
                          {item.category?.name || "Category"}
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-900">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${
                              item.isAvailable && (item.stock === undefined || item.stock > 0)
                                ? (item.stock ?? 50) <= 5
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isAvailable && (item.stock === undefined || item.stock > 0)
                                  ? (item.stock ?? 50) <= 5
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                  : "bg-rose-500"
                              }`}
                            />
                            <span>
                              {item.isAvailable && (item.stock === undefined || item.stock > 0)
                                ? (item.stock ?? 50) <= 5
                                  ? `Menipis (${item.stock ?? 50} Porsi)`
                                  : `Tersedia (${item.stock ?? 50} Porsi)`
                                : "Habis (0 Porsi)"}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Menu"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Menu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories View */}
      {activeTab === "categories" && (
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Urutan</th>
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4">Jumlah Item</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-zinc-400">
                      #{cat.displayOrder}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500">
                      {cat.slug}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-700">
                      {cat.itemCount || 0} menu
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Modal */}
      <MenuFormModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        categories={categories}
        onSave={handleSaveItem}
      />

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Tambah Kategori Baru"
        description="Buat kategori baru untuk dikelompokkan pada sidebar customer"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCategory} className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Nama Kategori *
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Contoh: Bakery & Pastry"
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Slug URL (Optional)
            </label>
            <input
              type="text"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              placeholder="bakery-pastry"
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div className="pt-2 border-t border-zinc-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md">
              Simpan Kategori
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
