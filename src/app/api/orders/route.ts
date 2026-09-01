import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const sessionId = searchParams.get("sessionId");
    const tableNumber = searchParams.get("tableNumber");

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (tableNumber) {
      where.tableNumber = tableNumber;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: { code: "ORDER_FETCH_ERROR", message: "Failed to fetch orders" } },
      { status: 500 }
    );
  }
}
