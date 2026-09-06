import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabaseSeeded } from "@/lib/seed-data";
import { eventBus } from "@/lib/events";

export async function GET() {
  try {
    await ensureDatabaseSeeded();

    const [items, recentReports] = await Promise.all([
      prisma.inventoryItem.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.auditLog.findMany({
        where: {
          action: "STAFF_STOCK_REPORT",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        recentReports,
      },
    });
  } catch (error: any) {
    console.error("Error fetching staff inventory data:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STAFF_INVENTORY_FETCH_ERROR",
          message: error.message || "Failed to fetch inventory data",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseSeeded();

    const body = await request.json();
    const {
      itemId,
      actualStock,
      staffName = "Staff Operasional",
      reportType = "STOCK_OPNAME",
      notes = "",
    } = body;

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Item ID is required" },
        },
        { status: 400 }
      );
    }

    if (actualStock === undefined || actualStock === null || isNaN(Number(actualStock)) || Number(actualStock) < 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Valid actual stock is required" },
        },
        { status: 400 }
      );
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ITEM_NOT_FOUND", message: "Bahan baku tidak ditemukan" },
        },
        { status: 404 }
      );
    }

    const newStockNum = Math.round(Number(actualStock) * 100) / 100;
    const prevStockNum = item.stock;
    const diff = Math.round((newStockNum - prevStockNum) * 100) / 100;
    const diffSign = diff > 0 ? `+${diff}` : `${diff}`;

    let newStatus = "AVAILABLE";
    if (newStockNum <= 0) newStatus = "OUT_OF_STOCK";
    else if (newStockNum <= item.minStock) newStatus = "LOW_STOCK";

    // Update item stock in DB
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        stock: newStockNum,
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Map report type label for clean reading
    let reportLabel = "Pengecekan Rutin (Stock Opname)";
    if (reportType === "SISA_SHIFT") reportLabel = "Sisa Akhir Shift";
    else if (reportType === "BAHAN_RUSAK") reportLabel = "Bahan Rusak / Basi / Tumpah";
    else if (reportType === "RESTOCK_REQUEST") reportLabel = "Permintaan Restock / Menipis";

    const cleanStaffName = (staffName || "Staff Operasional").trim();
    const cleanNotes = (notes || "").trim() || "Tidak ada catatan tambahan";

    const detailsString = `[Laporan Staf] ${item.name}: Stok fisik diinput menjadi ${newStockNum} ${item.unit} (Sebelumnya: ${prevStockNum} ${item.unit}, Selisih: ${diffSign} ${item.unit}). Kategori: ${reportLabel}. Catatan: ${cleanNotes}`;

    // Record audit log
    const auditLog = await prisma.auditLog.create({
      data: {
        action: "STAFF_STOCK_REPORT",
        userName: cleanStaffName,
        entity: "InventoryItem",
        entityId: item.id,
        details: detailsString,
      },
    });

    // Broadcast realtime event to SSE hub
    eventBus.broadcast("INVENTORY_CHANGED", {
      itemId: item.id,
      name: item.name,
      stock: newStockNum,
      unit: item.unit,
      status: newStatus,
      staffName: cleanStaffName,
      reportType,
      diff,
    });

    eventBus.broadcast("STOCK_REPORT_SUBMITTED", {
      itemId: item.id,
      name: item.name,
      stock: newStockNum,
      unit: item.unit,
      status: newStatus,
      staffName: cleanStaffName,
      details: detailsString,
    });

    return NextResponse.json({
      success: true,
      data: {
        item: updatedItem,
        log: auditLog,
        discrepancy: diff,
      },
    });
  } catch (error: any) {
    console.error("Error saving staff inventory report:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STAFF_INVENTORY_REPORT_ERROR",
          message: error.message || "Failed to submit inventory report",
        },
      },
      { status: 500 }
    );
  }
}
