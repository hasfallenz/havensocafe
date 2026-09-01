import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBus } from "@/lib/events";

// Support request rate limiting: Max 2 calls per table, then 1 minute cooldown (60s)
interface RateLimitRecord {
  count: number;
  lastCallTimestamp: number;
  cooldownUntil: number;
}

const tableSupportRateLimits = new Map<string, RateLimitRecord>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { success: false, error: { code: "TICKET_FETCH_ERROR", message: "Failed to fetch support tickets" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      conversationId,
      orderId,
      tableNumber = "A1",
      type = "PHYSICAL_ASSISTANCE",
      priority = "P1",
      summary,
      metadata,
    } = body;

    if (!summary) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Summary is required" } },
        { status: 400 }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const tableKey = (tableNumber || "A1").toUpperCase();
    let record = tableSupportRateLimits.get(tableKey);

    if (record) {
      // Check if table is currently on cooldown
      if (record.cooldownUntil > now) {
        const remainingSec = Math.ceil((record.cooldownUntil - now) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "RATE_LIMITED",
              message: `Batas panggilan tercapai. Mohon tunggu ${remainingSec} detik sebelum memanggil lagi.`,
              remainingSeconds: remainingSec,
            },
          },
          { status: 429 }
        );
      }

      // If last call was more than 60s ago, reset count
      if (now - record.lastCallTimestamp > 60000) {
        record.count = 1;
        record.lastCallTimestamp = now;
        record.cooldownUntil = 0;
      } else {
        record.count += 1;
        record.lastCallTimestamp = now;
        // If 2nd call reached, trigger 60s cooldown
        if (record.count >= 2) {
          record.cooldownUntil = now + 60000;
        }
      }
    } else {
      record = {
        count: 1,
        lastCallTimestamp: now,
        cooldownUntil: 0,
      };
      tableSupportRateLimits.set(tableKey, record);
    }

    let validConversationId: string | null = null;
    if (conversationId) {
      const convExists = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (convExists) {
        validConversationId = convExists.id;
      }
    }

    if (!validConversationId) {
      const activeSession = await prisma.customerSession.findFirst({
        where: { tableNumber, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (activeSession) {
        const conv = await prisma.conversation.findUnique({
          where: { sessionId: activeSession.id },
        });
        if (conv) {
          validConversationId = conv.id;
        }
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        conversationId: validConversationId,
        orderId,
        tableNumber,
        type,
        priority,
        status: "WAITING",
        summary,
        metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null,
      },
    });

    // If conversationId is present and valid, post a system note in the conversation
    if (validConversationId) {
      try {
        await prisma.message.create({
          data: {
            conversationId: validConversationId,
            senderType: "SYSTEM",
            content: `Permintaan bantuan staff telah dikirim untuk Meja ${tableNumber}. Staff kami akan segera merespons.`,
          },
        });
      } catch (e) {
        console.warn("Failed to create system message:", e);
      }
    }

    // Broadcast realtime event
    eventBus.broadcast("SUPPORT_TICKET_CREATED", { ticket });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      { success: false, error: { code: "TICKET_CREATE_ERROR", message: error.message || "Failed to create support ticket" } },
      { status: 500 }
    );
  }
}
