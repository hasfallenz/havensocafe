"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Settings, Building, Bell, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [cafeName, setCafeName] = useState("Havenso Cafe");
  const [taxRate, setTaxRate] = useState("10");
  const [wifiSsid, setWifiSsid] = useState("Havenso_Guest_5G");
  const [wifiPassword, setWifiPassword] = useState("havenso2026");
  const [supportTimeout, setSupportTimeout] = useState("180"); // seconds
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
          Pengaturan Bisnis & Operasional (Settings)
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Konfigurasi profil cafe, perpajakan, dan timeout eskalasi bantuan
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan berhasil disimpan!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Section 1: Cafe Business Info */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Building className="w-4 h-4 text-zinc-700" />
            <h3 className="font-extrabold text-sm text-zinc-900">
              Informasi Umum Cafe
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Nama Cafe / Brand
              </label>
              <input
                type="text"
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Pajak Restoran PB1 (%)
              </label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                WiFi SSID (Untuk Customer)
              </label>
              <input
                type="text"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Password WiFi
              </label>
              <input
                type="text"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Support Escalation Rules */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Bell className="w-4 h-4 text-zinc-700" />
            <h3 className="font-extrabold text-sm text-zinc-900">
              Aturan Eskalasi Bantuan & Timeout
            </h3>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Timeout Tiket Menunggu (Detik sebelum Auto-Notify Staff)
            </label>
            <input
              type="number"
              value={supportTimeout}
              onChange={(e) => setSupportTimeout(e.target.value)}
              className="w-full sm:w-64 mt-1 p-2.5 rounded-xl border border-zinc-300 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
            <span className="text-[11px] text-zinc-500 block mt-1">
              Tiket yang tidak diambil dalam durasi ini akan berubah prioritas menjadi P1 Critical.
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="lg" className="gap-2">
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
