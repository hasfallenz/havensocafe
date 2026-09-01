import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, tableNumber = "A1" } = body;

    let session = null;

    if (sessionId) {
      session = await prisma.customerSession.findUnique({
        where: { id: sessionId },
      });
    }

    if (!session) {
      session = await prisma.customerSession.create({
        data: {
          tableNumber,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        },
      });
    } else if (tableNumber && session.tableNumber !== tableNumber) {
      session = await prisma.customerSession.update({
        where: { id: session.id },
        data: { tableNumber },
      });
    }

    // Ensure associated cart exists
    let cart = await prisma.cart.findUnique({
      where: { sessionId: session.id },
      include: {
        items: {
          include: {
            // we will fetch item details manually if needed
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          sessionId: session.id,
          status: "ACTIVE",
        },
        include: { items: true },
      });
    }

    // Ensure associated conversation exists
    let conversation = await prisma.conversation.findUnique({
      where: { sessionId: session.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          sessionId: session.id,
          status: "ACTIVE",
          aiStatus: "ACTIVE",
          communicationProfile: JSON.stringify({
            language: "id",
            formality: "casual",
            tone: "friendly",
          }),
        },
        include: { messages: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        session,
        cart,
        conversation,
      },
    });
  } catch (error: any) {
    console.error("Error creating/recovering session:", error);
    return NextResponse.json(
      { success: false, error: { code: "SESSION_ERROR", message: error.message || "Failed to initialize session" } },
      { status: 500 }
    );
  }
}
