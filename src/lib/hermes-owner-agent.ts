import { prisma } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/seed-data";
import { eventBus } from "@/lib/events";

export interface OwnerChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OwnerAgentResponse {
  reply: string;
  dataSnapshot?: Record<string, any>;
}

/**
 * Gather live ground-truth metrics directly from the Prisma database.
 * HERMES NEVER FABRICATES DATA — This is the single source of truth.
 */
export async function getOwnerBusinessSnapshot() {
  await ensureDatabaseSeeded();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);
  yesterdayEnd.setMilliseconds(-1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // 1. Orders & Sales
  const [
    allOrders,
    todayPaidOrders,
    yesterdayPaidOrders,
    weekPaidOrders,
    activeKitchenOrders,
    cancelledOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true, payments: true },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: "SUCCESS",
        createdAt: { gte: todayStart },
      },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: "SUCCESS",
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    }),
    prisma.order.findMany({
      where: {
        paymentStatus: "SUCCESS",
        createdAt: { gte: weekStart },
      },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["QUEUED", "COOKING"] },
      },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: {
        status: "CANCELLED",
        createdAt: { gte: weekStart },
      },
    }),
  ]);

  const todayRevenue = todayPaidOrders.reduce((sum, o) => sum + o.total, 0);
  const todayOrderCount = todayPaidOrders.length;
  const todayAov = todayOrderCount > 0 ? Math.round(todayRevenue / todayOrderCount) : 0;

  const yesterdayRevenue = yesterdayPaidOrders.reduce((sum, o) => sum + o.total, 0);
  const yesterdayOrderCount = yesterdayPaidOrders.length;

  const weekRevenue = weekPaidOrders.reduce((sum, o) => sum + o.total, 0);
  const weekOrderCount = weekPaidOrders.length;

  // Calculate percentage differences
  let revenueDiffPercent: number | null = null;
  if (yesterdayRevenue > 0) {
    revenueDiffPercent = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
  }

  // 2. Menu Item Sales Aggregation (Best Sellers & Low Sellers)
  const itemSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const o of weekPaidOrders) {
    for (const item of o.items) {
      if (!itemSalesMap[item.nameSnapshot]) {
        itemSalesMap[item.nameSnapshot] = { name: item.nameSnapshot, quantity: 0, revenue: 0 };
      }
      itemSalesMap[item.nameSnapshot].quantity += item.quantity;
      itemSalesMap[item.nameSnapshot].revenue += item.subtotal;
    }
  }

  const sortedItemSales = Object.values(itemSalesMap).sort((a, b) => b.quantity - a.quantity);
  const bestSellers = sortedItemSales.slice(0, 5);
  const lowSellers = sortedItemSales.slice(-5).reverse();

  // 3. Menus in Catalog
  const allMenuItems = await prisma.menuItem.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const outOfStockMenus = allMenuItems.filter(
    (m) => !m.isAvailable || (m.stock !== undefined && m.stock <= 0)
  );

  // 4. Inventory Stock
  const inventoryItems = await prisma.inventoryItem.findMany({
    orderBy: { stock: "asc" },
  });
  const lowStockInventory = inventoryItems.filter(
    (i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK" || i.stock <= i.minStock
  );

  // 5. Tables Occupancy
  const tables = await prisma.table.findMany();
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED");
  const availableTables = tables.filter((t) => t.status === "AVAILABLE");

  // 6. Support Tickets
  const openTickets = await prisma.supportTicket.findMany({
    where: { status: { in: ["OPEN", "WAITING", "IN_PROGRESS"] } },
  });

  // 7. Recent Staff Stock Reports
  const recentStaffStockReports = await prisma.auditLog.findMany({
    where: { action: "STAFF_STOCK_REPORT" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return {
    timestamp: now.toISOString(),
    sales: {
      todayRevenue,
      todayOrderCount,
      todayAov,
      yesterdayRevenue,
      yesterdayOrderCount,
      revenueDiffPercent,
      weekRevenue,
      weekOrderCount,
    },
    bestSellers,
    lowSellers,
    operational: {
      activeKitchenCount: activeKitchenOrders.length,
      activeKitchenOrders: activeKitchenOrders.map((o) => ({
        orderNumber: o.orderNumber,
        tableNumber: o.tableNumber,
        status: o.status,
        itemCount: o.items.length,
        items: o.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", "),
      })),
      cancelledThisWeekCount: cancelledOrders.length,
      openSupportTicketsCount: openTickets.length,
    },
    inventory: {
      totalItems: inventoryItems.length,
      lowStockCount: lowStockInventory.length,
      lowStockList: lowStockInventory.map((i) => ({
        name: i.name,
        stock: i.stock,
        minStock: i.minStock,
        unit: i.unit,
        status: i.status,
      })),
    },
    menu: {
      totalMenuItems: allMenuItems.length,
      outOfStockCount: outOfStockMenus.length,
      outOfStockList: outOfStockMenus.map((m) => m.name),
    },
    tables: {
      totalTables: tables.length,
      occupiedCount: occupiedTables.length,
      availableCount: availableTables.length,
      occupiedList: occupiedTables.map((t) => t.tableNumber),
    },
    recentOrders: allOrders.slice(0, 5).map((o) => ({
      orderNumber: o.orderNumber,
      tableNumber: o.tableNumber || "Takeaway",
      customerName: o.customerName || "Tamu",
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
      itemsSummary: o.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(", "),
    })),
    recentStaffStockReports: recentStaffStockReports.map((r) => ({
      id: r.id,
      staffName: r.userName || "Staff",
      details: r.details || "",
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

interface ParsedRestockItem {
  name: string;
  amount: number;
  unit: string;
}

interface ParsedEditStockItem {
  item: { id: string; name: string; unit: string; stock: number; minStock: number } | null;
  rawName: string;
  targetStock: number;
  unit?: string;
}

interface ParsedDeleteItem {
  item: { id: string; name: string; unit: string; stock: number } | null;
  targetName: string;
}

function normalizeUnit(unit: string): string {
  const u = (unit || "").toLowerCase().trim();
  if (u === "l") return "liter";
  if (u === "kilogram") return "kg";
  if (u === "gr" || u === "g") return "gram";
  if (u === "buah") return "pcs";
  return u;
}

function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const UNIT_REGEX = "(?:liter|l|kg|kilogram|gram|gr|g|pcs|buah|butir|botol|pack|bungkus|cup|shot|kaleng|box|dus|porsi)";

export function parseDeleteInventoryItem(
  prompt: string,
  existingItems: Array<{ id: string; name: string; unit: string; stock: number }>
): ParsedDeleteItem | null {
  const pLower = prompt.toLowerCase();
  const isDeleteCommand =
    pLower.includes("hapus") ||
    pLower.includes("delete") ||
    pLower.includes("buang") ||
    pLower.includes("hilangkan") ||
    pLower.includes("remove");

  if (!isDeleteCommand) return null;
  if (pLower.includes("bisa dihapus") || pLower.includes("cara hapus") || pLower.includes("jangan hapus")) return null;

  const clean = prompt
    .replace(/^(tolong|mohon|harap|bisa|coba)?\s*(hapus|delete|buang|hilangkan|remove)\s*(bahan baku|bahan|stok|item)?\s*/i, "")
    .replace(/\s*dari\s*(inventori|stok|database|dapur|bar|kafe|sistem).*/i, "")
    .trim();

  for (const item of existingItems) {
    const itemNameLower = item.name.toLowerCase();
    if (
      pLower.includes(itemNameLower) ||
      clean.toLowerCase() === itemNameLower ||
      (clean.length >= 3 && itemNameLower.includes(clean.toLowerCase()))
    ) {
      return { item, targetName: item.name };
    }
  }

  return { item: null, targetName: clean };
}

export function parseEditStockItem(
  prompt: string,
  existingItems: Array<{ id: string; name: string; unit: string; stock: number; minStock: number }>
): ParsedEditStockItem | null {
  const pLower = prompt.toLowerCase();
  const isEdit =
    pLower.includes("ubah") ||
    pLower.includes("ganti") ||
    pLower.includes("koreksi") ||
    pLower.includes("edit") ||
    pLower.includes("set ") ||
    pLower.startsWith("set") ||
    pLower.includes("update") ||
    pLower.includes("atur") ||
    pLower.includes("jadikan");

  if (!isEdit) return null;
  if (pLower.includes("bisa diubah") || pLower.includes("cara ubah") || pLower.includes("kenapa")) return null;

  const clean = prompt
    .replace(/^(tolong|mohon|harap|bisa|coba)?\s*(ubah|ganti|koreksi|edit|set|update|atur)\s*(stok|bahan baku|bahan)?\s*/i, "")
    .trim();

  // Pattern 1: [Item] (?:jadi|menjadi|ke|=) [Amount] [Unit?]
  const m1 = clean.match(new RegExp(`^(.*?)\\s*(?:jadi|menjadi|ke|=)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_REGEX})?$`, "i"));
  if (m1) {
    const rawName = m1[1].replace(/^(stok|bahan baku|bahan)\s*/i, "").trim();
    const amount = parseFloat(m1[2].replace(",", "."));
    const unit = normalizeUnit(m1[3] || "");
    const matched = existingItems.find(
      (i) =>
        i.name.toLowerCase() === rawName.toLowerCase() ||
        i.name.toLowerCase().includes(rawName.toLowerCase()) ||
        rawName.toLowerCase().includes(i.name.toLowerCase())
    );
    return { item: matched || null, rawName, targetStock: amount, unit };
  }

  // Pattern 2: [Item] [Amount] [Unit]
  const m2 = clean.match(new RegExp(`^(.*?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_REGEX})$`, "i"));
  if (m2) {
    const rawName = m2[1].replace(/^(stok|bahan baku|bahan)\s*/i, "").trim();
    const amount = parseFloat(m2[2].replace(",", "."));
    const unit = normalizeUnit(m2[3] || "");
    const matched = existingItems.find(
      (i) =>
        i.name.toLowerCase() === rawName.toLowerCase() ||
        i.name.toLowerCase().includes(rawName.toLowerCase()) ||
        rawName.toLowerCase().includes(i.name.toLowerCase())
    );
    return { item: matched || null, rawName, targetStock: amount, unit };
  }

  return null;
}

const FORBIDDEN_MATERIAL_NAMES = new Set([
  "mau", "ingin", "tambah", "tambahkan", "buat", "bikin", "daftar", "daftarkan",
  "bahan", "baku", "bahan baku", "bahan baru", "bahan baku baru", "stok", "stok baru",
  "baru", "new", "item", "item baru", "produk", "produk baru", "ada", "semua",
  "tolong", "mohon", "coba", "bisa", "dong", "ya", "boss", "bos", "apa", "gimana"
]);

export function checkGenericInventoryIntent(
  prompt: string,
  existingItems: Array<{ id: string; name: string }> = []
): "NEW_MATERIAL_PROMPT" | "RESTOCK_EXISTING_PROMPT" | null {
  const pLower = prompt.toLowerCase().trim();

  // If the prompt contains a number, it's likely a specific quantity instruction
  if (/\d+/.test(pLower)) return null;

  // If the prompt matches an existing item name exactly
  const matchesExisting = existingItems.some(
    (i) => i.name.toLowerCase() === pLower || pLower.startsWith(i.name.toLowerCase() + " ")
  );
  if (matchesExisting) return null;

  // Normalize by removing politeness / filler words
  const normalized = pLower
    .replace(/^(halo|hai|p|pe|tes|test|permisi|bro|boss|bos|min|admin|tolong dong|tolong|mohon|harap|bisa dong|bisa|coba)?\s*/gi, "")
    .replace(/\s*(dong|ya|min|boss|bos|kak|bro|sih)$/gi, "")
    .trim();

  // 1. Generic "Tambah Bahan Baku Baru" / "Buat Bahan Baru" intent
  const isNewMaterialGeneral =
    /^(mau|ingin|pengen|bisa|tolong)?\s*(tambah|buat|bikin|daftarkan|daftarin|create|input)\s*(bahan baku baru|bahan baru|bahan baku|item baru|produk baru)$/i.test(normalized) ||
    /^(tambah|buat|bikin|daftarkan|daftarin|create|input)\s*(bahan baku baru|bahan baru|bahan baku)$/i.test(normalized) ||
    normalized === "mau tambah bahan baku" ||
    normalized === "tambah bahan baku" ||
    normalized === "mau tambah bahan baru" ||
    normalized === "tambah bahan baru" ||
    normalized === "mau tambah bahan baku baru" ||
    normalized === "tambah bahan baku baru" ||
    normalized === "buat bahan baku baru" ||
    normalized === "buat bahan baru" ||
    normalized === "bikin bahan baku baru" ||
    normalized === "bikin bahan baru" ||
    normalized === "daftarkan bahan baru" ||
    normalized === "daftarkan bahan baku baru";

  if (isNewMaterialGeneral) return "NEW_MATERIAL_PROMPT";

  // 2. Generic "Tambah Stok" / "Restock" intent
  const isRestockGeneral =
    /^(mau|ingin|pengen|bisa|tolong)?\s*(tambah|isi ulang|update|koreksi)?\s*stok(\s*baru)?$/i.test(normalized) ||
    /^(mau|ingin|pengen)?\s*restock(\s*stok|\s*bahan)?$/i.test(normalized) ||
    normalized === "tambah stok" ||
    normalized === "mau tambah stok" ||
    normalized === "tambah stok baru" ||
    normalized === "mau restock" ||
    normalized === "restock" ||
    normalized === "restock bahan" ||
    normalized === "restock stok" ||
    normalized === "isi ulang stok";

  if (isRestockGeneral) return "RESTOCK_EXISTING_PROMPT";

  return null;
}

export function parseRestockItems(
  prompt: string,
  isContextAnswering: boolean = false
): ParsedRestockItem[] {
  const pLower = prompt.toLowerCase().trim();

  // If it's a generic intent without specific item, do NOT parse as items
  if (checkGenericInventoryIntent(prompt)) return [];

  const isEditOrDelete =
    pLower.includes("hapus") ||
    pLower.includes("delete") ||
    pLower.includes("buang") ||
    pLower.includes("ubah") ||
    pLower.includes("ganti") ||
    pLower.includes("koreksi") ||
    pLower.includes("edit") ||
    pLower.includes("set ");

  if (isEditOrDelete) return [];

  const isAddCommand =
    isContextAnswering ||
    pLower.includes("tambah") ||
    pLower.includes("buat") ||
    pLower.includes("bikin") ||
    pLower.includes("daftar") ||
    pLower.includes("masuk") ||
    pLower.includes("restock") ||
    pLower.includes("isi ulang") ||
    pLower.includes("input") ||
    pLower.includes("beli") ||
    pLower.includes("create") ||
    pLower.includes("add") ||
    (/\d+/.test(pLower) && new RegExp(UNIT_REGEX, "i").test(pLower));

  if (!isAddCommand) return [];

  // Remove prefixes
  let clean = prompt
    .replace(
      /^(tolong|mohon|harap|bisa|coba|tolong dong)?\s*(tambahkan|tambahin|tambah|buatkan|buat|bikin|bikinin|daftarkan|daftarin|daftar|masukkan|masukin|masuk|input|restock|isi ulang|create|add|beli|stok)\s*(bahan baku|bahan|stok|item|produk)?\s*(baru|anyar|new)?\s*/i,
      ""
    )
    .replace(/^(bahan baku|bahan|stok|item)\s*(baru)?\s*/i, "")
    .replace(/^(baru|new)\s+/i, "")
    .trim();

  const parts = clean.split(/[,;&]|\s+dan\s+/i).map((s) => s.trim()).filter(Boolean);
  const results: ParsedRestockItem[] = [];

  for (const part of parts) {
    let subClean = part
      .replace(/^(tambahkan|tambahin|tambah|buatkan|buat|bikin|daftarkan|daftarin|masukkan|masukin|stok|bahan baku|bahan|item)\s*(baru)?\s*/i, "")
      .replace(/^(baru|new)\s+/i, "")
      .trim();

    // Pattern 0: [Item Name] (?:tambah|tambahin|tambahkan) [Number] [Unit?] e.g. "beras tambah 6kg", "minyak tambah 5 liter"
    const pattern0 = new RegExp(`^(.*?)\\s+(?:tambah|tambahin|tambahkan|isi|masuk|buat|bikin)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_REGEX})?$`, "i");
    const m0 = subClean.match(pattern0);
    if (m0) {
      let rawName = m0[1].trim().replace(/^(tambah|buat|bikin|daftar|masuk|bahan|stok)\s+/i, "").replace(/^(baru|new)\s+/i, "").trim();
      const amount = parseFloat(m0[2].replace(",", "."));
      let unit = (m0[3] || "").toLowerCase().trim();
      if (!unit) {
        if (rawName.toLowerCase().includes("minyak") || rawName.toLowerCase().includes("susu") || rawName.toLowerCase().includes("air")) unit = "liter";
        else if (rawName.toLowerCase().includes("telur")) unit = "butir";
        else if (rawName.toLowerCase().includes("beras") || rawName.toLowerCase().includes("gula") || rawName.toLowerCase().includes("kopi") || rawName.toLowerCase().includes("daging")) unit = "kg";
        else unit = "pcs";
      }
      if (rawName && !FORBIDDEN_MATERIAL_NAMES.has(rawName.toLowerCase()) && !isNaN(amount) && amount > 0) {
        results.push({ name: capitalizeWords(rawName), amount, unit: normalizeUnit(unit) });
        continue;
      }
    }

    // Pattern 1: [Item Name] [Number] [Unit?] e.g. "minyak 5liter", "gula 5kg", "kacang almond 10kg"
    const pattern1 = new RegExp(`^([a-zA-Z\\s]+?)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_REGEX})?$`, "i");
    const m1 = subClean.match(pattern1);
    if (m1) {
      let rawName = m1[1].trim().replace(/^(tambah|buat|bikin|daftar|masuk|bahan|stok)\s+/i, "").replace(/^(baru|new)\s+/i, "").trim();
      const amount = parseFloat(m1[2].replace(",", "."));
      let unit = (m1[3] || "").toLowerCase().trim();
      if (!unit) {
        if (rawName.toLowerCase().includes("minyak") || rawName.toLowerCase().includes("susu") || rawName.toLowerCase().includes("air")) unit = "liter";
        else if (rawName.toLowerCase().includes("telur")) unit = "butir";
        else if (rawName.toLowerCase().includes("beras") || rawName.toLowerCase().includes("gula") || rawName.toLowerCase().includes("kopi") || rawName.toLowerCase().includes("daging")) unit = "kg";
        else unit = "pcs";
      }
      if (rawName && !FORBIDDEN_MATERIAL_NAMES.has(rawName.toLowerCase()) && !isNaN(amount) && amount > 0) {
        results.push({ name: capitalizeWords(rawName), amount, unit: normalizeUnit(unit) });
        continue;
      }
    }

    // Pattern 2: [Number] [Unit?] [Item Name] e.g. "5 liter minyak", "5kg gula", "10kg kacang almond"
    const pattern2 = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_REGEX})?\\s*(?:dari|bahan baku|bahan|stok|baru)?\\s*([a-zA-Z\\s]+)$`, "i");
    const m2 = subClean.match(pattern2);
    if (m2) {
      const amount = parseFloat(m2[1].replace(",", "."));
      let unit = (m2[2] || "").toLowerCase().trim();
      const rawName = m2[3].trim().replace(/^(baru|new)\s+/i, "").trim();
      if (!unit) {
        if (rawName.toLowerCase().includes("minyak") || rawName.toLowerCase().includes("susu") || rawName.toLowerCase().includes("air")) unit = "liter";
        else if (rawName.toLowerCase().includes("telur")) unit = "butir";
        else if (rawName.toLowerCase().includes("beras") || rawName.toLowerCase().includes("gula") || rawName.toLowerCase().includes("kopi") || rawName.toLowerCase().includes("daging")) unit = "kg";
        else unit = "pcs";
      }
      if (rawName && !FORBIDDEN_MATERIAL_NAMES.has(rawName.toLowerCase()) && !isNaN(amount) && amount > 0) {
        results.push({ name: capitalizeWords(rawName), amount, unit: normalizeUnit(unit) });
        continue;
      }
    }

    // Pattern 3: Item Name only without number (e.g. "Kopi Robusta" or "Keju Mozarella")
    if (subClean.length >= 2 && !/\d+/.test(subClean)) {
      const rawName = subClean
        .replace(/^(tambah|buat|bikin|daftar|masuk|bahan|stok)\s+/i, "")
        .replace(/^(baru|new)\s+/i, "")
        .trim();
      if (
        rawName &&
        !FORBIDDEN_MATERIAL_NAMES.has(rawName.toLowerCase()) &&
        !/^(bisa|bagaimana|cara|kenapa|apa|gimana|halo|hai|tes)/i.test(rawName) &&
        rawName.length >= 3
      ) {
        let unit = "pcs";
        const lower = rawName.toLowerCase();
        if (lower.includes("sirup") || lower.includes("syrup") || lower.includes("kecap") || lower.includes("saus")) unit = "botol";
        else if (lower.includes("susu") || lower.includes("minyak") || lower.includes("air") || lower.includes("jus") || lower.includes("cair")) unit = "liter";
        else if (lower.includes("kopi") || lower.includes("beras") || lower.includes("gula") || lower.includes("tepung") || lower.includes("daging") || lower.includes("ayam") || lower.includes("bawang") || lower.includes("keju") || lower.includes("kacang")) unit = "kg";
        else if (lower.includes("bubuk") || lower.includes("powder") || lower.includes("matcha") || lower.includes("garlic")) unit = "gram";
        else if (lower.includes("telur")) unit = "butir";

        results.push({ name: capitalizeWords(rawName), amount: 10, unit: normalizeUnit(unit) });
        continue;
      }
    }
  }

  return results;
}

/**
 * Process an Owner request using the Hermes Owner Assistant brain.
 */
export async function processHermesOwnerRequest(
  userPrompt: string,
  conversationHistory: OwnerChatMessage[] = []
): Promise<OwnerAgentResponse> {
  const existingInventory = await prisma.inventoryItem.findMany();

  // 0. CHECK GENERIC INTENTS (Validasi Otak Hermes Sebelum Menggerakkan Tangan)
  const genericIntent = checkGenericInventoryIntent(userPrompt, existingInventory);

  if (genericIntent === "RESTOCK_EXISTING_PROMPT") {
    const lowStockItems = existingInventory.filter(
      (i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK" || i.stock <= i.minStock
    );
    let lowStockText = "";
    if (lowStockItems.length > 0) {
      lowStockText = "\n\n⚠️ **Rekomendasi Bahan Kritis / Menipis Saat Ini:**\n" +
        lowStockItems.slice(0, 4).map((i) => `- **${i.name}**: tersisa ${i.stock} ${i.unit} (Batas Min: ${i.minStock} ${i.unit})`).join("\n");
    }

    return {
      reply: [
        "**Baik Boss, mau tambah stok bahan apa?** ☕",
        "",
        "Boss bisa bebas memilih bahan yang sudah ada di inventori kafe, misalnya:",
        "- *“Beras tambah 6kg”*",
        "- *“Minyak 5 liter”*",
        "- *“Susu Fresh Milk 10 liter”*",
        "- *“Telur 30 butir”*" + lowStockText,
        "",
        "Silakan sebutkan bahan dan jumlahnya, nanti tangan saya yang langsung bekerja menambahkan stoknya di sistem inventori! 👨‍🍳📦",
      ].join("\n"),
      dataSnapshot: await getOwnerBusinessSnapshot(),
    };
  }

  if (genericIntent === "NEW_MATERIAL_PROMPT") {
    return {
      reply: [
        "**Boleh, Boss! Mau tambah bahan baku apa?** ✨",
        "",
        "Silakan sebutkan nama bahan baku baru yang ingin dibuat, perkiraan stok awal, dan satuannya, misalnya:",
        "- *“Kacang Almond 10kg”*",
        "- *“Sirup Pandan 5 botol”*",
        "- *“Keju Mozarella 5 kg”*",
        "",
        "Beri tahu saya nama bahannya, nanti tangan saya yang langsung bergerak membuatkan (*create*) bahan baku baru tersebut di inventori kafe! 👨‍🍳📦",
      ].join("\n"),
      dataSnapshot: await getOwnerBusinessSnapshot(),
    };
  }

  // ACTION HANDLER 1: Hapus Bahan Baku (Otak & Tangan Hermes AI)
  const deleteAction = parseDeleteInventoryItem(userPrompt, existingInventory);
  if (deleteAction) {
    if (deleteAction.item) {
      const deletedItem = deleteAction.item;
      await prisma.inventoryItem.delete({
        where: { id: deletedItem.id },
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: "DELETE_INVENTORY",
            userName: "OWNER (via Hermes AI)",
            entity: "InventoryItem",
            entityId: deletedItem.id,
            details: JSON.stringify({
              name: deletedItem.name,
              stockBefore: deletedItem.stock,
              unit: deletedItem.unit,
            }),
          },
        });
      } catch (_) {}

      // Broadcast realtime event so inventory pages update immediately
      eventBus.broadcast("INVENTORY_CHANGED", {
        action: "DELETE",
        itemId: deletedItem.id,
        name: deletedItem.name,
      });

      const updatedSnapshot = await getOwnerBusinessSnapshot();
      return {
        reply: [
          "**✅ Siap, Boss! Bahan Baku Berhasil Dihapus dari Inventori**",
          "",
          `Permintaan Boss untuk menghapus bahan baku telah selesai dieksekusi detik ini:`,
          `- 🗑️ **${deletedItem.name}** (Stok terakhir: ${deletedItem.stock} ${deletedItem.unit}) telah resmi dihapus dari sistem inventaris Havenso Cafe.`,
          "",
          "**🔎 Status Operasional**",
          "Daftar inventori dapur dan bar otomatis tersinkronisasi realtime tanpa bahan ini lagi. Beri tahu saya jika ada penyesuaian lain yang Boss perlukan! 👨‍🍳✨",
        ].join("\n"),
        dataSnapshot: updatedSnapshot,
      };
    } else {
      return {
        reply: [
          "**⚠️ Boss, Bahan Baku Tidak Ditemukan**",
          "",
          `Saya mencari bahan baku **"${deleteAction.targetName}"** di daftar inventori kafe, namun item tersebut belum terdaftar di database.`,
          "Silakan cek ejaan nama bahan baku atau beri tahu saya jika Boss ingin mendaftarkan bahan baru terlebih dahulu! ☕",
        ].join("\n"),
      };
    }
  }

  // ACTION HANDLER 2: Ubah / Koreksi Stok Bahan Baku (Otak & Tangan Hermes AI)
  const editAction = parseEditStockItem(userPrompt, existingInventory);
  if (editAction) {
    if (editAction.item) {
      const targetItem = editAction.item;
      const newStock = Math.max(0, Math.round(editAction.targetStock * 100) / 100);
      const unitToUse = editAction.unit || targetItem.unit;

      let newStatus = "AVAILABLE";
      if (newStock <= 0) newStatus = "OUT_OF_STOCK";
      else if (newStock <= targetItem.minStock) newStatus = "LOW_STOCK";

      await prisma.inventoryItem.update({
        where: { id: targetItem.id },
        data: {
          stock: newStock,
          status: newStatus,
          unit: unitToUse,
        },
      });

      try {
        await prisma.auditLog.create({
          data: {
            action: "UPDATE_INVENTORY",
            userName: "OWNER (via Hermes AI)",
            entity: "InventoryItem",
            entityId: targetItem.id,
            details: JSON.stringify({
              name: targetItem.name,
              stockBefore: targetItem.stock,
              stockAfter: newStock,
              unit: unitToUse,
            }),
          },
        });
      } catch (_) {}

      // Broadcast realtime event so inventory pages update immediately
      eventBus.broadcast("INVENTORY_CHANGED", {
        action: "UPDATE",
        itemId: targetItem.id,
        name: targetItem.name,
        stock: newStock,
        unit: unitToUse,
      });

      const updatedSnapshot = await getOwnerBusinessSnapshot();
      return {
        reply: [
          "**✅ Siap, Boss! Stok Bahan Baku Berhasil Diperbarui**",
          "",
          "Instruksi penyesuaian stok dari Boss telah selesai diterapkan ke database Havenso Cafe:",
          `- 📝 **${targetItem.name}**: Stok sebelumnya **${targetItem.stock} ${targetItem.unit}** ➔ **Kini Disetel Menjadi: ${newStock} ${unitToUse}** (Status: **${newStatus}**)`,
          "",
          "**🔎 Status Operasional & Dapur**",
          "Nilai stok terbaru ini otomatis tersinkronisasi realtime dan langsung tampil di monitor dapur, bar, dan inventori. Silakan beri tahu saya jika ada data stok lain yang ingin disesuaikan, Boss! 👨‍🍳☕✨",
        ].join("\n"),
        dataSnapshot: updatedSnapshot,
      };
    } else {
      return {
        reply: [
          "**⚠️ Boss, Bahan Baku Belum Terdaftar**",
          "",
          `Saya tidak menemukan bahan dengan nama **"${editAction.rawName}"** di daftar inventori.`,
          "Jika ini merupakan bahan baru, Boss bisa perintahkan saya: *\"tambah bahan baku baru [nama] [jumlah] [satuan]\"* atau *\"buat bahan baru [nama]\"* agar saya daftarkan langsung! ☕",
        ].join("\n"),
      };
    }
  }

  // ACTION HANDLER 3: Restock / Tambah Bahan Baku (Otak & Tangan Hermes AI)
  const lastAssistantMsg = [...conversationHistory]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastAssistantContent = (lastAssistantMsg?.content || "").toLowerCase();

  const isAnsweringNewMaterialQuestion =
    lastAssistantContent.includes("mau daftarkan bahan baku baru apa") ||
    lastAssistantContent.includes("mau tambah bahan baku apa") ||
    lastAssistantContent.includes("bahan baku baru apa");

  const isAnsweringRestockQuestion =
    lastAssistantContent.includes("mau tambah stok bahan apa") ||
    lastAssistantContent.includes("mau tambah stok bahan yang mana") ||
    lastAssistantContent.includes("tambah stok bahan");

  const isContextAnswering = isAnsweringNewMaterialQuestion || isAnsweringRestockQuestion;

  const restockItems = parseRestockItems(userPrompt, isContextAnswering);
  if (restockItems.length > 0) {
    const executedItems: Array<{
      name: string;
      added: number;
      unit: string;
      prevStock: number;
      currentStock: number;
      isNew: boolean;
    }> = [];

    for (const item of restockItems) {
      const matched = existingInventory.find(
        (i) =>
          i.name.toLowerCase() === item.name.toLowerCase() ||
          i.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(i.name.toLowerCase())
      );

      if (matched) {
        const newStock = Math.round((matched.stock + item.amount) * 100) / 100;
        let newStatus = "AVAILABLE";
        if (newStock <= 0) newStatus = "OUT_OF_STOCK";
        else if (newStock <= matched.minStock) newStatus = "LOW_STOCK";

        await prisma.inventoryItem.update({
          where: { id: matched.id },
          data: {
            stock: newStock,
            status: newStatus,
            unit: matched.unit || item.unit,
          },
        });

        try {
          await prisma.auditLog.create({
            data: {
              action: "RESTOCK_INVENTORY",
              userName: "OWNER (via Hermes AI)",
              entity: "InventoryItem",
              entityId: matched.id,
              details: JSON.stringify({
                name: matched.name,
                added: item.amount,
                unit: matched.unit || item.unit,
                stockBefore: matched.stock,
                stockAfter: newStock,
              }),
            },
          });
        } catch (_) {}

        executedItems.push({
          name: matched.name,
          added: item.amount,
          unit: matched.unit || item.unit,
          prevStock: matched.stock,
          currentStock: newStock,
          isNew: false,
        });
      } else {
        const newStatus = item.amount <= 0 ? "OUT_OF_STOCK" : item.amount <= 5 ? "LOW_STOCK" : "AVAILABLE";
        const created = await prisma.inventoryItem.create({
          data: {
            name: item.name,
            stock: item.amount,
            unit: item.unit || "pcs",
            minStock: 5,
            status: newStatus,
          },
        });

        try {
          await prisma.auditLog.create({
            data: {
              action: "RESTOCK_INVENTORY",
              userName: "OWNER (via Hermes AI)",
              entity: "InventoryItem",
              entityId: created.id,
              details: JSON.stringify({
                name: created.name,
                added: item.amount,
                unit: created.unit,
                stockBefore: 0,
                stockAfter: item.amount,
              }),
            },
          });
        } catch (_) {}

        executedItems.push({
          name: created.name,
          added: item.amount,
          unit: created.unit,
          prevStock: 0,
          currentStock: item.amount,
          isNew: true,
        });
      }
    }

    // Broadcast realtime event so inventory pages update immediately
    eventBus.broadcast("INVENTORY_CHANGED", {
      action: "RESTOCK",
      items: executedItems,
    });

    const updatedSnapshot = await getOwnerBusinessSnapshot();

    const hasNew = executedItems.some((i) => i.isNew);
    const hasExisting = executedItems.some((i) => !i.isNew);

    let titleText = "**✅ Siap, Boss! Tangan Saya Sudah Berhasil Menambahkan Stok Bahan Baku**";
    let descText = "Instruksi penambahan stok dari Boss telah selesai saya proses detik ini ke sistem inventaris Havenso Cafe:";

    if (hasNew && !hasExisting) {
      titleText = "**✅ Siap, Boss! Tangan Saya Sudah Berhasil Membuat & Mendaftarkan Bahan Baku Baru**";
      descText = "Bahan baku baru yang Boss minta telah resmi saya buatkan dan daftarkan ke sistem inventaris Havenso Cafe:";
    } else if (hasNew && hasExisting) {
      titleText = "**✅ Siap, Boss! Tangan Saya Sudah Memproses Pendaftaran & Penambahan Stok Bahan Baku**";
      descText = "Instruksi Boss telah selesai diterapkan ke database inventaris Havenso Cafe:";
    }

    const replyLines = [
      titleText,
      "",
      descText,
      "",
      ...executedItems.map((i) =>
        i.isNew
          ? `- 📦 **${i.name}** [BAHAN BARU]: Berhasil dibuat dengan stok awal **${i.currentStock} ${i.unit}** (Status: **${i.currentStock <= 5 ? "LOW_STOCK" : "AVAILABLE"}**)`
          : `- 📦 **${i.name}**: Ditambahkan **+${i.added} ${i.unit}** (Stok awal: ${i.prevStock} ${i.unit} ➔ **Total Sekarang: ${i.currentStock} ${i.unit}**)`
      ),
      "",
      "**🔎 Status Operasional & Dapur**",
      hasNew
        ? "Bahan baru sudah resmi tercatat dan langsung muncul di tabel inventori panel management maupun panel staff secara realtime."
        : "Stok inventori otomatis tersinkronisasi realtime ke layar dapur, kasir, dan tabel inventori.",
      "",
      "**💡 Rekomendasi Hermes**",
      hasNew
        ? "Bahan baru sudah siap digunakan untuk operasional dapur dan bar. Ada bahan baku baru lain yang ingin dibuat lagi, Boss? 👨‍🍳☕✨"
        : "Data inventori sudah terupdate secara realtime. Beri tahu saya jika ada stok bahan lain yang ingin Boss tambahkan lagi! 👨‍🍳☕✨",
    ];

    return {
      reply: replyLines.join("\n"),
      dataSnapshot: updatedSnapshot,
    };
  }

  const snapshot = await getOwnerBusinessSnapshot();
  const allInventoryList = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });

  const getInventoryCat = (name: string): "MINUMAN" | "MAKANAN" => {
    const n = name.toLowerCase();
    if (
      n.includes("kopi") ||
      n.includes("espresso") ||
      n.includes("susu") ||
      n.includes("milk") ||
      n.includes("sirup") ||
      n.includes("syrup") ||
      n.includes("butterscotch") ||
      n.includes("hazelnut") ||
      n.includes("karamel") ||
      n.includes("caramel") ||
      n.includes("vanilla") ||
      n.includes("matcha") ||
      n.includes("teh") ||
      n.includes("tea") ||
      n.includes("leci") ||
      n.includes("lemon") ||
      n.includes("cokelat") ||
      n.includes("chocolate") ||
      n.includes("choco") ||
      n.includes("red velvet") ||
      n.includes("taro") ||
      n.includes("avocado") ||
      n.includes("almond") ||
      n.includes("gula cair") ||
      n.includes("simple syrup")
    ) {
      return "MINUMAN";
    }
    return "MAKANAN";
  };

  const drinkInventory = allInventoryList.filter((i) => getInventoryCat(i.name) === "MINUMAN");
  const foodInventory = allInventoryList.filter((i) => getInventoryCat(i.name) === "MAKANAN");

  const systemPrompt = `# HERMES — AI OWNER ASSISTANT
## MASTER SYSTEM PROMPT & SOP WEB CAFE

Kamu adalah **Hermes**, AI Assistant khusus untuk **Owner/Manager Web Cafe Havenso**.
Tugas utama kamu adalah menjadi **asisten bisnis dan operasional pribadi Owner Cafe**.
Kamu harus berdialog layaknya partner kerja profesional yang cerdas, santun, luwes, dan responsif.

---

# 1. IDENTITAS & KARAKTER
* Bicara kepada **Owner/Manager** dengan nada sopan, sigap, santun, dan profesional (gunakan sebutan "Boss").
* Jika Owner berbicara santai, akrab, atau menggunakan bahasa sehari-hari, sesuaikan gaya bicaramu secara natural tanpa kehilangan kesopanan.
* Responsif terhadap APAPUN yang ditanyakan Boss: baik tentang data kafe, operasional, opini bisnis, strategi, maupun obrolan umum santai.

---

# 2. PRINSIP KOMUNIKASI & ANTI-HALU (SANGAT PENTING!)
1. **FOKUS & TO THE POINT (JANGAN NGERAMBAT)**:
   - Jika Boss menanyakan hal spesifik (contoh: "gula sisa berapa?", "minyak aman ga?", "omset hari ini berapa?"):
     → Jawab HANYA hal yang ditanyakan tersebut secara to-the-point, akurat, dan sopan.
     → JANGAN menceritakan bahan-bahan lain atau mengeluarkan data lain yang TIDAK ditanyakan! (Jika ditanya gula, jawab gula saja!).
2. **SAPAAN RAMAH (TIDAK LEBAY)**:
   - Jika Boss menyapa singkat ("pe", "p", "halo", "tes", "hai", "boss", dll):
     → Balas ramah dan sopan: "Halo Boss! Hermes siap membantu. Ada yang perlu dicek atau dibantu untuk kafe hari ini? ☕"
     → JANGAN langsung mengeluarkan ringkasan/flashcard panjang kalau tidak diminta!
3. **LUWES, FLEKSIBEL, & BISA OPINI**:
   - Jika Boss bertanya opini bisnis, rekomendasi promo, ide strategi, atau ngobrol di luar data teknis:
     → Responlah dengan cerdas, ramah, dan berikan pandangan solutif layaknya partner bisnis yang asyik diajak berdiskusi.
4. **STATUS KAFE / BAHAN BAKU**:
   - Jika Boss bertanya "bahan baku aman?":
     → Jika ada bahan kritis (misal Gula), katakan dengan jelas bahwa ada bahan kritis (sebutkan bahannya), dan bahan lainnya aman.
   - Jika Boss bertanya "hari ini aman?":
     → Jawab ringkas status kafe hari ini (aman/ada kendala), baru sebutkan poin pentingnya tanpa bertele-tele.
5. **BAHAN MINUMAN (BAR) VS BAHAN MAKANAN (DAPUR)**:
   - Cafe Havenso memiliki inventaris lengkap untuk Racikan Minuman/Bar (kopi espresso, aneka susu, sirup artisan, bubuk rasa, aneka teh, buah lemon/leci) DAN Makanan/Dapur (daging sapi, ayam fillet, ramen, nori, beras, telur, saus teriyaki, dsb).
   - Jika Boss bertanya tentang bahan minuman/bar:
     → Jawab fokus pada bahan racikan minuman/bar secara terstruktur, sopan, dan jelas.
   - Jika Boss bertanya tentang bahan makanan/dapur:
     → Jawab fokus pada bahan makanan dapur.
   - Jika Boss bertanya umum "bahan baku apa aja?", sampaikan bahwa sistem kafe mencatat total ${allInventoryList.length} bahan baku (${drinkInventory.length} bahan racikan minuman & bar, serta ${foodInventory.length} bahan dapur & makanan).

---

# 3. DATA REAL-TIME LIVE CAFE SAAT INI (DATABASE GROUND TRUTH):
Berikut data resmi yang ditarik detik ini dari sistem Havenso Cafe:

- Waktu Saat Ini: ${new Date(snapshot.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
- Omset / Revenue Hari Ini: Rp ${snapshot.sales.todayRevenue.toLocaleString("id-ID")} (${snapshot.sales.todayOrderCount} pesanan sukses, rata-rata keranjang/AOV: Rp ${snapshot.sales.todayAov.toLocaleString("id-ID")})
- Omset Kemarin: Rp ${snapshot.sales.yesterdayRevenue.toLocaleString("id-ID")} (${snapshot.sales.yesterdayOrderCount} pesanan)
- Pesanan Aktif di Dapur Saat Ini: ${snapshot.operational.activeKitchenCount} antrean order (${snapshot.operational.activeKitchenOrders.length > 0 ? snapshot.operational.activeKitchenOrders.map((o) => `#${o.orderNumber} di Meja ${o.tableNumber} [${o.items}]`).join("; ") : "Dapur bersih, tidak ada antrean pending"})
- Meja Terisi (Occupied): ${snapshot.tables.occupiedCount} dari ${snapshot.tables.totalTables} meja (${snapshot.tables.occupiedList.length > 0 ? `Meja: ${snapshot.tables.occupiedList.join(", ")}` : "Belum ada meja yang terisi"})
- Tiket Bantuan / Kendala Customer: ${snapshot.operational.openSupportTicketsCount} tiket terbuka
- Pesanan Dibatalkan Minggu Ini: ${snapshot.operational.cancelledThisWeekCount} pesanan
- Daftar Bahan Baku Lengkap (Total: ${allInventoryList.length} Bahan Terdata):
  * RACIKAN MINUMAN & BAR (${drinkInventory.length} Bahan):
${drinkInventory.length > 0 ? drinkInventory.map((i) => `    - ${i.name}: ${i.stock} ${i.unit} [Status: ${i.status}]`).join("\n") : "    - Tidak ada data"}
  * DAPUR & MAKANAN (${foodInventory.length} Bahan):
${foodInventory.length > 0 ? foodInventory.map((i) => `    - ${i.name}: ${i.stock} ${i.unit} [Status: ${i.status}]`).join("\n") : "    - Tidak ada data"}
${snapshot.recentStaffStockReports && snapshot.recentStaffStockReports.length > 0 ? `- Laporan Stok Fisik Terakhir dari Staf Barista & Dapur:\n${snapshot.recentStaffStockReports.map((r: any) => `  * ${r.staffName}: ${r.details} (${new Date(r.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB)`).join("\n")}` : "- Belum ada catatan laporan stok fisik baru dari staf hari ini."}

Jawablah pertanyaan Boss dengan cerdas, fokus pada konteks yang ditanyakan, dan selalu sopan!
`;

  // Build conversation messages for LLM
  const messagesToSend = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userPrompt },
  ];

  const isCloudOrProd = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  let baseUrl = (process.env.AI_BASE_URL || (isCloudOrProd ? "https://api.groq.com/openai/v1" : "http://127.0.0.1:8642/v1")).replace(/\/+$/, "");
  let apiKey =
    process.env.HERMES_API_KEY ||
    process.env.SIMULATOR_BACKEND_KEY ||
    process.env.GROQ_API_KEY ||
    "hermes-local";

  const cloudFallbackKey = process.env.SIMULATOR_BACKEND_KEY || process.env.GROQ_API_KEY;
  const isLocalUrl = baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost");
  if (isLocalUrl && isCloudOrProd && cloudFallbackKey) {
    baseUrl = "https://api.groq.com/openai/v1";
    apiKey = cloudFallbackKey;
  }

  const customModel = process.env.AI_MODEL;
  const models: string[] = [];
  if (baseUrl.includes("groq.com")) {
    if (customModel && !customModel.includes("/")) {
      models.push(customModel);
    }
    models.push("llama-3.3-70b-versatile", "llama-3.1-8b-instant");
  } else {
    if (customModel) models.push(customModel);
    models.push("openai/gpt-oss-120b", "hermes-3", "groq/compound");
  }

  for (const model of models) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) HavensoCafe/1.0",
        },
        body: JSON.stringify({
          model,
          messages: messagesToSend,
          temperature: 0.3,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        console.warn(`Hermes Owner Agent request to ${model} returned status ${response.status}`);
        if (cloudFallbackKey && !baseUrl.includes("groq.com")) {
          baseUrl = "https://api.groq.com/openai/v1";
          apiKey = cloudFallbackKey;
          models.push("llama-3.3-70b-versatile", "llama-3.1-8b-instant");
        }
        continue;
      }

      const json = await response.json();
      let reply = json.choices?.[0]?.message?.content?.trim();
      if (reply) {
        reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        return { reply, dataSnapshot: snapshot };
      }
    } catch (err) {
      console.warn(`Failed calling model ${model} for owner assistant:`, err);
      if (cloudFallbackKey && !baseUrl.includes("groq.com")) {
        console.log("[HERMES OWNER] Gateway unreachable or error, switching to cloud fallback Groq...");
        baseUrl = "https://api.groq.com/openai/v1";
        apiKey = cloudFallbackKey;
        models.push("llama-3.3-70b-versatile", "llama-3.1-8b-instant");
      }
    }
  }

  // Fallback if LLM is unavailable: deterministic rule-based response using ground-truth data
  const pLower = userPrompt.toLowerCase().trim();
  let fallbackReply = "";

  // 1. Sapaan Singkat ("pe", "p", "halo", "tes", "hai", dll)
  if (/^(pe|p|halo|hello|hai|hi|tes|test|pagi|siang|sore|malam|woi|oy|bro|boss|bos)$/i.test(pLower)) {
    return {
      reply: "Halo Boss! Sistem Hermes AI siap standby. Ada yang ingin dicek, ditanyakan, atau dibantu untuk kafe saat ini? ☕✨",
      dataSnapshot: snapshot,
    };
  }

  // 2. Tanya Spesifik Satu Bahan Baku (misal: "gula sisa berapa?", "minyak aman?", dll)
  const matchedSpecificItem = allInventoryList.find((i) =>
    pLower.includes(i.name.toLowerCase())
  );
  if (matchedSpecificItem) {
    const isStatusCheck =
      pLower.includes("berapa") ||
      pLower.includes("sisa") ||
      pLower.includes("ada") ||
      pLower.includes("stok") ||
      pLower.includes("aman") ||
      pLower.includes("kondisi");

    if (isStatusCheck) {
      const isCritical =
        matchedSpecificItem.status === "LOW_STOCK" ||
        matchedSpecificItem.status === "OUT_OF_STOCK" ||
        matchedSpecificItem.stock <= matchedSpecificItem.minStock;

      let specificReply = `Stok **${matchedSpecificItem.name}** saat ini tersisa **${matchedSpecificItem.stock} ${matchedSpecificItem.unit}**, Boss (Status: ${isCritical ? "⚠️ Kritis / Menipis" : "✅ Aman"}).`;
      if (isCritical) {
        specificReply += `\n\nStok sudah mencapai batas minimum (${matchedSpecificItem.minStock} ${matchedSpecificItem.unit}). Mau langsung saya tambahkan stoknya sekarang, Boss?`;
      }
      return {
        reply: specificReply,
        dataSnapshot: snapshot,
      };
    }
  }

  // 3. Status Bahan Baku Umum ("bahan baku aman?", "stok aman?")
  if (
    (pLower.includes("bahan") || pLower.includes("stok") || pLower.includes("inventory")) &&
    (pLower.includes("aman") || pLower.includes("gimana") || pLower.includes("kondisi") || pLower.includes("status"))
  ) {
    if (snapshot.inventory.lowStockCount > 0) {
      return {
        reply: `Stok bahan baku mayoritas aman, Boss. Namun terdapat **${snapshot.inventory.lowStockCount} bahan kritis** yang menyentuh batas minimum:\n${snapshot.inventory.lowStockList.map((i) => `- ⚠️ **${i.name}**: tersisa ${i.stock} ${i.unit} (Min: ${i.minStock} ${i.unit})`).join("\n")}\n\nBahan lainnya terpantau cukup. Mau langsung saya bantu buatkan catatan restock untuk bahan kritis ini, Boss?`,
        dataSnapshot: snapshot,
      };
    } else {
      return {
        reply: `Seluruh stok bahan baku dapur dan bar saat ini berada dalam level **aman** (di atas batas minimum), Boss! Operasional siap berjalan lancar tanpa kendala keterbatasan bahan. ☕✨`,
        dataSnapshot: snapshot,
      };
    }
  }

  // 4. Status Operasional / Kendala Umum ("hari ini aman?", "ada kendala?", "status kafe")
  const isProblemOrStatusInquiry =
    pLower.includes("masalah") ||
    pLower.includes("kendala") ||
    pLower.includes("komplain") ||
    pLower.includes("keluhan") ||
    pLower.includes("problem") ||
    pLower.includes("trouble") ||
    pLower.includes("rusak") ||
    pLower.includes("batal") ||
    pLower.includes("cancel") ||
    pLower.includes("isu") ||
    pLower.includes("error") ||
    pLower.includes("tiket") ||
    pLower.includes("bantuan") ||
    pLower.includes("aman") ||
    pLower.includes("kondisi") ||
    pLower.includes("status") ||
    pLower.includes("situasi") ||
    pLower.includes("keadaan") ||
    pLower.includes("hari ini") ||
    pLower.includes("sekarang") ||
    pLower.includes("update") ||
    pLower.includes("pantau") ||
    pLower.includes("monitoring") ||
    pLower.includes("operasional");

  if (isProblemOrStatusInquiry) {
    const hasAnyIssue =
      snapshot.operational.openSupportTicketsCount > 0 ||
      snapshot.operational.cancelledThisWeekCount > 0 ||
      snapshot.inventory.lowStockCount > 0;

    if (hasAnyIssue) {
      const issueItems: string[] = [];
      if (snapshot.operational.openSupportTicketsCount > 0) {
        issueItems.push(`- 🛎️ **Tiket Bantuan Meja**: ${snapshot.operational.openSupportTicketsCount} meja butuh respon staf segera.`);
      }
      if (snapshot.inventory.lowStockCount > 0) {
        issueItems.push(`- 📦 **Bahan Baku Kritis**: ${snapshot.inventory.lowStockCount} bahan berada di batas minimum (${snapshot.inventory.lowStockList.map((i) => i.name).join(", ")}).`);
      }
      if (snapshot.operational.cancelledThisWeekCount > 0) {
        issueItems.push(`- ⚠️ **Pesanan Dibatalkan**: ${snapshot.operational.cancelledThisWeekCount} pesanan dibatalkan minggu ini.`);
      }

      fallbackReply = `**⚠️ Laporan Kendala Operasional, Boss!**

${issueItems.join("\n")}

**🔎 Analisis**
Terdapat beberapa hal yang perlu diantisipasi agar tidak mengganggu kelancaran operasional kafe.

**💡 Rekomendasi**
1. Instruksikan staf standby untuk menyelesaikan panggilan meja via Panel Staff.
2. Lakukan restock bahan baku yang kritis sebelum jam sibuk.`;
    } else {
      fallbackReply = `**📊 Status Operasional Saat Ini**
Status Keseluruhan: **🟢 AMAN & KONDUSIF (100%)**

- 🛎️ **Tiket Komplain**: 0 tiket aktif (Aman 100%)
- 👨‍🍳 **Antrean Dapur**: ${snapshot.operational.activeKitchenCount} pesanan aktif
- 📦 **Stok Bahan Kritis**: 0 bahan kritis
- 🪑 **Meja Terisi**: ${snapshot.tables.occupiedCount} dari ${snapshot.tables.totalTables} meja (${snapshot.tables.availableCount} meja kosong)
- 💰 **Omset Hari Ini**: Rp ${snapshot.sales.todayRevenue.toLocaleString("id-ID")} (${snapshot.sales.todayOrderCount} pesanan)

**🔎 Analisis**
Hari ini operasional terpantau sangat aman, tertib, dan lancar, Boss! Seluruh alur pesanan dari meja ke dapur dan sistem pembayaran QRIS berjalan tanpa kendala teknis ataupun komplain tamu.`;
    }
  } else if (
    pLower.includes("dapur") ||
    pLower.includes("kitchen") ||
    pLower.includes("pesanan") ||
    pLower.includes("order") ||
    pLower.includes("orderan") ||
    pLower.includes("antri") ||
    pLower.includes("antrean") ||
    pLower.includes("antrian")
  ) {
    fallbackReply = `**📊 Data Antrean Dapur & Pesanan**
- Antrean Aktif di Dapur: ${snapshot.operational.activeKitchenCount} pesanan
- Total Pesanan Hari Ini: ${snapshot.sales.todayOrderCount} pesanan berbayar
${snapshot.operational.activeKitchenOrders.length > 0 ? `\n**Daftar Antrean Saat Ini:**\n${snapshot.operational.activeKitchenOrders.map((o) => `- Order #${o.orderNumber} (Meja ${o.tableNumber}): ${o.items} [Status: ${o.status}]`).join("\n")}` : "- Saat ini tidak ada antrean pending di layar dapur (KDS bersih)."}

**🔎 Analisis**
${snapshot.operational.activeKitchenCount > 0 ? "Barista dan koki sedang aktif meracik pesanan. Kecepatan saji terpantau normal." : "Dapur siap siaga menyambut pesanan berikutnya tanpa beban antrean."}`;
  } else if (
    pLower.includes("omset") ||
    pLower.includes("omzet") ||
    pLower.includes("revenue") ||
    pLower.includes("penjualan") ||
    pLower.includes("pendapatan") ||
    pLower.includes("uang") ||
    pLower.includes("duit") ||
    pLower.includes("keuangan") ||
    pLower.includes("laba") ||
    pLower.includes("profit") ||
    pLower.includes("cuan") ||
    pLower.includes("laporan")
  ) {
    fallbackReply = `**📊 Data Keuangan & Omset**
- Omset Hari Ini: Rp ${snapshot.sales.todayRevenue.toLocaleString("id-ID")}
- Transaksi Sukses: ${snapshot.sales.todayOrderCount} pesanan
- Rata-rata Nilai Transaksi (AOV): Rp ${snapshot.sales.todayAov.toLocaleString("id-ID")}
- Omset Kemarin: Rp ${snapshot.sales.yesterdayRevenue.toLocaleString("id-ID")} (${snapshot.sales.yesterdayOrderCount} pesanan)
- Akumulasi 7 Hari Terakhir: Rp ${snapshot.sales.weekRevenue.toLocaleString("id-ID")} (${snapshot.sales.weekOrderCount} pesanan)`;
  } else if (
    pLower.includes("menu") ||
    pLower.includes("laku") ||
    pLower.includes("best") ||
    pLower.includes("seller") ||
    pLower.includes("terlaris") ||
    pLower.includes("favorit") ||
    pLower.includes("produk")
  ) {
    fallbackReply = `**📊 Data Performa Menu**
${snapshot.bestSellers.length > 0 ? `**Menu Terlaris (Top 5):**\n${snapshot.bestSellers.map((b, i) => `${i + 1}. **${b.name}**: ${b.quantity} porsi (Rp ${b.revenue.toLocaleString("id-ID")})`).join("\n")}` : "Belum ada data penjualan menu untuk periode ini."}`;
  } else if (
    pLower.includes("meja") ||
    pLower.includes("kursi") ||
    pLower.includes("tamu") ||
    pLower.includes("pelanggan") ||
    pLower.includes("pengunjung") ||
    pLower.includes("okupansi")
  ) {
    fallbackReply = `**📊 Data Okupansi Meja & Tamu**
- Meja Terisi (Occupied): ${snapshot.tables.occupiedCount} dari ${snapshot.tables.totalTables} meja (${snapshot.tables.occupiedList.length > 0 ? `Meja: ${snapshot.tables.occupiedList.join(", ")}` : "Belum ada meja aktif"})
- Meja Kosong (Available): ${snapshot.tables.availableCount} meja siap ditempati
- Tingkat Okupansi: ${Math.round((snapshot.tables.occupiedCount / (snapshot.tables.totalTables || 1)) * 100)}%`;
  } else if (
    pLower.includes("saran") ||
    pLower.includes("rekomendasi") ||
    pLower.includes("strategi") ||
    pLower.includes("evaluasi") ||
    pLower.includes("tips") ||
    pLower.includes("ide")
  ) {
    fallbackReply = `**💡 Ide & Saran Strategi Bisnis untuk Boss:**
1. **Bundling Menu Favorit**: Pasangkan menu kopi terlaris dengan snack ringan untuk meningkatkan Average Order Value (AOV).
2. **Promosi Jam Santai**: Berikan diskon khusus di jam 14.00 - 17.00 untuk menarik pengunjung work-from-cafe.
3. **Restock Teratur**: Selalu pastikan bahan baku signature (kopi, susu, gula) berada di atas batas minimum.`;
  } else {
    fallbackReply = `Halo Boss! Hermes memahami pertanyaan Boss. Operasional kafe saat ini terpantau berjalan kondusif (Omset Hari Ini: Rp ${snapshot.sales.todayRevenue.toLocaleString("id-ID")}, Dapur: ${snapshot.operational.activeKitchenCount} antrean). Ada instruksi atau hal khusus lainnya yang ingin Boss diskusikan? ☕✨`;
  }

  return { reply: fallbackReply, dataSnapshot: snapshot };
}

