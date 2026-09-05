import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      action, // TAKE_REQUEST, RESOLVE, RETURN_TO_AI
      assignedUserId = "staff_01",
      assignedUserName = "Sarah Amanda (Service Staff)",
      status,
    } = body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" } },
        { status: 404 }
      );
    }

    let updatedTicket = ticket;
    let confirmedOrder: any = null;

    let meta: any = {};
    if (ticket.metadata) {
      try {
        meta = typeof ticket.metadata === "string" ? JSON.parse(ticket.metadata) : ticket.metadata;
      } catch (e) {
        meta = {};
      }
    }

    if (action === "TAKE_REQUEST" || action === "IN_PROGRESS") {
      updatedTicket = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          assignedUserId,
          assignedUserName,
        },
      });

      // Pause AI for associated conversation
      if (ticket.conversationId) {
        await prisma.conversation.update({
          where: { id: ticket.conversationId },
          data: { aiStatus: "PAUSED" },
        });

        const staffMsg =
          ticket.type === "DEBIT_PAYMENT"
            ? `Halo kak! Staf kami (${assignedUserName}) sedang menuju ke Meja ${ticket.tableNumber || "A1"} membawakan mesin EDC untuk proses pembayaran kartu debit kakak. Silakan siapkan kartu debit Anda ya! 💳`
            : `Halo kak! Staff kami sedang segera menuju ke meja Anda untuk membantu.`;

        await prisma.message.create({
          data: {
            conversationId: ticket.conversationId,
            senderType: "STAFF",
            content: staffMsg,
          },
        });
      }

      eventBus.broadcast("SUPPORT_TICKET_UPDATED", {
        ticket: updatedTicket,
        conversationId: ticket.conversationId,
      });
      eventBus.broadcast("STAFF_TAKEOVER", {
        ticket: updatedTicket,
        conversationId: ticket.conversationId,
      });
    } else if (action === "RETURN_TO_AI") {
      // Resume AI for associated conversation
      if (ticket.conversationId) {
        await prisma.conversation.update({
          where: { id: ticket.conversationId },
          data: { aiStatus: "ACTIVE" },
        });

        await prisma.message.create({
          data: {
            conversationId: ticket.conversationId,
            senderType: "SYSTEM",
            content: `Percakapan telah dikembalikan ke Smart Waiter AI. Silakan lanjutkan pesan ya kak!`,
          },
        });
      }

      eventBus.broadcast("RETURN_TO_AI", {
        ticket: updatedTicket,
        conversationId: ticket.conversationId,
      });
    } else if (action === "CONFIRM_DEBIT" || (action === "RESOLVE" && ticket.type === "DEBIT_PAYMENT") || status === "RESOLVED") {
      // Handle EDC debit payment completion if this is a DEBIT_PAYMENT ticket
      if (ticket.type === "DEBIT_PAYMENT") {
        let order = null;
        if (meta.orderId) {
          order = await prisma.order.findUnique({
            where: { id: meta.orderId },
            include: { items: true, payments: true },
          });
        }

        if (!order && ticket.tableNumber) {
          order = await prisma.order.findFirst({
            where: {
              tableNumber: ticket.tableNumber,
              status: "PENDING",
            },
            include: { items: true, payments: true },
            orderBy: { createdAt: "desc" },
          });
        }

        if (order) {
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "QUEUED",
              paymentStatus: "SUCCESS",
              notes: `${order.notes || ""} • Lunas via EDC (Staf: ${assignedUserName})`.trim(),
            },
            include: { items: true, payments: true },
          });

          const payment = await prisma.payment.create({
            data: {
              orderId: updatedOrder.id,
              provider: "DEBIT",
              providerReference: `EDC-${Date.now()}`,
              amount: updatedOrder.total,
              status: "SUCCESS",
            },
          });

          confirmedOrder = {
            ...updatedOrder,
            payments: [payment],
          };

          // Broadcast to Kitchen Display & Staff!
          eventBus.broadcast("ORDER_CREATED", {
            order: confirmedOrder,
          });

          eventBus.broadcast("PAYMENT_COMPLETED", {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            payment,
            order: confirmedOrder,
          });

          eventBus.broadcast("KITCHEN_UPDATED", {
            orderId: updatedOrder.id,
          });

          // Send confirmation message to customer chat
          if (ticket.conversationId) {
            await prisma.message.create({
              data: {
                conversationId: ticket.conversationId,
                senderType: "SYSTEM",
                content: `✅ Pembayaran via Kartu Debit sebesar Rp ${(updatedOrder.total || 0).toLocaleString("id-ID")} BERHASIL diproses oleh Staf (${assignedUserName}) dengan Mesin EDC! Pesanan #${updatedOrder.orderNumber} telah diteruskan ke Dapur & Kitchen untuk segera disiapkan. Selamat menikmati! ☕✨`,
                metadata: JSON.stringify({
                  orderConfirmed: {
                    orderNumber: updatedOrder.orderNumber,
                    total: updatedOrder.total,
                    tableNumber: updatedOrder.tableNumber,
                    customerName: updatedOrder.customerName,
                  },
                }),
              },
            });
          }
        }
      }

      updatedTicket = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          assignedUserId: assignedUserId || ticket.assignedUserId,
          assignedUserName: assignedUserName || ticket.assignedUserName,
        },
      });

      // Also ensure AI is reactivated
      if (ticket.conversationId) {
        await prisma.conversation.update({
          where: { id: ticket.conversationId },
          data: { aiStatus: "ACTIVE" },
        });

        if (ticket.type !== "DEBIT_PAYMENT") {
          await prisma.message.create({
            data: {
              conversationId: ticket.conversationId,
              senderType: "SYSTEM",
              content: `Bantuan staff telah selesai. Terima kasih!`,
            },
          });
        }
      }

      eventBus.broadcast("SUPPORT_TICKET_UPDATED", { ticket: updatedTicket });
    }

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      order: confirmedOrder,
    });
  } catch (error: any) {
    console.error("Error updating support ticket:", error);
    return NextResponse.json(
      { success: false, error: { code: "TICKET_UPDATE_ERROR", message: error.message || "Failed to update ticket" } },
      { status: 500 }
    );
  }
}
