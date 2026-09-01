import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();

    // Start of Today
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Start of Week (7 days ago)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Fetch Paid Orders
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: "SUCCESS",
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Compute Revenues
    const todayRevenue = paidOrders
      .filter((o) => new Date(o.createdAt) >= today)
      .reduce((sum, o) => sum + o.total, 0);

    const todayOrdersCount = paidOrders.filter(
      (o) => new Date(o.createdAt) >= today
    ).length;

    const weeklyRevenue = paidOrders
      .filter((o) => new Date(o.createdAt) >= startOfWeek)
      .reduce((sum, o) => sum + o.total, 0);

    const monthlyRevenue = paidOrders
      .filter((o) => new Date(o.createdAt) >= startOfMonth)
      .reduce((sum, o) => sum + o.total, 0);

    // 3. Aggregate Top Selling Menu Items
    const itemMap = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();

    for (const order of paidOrders) {
      for (const item of order.items) {
        const existing = itemMap.get(item.name) || {
          name: item.name,
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.name, existing);
      }
    }

    const popularItems = Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        todayRevenue,
        todayOrdersCount,
        weeklyRevenue,
        monthlyRevenue,
        totalOrders: paidOrders.length,
        popularItems,
      },
    });
  } catch (error: any) {
    console.error("Error loading analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: error.message || "Failed to load analytics",
        },
      },
      { status: 500 }
    );
  }
}
