import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "ORDER_NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { success: false, error: { code: "ORDER_FETCH_ERROR", message: "Failed to fetch order" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus } = body;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "ORDER_NOT_FOUND", message: "Order not found" } },
        { status: 404 }
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(paymentStatus !== undefined && { paymentStatus }),
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // Record audit log if status changed
    if (status && status !== existing.status) {
      await prisma.auditLog.create({
        data: {
          userId: "kitchen_staff",
          userName: "Kitchen / Staff",
          action: "UPDATE_ORDER_STATUS",
          entity: "Order",
          entityId: id,
          details: `Order ${updated.orderNumber} status changed from ${existing.status} to ${updated.status}`,
        },
      });

      // Add update note in conversation
      const conversation = await prisma.conversation.findUnique({
        where: { sessionId: updated.sessionId },
      });

      if (conversation) {
        let statusMsg = "";
        if (status === "COOKING") {
          statusMsg = `Pesanan ${updated.orderNumber} sedang dimasak/diracik oleh barista & dapur Havenso!`;
        } else if (status === "READY") {
          statusMsg = `Pesanan ${updated.orderNumber} SUDAH SIAP dan sedang diantar ke meja kakak! Selamat menikmati!`;
        } else if (status === "COMPLETED") {
          statusMsg = `Pesanan ${updated.orderNumber} telah selesai diantar. Terima kasih sudah berkunjung ke Havenso Cafe!`;
        } else if (status === "CANCELLED" || paymentStatus === "REJECTED_UNPAID") {
          statusMsg = `Mohon maaf kak, verifikasi mutasi untuk pesanan ${updated.orderNumber} belum berhasil (nominal kurang / belum masuk ke rekening kafe). Silakan periksa kembali bukti transfer Anda atau hubungi kasir ya kak 🙏.`;
        }

        if (statusMsg) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderType: "SYSTEM",
              content: statusMsg,
            },
          });
        }
      }
    }

    // Broadcast realtime event
    eventBus.broadcast("ORDER_STATUS_CHANGED", { order: updated });
    eventBus.broadcast("KITCHEN_UPDATED", { order: updated });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { success: false, error: { code: "ORDER_UPDATE_ERROR", message: error.message || "Failed to update order" } },
      { status: 500 }
    );
  }
}
