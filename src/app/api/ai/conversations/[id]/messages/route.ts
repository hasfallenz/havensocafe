import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processGroqAgentRequest } from "@/lib/groq-agent";
import { verifyPaymentReceiptWithVision } from "@/lib/vision-verifier";
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

    // 4. Run Real AI Agent (Groq Llama 3.3 70B)
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
        await prisma.cartItem.create({
          data: {
            cartId: existingCart.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: uPrice,
            subtotal: item.subtotal || uPrice * item.quantity,
            customizations: item.customizations || null,
          },
        });
      }
      existingCart = await prisma.cart.findUnique({
        where: { id: existingCart.id },
        include: { items: true },
      });
    }

    const aiResult = await processGroqAgentRequest(
      content,
      {
        sessionId: conversation.sessionId,
        tableNumber: tableNumber || "A1",
        selectedItems,
        currentCartItems: existingCart?.items as any,
        paymentVerified: !!paymentVerified,
        metadata,
      },
      allMenuItems as any,
      conversation.messages as any
    );

    // Execute actions from AI
    let updatedCart = existingCart;

    let extraMetadata: Record<string, any> = {};
    let finalReplyContent = aiResult.reply;

    for (const act of aiResult.actions) {
      if (act.type === "ADD_ITEM" && act.menuItemId) {
        const itemObj = allMenuItems.find((m) => m.id === act.menuItemId);
        if (itemObj && itemObj.isAvailable) {
          let cart = await prisma.cart.findUnique({
            where: { sessionId: conversation.sessionId },
          });

          if (!cart) {
            cart = await prisma.cart.create({
              data: { sessionId: conversation.sessionId, status: "ACTIVE" },
            });
          }

          const customStr = act.customizations ? JSON.stringify(act.customizations) : "{}";
          const qty = act.quantity || 1;

          const existingCi = await prisma.cartItem.findFirst({
            where: {
              cartId: cart.id,
              menuItemId: act.menuItemId,
              customizations: customStr,
            },
          });

          if (existingCi) {
            const newQty = existingCi.quantity + qty;
            await prisma.cartItem.update({
              where: { id: existingCi.id },
              data: {
                quantity: newQty,
                subtotal: newQty * itemObj.price,
              },
            });
          } else {
            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                menuItemId: act.menuItemId,
                quantity: qty,
                customizations: customStr,
                unitPrice: itemObj.price,
                subtotal: qty * itemObj.price,
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
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        if (cart && cart.items.length > 0) {
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
            const menuObj = allMenuItems.find((m) => m.id === targetItem.menuItemId);
            const unitPrice = menuObj?.price || targetItem.unitPrice;
            const newQty = act.quantity && act.quantity > 0 ? act.quantity : targetItem.quantity;

            let existingCustom: Record<string, any> = {};
            try {
              existingCustom = JSON.parse(targetItem.customizations || "{}");
            } catch (e) {}

            const mergedCustom = {
              ...existingCustom,
              ...(act.customizations || {}),
            };

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
        }
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
      } else if (act.type === "SHOW_QRIS") {
        const cart = await prisma.cart.findUnique({
          where: { sessionId: conversation.sessionId },
          include: { items: true },
        });

        if (cart && cart.items.length > 0) {
          const itemSummaries = cart.items.map((ci) => {
            const m = allMenuItems.find((mi) => mi.id === ci.menuItemId);
            return {
              name: m?.name || "Menu",
              quantity: ci.quantity,
              subtotal: ci.subtotal,
            };
          });

          extraMetadata.qris = {
            show: true,
            amount: cart.total,
            subtotal: cart.subtotal,
            tax: cart.tax,
            items: itemSummaries,
            tableNumber: tableNumber || "A1",
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
            const menuItem = allMenuItems.find((m) => m.id === item.menuItemId || m.name.toLowerCase() === (item.name || "").toLowerCase());
            const itemPrice = menuItem?.price ?? item.unitPrice ?? item.price ?? (item.subtotal ? item.subtotal / (item.quantity || 1) : 28000);
            const itemQty = item.quantity || 1;
            const itemSubtotal = item.subtotal || itemPrice * itemQty;
            subtotal += itemSubtotal;

            orderItemsData.push({
              menuItemId: menuItem?.id || item.menuItemId || "custom-item",
              nameSnapshot: menuItem?.name || item.name || "Menu",
              priceSnapshot: itemPrice,
              quantity: itemQty,
              customizations: typeof item.customizations === "string" ? item.customizations : JSON.stringify(item.customizations || {}),
              subtotal: itemSubtotal,
            });
          }

          if (subtotal === 0 && clientCart?.total) {
            subtotal = clientCart.subtotal || Math.round(clientCart.total / 1.1);
          }

          const tax = Math.round(subtotal * 0.1);
          const total = clientCart?.total || subtotal + tax;

          // 🛡️ STRICT VISION INSPECTION FOR PAYMENT PROOF
          const proofImageUrl = metadata?.imageUrl;

          if (!proofImageUrl) {
            // No image provided
            finalReplyContent = `Siap kak! Boleh tolong upload/kirimkan foto screenshot bukti transfernya lewat tombol 📸 di bawah atau di samping kolom chat ya kak? Begitu fotonya masuk, pesanan Meja **${tableNumber || "A1"}** langsung kami verifikasi dan proses ke dapur! 😊`;
          } else {
            // Run Groq Llama 3.2 Vision Model Inspection
            const visionResult = await verifyPaymentReceiptWithVision(
              proofImageUrl,
              total,
              tableNumber || "A1"
            );

            if (!visionResult.isValidReceipt) {
              // ❌ REJECT: Random photo, selfie, meme, or non-receipt
              finalReplyContent = `❌ **Bukti Pembayaran Ditolak**\n\nMohon maaf kak, gambar yang kakak kirimkan terdeteksi sebagai **${visionResult.rejectionReason || "foto acak / bukan bukti transfer pembayaran"}** 🙏.\n\nSilakan kirimkan screenshot bukti transfer resmi m-banking atau e-wallet (tertera nominal **Rp ${total.toLocaleString("id-ID")}** ke **HASFALLENZ STORE**) agar pesanan Meja **${tableNumber || "A1"}** bisa kami proses ke dapur ya! 📸`;
            } else if (!visionResult.isAmountMatch && visionResult.detectedAmount && Math.abs(visionResult.detectedAmount - total) > 5000) {
              // ❌ REJECT: Wrong nominal
              finalReplyContent = `❌ **Nominal Pembayaran Tidak Sesuai**\n\nBukti transfer dari **${visionResult.detectedBankOrWallet || "Bank"}** tertera nominal sebesar **Rp ${visionResult.detectedAmount.toLocaleString("id-ID")}**, sedangkan total tagihan Meja **${tableNumber || "A1"}** adalah **Rp ${total.toLocaleString("id-ID")}** 🙏.\n\nMohon periksa kembali bukti transfer yang dikirimkan ya kak!`;
            } else {
              // ✅ ACCEPT: Legitimate payment proof verified!
              const orderNumber = `#HVS-${Math.floor(10000 + Math.random() * 90000)}`;

              // Create verified order
              const order = await prisma.order.create({
                data: {
                  orderNumber,
                  sessionId: conversation.sessionId,
                  tableNumber: tableNumber || "A1",
                  status: "QUEUED",
                  paymentStatus: "SUCCESS",
                  subtotal,
                  tax,
                  discount: 0,
                  total,
                  notes: `Bukti transfer (${visionResult.detectedBankOrWallet || "QRIS"}) terverifikasi AI Vision`,
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
                  provider: visionResult.detectedBankOrWallet || "DANA_QRIS",
                  providerReference: `PROOF-${Date.now()}`,
                  amount: total,
                  status: "SUCCESS",
                  metadata: JSON.stringify({
                    ...visionResult,
                    imageUrl: proofImageUrl,
                  }),
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

              // Broadcast to Kitchen Display!
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
              };

              finalReplyContent = `Terima kasih banyak kak! Bukti transfer pembayaran QRIS dari **${visionResult.detectedBankOrWallet || "E-Wallet/Bank"}** sebesar **Rp ${total.toLocaleString("id-ID")}** untuk **Meja ${tableNumber || "A1"}** SUDAH BERHASIL TERVERIFIKASI 📸✨.\n\nPesanan (${order.orderNumber}) sudah kami kirimkan ke tim Kitchen & Barista dan saat ini sedang disiapkan. Selamat menikmati! ☕👨‍🍳`;
            }
          }
        } else if (activeOrder) {
          extraMetadata.orderConfirmed = {
            orderNumber: activeOrder.orderNumber,
            total: activeOrder.total,
            tableNumber: activeOrder.tableNumber,
          };
          finalReplyContent = `Pesanan untuk Meja **${tableNumber || "A1"}** (${activeOrder.orderNumber}) sudah terverifikasi lunas sebesar **Rp ${(activeOrder.total || 0).toLocaleString("id-ID")}** dan saat ini sedang disiapkan oleh tim Barista/Dapur kami. Mohon ditunggu sebentar ya kak! ☕✨`;
        } else {
          finalReplyContent = `Saat ini keranjang pesanan untuk Meja **${tableNumber || "A1"}** masih kosong nih kak 😊. Mau saya pesankan menu kopi atau hidangan lezat hari ini?`;
        }
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
      finalReplyContent = `Mohon maaf kak, setelah sistem kami melakukan pengecekan mutasi ke DANA secara real-time, dana sebesar Rp ${(updatedCart?.total || 0).toLocaleString("id-ID")} untuk Meja **${tableNumber || "A1"}** masih **BELUM DITEMUKAN / BELUM DITRANSFER** ⚠️.\n\nSilakan selesaikan pembayaran terlebih dahulu melalui scan barcode QRIS di atas ya kak. Jika sudah berhasil transfer, silakan klik tombol **⚡ Verifikasi Pembayaran Otomatis** kembali 😊`;
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
          const mi = allMenuItems.find((m) => m.id === ci.menuItemId);
          let noteStr = "";
          try {
            const cObj = JSON.parse(ci.customizations || "{}");
            if (cObj.notes) noteStr = ` *(${cObj.notes})*`;
          } catch (e) {}
          return `- **${ci.quantity}x ${mi?.name || "Menu"}**${noteStr} — Rp ${(ci.subtotal || 0).toLocaleString("id-ID")}`;
        })
        .join("\n");

      // Check if aiResult.reply had an appetizing answer/description (e.g. from compound question)
      let introPrefix = "";
      if (
        aiResult.reply &&
        (aiResult.reply.includes("rasanya") ||
          aiResult.reply.includes("adalah") ||
          aiResult.reply.includes("nikmat") ||
          aiResult.reply.includes("harum") ||
          aiResult.reply.includes("sajian")) &&
        !aiResult.reply.startsWith("Baik kak, pesanan")
      ) {
        const firstPart = aiResult.reply.split("\n\n")[0];
        if (firstPart && firstPart.length > 10) {
          introPrefix = `${firstPart}\n\n`;
        }
      }

      finalReplyContent = `${introPrefix}Baik kak, pesanan untuk **Meja ${tableNumber || "A1"}** sudah saya perbarui:\n\n${fullItemsList}\n\n🧾 **Total Tagihan: Rp ${(updatedCart.total || 0).toLocaleString("id-ID")}** *(termasuk PB1 10%)*\n\nApakah pesanannya sudah sesuai kak? Atau ada menu lain yang ingin ditambah? 😊`;
    }

    if (extraMetadata.orderConfirmed) {
      finalReplyContent = `Terima kasih banyak kak, pembayaran QRIS sebesar Rp ${(extraMetadata.orderConfirmed.total || 0).toLocaleString("id-ID")} sudah BERHASIL terverifikasi secara otomatis! ✨\n\nPesanan Meja **${tableNumber || "A1"}** (${extraMetadata.orderConfirmed.orderNumber}) sudah resmi kami kirimkan ke tim Kitchen & Barista dan saat ini sedang disiapkan. Mohon ditunggu sebentar ya kak, selamat menikmati! ☕👨‍🍳`;
    }

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
