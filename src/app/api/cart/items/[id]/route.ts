import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function recalculateCart(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.round(subtotal * 0.1);
  const discount = 0;
  const total = subtotal + tax - discount;

  return await prisma.cart.update({
    where: { id: cartId },
    data: { subtotal, tax, discount, total },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, customizations } = body;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, error: { code: "CART_ITEM_NOT_FOUND", message: "Cart item not found" } },
        { status: 404 }
      );
    }

    const newQty = quantity !== undefined ? Number(quantity) : cartItem.quantity;

    if (newQty <= 0) {
      await prisma.cartItem.delete({ where: { id } });
    } else {
      await prisma.cartItem.update({
        where: { id },
        data: {
          quantity: newQty,
          subtotal: newQty * cartItem.unitPrice,
          ...(customizations !== undefined && {
            customizations: typeof customizations === "string" ? customizations : JSON.stringify(customizations),
          }),
        },
      });
    }

    await recalculateCart(cartItem.cartId);

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: { items: true },
    });

    const itemsWithDetails = await Promise.all(
      (updatedCart?.items || []).map(async (ci) => {
        const itemInfo = await prisma.menuItem.findUnique({
          where: { id: ci.menuItemId },
          include: { category: true },
        });
        return { ...ci, menuItem: itemInfo };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCart,
        items: itemsWithDetails,
      },
    });
  } catch (error: any) {
    console.error("Error updating cart item:", error);
    return NextResponse.json(
      { success: false, error: { code: "CART_ITEM_UPDATE_ERROR", message: error.message || "Failed to update cart item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
    });

    if (!cartItem) {
      return NextResponse.json(
        { success: false, error: { code: "CART_ITEM_NOT_FOUND", message: "Cart item not found" } },
        { status: 404 }
      );
    }

    const cartId = cartItem.cartId;
    await prisma.cartItem.delete({ where: { id } });
    await recalculateCart(cartId);

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    const itemsWithDetails = await Promise.all(
      (updatedCart?.items || []).map(async (ci) => {
        const itemInfo = await prisma.menuItem.findUnique({
          where: { id: ci.menuItemId },
          include: { category: true },
        });
        return { ...ci, menuItem: itemInfo };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCart,
        items: itemsWithDetails,
      },
    });
  } catch (error: any) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json(
      { success: false, error: { code: "CART_ITEM_DELETE_ERROR", message: error.message || "Failed to delete cart item" } },
      { status: 500 }
    );
  }
}
