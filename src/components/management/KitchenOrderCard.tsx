"use client";

import React from "react";
import { OrderData, OrderStatus } from "@/types";
import { formatTimeAgo } from "@/lib/utils";
import { Clock, Play, CheckCircle2, Check, AlertCircle } from "lucide-react";

interface KitchenOrderCardProps {
  order: OrderData;
  onAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  order,
  onAdvanceStatus,
}) => {
  const parseCustomizations = (customStr?: string | null) => {
    if (!customStr) return null;
    try {
      const obj = JSON.parse(customStr);
      const parts = [];
      if (obj.temperature) parts.push(obj.temperature.toUpperCase());
      if (obj.sugarLevel) parts.push(`Sugar: ${obj.sugarLevel}`);
      if (obj.iceLevel && obj.iceLevel !== "normal") parts.push(`Ice: ${obj.iceLevel}`);
      if (obj.dairyOption && obj.dairyOption !== "regular") parts.push(`Milk: ${obj.dairyOption}`);
      if (obj.spicyLevel) parts.push(obj.spicyLevel);
      if (obj.notes) parts.push(`"${obj.notes}"`);
      return parts.length > 0 ? parts.join(" • ") : null;
    } catch (e) {
      return customStr;
    }
  };

  const getNextStatus = (current: OrderStatus): { label: string; status: OrderStatus; icon: React.ReactNode; color: string } | null => {
    switch (current) {
      case "QUEUED":
        return {
          label: "Mulai Racik / Masak",
          status: "COOKING",
          icon: <Play className="w-3.5 h-3.5" />,
          color: "bg-amber-600 hover:bg-amber-700 text-white",
        };
      case "COOKING":
        return {
          label: "Pesanan Siap Diantar",
          status: "READY",
          icon: <Check className="w-3.5 h-3.5" />,
          color: "bg-emerald-600 hover:bg-emerald-700 text-white",
        };
      case "READY":
        return {
          label: "Selesai (Diantar)",
          status: "COMPLETED",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          color: "bg-zinc-800 hover:bg-zinc-900 text-white",
        };
      default:
        return null;
    }
  };

  const nextAction = getNextStatus(order.status);

  return (
    <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono font-black text-sm text-zinc-900">
            {order.orderNumber}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(order.createdAt)}</span>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
              Meja {order.tableNumber || "A1"}
            </span>
            {order.customerName && (
              <span className="text-xs font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded-md">
                A/N: {order.customerName}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold text-zinc-500">
            {order.items.length} item
          </span>
        </div>

        {/* Notes Alert */}
        {order.notes && (
          <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900 text-xs font-medium flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>Catatan: {order.notes}</span>
          </div>
        )}

        {/* Items List */}
        <div className="mt-3 flex flex-col gap-2 divide-y divide-zinc-100">
          {order.items.map((item) => {
            const custom = parseCustomizations(item.customizations);
            return (
              <div key={item.id} className="pt-2 first:pt-0 flex flex-col">
                <div className="flex justify-between items-start text-xs font-bold text-zinc-900">
                  <span>
                    {item.quantity}x {item.nameSnapshot}
                  </span>
                </div>
                {custom && (
                  <span className="text-[11px] font-medium text-sky-800 bg-sky-50/60 px-1.5 py-0.5 rounded-md self-start mt-0.5">
                    {custom}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      {nextAction && (
        <div className="pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => onAdvanceStatus(order.id, nextAction.status)}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${nextAction.color}`}
          >
            {nextAction.icon}
            <span>{nextAction.label}</span>
          </button>
        </div>
      )}
    </div>
  );
};
