"use client";

import React, { useState, useEffect, useMemo } from "react";
import { InventoryItemData } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemData | null>(null);
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("kg");
  const [isSaving, setIsSaving] = useState(false);

  const loadInventory = async () => {
    try {
      const res = await fetch("/api/admin/inventory");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Open Add / Edit Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setName("");
    setStock("10");
    setUnit("kg");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItemData) => {
    setEditingItem(item);
    setName(item.name);
    setStock(item.stock.toString());
    setUnit(item.unit);
    setIsModalOpen(true);
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Hapus bahan baku ini dari inventori?")) return;
    try {
      const res = await fetch(`/api/admin/inventory?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (e) {
      console.error("Delete inventory item error:", e);
    }
  };

  // Submit Add / Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const stockNum = Math.max(0, Number(stock) || 0);

    try {
      if (editingItem) {
        const res = await fetch("/api/admin/inventory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            name: name.trim(),
            stock: stockNum,
            unit: unit.trim() || "pcs",
          }),
        });
        const json = await res.json();
        if (json.success) {
          setItems((prev) => prev.map((i) => (i.id === editingItem.id ? json.data : i)));
          setIsModalOpen(false);
        }
      } else {
        const res = await fetch("/api/admin/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            stock: stockNum,
            unit: unit.trim() || "pcs",
          }),
        });
        const json = await res.json();
        if (json.success) {
          setItems((prev) => [...prev, json.data]);
          setIsModalOpen(false);
        }
      }
    } catch (e) {
      console.error("Save inventory item error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "AVAILABLE" && item.stock > 5) ||
        (statusFilter === "LOW_STOCK" && item.stock > 0 && item.stock <= 5) ||
        (statusFilter === "OUT_OF_STOCK" && item.stock <= 0);

      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  // Summary counts
  const availableCount = items.filter((i) => i.stock > 5).length;
  const lowStockCount = items.filter((i) => i.stock > 0 && i.stock <= 5).length;
  const outOfStockCount = items.filter((i) => i.stock <= 0).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-zinc-700" />
            <span>Stok Inventori (Bahan Baku)</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola stok bahan makanan dan racikan minuman Havenso Cafe
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleOpenAdd}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Bahan Baku</span>
        </Button>
      </div>

      {/* Stats Summary Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
          }`}
        >
          <span className="text-[11px] font-bold block opacity-70">Total Bahan</span>
          <span className="text-xl font-black mt-0.5 block">{items.length} Item</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("AVAILABLE")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "AVAILABLE"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-emerald-50/50"
          }`}
        >
          <span className="text-[11px] font-bold block text-emerald-600">Stok Aman</span>
          <span className="text-xl font-black mt-0.5 block">{availableCount} Item</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("LOW_STOCK")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "LOW_STOCK"
              ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-amber-50/50"
          }`}
        >
          <span className="text-[11px] font-bold block text-amber-600">Stok Menipis</span>
          <span className="text-xl font-black mt-0.5 block">{lowStockCount} Item</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("OUT_OF_STOCK")}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "OUT_OF_STOCK"
              ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
              : "bg-white text-zinc-800 border-zinc-200 hover:bg-rose-50/50"
          }`}
        >
          <span className="text-[11px] font-bold block text-rose-600">Stok Habis</span>
          <span className="text-xl font-black mt-0.5 block">{outOfStockCount} Item</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama bahan baku..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
        />
      </div>

      {/* Clean Inventory Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nama Bahan</th>
                <th className="py-3.5 px-4">Stok</th>
                <th className="py-3.5 px-4">Satuan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Tidak ada bahan baku yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isAvailable = item.stock > 5;
                  const isLow = item.stock > 0 && item.stock <= 5;
                  const isOut = item.stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* 1. Nama Bahan */}
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {item.name}
                      </td>

                      {/* 2. Stok */}
                      <td className="py-3.5 px-4 font-mono font-black text-sm text-zinc-900">
                        {item.stock}
                      </td>

                      {/* 3. Satuan */}
                      <td className="py-3.5 px-4 font-semibold text-zinc-600">
                        {item.unit}
                      </td>

                      {/* 4. Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-2xs ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isLow
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable
                                ? "bg-emerald-500"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span>
                            {isAvailable ? "Tersedia" : isLow ? "Menipis" : "Habis"}
                          </span>
                        </span>
                      </td>

                      {/* 5. Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Bahan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Bahan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
        description="Kelola nama, stok jumlah, dan satuan bahan"
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Nama Bahan *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Minyak Goreng"
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Jumlah Stok *
              </label>
              <input
                type="number"
                required
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="25"
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Satuan *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden bg-white"
              >
                <option value="kg">kg (Kilogram)</option>
                <option value="liter">liter</option>
                <option value="gram">gram</option>
                <option value="botol">botol</option>
                <option value="kaleng">kaleng</option>
                <option value="butir">butir</option>
                <option value="porsi">porsi</option>
                <option value="pack">pack</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
              Simpan Bahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
