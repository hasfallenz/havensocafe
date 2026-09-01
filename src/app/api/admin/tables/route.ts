import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { tableNumber: "asc" },
    });
    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { success: false, error: { code: "TABLE_FETCH_ERROR", message: "Failed to fetch tables" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableNumber, capacity = 4, location = "Indoor", status = "AVAILABLE" } = body;

    if (!tableNumber) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "tableNumber is required" } },
        { status: 400 }
      );
    }

    const table = await prisma.table.create({
      data: {
        tableNumber,
        capacity: Number(capacity),
        location,
        status,
        qrCode: `/customer?table=${tableNumber}`,
      },
    });

    return NextResponse.json({ success: true, data: table });
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json(
      { success: false, error: { code: "TABLE_CREATE_ERROR", message: error.message || "Failed to create table" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, capacity, location } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "ID is required" } },
        { status: 400 }
      );
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(location !== undefined && { location }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating table:", error);
    return NextResponse.json(
      { success: false, error: { code: "TABLE_UPDATE_ERROR", message: error.message || "Failed to update table" } },
      { status: 500 }
    );
  }
}
