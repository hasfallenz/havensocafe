"use client";

import React from "react";
import Link from "next/link";
import { TableItem } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import { ExternalLink, Users, MapPin, Printer } from "lucide-react";

interface TableQrCardProps {
  table: TableItem;
  onUpdateStatus?: (tableId: string, status: string) => void;
}

export const TableQrCard: React.FC<TableQrCardProps> = ({
  table,
  onUpdateStatus,
}) => {
  const customerUrl = `/customer?table=${table.tableNumber}`;

  const handlePrint = () => {
    window.open(customerUrl, "_blank");
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-black text-xl text-zinc-900 block leading-tight">
            Meja {table.tableNumber}
          </span>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {table.capacity} Kursi
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {table.location}
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            table.status === "AVAILABLE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : table.status === "OCCUPIED"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-zinc-100 text-zinc-700 border-zinc-200"
          }`}
        >
          {table.status}
        </span>
      </div>

      {/* QR Code Container */}
      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-50 border border-zinc-100 gap-2">
        <div className="p-2.5 bg-white rounded-xl shadow-xs border border-zinc-200/80">
          <QRCodeSVG value={customerUrl} size={120} level="M" />
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          havenso.cafe{customerUrl}
        </span>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
        <Link
          href={customerUrl}
          target="_blank"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-colors"
        >
          <span>Test Buka</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200 transition-colors cursor-pointer"
          title="Print QR"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
