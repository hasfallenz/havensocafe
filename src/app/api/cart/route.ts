import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function recalculateCart(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Math.round(subtotal * 0.1); // 10% PB1 tax
  const discount = 0;
  const total = subtotal + tax - discount;

  return await prisma.cart.update({
    where: { id: cartId },
    data: {
      subtotal,
      tax,
      discount,
      total,
    },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sessionId is required" } },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: true,
      },
    });

    if (!cart) {
      return NextResponse.json(
        { success: false, error: { code: "CART_NOT_FOUND", message: "Cart not found" } },
        { status: 404 }
      );
    }

    // Attach full menu item info for each cart item
    const itemDetails = await Promise.all(
      cart.items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          include: { category: true },
        });
        return {
          ...item,
          menuItem,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...cart,
        items: itemDetails,
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { success: false, error: { code: "CART_FETCH_ERROR", message: "Failed to fetch cart" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, menuItemId, quantity = 1, customizations = {} } = body;

    if (!sessionId || !menuItemId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sessionId and menuItemId are required" } },
        { status: 400 }
      );
    }

    // Verify menu item availability and current price
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return NextResponse.json(
        { success: false, error: { code: "MENU_NOT_FOUND", message: "Menu item not found" } },
        { status: 404 }
      );
    }

    if (!menuItem.isAvailable) {
      return NextResponse.json(
        { success: false, error: { code: "MENU_ITEM_UNAVAILABLE", message: "This menu item is currently unavailable" } },
        { status: 400 }
      );
    }

    let cart = await prisma.cart.findUnique({
      where: { sessionId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId, status: "ACTIVE" },
      });
    }

    const customString = typeof customizations === "string" ? customizations : JSON.stringify(customizations);

    // Check if item with exact same customizations already exists in cart
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        menuItemId,
        customizations: customString,
      },
    });

    if (existingCartItem) {
      const newQty = existingCartItem.quantity + Number(quantity);
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: newQty,
          subtotal: newQty * menuItem.price,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId,
          quantity: Number(quantity),
          customizations: customString,
          unitPrice: menuItem.price,
          subtotal: Number(quantity) * menuItem.price,
        },
      });
    }

    await recalculateCart(cart.id);

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });

    const itemsWithMenu = await Promise.all(
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
        items: itemsWithMenu,
      },
    });
  } catch (error: any) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { success: false, error: { code: "CART_ADD_ERROR", message: error.message || "Failed to add to cart" } },
      { status: 500 }
    );
  }
}
