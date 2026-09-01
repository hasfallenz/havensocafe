import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, provider = "QRIS", status: requestedStatus = "SUCCESS" } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "orderId is required" } },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "ORDER_NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    const status = requestedStatus;

    let payment = await prisma.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });

    if (payment) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          provider,
          status,
          updatedAt: new Date(),
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider,
          providerReference: `${provider}-${Date.now()}`,
          amount: order.total,
          status,
        },
      });
    }

    // Update order paymentStatus
    if (status === "SUCCESS") {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "SUCCESS" },
      });

      // Notify in customer conversation
      const conversation = await prisma.conversation.findUnique({
        where: { sessionId: order.sessionId },
      });

      if (conversation) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderType: "SYSTEM",
            content: `Pembayaran ${provider} sebesar ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(order.total)} BERHASIL dikonfirmasi. Pesanan sedang masuk ke antrean dapur!`,
          },
        });
      }

      // Broadcast realtime event
      eventBus.broadcast("PAYMENT_COMPLETED", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        payment,
      });
      eventBus.broadcast("KITCHEN_UPDATED", {
        orderId: order.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        payment,
        orderStatus: order.status,
        paymentStatus: status,
      },
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: { code: "PAYMENT_ERROR", message: error.message || "Failed to process payment" } },
      { status: 500 }
    );
  }
}
