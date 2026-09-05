import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sessionId,
      tableNumber = "A1",
      customerName,
      notes = "",
      paymentProvider = "QRIS",
    } = body;

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

    // Validate availability & lock price snapshots
    const orderItemsData = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem) {
        return NextResponse.json(
          { success: false, error: { code: "MENU_NOT_FOUND", message: `Menu item not found` } },
          { status: 400 }
        );
      }

      if (!menuItem.isAvailable) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MENU_ITEM_UNAVAILABLE",
              message: `Menu "${menuItem.name}" sedang tidak tersedia`,
            },
          },
          { status: 400 }
        );
      }

      const itemSubtotal = menuItem.price * item.quantity;
      subtotal += itemSubtotal;

      orderItemsData.push({
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price,
        quantity: item.quantity,
        customizations: item.customizations,
        subtotal: itemSubtotal,
      });
    }

    const tax = Math.round(subtotal * 0.1);
    const discount = 0;
    const total = subtotal + tax - discount;

    const orderNumber = `#HVS-${Math.floor(10000 + Math.random() * 90000)}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        sessionId,
        customerName: customerName || null,
        tableNumber,
        status: "QUEUED",
        paymentStatus: "PENDING",
        subtotal,
        tax,
        discount,
        total,
        notes: customerName ? `${notes ? notes + " • " : ""}A/N: ${customerName}` : notes,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: paymentProvider,
        providerReference: `${paymentProvider}-${Date.now()}`,
        amount: total,
        status: "PENDING",
      },
    });

    // Clear cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { subtotal: 0, tax: 0, total: 0 },
    });

    // Add confirmation message to AI Conversation
    const conversation = await prisma.conversation.findUnique({
      where: { sessionId },
    });

    if (conversation) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "AI",
          content: `Pesanan ${orderNumber} berhasil dibuat untuk Meja ${tableNumber}! Total ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(total)}. Silakan selesaikan pembayaran ya kak!`,
        },
      });
    }

    // Broadcast realtime event
    eventBus.broadcast("ORDER_CREATED", {
      order: {
        ...order,
        payments: [payment],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        order: {
          ...order,
          payments: [payment],
        },
        payment,
      },
    });
  } catch (error: any) {
    console.error("Error confirming order:", error);
    return NextResponse.json(
      { success: false, error: { code: "ORDER_CONFIRM_ERROR", message: error.message || "Failed to confirm order" } },
      { status: 500 }
    );
  }
}
