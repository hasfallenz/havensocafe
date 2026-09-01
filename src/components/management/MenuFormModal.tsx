"use client";

import React, { useState, useEffect, useRef } from "react";
import { MenuItemData, CategoryItem } from "@/types";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { UploadCloud, Image as ImageIcon, Trash2, Link2, Boxes } from "lucide-react";

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItemData | null;
  categories: CategoryItem[];
  onSave: (formData: Partial<MenuItemData>) => Promise<void>;
}

export const MenuFormModal: React.FC<MenuFormModalProps> = ({
  isOpen,
  onClose,
  item,
  categories,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("50");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [useUrlMode, setUseUrlMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategoryId(item.categoryId);
      setPrice(item.price.toString());
      setStock((item.stock !== undefined ? item.stock : 50).toString());
      setDescription(item.description);
      setImageUrl(item.imageUrl);
      setIngredients(item.ingredients || "");
    } else {
      setName("");
      setCategoryId(categories[0]?.id || "");
      setPrice("");
      setStock("50");
      setDescription("");
      setImageUrl("https://images.unsplash.com/photo-1509785307050-d4066910ec1e?q=80&w=800&auto=format&fit=crop");
      setIngredients("");
    }
  }, [item, categories, isOpen]);

  // Handle Device File Upload & Convert to Data URL
  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Harap pilih file gambar yang valid (JPG, PNG, WebP, dll)");
      return;
    }

    // Read image as Base64 Data URL
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId || !price) return;

    const parsedStock = Number(stock) >= 0 ? Number(stock) : 0;
    const computedAvailable = parsedStock > 0;

    setIsSaving(true);
    try {
      await onSave({
        ...(item ? { id: item.id } : {}),
        name: name.trim(),
        categoryId,
        price: Number(price),
        stock: parsedStock,
        isAvailable: computedAvailable,
        description: description.trim(),
        imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?q=80&w=800&auto=format&fit=crop",
        preparationTime: 5,
        ingredients: ingredients.trim(),
        allergens: "None",
        recommendationTags: "[]",
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Edit Menu Item" : "Tambah Menu Baru"}
      description="Kelola item menu, harga, stok porsi, dan foto produk"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2 max-h-[75vh] overflow-y-auto pr-1">
        
        {/* Foto Produk (Unggah dari Device / Perangkat) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Foto Menu Produk
            </label>
            <button
              type="button"
              onClick={() => setUseUrlMode(!useUrlMode)}
              className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Link2 className="w-3 h-3" />
              <span>{useUrlMode ? "Gunakan Unggah File" : "Gunakan Tautan URL"}</span>
            </button>
          </div>

          {useUrlMode ? (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
              {/* Preview Box */}
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-zinc-200 border border-zinc-300 shrink-0 shadow-inner flex items-center justify-center">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-400" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleDeviceFileUpload}
                  className="hidden"
                />
                
                <div>
                  <span className="text-xs font-bold text-zinc-800 block">
                    Pilih Foto dari Galeri / Komputer
                  </span>
                  <span className="text-[11px] text-zinc-500 block mt-0.5">
                    Mendukung format JPG, PNG, WebP (Maks 5MB)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{imageUrl ? "Ganti Foto" : "Unggah Foto"}</span>
                  </button>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Nama Menu *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Havenso Cold Brew Orange"
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Kategori *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price & Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Harga (IDR) *
            </label>
            <input
              type="number"
              required
              min={0}
              step={1000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="32000"
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center justify-between">
              <span>Stok Tersedia (Porsi / Unit) *</span>
              {Number(stock) > 0 ? (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Otomatis Tersedia
                </span>
              ) : (
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Otomatis Habis
                </span>
              )}
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                required
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="50"
                className="w-full p-2.5 pl-8 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
              <Boxes className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Deskripsi Menu
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan cita rasa dan keunikan menu..."
            className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden resize-none"
          />
        </div>

        {/* Ingredients */}
        <div>
          <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Bahan-Bahan Utama (Ingredients)
          </label>
          <input
            type="text"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Contoh: Single Origin Arabica, Fresh Milk, Aren Palm Sugar"
            className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
            Simpan Menu
          </Button>
        </div>
      </form>
    </Modal>
  );
};
