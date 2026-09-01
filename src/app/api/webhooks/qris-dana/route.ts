import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";
import { getDanaConfig, verifyDanaSignature } from "@/lib/dana-gateway";

/**
 * Official DANA Finish Payment Webhook Receiver (DANA OpenAPI / SNAP Gateway)
 * Listens for automatic payment notifications from DANA Enterprise.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      body = {};
    }

    const headers = request.headers;
    const signature = headers.get("x-signature") || headers.get("X-Signature") || "";
    const config = getDanaConfig();

    console.log("=== INCOMING DANA WEBHOOK NOTIFICATION ===");
    console.log("Payload:", JSON.stringify(body, null, 2));

    // Optional RSA signature verification if signature is provided
    if (signature && config.publicKey) {
      const isValid = verifyDanaSignature(rawBody, signature, config.publicKey);
      if (!isValid) {
        console.warn("⚠️ DANA signature verification mismatch, logging for inspection...");
      }
    }

    // Extract Order Reference
    const orderNumber =
      body.partnerReferenceNo ||
      body.merchantTransId ||
      body.orderNumber ||
      body.externalId ||
      body.orderId;

    const amount = Number(body.amount?.value || body.amount || body.totalAmount || 0);
    const transactionStatus = (
      body.transactionStatus ||
      body.status ||
      body.latestTransactionStatus ||
      "SUCCESS"
    ).toUpperCase();

    if (!orderNumber) {
      // Return 200 with error structure to satisfy DANA Webhook check
      return NextResponse.json({
        responseCode: "4005400",
        responseMessage: "Invalid reference number in payload",
      });
    }

    // Find order in database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: orderNumber },
          { id: orderNumber },
        ],
      },
      include: { items: true, payments: true },
    });

    if (!order) {
      console.warn(`Order not found for DANA notification: ${orderNumber}`);
      return NextResponse.json({
        responseCode: "4045400",
        responseMessage: "Order not found",
      });
    }

    // Check if payment was successful
    const isSuccess =
      transactionStatus === "SUCCESS" ||
      transactionStatus === "PAID" ||
      transactionStatus === "SETTLEMENT" ||
      transactionStatus === "COMPLETED";

    if (isSuccess) {
      // 1. Update Order Status
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "SUCCESS",
          status: order.status === "QUEUED" ? "COOKING" : order.status,
        },
      });

      // 2. Record or Update Payment Entry
      let payment = await prisma.payment.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
      });

      if (payment) {
        payment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            provider: "DANA_QRIS",
            providerReference: body.referenceNo || body.danaTransId || `DANA-${Date.now()}`,
            amount: amount > 0 ? amount : order.total,
            status: "SUCCESS",
            updatedAt: new Date(),
          },
        });
      } else {
        payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: "DANA_QRIS",
            providerReference: body.referenceNo || body.danaTransId || `DANA-${Date.now()}`,
            amount: amount > 0 ? amount : order.total,
            status: "SUCCESS",
          },
        });
      }

      // 3. Post confirmation message into Customer Conversation
      const conversation = await prisma.conversation.findUnique({
        where: { sessionId: order.sessionId },
      });

      if (conversation) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderType: "SYSTEM",
            content: `Pembayaran QRIS DANA sebesar ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(order.total)} BERHASIL terverifikasi secara otomatis ✨! Pesanan Meja ${order.tableNumber || "A1"} sudah diteruskan ke dapur dan sedang disiapkan barista.`,
            metadata: JSON.stringify({
              orderConfirmed: {
                orderNumber: order.orderNumber,
                total: order.total,
                status: "COOKING",
              },
            }),
          },
        });
      }

      // 4. Broadcast Real-time Events (SSE)
      eventBus.broadcast("PAYMENT_COMPLETED", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        payment,
      });

      eventBus.broadcast("ORDER_STATUS_CHANGED", {
        order: updatedOrder,
      });

      eventBus.broadcast("KITCHEN_UPDATED", {
        orderId: order.id,
      });

      console.log(`✅ Order ${order.orderNumber} successfully marked as PAID via DANA Webhook!`);
    }

    // Return official DANA SNAP success acknowledgement
    return NextResponse.json({
      responseCode: "2005400",
      responseMessage: "Successful",
      partnerReferenceNo: order.orderNumber,
    });
  } catch (error: any) {
    console.error("Error handling DANA Webhook:", error);
    return NextResponse.json(
      {
        responseCode: "5005400",
        responseMessage: "Internal Server Error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
