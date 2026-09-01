"use client";

import React from "react";
import { ShieldCheck, User } from "lucide-react";

interface ManagementHeaderProps {
  title?: string;
  subtitle?: string;
  isRealtimeConnected?: boolean;
}

export const ManagementHeader: React.FC<ManagementHeaderProps> = ({
  title = "Havenso Management Operations",
  subtitle = "Sistem kontrol katalog menu, stok inventori, QR meja & analitik",
  isRealtimeConnected = true,
}) => {
  return (
    <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">{subtitle}</p>
        )}
      </div>
    </header>
  );
};

