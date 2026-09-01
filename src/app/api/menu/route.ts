import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const search = searchParams.get("search");
    const availableOnly = searchParams.get("available") === "true";

    const where: any = {};

    if (categorySlug && categorySlug !== "all") {
      where.category = { slug: categorySlug };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { ingredients: { contains: search } },
      ];
    }

    if (availableOnly) {
      where.isAvailable = true;
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });

    const mappedItems = items.map((item: any) => ({
      ...item,
      stock: item.stock !== undefined && item.stock !== null ? item.stock : (item.isAvailable ? 50 : 0),
    }));

    return NextResponse.json({ success: true, data: mappedItems });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { success: false, error: { code: "MENU_FETCH_ERROR", message: "Failed to fetch menu items" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      categoryId,
      name,
      slug,
      description,
      price,
      imageUrl,
      stock = 50,
      isAvailable,
      preparationTime = 5,
      ingredients = "",
      allergens = "",
      recommendationTags = "[]",
    } = body;

    if (!categoryId || !name || !price) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Category, Name, and Price are required" } },
        { status: 400 }
      );
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const stockVal = stock !== undefined ? Number(stock) : 50;
    const computedAvailable = isAvailable !== undefined ? Boolean(isAvailable) && stockVal > 0 : stockVal > 0;

    const item = await prisma.menuItem.create({
      data: {
        categoryId,
        name,
        slug: finalSlug,
        description: description || "",
        price: Number(price),
        imageUrl:
          imageUrl ||
          "https://images.unsplash.com/photo-1509785307050-d4066910ec1e?q=80&auto=format&fit=crop",
        stock: stockVal,
        isAvailable: computedAvailable,
        preparationTime: Number(preparationTime),
        ingredients,
        allergens,
        recommendationTags: typeof recommendationTags === "string" ? recommendationTags : JSON.stringify(recommendationTags),
      },
      include: { category: true },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: "admin",
        userName: "Manager",
        action: "CREATE_MENU_ITEM",
        entity: "MenuItem",
        entityId: item.id,
        details: `Created menu item ${item.name} with price ${item.price}`,
      },
    });

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { success: false, error: { code: "MENU_CREATE_ERROR", message: error.message || "Failed to create menu item" } },
      { status: 500 }
    );
  }
}
