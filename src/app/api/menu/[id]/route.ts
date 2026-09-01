import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: "MENU_NOT_FOUND", message: "Menu item not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    return NextResponse.json(
      { success: false, error: { code: "MENU_FETCH_ERROR", message: "Failed to fetch menu item" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      categoryId,
      name,
      slug,
      description,
      price,
      imageUrl,
      stock,
      isAvailable,
      preparationTime,
      ingredients,
      allergens,
      recommendationTags,
    } = body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "MENU_NOT_FOUND", message: "Menu item not found" } },
        { status: 404 }
      );
    }

    const stockVal = stock !== undefined ? Number(stock) : undefined;
    let computedAvailable = isAvailable !== undefined ? Boolean(isAvailable) : undefined;
    if (stockVal !== undefined) {
      computedAvailable = stockVal > 0;
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: Number(price) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(stockVal !== undefined && { stock: stockVal }),
        ...(computedAvailable !== undefined && { isAvailable: computedAvailable }),
        ...(preparationTime !== undefined && { preparationTime: Number(preparationTime) }),
        ...(ingredients !== undefined && { ingredients }),
        ...(allergens !== undefined && { allergens }),
        ...(recommendationTags !== undefined && {
          recommendationTags:
            typeof recommendationTags === "string"
              ? recommendationTags
              : JSON.stringify(recommendationTags),
        }),
      },
      include: { category: true },
    });

    // Record audit log for price or availability change
    if (price !== undefined && price !== existing.price) {
      await prisma.auditLog.create({
        data: {
          userId: "admin",
          userName: "Manager",
          action: "UPDATE_PRICE",
          entity: "MenuItem",
          entityId: id,
          details: `Changed price for ${updated.name} from Rp ${existing.price} to Rp ${updated.price}`,
        },
      });
    }

    if (isAvailable !== undefined && isAvailable !== existing.isAvailable) {
      await prisma.auditLog.create({
        data: {
          userId: "admin",
          userName: "Manager",
          action: "UPDATE_AVAILABILITY",
          entity: "MenuItem",
          entityId: id,
          details: `Changed availability for ${updated.name} to ${updated.isAvailable ? "Available" : "Unavailable"}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      { success: false, error: { code: "MENU_UPDATE_ERROR", message: error.message || "Failed to update menu item" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.menuItem.findUnique({ where: { id } });

    await prisma.menuItem.delete({
      where: { id },
    });

    if (existing) {
      await prisma.auditLog.create({
        data: {
          userId: "admin",
          userName: "Manager",
          action: "DELETE_MENU_ITEM",
          entity: "MenuItem",
          entityId: id,
          details: `Deleted menu item ${existing.name}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { success: false, error: { code: "MENU_DELETE_ERROR", message: error.message || "Failed to delete menu item" } },
      { status: 500 }
    );
  }
}
