import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sessionId is required" } },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "CART_EMPTY", message: "Keranjang pesanan masih kosong" } },
        { status: 400 }
      );
    }

    // Revalidate each item against current database price and availability
    const validatedItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem) {
        return NextResponse.json(
          { success: false, error: { code: "MENU_ITEM_MISSING", message: `Item tidak ditemukan di menu` } },
          { status: 400 }
        );
      }

      if (!menuItem.isAvailable) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MENU_ITEM_UNAVAILABLE",
              message: `Menu "${menuItem.name}" sedang habis/tidak tersedia`,
            },
          },
          { status: 400 }
        );
      }

      const itemSubtotal = menuItem.price * item.quantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        unitPrice: menuItem.price,
        quantity: item.quantity,
        customizations: item.customizations,
        subtotal: itemSubtotal,
        imageUrl: menuItem.imageUrl,
      });
    }

    const tax = Math.round(subtotal * 0.1); // 10% PB1 tax
    const discount = 0;
    const total = subtotal + tax - discount;

    return NextResponse.json({
      success: true,
      data: {
        items: validatedItems,
        subtotal,
        tax,
        discount,
        total,
      },
    });
  } catch (error: any) {
    console.error("Error previewing order:", error);
    return NextResponse.json(
      { success: false, error: { code: "PREVIEW_ERROR", message: error.message || "Failed to preview order" } },
      { status: 500 }
    );
  }
}
