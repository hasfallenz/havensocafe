"use client";

import React, { useState, useEffect } from "react";
import { TableItem } from "@/types";
import { TableQrCard } from "@/components/management/TableQrCard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Plus, QrCode, MapPin } from "lucide-react";

export default function TablesManagementPage() {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [location, setLocation] = useState("Indoor Main");
  const [isSaving, setIsSaving] = useState(false);

  const loadTables = async () => {
    try {
      const res = await fetch("/api/admin/tables");
      const json = await res.json();
      if (json.success) setTables(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: tableNumber.trim().toUpperCase(),
          capacity: Number(capacity),
          location,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTables((prev) => [...prev, json.data]);
        setIsAddModalOpen(false);
        setTableNumber("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            Manajemen Meja & QR Code (Tables)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola nomor meja, kapasitas tempat duduk, dan cetak QR Code customer
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Meja</span>
        </Button>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => (
          <TableQrCard key={table.id} table={table} />
        ))}
      </div>

      {/* Add Table Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Meja Baru"
        description="Daftarkan nomor meja baru untuk generate link QR Code otomatis"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateTable} className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Nomor Meja *
            </label>
            <input
              type="text"
              required
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Contoh: A13, B09, VIP1"
              className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Kapasitas Kursi
              </label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="4"
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Area / Lokasi
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden bg-white"
              >
                <option value="Indoor Main">Indoor Main</option>
                <option value="Indoor Window">Indoor Window</option>
                <option value="Outdoor Garden">Outdoor Garden</option>
                <option value="VIP Glasshouse">VIP Glasshouse</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
              Simpan Meja
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
