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

        await prisma.message.create({
          data: {
            conversationId: ticket.conversationId,
            senderType: "STAFF",
            content: `Halo kak! Staff kami sedang segera menuju ke meja Anda untuk membantu.`,
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
    } else if (action === "RESOLVE" || status === "RESOLVED") {
      updatedTicket = await prisma.supportTicket.update({
        where: { id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });

      // Also ensure AI is reactivated
      if (ticket.conversationId) {
        await prisma.conversation.update({
          where: { id: ticket.conversationId },
          data: { aiStatus: "ACTIVE" },
        });

        await prisma.message.create({
          data: {
            conversationId: ticket.conversationId,
            senderType: "SYSTEM",
            content: `Bantuan staff telah selesai. Terima kasih!`,
          },
        });
      }

      eventBus.broadcast("SUPPORT_TICKET_UPDATED", { ticket: updatedTicket });
    }

    return NextResponse.json({ success: true, data: updatedTicket });
  } catch (error: any) {
    console.error("Error updating support ticket:", error);
    return NextResponse.json(
      { success: false, error: { code: "TICKET_UPDATE_ERROR", message: error.message || "Failed to update ticket" } },
      { status: 500 }
    );
  }
}
