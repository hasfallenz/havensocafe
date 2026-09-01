import { MenuItemData } from "@/types";

export interface MockAIInputContext {
  sessionId: string;
  tableNumber?: string;
  selectedItems?: Array<{
    menuItemId: string;
    name?: string;
    quantity: number;
    customizations?: Record<string, any>;
  }>;
  cart?: any;
}

export interface MockAIAction {
  type: "ADD_ITEM" | "CUSTOMIZE_ITEM" | "OPEN_CHECKOUT" | "REQUEST_SUPPORT" | "RECOMMEND_MENU" | "INFO_ONLY";
  menuItemId?: string;
  quantity?: number;
  customizations?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MockAIResponse {
  reply: string;
  intent: string;
  confidence: number;
  actions: MockAIAction[];
}

export function processMockAIRequest(
  message: string,
  context: MockAIInputContext,
  allMenuItems: MenuItemData[]
): MockAIResponse {
  const normalizedMsg = message.toLowerCase().trim();

  // 1. Check for Call Staff / Help / Support requests
  if (
    normalizedMsg.includes("pelayan") ||
    normalizedMsg.includes("staff") ||
    normalizedMsg.includes("panggil") ||
    normalizedMsg.includes("bantuan") ||
    normalizedMsg.includes("tumpah") ||
    normalizedMsg.includes("pecah") ||
    normalizedMsg.includes("komplain")
  ) {
    return {
      reply: "Siap kak! Saya langsung panggilkan staff/waiter kami ke meja ya. Ada yang bisa kami bantu segera?",
      intent: "REQUEST_SUPPORT",
      confidence: 0.98,
      actions: [
        {
          type: "REQUEST_SUPPORT",
          metadata: {
            reason: message,
            tableNumber: context.tableNumber || "Current Table",
          },
        },
      ],
    };
  }

  // 2. Check for Bill / Checkout / Payment requests
  if (
    normalizedMsg.includes("bill") ||
    normalizedMsg.includes("bayar") ||
    normalizedMsg.includes("checkout") ||
    normalizedMsg.includes("bon") ||
    normalizedMsg.includes("total")
  ) {
    return {
      reply: "Siap kak! Ini ringkasan pesanan dan tagihan kakak. Silakan dicek dan lanjutkan pembayaran ya.",
      intent: "OPEN_CHECKOUT",
      confidence: 0.95,
      actions: [
        {
          type: "OPEN_CHECKOUT",
        },
      ],
    };
  }

  // 3. Check for Recommendations or Questions
  if (
    normalizedMsg.includes("rekomendasi") ||
    normalizedMsg.includes("enak") ||
    normalizedMsg.includes("favorit") ||
    normalizedMsg.includes("signature") ||
    normalizedMsg.includes("best seller") ||
    normalizedMsg.includes("saran")
  ) {
    const signatureItems = allMenuItems.filter((i) => i.recommendationTags?.includes("Signature") || i.recommendationTags?.includes("Best Seller"));
    const names = signatureItems.slice(0, 3).map((i) => i.name).join(", ");
    return {
      reply: `Untuk rekomendasi favorit di Havenso Cafe, kakak wajib cobain: ${names}! Mau aku masukin ke keranjang yang mana kak?`,
      intent: "RECOMMEND_MENU",
      confidence: 0.94,
      actions: [
        {
          type: "RECOMMEND_MENU",
          metadata: { suggestedItems: signatureItems.slice(0, 3).map((i) => i.id) },
        },
      ],
    };
  }

  // 4. Check if user has selectedItems from Composer and is providing customization/modifiers
  if (context.selectedItems && context.selectedItems.length > 0) {
    const primarySelected = context.selectedItems[0];
    const foundItem = allMenuItems.find((i) => i.id === primarySelected.menuItemId);
    const itemName = foundItem?.name || primarySelected.name || "Item";

    const customizations: Record<string, any> = {
      ...primarySelected.customizations,
    };

    // Temperature detection
    if (normalizedMsg.includes("dingin") || normalizedMsg.includes("iced") || normalizedMsg.includes("es") || normalizedMsg.includes("pake es")) {
      customizations.temperature = "iced";
    } else if (normalizedMsg.includes("panas") || normalizedMsg.includes("hot") || normalizedMsg.includes("hangat")) {
      customizations.temperature = "hot";
    }

    // Sugar detection
    if (normalizedMsg.includes("less sugar") || normalizedMsg.includes("gula dikit") || normalizedMsg.includes("sedikit gula") || normalizedMsg.includes("ga terlalu manis") || normalizedMsg.includes("less")) {
      customizations.sugarLevel = "less";
    } else if (normalizedMsg.includes("tanpa gula") || normalizedMsg.includes("no sugar") || normalizedMsg.includes("gula 0") || normalizedMsg.includes("pahit")) {
      customizations.sugarLevel = "none";
    } else if (normalizedMsg.includes("extra manis") || normalizedMsg.includes("manis banget")) {
      customizations.sugarLevel = "extra";
    }

    // Ice detection
    if (normalizedMsg.includes("less ice") || normalizedMsg.includes("es dikit") || normalizedMsg.includes("es sedikit")) {
      customizations.iceLevel = "less";
    } else if (normalizedMsg.includes("no ice") || normalizedMsg.includes("tanpa es")) {
      customizations.iceLevel = "none";
    }

    // Dairy/Milk detection
    if (normalizedMsg.includes("oat milk") || normalizedMsg.includes("susu oat")) {
      customizations.dairyOption = "oat";
    } else if (normalizedMsg.includes("coconut") || normalizedMsg.includes("kelapa")) {
      customizations.dairyOption = "coconut";
    }

    // Custom notes
    if (normalizedMsg.length > 0) {
      customizations.notes = message;
    }

    const actions: MockAIAction[] = [
      {
        type: "ADD_ITEM",
        menuItemId: primarySelected.menuItemId,
        quantity: primarySelected.quantity || 1,
        customizations,
      },
    ];

    // Check if user ALSO mentioned another item in the same sentence (e.g. "sekalian croissant satu")
    const alsoItem = allMenuItems.find(
      (m) =>
        m.id !== primarySelected.menuItemId &&
        (normalizedMsg.includes(m.name.toLowerCase()) ||
          normalizedMsg.includes(m.slug.replace(/-/g, " ")) ||
          (m.slug.includes("croissant") && normalizedMsg.includes("croissant")) ||
          (m.slug.includes("fries") && normalizedMsg.includes("fries")) ||
          (m.slug.includes("cheesecake") && normalizedMsg.includes("cheesecake")))
    );

    let additionalText = "";
    if (alsoItem) {
      actions.push({
        type: "ADD_ITEM",
        menuItemId: alsoItem.id,
        quantity: 1,
        customizations: {},
      });
      additionalText = ` plus 1 ${alsoItem.name}`;
    }

    const tempStr = customizations.temperature ? ` (${customizations.temperature.toUpperCase()})` : "";
    const sugarStr = customizations.sugarLevel ? `, sugar: ${customizations.sugarLevel}` : "";

    return {
      reply: `Siap kak! 1x ${itemName}${tempStr}${sugarStr}${additionalText} sudah aku masukkan ke pesanan ya. Mau tambah apa lagi?`,
      intent: "ADD_TO_CART",
      confidence: 0.96,
      actions,
    };
  }

  // 5. Check if user is typing an order from scratch without preselecting
  // Find all items mentioned in the message
  const matchedActions: MockAIAction[] = [];
  const mentionedNames: string[] = [];

  for (const m of allMenuItems) {
    const lowerName = m.name.toLowerCase();
    const slugSimple = m.slug.replace(/-/g, " ");
    const keyWords = lowerName.split(" ").filter((w) => w.length > 2);

    const isMatch =
      normalizedMsg.includes(lowerName) ||
      normalizedMsg.includes(slugSimple) ||
      keyWords.some((w) => normalizedMsg.includes(w));

    if (isMatch) {
      // Check if not already added
      if (!matchedActions.some((a) => a.menuItemId === m.id)) {
        const customizations: Record<string, any> = {};
        if (normalizedMsg.includes("dingin") || normalizedMsg.includes("iced") || normalizedMsg.includes("es") || normalizedMsg.includes("pake es")) {
          customizations.temperature = "iced";
        } else if (normalizedMsg.includes("panas") || normalizedMsg.includes("hot") || normalizedMsg.includes("hangat")) {
          customizations.temperature = "hot";
        }

        if (normalizedMsg.includes("less sugar") || normalizedMsg.includes("gula dikit") || normalizedMsg.includes("sedikit gula") || normalizedMsg.includes("less")) {
          customizations.sugarLevel = "less";
        } else if (normalizedMsg.includes("tanpa gula") || normalizedMsg.includes("no sugar") || normalizedMsg.includes("gula 0")) {
          customizations.sugarLevel = "none";
        }

        if (normalizedMsg.includes("oat milk") || normalizedMsg.includes("susu oat")) {
          customizations.dairyOption = "oat";
        }

        // Detect quantity
        let qty = 1;
        if (normalizedMsg.includes(" 2 ") || normalizedMsg.includes(" 2x") || normalizedMsg.includes("dua") || normalizedMsg.endsWith(" 2") || normalizedMsg.includes("2 ")) {
          qty = 2;
        } else if (normalizedMsg.includes(" 3 ") || normalizedMsg.includes(" 3x") || normalizedMsg.includes("tiga") || normalizedMsg.endsWith(" 3") || normalizedMsg.includes("3 ")) {
          qty = 3;
        }

        matchedActions.push({
          type: "ADD_ITEM",
          menuItemId: m.id,
          quantity: qty,
          customizations,
        });

        const tempTag = customizations.temperature ? ` (${customizations.temperature.toUpperCase()})` : "";
        mentionedNames.push(`${qty}x ${m.name}${tempTag}`);
      }
    }
  }

  if (matchedActions.length > 0) {
    return {
      reply: `Oke siap kak! ${mentionedNames.join(" dan ")} langsung aku catat dan masukkan ke keranjang pesanan. Ada pesanan atau catatan tambahan lagi?`,
      intent: "ADD_TO_CART",
      confidence: 0.96,
      actions: matchedActions,
    };
  }

  // 6. Friendly generic fallback waiter response
  return {
    reply: "Halo kak! Mau pesan apa hari ini? Ketik langsung nama menu atau pesanan kakak di sini ya (contoh: *Pesan Americano dingin 1 dan Croissant*), biar aku langsung catatkan!",
    intent: "GREETING",
    confidence: 0.9,
    actions: [
      {
        type: "INFO_ONLY",
      },
    ],
  };
}
