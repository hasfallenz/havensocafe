import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Revenue Today (from completed or paid orders)
    const paidOrdersToday = await prisma.order.findMany({
      where: {
        paymentStatus: "SUCCESS",
        createdAt: { gte: today },
      },
    });

    const todayRevenue = paidOrdersToday.reduce((sum, o) => sum + o.total, 0);
    const todayOrdersCount = paidOrdersToday.length;

    // Active orders in kitchen (QUEUED or COOKING)
    const activeKitchenCount = await prisma.order.count({
      where: {
        status: { in: ["QUEUED", "COOKING"] },
      },
    });

    // Pending support tickets
    const pendingSupportCount = await prisma.supportTicket.count({
      where: {
        status: "WAITING",
      },
    });

    // Total available menu items
    const menuCount = await prisma.menuItem.count();

    // Recent 5 orders
    const recentOrders = await prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        payments: true,
      },
    });

    // Low stock inventory items
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] },
      },
      take: 5,
    });

    // Recent audit logs
    const recentLogs = await prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          todayRevenue,
          todayOrdersCount,
          activeKitchenCount,
          pendingSupportCount,
          menuCount,
        },
        recentOrders,
        lowStockItems,
        recentLogs,
      },
    });
  } catch (error) {
    console.error("Error loading dashboard metrics:", error);
    return NextResponse.json(
      { success: false, error: { code: "DASHBOARD_ERROR", message: "Failed to load dashboard metrics" } },
      { status: 500 }
    );
  }
}
