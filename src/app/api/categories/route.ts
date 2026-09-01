import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    const formatted = categories.map((cat) => ({
      ...cat,
      itemCount: cat._count.items,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: { code: "CATEGORY_FETCH_ERROR", message: "Failed to fetch categories" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, displayOrder = 0, isActive = true } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and slug are required" } },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        displayOrder: Number(displayOrder),
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { success: false, error: { code: "CATEGORY_CREATE_ERROR", message: error.message || "Failed to create category" } },
      { status: 500 }
    );
  }
}
