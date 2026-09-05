import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processHermesAgentRequest } from "@/lib/hermes-agent";
import { eventBus } from "@/lib/events";
import { ensureDatabaseSeeded } from "@/lib/seed-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSeeded();
    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: conversation });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { success: false, error: { code: "CONVERSATION_FETCH_ERROR", message: "Failed to fetch messages" } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSeeded();
    const { id } = await params;
    const body = await request.json();
    const {
      content,
      senderType = "CUSTOMER",
      tableNumber,
      selectedItems = [],
      metadata,
      paymentVerified,
      clientCart,
    } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Content is required" } },
        { status: 400 }
      );
    }

    let conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      // Auto-recover session and conversation on serverless container instance
      const session = await prisma.customerSession.create({
        data: {
          tableNumber: tableNumber || "A1",
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      });

      await prisma.cart.create({
        data: {
          sessionId: session.id,
          status: "ACTIVE",
        },
      });

      conversation = await prisma.conversation.create({
        data: {
          id,
          sessionId: session.id,
          status: "ACTIVE",
          aiStatus: "ACTIVE",
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    // 1. Save incoming message
    const userMsg = await prisma.message.create({
      data: {
        conversationId: id,
        senderType,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    eventBus.broadcast("NEW_MESSAGE", {
      conversationId: id,
      message: userMsg,
    });

    // 2. If sender is STAFF, AI is paused and does not reply automatically
    if (senderType === "STAFF") {
      return NextResponse.json({
        success: true,
        data: {
          message: userMsg,
          aiReply: null,
        },
      });
    }

    // 3. If conversation AI is paused by human takeover, notify staff and return
    if (conversation.aiStatus === "PAUSED") {
      return NextResponse.json({
        success: true,
        data: {
          message: userMsg,
          aiReply: null,
          note: "Staff is currently attending to this conversation.",
        },
      });
    }

    // 4. Run Real AI Agent (Hermes Agent Framework)
    const allMenuItems = await prisma.menuItem.findMany({
      include: { category: true },
    });

    let existingCart = await prisma.cart.findUnique({
      where: { sessionId: conversation.sessionId },
      include: { items: true },
    });

    if (!existingCart) {
      existingCart = await prisma.cart.create({
        data: {
          sessionId: conversation.sessionId,
          status: "ACTIVE",
        },
        include: { items: true },
      });
    }

    // Sync clientCart into serverless DB if serverless cart is empty
    if (
      (!existingCart.items || existingCart.items.length === 0) &&
      clientCart &&
      clientCart.items &&
      clientCart.items.length > 0
    ) {
      for (const item of clientCart.items) {
        const uPrice = item.unitPrice ?? item.price ?? (item.subtotal ? item.subtotal / (item.quantity || 1) : 0);
        const mItem = allMenuItems.find(
          (m) =>
            m.id === item.menuItemId ||
            m.name.toLowerCase() === (item.name || item.menuItem?.name || "").toLowerCase() ||
            m.slug.toLowerCase() === (item.menuItemId || "").toLowerCase()
        );
        let customObj: Record<string, any> = {};
        try {
          customObj = typeof item.customizations === "string" ? JSON.parse(item.customizations) : (item.customizations || {});
        } catch (e) {
          customObj = {};
        }
        customObj.name = mItem?.name || item.menuItem?.name || item.name || customObj.name;
        customObj.itemName = customObj.name;

        await prisma.cartItem.create({
          data: {
            cartId: existingCart.id,
            menuItemId: mItem?.id || item.menuItemId || "custom-item",
            quantity: item.quantity,
            unitPrice: uPrice || mItem?.price || 28000,
            subtotal: item.subtotal || (uPrice || mItem?.price || 28000) * item.quantity,
            customizations: JSON.stringify(customObj),
          },
        });
      }
      existingCart = await prisma.cart.findUnique({
        where: { id: existingCart.id },
        include: { items: true },
      });
    }

    const session = await prisma.customerSession.findUnique({
      where: { id: conversation.sessionId },
    });

    const aiResult = await processHermesAgentRequest(
      content,
      {
        sessionId: conversation.sessionId,
        tableNumber: tableNumber || "A1",
        customerName: session?.customerName || undefined,
        selectedItems,
        currentCartItems: existingCart?.items as any,
        paymentVerified: !!paymentVerified,
        metadata,
      },
      allMenuItems as any,
      conversation.messages as any
    );

    if (aiResult.customerName && aiResult.customerName !== session?.customerName) {
      await prisma.customerSession.update({
        where: { id: conversation.sessionId },
        data: { customerName: aiResult.customerName },
      });
    }

    // Execute actions from AI
    let updatedCart = existingCart;

    let extraMetadata: Record<string, any> = {};
    let finalReplyContent = aiResult.reply;

    for (const act of aiResult.actions) {
      if (act.type === "ADD_ITEM") {
        const mName = (act.menuName || "").toLowerCase().trim();
        const itemObj =
          (act.menuItemId && act.menuItemId !== "custom-item" ? allMenuItems.find((m) => m.id === act.menuItemId) : null) ||
          (mName ? allMenuItems.find((m) => m.name.toLowerCase() === mName) : null) ||
          (mName && mName.length >= 3 ? allMenuItems.find((m) => m.name.toLowerCase().includes(mName)) : null) ||
          (act.menuItemId ? allMenuItems.find((m) => m.name.toLowerCase() === String(act.menuItemId).toLowerCase()) : null);

        if (!itemObj && (!mName || mName === "custom-item" || mName === "menu" || mName === "pesanan")) {
          continue;
        }

        const itemId = itemObj?.id || act.menuItemId || "custom-item";
        const itemName = itemObj?.name || act.menuName || "Menu";
        const itemPrice = itemObj?.price || 28000;
        const qty = act.quantity && act.quantity > 0 ? act.quantity : 1;

        let cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
        });

        if (!cart) {
          cart = await prisma.cart.create({
            data: { sessionId: conversation.sessionId, status: "ACTIVE" },
          });
        }

        const customObj: Record<string, any> = {
          ...(typeof act.customizations === "object" ? act.customizations : {}),
          name: itemName,
          itemName: itemName,
        };
        if (act.notes) customObj.notes = act.notes;

        const customStr = JSON.stringify(customObj);

        const existingCi = await prisma.cartItem.findFirst({
          where: {
            cartId: cart.id,
            menuItemId: itemId,
          },
        });

        if (existingCi) {
          const newQty = existingCi.quantity + qty;
          await prisma.cartItem.update({
            where: { id: existingCi.id },
            data: {
              quantity: newQty,
              customizations: customStr,
              subtotal: newQty * itemPrice,
            },
          });
        } else {
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              menuItemId: itemId,
              quantity: qty,
              customizations: customStr,
              unitPrice: itemPrice,
              subtotal: qty * itemPrice,
            },
          });
        }

        // Recalculate cart totals
        const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
        const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
        const tax = Math.round(subtotal * 0.1);
        const total = subtotal + tax;

        updatedCart = await prisma.cart.update({
          where: { id: cart.id },
          data: { subtotal, tax, total },
          include: { items: true },
        });

        if (act.notes || (act.customizations && Object.keys(act.customizations).length > 0)) {
          extraMetadata.customizedItem = {
            menuName: itemName,
            quantity: qty,
            customizations: customObj,
            notes: act.notes,
          };
        }
      } else if (act.type === "REMOVE_ITEM") {
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        if (cart && cart.items.length > 0) {
          // Find item to remove
          let targetItem = null;
          if (act.menuItemId) {
            targetItem = cart.items.find((ci) => ci.menuItemId === act.menuItemId);
          }
          if (!targetItem && act.menuName) {
            const nameLower = act.menuName.toLowerCase();
            const matchedMenu = allMenuItems.find((m) =>
              m.name.toLowerCase().includes(nameLower)
            );
            if (matchedMenu) {
              targetItem = cart.items.find((ci) => ci.menuItemId === matchedMenu.id);
            }
          }
          if (!targetItem) {
            targetItem = cart.items[0];
          }

          if (targetItem) {
            await prisma.cartItem.delete({ where: { id: targetItem.id } });
          }

          const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
          const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
          const tax = Math.round(subtotal * 0.1);
          const total = subtotal + tax;

          updatedCart = await prisma.cart.update({
            where: { id: cart.id },
            data: { subtotal, tax, total },
            include: { items: true },
          });
        }
      } else if (act.type === "CUSTOMIZE_ITEM") {
        let cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        if (!cart) {
          cart = await prisma.cart.create({
            data: { sessionId: conversation.sessionId, status: "ACTIVE" },
            include: { items: true },
          });
        }

        let targetItem = null;
        if (cart.items.length > 0) {
          if (act.menuItemId) {
            targetItem = cart.items.find((ci) => ci.menuItemId === act.menuItemId);
          }
          if (!targetItem && act.menuName) {
            const nameLower = act.menuName.toLowerCase();
            const matchedMenu = allMenuItems.find((m) =>
              m.name.toLowerCase().includes(nameLower)
            );
            if (matchedMenu) {
              targetItem = cart.items.find((ci) => ci.menuItemId === matchedMenu.id);
            }
          }
          if (!targetItem) {
            targetItem = cart.items[0];
          }
        }

        if (targetItem) {
          const menuObj = allMenuItems.find((m) => m.id === targetItem.menuItemId);
          const unitPrice = menuObj?.price || targetItem.unitPrice;
          const newQty = act.quantity && act.quantity > 0 ? act.quantity : targetItem.quantity;

          let existingCustom: Record<string, any> = {};
          try {
            existingCustom = JSON.parse(targetItem.customizations || "{}");
          } catch (e) {}

          const mergedCustom: Record<string, any> = {
            ...existingCustom,
            ...(act.customizations || {}),
            name: menuObj?.name || existingCustom.name || act.menuName,
            itemName: menuObj?.name || existingCustom.name || act.menuName,
          };
          if (act.notes) mergedCustom.notes = act.notes;

          await prisma.cartItem.update({
            where: { id: targetItem.id },
            data: {
              quantity: newQty,
              customizations: JSON.stringify(mergedCustom),
              subtotal: newQty * unitPrice,
            },
          });

          // Clean up any duplicate entries of this menu item in cart
          const duplicateItems = cart.items.filter(
            (ci) => ci.menuItemId === targetItem.menuItemId && ci.id !== targetItem.id
          );
          for (const dup of duplicateItems) {
            await prisma.cartItem.delete({ where: { id: dup.id } });
          }
        } else {
          // If cart was empty, ONLY create an item if a REAL catalog menu item was matched!
          const itemObj =
            (act.menuItemId && act.menuItemId !== "custom-item" ? allMenuItems.find((m) => m.id === act.menuItemId) : null) ||
            (act.menuName ? allMenuItems.find((m) => m.name.toLowerCase() === act.menuName!.toLowerCase()) : null);

          if (itemObj) {
            const itemName = itemObj.name;
            const unitPrice = itemObj.price;
            const qty = act.quantity && act.quantity > 0 ? act.quantity : 1;
            const customObj: Record<string, any> = {
              name: itemName,
              itemName: itemName,
              notes: act.notes,
            };

            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                menuItemId: itemObj.id,
                quantity: qty,
                customizations: JSON.stringify(customObj),
                unitPrice,
                subtotal: qty * unitPrice,
              },
            });
          }
        }

        const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
        const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
        const tax = Math.round(subtotal * 0.1);
        const total = subtotal + tax;

        updatedCart = await prisma.cart.update({
          where: { id: cart.id },
          data: { subtotal, tax, total },
          include: { items: true },
        });
      } else if (act.type === "CLEAR_CART") {
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
        });
        if (cart) {
          await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
          updatedCart = await prisma.cart.update({
            where: { id: cart.id },
            data: { subtotal: 0, tax: 0, total: 0 },
            include: { items: true },
          });
        }
      } else if (act.type === "SET_CUSTOMER_NAME") {
        const cName = act.customerName || aiResult.customerName;
        if (cName) {
          await prisma.customerSession.update({
            where: { id: conversation.sessionId },
            data: { customerName: cName },
          });
        }
      } else if (act.type === "SHOW_QRIS") {
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        const itemsToProcess =
          cart && cart.items && cart.items.length > 0
            ? cart.items
            : clientCart && clientCart.items && clientCart.items.length > 0
            ? clientCart.items
            : [];

        if (itemsToProcess.length > 0) {
          let calculatedSubtotal = 0;
          const itemSummaries = itemsToProcess.map((ci: any) => {
            let customObj: any = {};
            try {
              customObj = typeof ci.customizations === "string" ? JSON.parse(ci.customizations || "{}") : (ci.customizations || {});
            } catch (e) {}

            const m =
              allMenuItems.find((mi) => mi.id === ci.menuItemId) ||
              allMenuItems.find((mi) => mi.name.toLowerCase() === (ci.name || ci.menuItem?.name || customObj.name || "").toLowerCase()) ||
              allMenuItems.find((mi) => mi.slug.toLowerCase() === (ci.menuItemId || "").toLowerCase());

            const resolvedName =
              m?.name ||
              ci.menuItem?.name ||
              ci.name ||
              customObj.name ||
              customObj.itemName ||
              (ci.menuItemId && !ci.menuItemId.startsWith("cm") && !ci.menuItemId.startsWith("item") ? ci.menuItemId : null) ||
              "Special Order";

            const price = m?.price ?? ci.unitPrice ?? ci.price ?? (ci.subtotal ? ci.subtotal / (ci.quantity || 1) : 28000);
            const qty = ci.quantity || 1;
            const sub = ci.subtotal || price * qty;
            calculatedSubtotal += sub;
            return {
              name: resolvedName,
              quantity: qty,
              subtotal: sub,
            };
          });

          if (calculatedSubtotal === 0 && clientCart?.total) {
            calculatedSubtotal = clientCart.subtotal || Math.round(clientCart.total / 1.1);
          }

          const calculatedTax = Math.round(calculatedSubtotal * 0.1);
          const calculatedTotal = (clientCart?.total && clientCart.total > 0) ? clientCart.total : (calculatedSubtotal + calculatedTax);
          const activeCustomerName = act.customerName || aiResult.customerName || session?.customerName || null;

          extraMetadata.qris = {
            show: true,
            amount: calculatedTotal,
            subtotal: calculatedSubtotal,
            tax: calculatedTax,
            items: itemSummaries,
            tableNumber: tableNumber || "A1",
            customerName: activeCustomerName,
          };
        }
      } else if (act.type === "CONFIRM_ORDER_PAID") {
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        const activeOrder = await prisma.order.findFirst({
          where: {
            sessionId: conversation.sessionId,
            status: { in: ["QUEUED", "PREPARING", "READY"] },
          },
          orderBy: { createdAt: "desc" },
        });

        const itemsToProcess =
          cart && cart.items && cart.items.length > 0
            ? cart.items
            : clientCart && clientCart.items && clientCart.items.length > 0
            ? clientCart.items
            : [];

        if (itemsToProcess.length > 0) {
          const orderItemsData = [];
          let subtotal = 0;

          for (const item of itemsToProcess) {
            let customObj: any = {};
            try {
              customObj = typeof item.customizations === "string" ? JSON.parse(item.customizations || "{}") : (item.customizations || {});
            } catch (e) {
              customObj = {};
            }

            const menuItem =
              allMenuItems.find((m) => m.id === item.menuItemId) ||
              allMenuItems.find((m) => m.name.toLowerCase() === (item.name || item.menuItem?.name || customObj.name || "").toLowerCase()) ||
              allMenuItems.find((m) => m.slug.toLowerCase() === (item.menuItemId || "").toLowerCase());

            const resolvedName =
              menuItem?.name ||
              item.menuItem?.name ||
              item.name ||
              customObj.name ||
              customObj.itemName ||
              (item.menuItemId && !item.menuItemId.startsWith("cm") && !item.menuItemId.startsWith("item") ? item.menuItemId : null) ||
              "Menu Spesial Havenso";

            const itemPrice = menuItem?.price ?? item.unitPrice ?? item.price ?? (item.subtotal ? item.subtotal / (item.quantity || 1) : 28000);
            const itemQty = item.quantity || 1;
            const itemSubtotal = item.subtotal || itemPrice * itemQty;
            subtotal += itemSubtotal;

            orderItemsData.push({
              menuItemId: menuItem?.id || item.menuItemId || "custom-item",
              nameSnapshot: resolvedName,
              priceSnapshot: itemPrice,
              quantity: itemQty,
              customizations: JSON.stringify(customObj),
              subtotal: itemSubtotal,
            });
          }

          if (subtotal === 0 && clientCart?.total) {
            subtotal = clientCart.subtotal || Math.round(clientCart.total / 1.1);
          }

          const tax = Math.round(subtotal * 0.1);
          const total = clientCart?.total || subtotal + tax;

          const orderNumber = `#HVS-${Math.floor(10000 + Math.random() * 90000)}`;
          const activeCustomerName = act.customerName || aiResult.customerName || session?.customerName || null;

          // Create verified order
          const order = await prisma.order.create({
            data: {
              orderNumber,
              sessionId: conversation.sessionId,
              customerName: activeCustomerName,
              tableNumber: tableNumber || "A1",
              status: "QUEUED",
              paymentStatus: "SUCCESS",
              subtotal,
              tax,
              discount: 0,
              total,
              notes: activeCustomerName ? `A/N: ${activeCustomerName} - Pembayaran QRIS Terverifikasi` : "Pembayaran QRIS Terverifikasi",
              items: {
                create: orderItemsData,
              },
            },
            include: {
              items: true,
            },
          });

          // Create successful payment
          const payment = await prisma.payment.create({
            data: {
              orderId: order.id,
              provider: "QRIS",
              providerReference: `QRIS-${Date.now()}`,
              amount: total,
              status: "SUCCESS",
            },
          });

          // Clear cart
          if (cart) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
            updatedCart = await prisma.cart.update({
              where: { id: cart.id },
              data: { subtotal: 0, tax: 0, total: 0 },
              include: { items: true },
            });
          }

          // Broadcast to Kitchen Display & Staff!
          eventBus.broadcast("ORDER_CREATED", {
            order: {
              ...order,
              payments: [payment],
            },
          });

          extraMetadata.orderConfirmed = {
            orderNumber: order.orderNumber,
            total: order.total,
            tableNumber: order.tableNumber,
            customerName: order.customerName,
          };

          const nameGreeting = activeCustomerName ? ` Kak **${activeCustomerName}**` : " kak";
          finalReplyContent = `Terima kasih banyak${nameGreeting}! Pembayaran QRIS sebesar **Rp ${total.toLocaleString("id-ID")}** untuk **Meja ${tableNumber || "A1"}** SUDAH BERHASIL TERVERIFIKASI ✨.\n\nPesanan (${order.orderNumber}) atas nama ${activeCustomerName ? `Kak **${activeCustomerName}**` : "kakak"} sudah resmi kami kirimkan ke tim Kitchen & Barista dan saat ini sedang disiapkan. Selamat menikmati! ☕👨‍🍳`;
        } else if (activeOrder) {
          extraMetadata.orderConfirmed = {
            orderNumber: activeOrder.orderNumber,
            total: activeOrder.total,
            tableNumber: activeOrder.tableNumber,
            customerName: activeOrder.customerName,
          };
          finalReplyContent = `Pesanan untuk Meja **${tableNumber || "A1"}** (${activeOrder.orderNumber}) sudah terverifikasi lunas sebesar **Rp ${(activeOrder.total || 0).toLocaleString("id-ID")}** dan saat ini sedang disiapkan oleh tim Barista/Dapur kami. Mohon ditunggu sebentar ya kak! ☕✨`;
        } else {
          finalReplyContent = `Saat ini keranjang pesanan untuk Meja **${tableNumber || "A1"}** masih kosong nih kak 😊. Mau saya pesankan menu kopi atau hidangan lezat hari ini?`;
        }
      } else if (act.type === "REQUEST_DEBIT_PAYMENT") {
        const activeCustomerName = act.customerName || aiResult.customerName || session?.customerName || null;
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        const itemsToProcess =
          cart && cart.items && cart.items.length > 0
            ? cart.items
            : clientCart && clientCart.items && clientCart.items.length > 0
            ? clientCart.items
            : [];

        let orderId: string | null = null;
        let orderNumber: string | null = null;
        let finalTotal = updatedCart?.total || 0;

        if (itemsToProcess.length > 0) {
          const orderItemsData = [];
          let subtotal = 0;

          for (const item of itemsToProcess) {
            let customObj: any = {};
            try {
              customObj = typeof item.customizations === "string" ? JSON.parse(item.customizations || "{}") : (item.customizations || {});
            } catch (e) {
              customObj = {};
            }

            const menuItem =
              allMenuItems.find((m) => m.id === item.menuItemId) ||
              allMenuItems.find((m) => m.name.toLowerCase() === (item.name || item.menuItem?.name || customObj.name || "").toLowerCase()) ||
              allMenuItems.find((m) => m.slug.toLowerCase() === (item.menuItemId || "").toLowerCase());

            const resolvedName =
              menuItem?.name ||
              item.menuItem?.name ||
              item.name ||
              customObj.name ||
              customObj.itemName ||
              (item.menuItemId && !item.menuItemId.startsWith("cm") && !item.menuItemId.startsWith("item") ? item.menuItemId : null) ||
              "Menu Spesial Havenso";

            const itemPrice = menuItem?.price ?? item.unitPrice ?? item.price ?? (item.subtotal ? item.subtotal / (item.quantity || 1) : 28000);
            const itemQty = item.quantity || 1;
            const itemSubtotal = item.subtotal || itemPrice * itemQty;
            subtotal += itemSubtotal;

            orderItemsData.push({
              menuItemId: menuItem?.id || item.menuItemId || "custom-item",
              nameSnapshot: resolvedName,
              priceSnapshot: itemPrice,
              quantity: itemQty,
              customizations: JSON.stringify(customObj),
              subtotal: itemSubtotal,
            });
          }

          if (subtotal === 0 && (cart?.total || clientCart?.total)) {
            subtotal = cart?.subtotal || clientCart?.subtotal || Math.round((cart?.total || clientCart?.total || 0) / 1.1);
          }

          const tax = Math.round(subtotal * 0.1);
          finalTotal = cart?.total || clientCart?.total || subtotal + tax;
          orderNumber = `#HVS-${Math.floor(10000 + Math.random() * 90000)}`;

          // Create pending order for debit payment
          const order = await prisma.order.create({
            data: {
              orderNumber,
              sessionId: conversation.sessionId,
              customerName: activeCustomerName,
              tableNumber: tableNumber || "A1",
              status: "PENDING",
              paymentStatus: "PENDING",
              subtotal,
              tax,
              discount: 0,
              total: finalTotal,
              notes: activeCustomerName ? `A/N: ${activeCustomerName} - Pembayaran Kartu Debit (Bawa Mesin EDC)` : "Pembayaran Kartu Debit (Bawa Mesin EDC)",
              items: {
                create: orderItemsData,
              },
            },
          });
          orderId = order.id;

          // Clear cart so items are safely migrated to the pending order
          if (cart) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
            updatedCart = await prisma.cart.update({
              where: { id: cart.id },
              data: { subtotal: 0, tax: 0, total: 0 },
              include: { items: true },
            });
          }
        }

        const ticketSummary = `💳 Pembayaran Kartu Debit (Bawa Mesin EDC) - Meja ${tableNumber || "A1"} (A/N: ${activeCustomerName || "Pelanggan"})`;

        const ticket = await prisma.supportTicket.create({
          data: {
            conversationId: id,
            tableNumber: tableNumber || "A1",
            type: "DEBIT_PAYMENT",
            priority: "P0",
            status: "WAITING",
            summary: ticketSummary,
            metadata: JSON.stringify({
              orderId,
              orderNumber,
              customerName: activeCustomerName,
              amount: finalTotal,
              paymentMethod: "DEBIT",
              requestedAt: new Date().toISOString(),
            }),
          },
        });

        eventBus.broadcast("SUPPORT_TICKET_CREATED", { ticket });

        extraMetadata.debitPayment = {
          show: true,
          ticketId: ticket.id,
          orderId,
          orderNumber,
          tableNumber: tableNumber || "A1",
          customerName: activeCustomerName,
          amount: finalTotal,
        };

        const nameGreeting = activeCustomerName ? ` Kak **${activeCustomerName}**` : "";
        finalReplyContent = `Baik${nameGreeting}! Permintaan pembayaran via Kartu Debit sudah kami teruskan ke staf kami. Staf kami sedang menuju ke Meja **${tableNumber || "A1"}** membawakan mesin EDC untuk proses pembayaran kartu debit kakak. Mohon ditunggu sebentar ya kak! 💳🏃‍♂️`;
      } else if (act.type === "CALL_STAFF") {
        const ticket = await prisma.supportTicket.create({
          data: {
            conversationId: id,
            tableNumber: tableNumber || "A1",
            type: "PHYSICAL_ASSISTANCE",
            priority: "P1",
            status: "WAITING",
            summary: act.reason || `Panggilan staff dari chat: "${content}"`,
            metadata: JSON.stringify({ source: "AI_AGENT_TOOL" }),
          },
        });

        eventBus.broadcast("SUPPORT_TICKET_CREATED", { ticket });
      }
    }

    // Generate cumulative full-order confirmation if cart items were added/modified/customized
    if (extraMetadata.paymentPending) {
      finalReplyContent = `Mohon maaf kak, setelah sistem kami melakukan pengecekan mutasi ke DANA secara real-time, dana sebesar Rp ${(updatedCart?.total || 0).toLocaleString("id-ID")} untuk Meja ${tableNumber || "A1"} masih BELUM DITEMUKAN / BELUM DITRANSFER.\n\nSilakan selesaikan pembayaran terlebih dahulu melalui scan barcode QRIS di atas ya kak. Jika sudah berhasil transfer, silakan klik tombol Verifikasi Pembayaran Otomatis kembali 😊`;
    } else if (
      aiResult.actions.some(
        (a) =>
          a.type === "ADD_ITEM" || a.type === "REMOVE_ITEM" || a.type === "CUSTOMIZE_ITEM"
      ) &&
      updatedCart &&
      updatedCart.items &&
      updatedCart.items.length > 0
    ) {
      const fullItemsList = updatedCart.items
        .map((ci: any) => {
          let cObj: Record<string, any> = {};
          try {
            cObj = typeof ci.customizations === "string" ? JSON.parse(ci.customizations || "{}") : (ci.customizations || {});
          } catch (e) {
            cObj = {};
          }

          const mi =
            allMenuItems.find((m) => m.id === ci.menuItemId) ||
            allMenuItems.find((m) => m.name.toLowerCase() === (cObj.name || ci.name || "").toLowerCase()) ||
            allMenuItems.find((m) => m.slug.toLowerCase() === (ci.menuItemId || "").toLowerCase());

          const displayName = mi?.name || cObj.name || cObj.itemName || ci.name || "Menu";

          let noteStr = "";
          if (cObj.notes) {
            noteStr = ` (${cObj.notes})`;
          } else if (cObj.iceLevel || cObj.sugarLevel || cObj.temperature) {
            const parts = [];
            if (cObj.temperature) parts.push(cObj.temperature.toUpperCase());
            if (cObj.sugarLevel) parts.push(`Sugar: ${cObj.sugarLevel}`);
            if (cObj.iceLevel && cObj.iceLevel !== "normal") parts.push(`Ice: ${cObj.iceLevel}`);
            if (parts.length > 0) noteStr = ` (${parts.join(", ")})`;
          }

          return `- **${ci.quantity}x ${displayName}**${noteStr} (Rp ${(ci.subtotal || 0).toLocaleString("id-ID")})`;
        })
        .join("\n");

      finalReplyContent = `Baik kak, pesanan untuk Meja ${tableNumber || "A1"} sudah dicatat:\n\n${fullItemsList}\n\nTotal: **Rp ${(updatedCart.total || 0).toLocaleString("id-ID")}** (sudah termasuk PB1 10%)\n\nAda menu lain yang ingin ditambah kak, atau sudah cukup ini saja? 😊`;
    }

    if (extraMetadata.orderConfirmed) {
      finalReplyContent = `Terima kasih banyak kak, pembayaran QRIS sebesar Rp ${(extraMetadata.orderConfirmed.total || 0).toLocaleString("id-ID")} sudah BERHASIL terverifikasi! Pesanan Meja ${tableNumber || "A1"} (${extraMetadata.orderConfirmed.orderNumber}) sudah resmi kami kirimkan ke tim Dapur & Barista dan saat ini sedang disiapkan. Selamat menikmati! ☕👨‍🍳`;
    }

    // Strip star emojis and stray single asterisks, but preserve **bold**
    finalReplyContent = finalReplyContent
      .replace(/[✨⭐🌟]/g, "")
      .replace(/(?<!\*)\*(?!\*)/g, "")
      .trim();

    // Save AI response message
    const aiMsg = await prisma.message.create({
      data: {
        conversationId: id,
        senderType: "AI",
        content: finalReplyContent,
        metadata: JSON.stringify({
          intent: aiResult.intent,
          actions: aiResult.actions,
          ...extraMetadata,
        }),
      },
    });

    eventBus.broadcast("NEW_MESSAGE", {
      conversationId: id,
      message: aiMsg,
    });

    return NextResponse.json({
      success: true,
      data: {
        userMessage: userMsg,
        aiMessage: aiMsg,
        actions: aiResult.actions,
        cart: updatedCart,
      },
    });
  } catch (error: any) {
    console.error("Error sending message to AI conversation:", error);
    return NextResponse.json(
      { success: false, error: { code: "MESSAGE_ERROR", message: error.message || "Failed to send message" } },
      { status: 500 }
    );
  }
}
