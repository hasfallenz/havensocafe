import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { success: false, error: { code: "INVENTORY_FETCH_ERROR", message: "Failed to fetch inventory" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, stock = 0, unit = "pcs" } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    const stockNum = Number(stock);
    let status = "AVAILABLE";
    if (stockNum <= 0) status = "OUT_OF_STOCK";
    else if (stockNum <= 5) status = "LOW_STOCK";

    const item = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        stock: stockNum,
        unit: unit.trim() || "pcs",
        minStock: 5,
        status,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { success: false, error: { code: "INVENTORY_CREATE_ERROR", message: error.message || "Failed to create item" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, stock, unit } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID is required" } },
        { status: 400 }
      );
    }

    const existing = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "ITEM_NOT_FOUND", message: "Item not found" } },
        { status: 404 }
      );
    }

    const newStock = stock !== undefined ? Number(stock) : existing.stock;
    let status = "AVAILABLE";
    if (newStock <= 0) status = "OUT_OF_STOCK";
    else if (newStock <= 5) status = "LOW_STOCK";

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        stock: newStock,
        status,
        ...(unit !== undefined && { unit: unit.trim() }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { success: false, error: { code: "INVENTORY_UPDATE_ERROR", message: error.message || "Failed to update item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID is required" } },
        { status: 400 }
      );
    }

    await prisma.inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json(
      { success: false, error: { code: "INVENTORY_DELETE_ERROR", message: error.message || "Failed to delete item" } },
      { status: 500 }
    );
  }
}
