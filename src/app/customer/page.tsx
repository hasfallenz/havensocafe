"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  CategoryItem,
  MenuItemData,
  CartData,
  OrderData,
  ConversationData,
  MessageData,
  RealtimeEvent,
  SupportTicketData,
} from "@/types";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { MenuGrid } from "@/components/customer/MenuGrid";
import { ItemDetailModal } from "@/components/customer/ItemDetailModal";
import { AIComposer } from "@/components/customer/AIComposer";
import { AIConversationDrawer } from "@/components/customer/AIConversationDrawer";
import { OrderSummaryModal } from "@/components/customer/OrderSummaryModal";
import { PaymentModal } from "@/components/customer/PaymentModal";
import { OrderStatusDrawer } from "@/components/customer/OrderStatusDrawer";
import { SupportModal } from "@/components/customer/SupportModal";
import { Modal } from "@/components/ui/Modal";
import { MessageSquare, ShoppingBag, Clock, Sparkles, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function CustomerView() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table") || "A1";

  // State
  const [tableNumber, setTableNumber] = useState(tableParam);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("coffee");
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Cart & Order State
  const [cart, setCart] = useState<CartData | null>(null);
  const [activeOrders, setActiveOrders] = useState<OrderData[]>([]);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<MenuItemData | null>(null);
  const [activeSupportTicket, setActiveSupportTicket] = useState<SupportTicketData | null>(null);

  // AI Composer & Context
  const [composerSelectedItems, setComposerSelectedItems] = useState<MenuItemData[]>([]);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [isAiSending, setIsAiSending] = useState(false);

  // Modals & Drawers Visibility
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isOrderStatusOpen, setIsOrderStatusOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTableSwitchOpen, setIsTableSwitchOpen] = useState(false);
  const [currentPayingOrder, setCurrentPayingOrder] = useState<OrderData | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // 1. Initialize or Recover Session
  useEffect(() => {
    async function initSession() {
      try {
        const storedSessionId = localStorage.getItem("havenso_customer_session");
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: storedSessionId,
            tableNumber: tableParam,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const sess = data.data.session;
          setSessionId(sess.id);
          localStorage.setItem("havenso_customer_session", sess.id);
          setCart(data.data.cart);
          setConversation(data.data.conversation);
          setMessages(data.data.conversation?.messages || []);
        }
      } catch (err) {
        console.error("Session init failed:", err);
      }
    }
    initSession();
  }, [tableParam]);

  // 2. Fetch Categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
          if (data.data.length > 0 && !activeCategory) {
            setActiveCategory(data.data[0].slug);
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    loadCategories();
  }, []);

  // 3. Fetch Menu Items
  const loadMenuItems = useCallback(async () => {
    setIsLoadingMenu(true);
    try {
      const url = new URL("/api/menu", window.location.origin);
      if (activeCategory) url.searchParams.set("category", activeCategory);
      if (searchQuery) url.searchParams.set("search", searchQuery);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setMenuItems(data.data);
      }
    } catch (err) {
      console.error("Failed to load menu items:", err);
    } finally {
      setIsLoadingMenu(false);
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // 4. Fetch Active Orders
  const loadOrders = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/orders?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setActiveOrders(data.data);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) loadOrders();
  }, [sessionId, loadOrders]);

  // 5. Fetch Active Support Ticket for this Table
  const loadSupportTicket = useCallback(async () => {
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const found = data.data.find(
          (t: SupportTicketData) =>
            (t.tableNumber === tableNumber || t.tableNumber === tableParam) &&
            t.status !== "RESOLVED"
        );
        if (found) {
          setActiveSupportTicket(found);
        }
      }
    } catch (err) {
      console.error("Failed to load support tickets:", err);
    }
  }, [tableNumber, tableParam]);

  useEffect(() => {
    loadSupportTicket();
  }, [loadSupportTicket]);

  // 6. Connect to Realtime Event Stream (SSE)
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime");

    eventSource.onmessage = (e) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);

        if (event.type === "ORDER_STATUS_CHANGED" || event.type === "KITCHEN_UPDATED" || event.type === "PAYMENT_COMPLETED") {
          loadOrders();
        }

        if (event.type === "NEW_MESSAGE" && event.data.conversationId === conversation?.id) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === event.data.message.id);
            if (exists) return prev;
            return [...prev, event.data.message];
          });
        }

        if (event.type === "SUPPORT_TICKET_CREATED") {
          const t = event.data.ticket;
          if (t && (t.tableNumber === tableNumber || t.tableNumber === tableParam)) {
            setActiveSupportTicket(t);
          }
        }

        if (event.type === "SUPPORT_TICKET_UPDATED") {
          const t = event.data.ticket;
          if (t && (t.tableNumber === tableNumber || t.tableNumber === tableParam)) {
            setActiveSupportTicket(t);
            if (t.status === "RESOLVED") {
              setTimeout(() => {
                setActiveSupportTicket((prev) => (prev?.id === t.id ? null : prev));
              }, 6000);
            }
          }
        }

        if (event.type === "STAFF_TAKEOVER") {
          const t = event.data.ticket;
          if (event.data.conversationId === conversation?.id) {
            setConversation((prev) => (prev ? { ...prev, aiStatus: "PAUSED" } : null));
          }
          if (t && (t.tableNumber === tableNumber || t.tableNumber === tableParam)) {
            setActiveSupportTicket((prev) => (prev ? { ...prev, status: "IN_PROGRESS" } : t));
          }
        }

        if (event.type === "RETURN_TO_AI" && event.data.conversationId === conversation?.id) {
          setConversation((prev) => (prev ? { ...prev, aiStatus: "ACTIVE" } : null));
        }
      } catch (err) {
        // Heartbeat or malformed data
      }
    };

    return () => {
      eventSource.close();
    };
  }, [conversation?.id, loadOrders, tableNumber, tableParam]);

  // 6. Handle Item Selection for AI Composer
  const handleSelectItemForComposer = (item: MenuItemData) => {
    setComposerSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const handleRemoveComposerItem = (itemId: string) => {
    setComposerSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // 7. Handle Adding Item to Cart directly from Custom modal
  const handleAddToCart = async (
    item: MenuItemData,
    quantity: number,
    customizations: any
  ) => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          menuItemId: item.id,
          quantity,
          customizations,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.data);
        setIsCartOpen(true);
      }
    } catch (err) {
      console.error("Failed to add to cart:", err);
    }
  };

  // 8. Handle Updating Cart Quantity
  const handleUpdateCartQuantity = async (cartItemId: string, newQty: number) => {
    try {
      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.data);
      }
    } catch (err) {
      console.error("Failed to update cart:", err);
    }
  };

  const handleRemoveCartItem = async (cartItemId: string) => {
    try {
      const res = await fetch(`/api/cart/items/${cartItemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.data);
      }
    } catch (err) {
      console.error("Failed to remove cart item:", err);
    }
  };

  // 9. Send Message to AI Waiter (100% Reliable, Instant Optimistic UI & Proof Attachment)
  const handleSendMessage = async (
    content: string,
    paymentVerified: boolean = false,
    imageUrl?: string
  ) => {
    if (!content.trim() && !imageUrl) return;

    // Automatically open the chat drawer when customer sends a message
    setIsConversationOpen(true);
    setIsAiSending(true);

    const userText = content.trim() || "Saya sudah transfer, ini bukti pembayarannya 📸";

    // 1. Optimistic User Message Bubble (Instantly visible in 0ms!)
    const tempUserId = `temp-${Date.now()}`;
    const tempUserMsg: MessageData = {
      id: tempUserId,
      conversationId: conversation?.id || "temp",
      senderType: "CUSTOMER",
      content: userText,
      metadata: imageUrl ? JSON.stringify({ imageUrl, isProofOfPayment: true }) : null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      // Prevent duplicate bubbles by checking existing IDs
      if (prev.some((m) => m.id === tempUserId)) return prev;
      return [...prev, tempUserMsg];
    });

    // 2. Ensure active conversation exists
    let activeConvId = conversation?.id;
    if (!activeConvId) {
      try {
        const sessRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            tableNumber: tableNumber || tableParam || "A1",
          }),
        });
        const sessData = await sessRes.json();
        if (sessData.success && sessData.data) {
          setSessionId(sessData.data.session.id);
          setCart(sessData.data.cart);
          setConversation(sessData.data.conversation);
          activeConvId = sessData.data.conversation.id;
        }
      } catch (e) {
        console.error("Failed to init session on send:", e);
      }
    }

    if (!activeConvId) {
      setIsAiSending(false);
      return;
    }

    const selectedForContext = composerSelectedItems.map((i) => ({
      menuItemId: i.id,
      name: i.name,
      quantity: 1,
    }));

    try {
      const res = await fetch(
        `/api/ai/conversations/${activeConvId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: userText,
            senderType: "CUSTOMER",
            tableNumber: tableNumber || tableParam || "A1",
            selectedItems: selectedForContext,
            paymentVerified,
            metadata: imageUrl ? { imageUrl, isProofOfPayment: true } : undefined,
            clientCart: cart,
          }),
        }
      );
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserId);
          const next = [...filtered];
          if (data.data.userMessage && !next.some((m) => m.id === data.data.userMessage.id)) {
            next.push(data.data.userMessage);
          }
          if (data.data.aiMessage && !next.some((m) => m.id === data.data.aiMessage.id)) {
            next.push(data.data.aiMessage);
          }
          return next;
        });

        if (data.data.cart) {
          setCart(data.data.cart);
        }

        // Clear composer context after successful natural order
        setComposerSelectedItems([]);

        // Handle open checkout intent
        const hasCheckout = data.data.actions?.some(
          (a: any) => a.type === "OPEN_CHECKOUT"
        );
        if (hasCheckout) {
          setIsCartOpen(true);
        }
      } else {
        const fallbackMsg: MessageData = {
          id: `fallback-${Date.now()}`,
          conversationId: activeConvId,
          senderType: "AI",
          content: "Halo kak! Pesanan dan pesan kakak sudah kami catat 😊 Ada yang bisa saya bantu siapkan untuk Meja kakak hari ini?",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const fallbackMsg: MessageData = {
        id: `fallback-${Date.now()}`,
        conversationId: activeConvId,
        senderType: "AI",
        content: "Halo kak! Pesanan dan pesan kakak sudah kami catat 😊 Ada yang bisa saya bantu siapkan untuk Meja kakak hari ini?",
        createdAt: new Date().toISOString(),
      };
    } finally {
      setIsAiSending(false);
    }
  };

  // 10. Proceed to Checkout & Payment
  const handleProceedToPayment = async (notes: string) => {
    if (!sessionId || !cart || cart.items.length === 0) return;

    setIsCheckingOut(true);
    try {
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tableNumber,
          notes,
          paymentProvider: "QRIS",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPayingOrder(data.data.order);
        setIsCartOpen(false);
        setIsPaymentOpen(true);
        // Refresh cart (which is now cleared)
        setCart((prev) =>
          prev ? { ...prev, items: [], subtotal: 0, tax: 0, total: 0 } : null
        );
        loadOrders();
      } else {
        alert(data.error?.message || "Gagal membuat pesanan");
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // 11. Confirm Payment simulation
  const handleConfirmPayment = async (orderId: string, provider: string) => {
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          provider,
          simulateSuccess: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrders();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Payment confirmation failed:", err);
      return false;
    }
  };

  const handlePaymentSuccess = (order: OrderData) => {
    setIsPaymentOpen(false);
    setIsOrderStatusOpen(true);
  };

  // 12. Request Support
  const handleRequestSupport = async (
    type: string,
    priority: string,
    summary: string
  ) => {
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation?.id,
          tableNumber,
          type,
          priority,
          summary,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSupportTicket(data.data);
        if (type === "LIVE_CHAT") {
          setIsConversationOpen(true);
        }
      } else {
        alert(data.error?.message || "Gagal mengirim panggilan staff");
      }
    } catch (err) {
      console.error("Failed to request support:", err);
    }
  };

  const activeCategoryName =
    categories.find((c) => c.slug === activeCategory)?.name || "Menu";
  const cartTotalItems =
    cart?.items.reduce((sum, i) => sum + i.quantity, 0) || 0;

  return (
    <div className="customer-canvas-bg min-h-screen text-zinc-900 flex flex-col md:flex-row relative">
      {/* Top Mobile Bar */}
      <header className="md:hidden glass-panel m-4 p-4 rounded-3xl flex items-center justify-between shadow-sm sticky top-3 z-30">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logohavenso.png"
            alt="Havenso Cafe"
            width={120}
            height={32}
            priority
            className="h-7 w-auto object-contain"
          />
          <button
            type="button"
            onClick={() => setIsTableSwitchOpen(true)}
            className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs"
          >
            Meja {tableNumber}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeOrders.length > 0 && (
            <button
              onClick={() => setIsOrderStatusOpen(true)}
              className="p-2 rounded-xl bg-amber-500/20 text-amber-900 border border-amber-400/40 relative"
            >
              <Clock className="w-4 h-4 animate-pulse" />
            </button>
          )}
        </div>
      </header>

      {/* Left Full-Bleed Sidebar (Docked to Left Edge) */}
      <CustomerSidebar
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={(slug) => setActiveCategory(slug)}
        tableNumber={tableNumber}
        cartCount={cartTotalItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenConversation={() => setIsConversationOpen(true)}
        onOpenOrderStatus={() => setIsOrderStatusOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenTableSwitch={() => setIsTableSwitchOpen(true)}
        activeOrderCount={
          activeOrders.filter((o) => o.status !== "COMPLETED").length
        }
        activeSupportTicket={activeSupportTicket}
      />

      {/* Right Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-36 flex flex-col max-w-7xl w-full">
        {/* Right Menu Content */}
        <MenuGrid
          categoryName={activeCategoryName}
          categorySlug={activeCategory}
          items={menuItems}
          isLoading={isLoadingMenu}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
        />
      </main>

      {/* AI Smart Waiter Composer (Fixed Bottom) */}
      <AIComposer
        selectedItems={composerSelectedItems}
        onRemoveSelectedItem={handleRemoveComposerItem}
        onSendMessage={handleSendMessage}
        isLoading={isAiSending}
        onOpenConversation={() => setIsConversationOpen(true)}
        unreadCount={messages.length > 1 ? 1 : 0}
      />

      {/* Table Switcher Modal (Meja A1 - A10) */}
      <Modal
        isOpen={isTableSwitchOpen}
        onClose={() => setIsTableSwitchOpen(false)}
        title="Pilih Nomor Meja"
        description="Pilih meja aktif Anda (A1 sampai A10)"
        maxWidth="md"
        glass
      >
        <div className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {Array.from({ length: 10 }, (_, idx) => `A${idx + 1}`).map((tbl) => {
              const isCurrent = tableNumber === tbl;
              return (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => {
                    setTableNumber(tbl);
                    window.history.replaceState(null, "", `/customer?table=${tbl}`);
                    setIsTableSwitchOpen(false);
                  }}
                  className={cn(
                    "p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border",
                    isCurrent
                      ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/30 font-black scale-105"
                      : "bg-white/80 border-zinc-200/80 text-zinc-800 hover:bg-sky-50 hover:border-sky-300 font-bold"
                  )}
                >
                  <MapPin className={cn("w-4 h-4", isCurrent ? "text-white" : "text-sky-600")} />
                  <span className="text-sm font-black">Meja {tbl}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      <OrderSummaryModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        tableNumber={tableNumber}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToPayment={handleProceedToPayment}
        isProcessing={isCheckingOut}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        order={currentPayingOrder}
        onConfirmPayment={handleConfirmPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <OrderStatusDrawer
        isOpen={isOrderStatusOpen}
        onClose={() => setIsOrderStatusOpen(false)}
        orders={activeOrders}
        onOpenSupport={() => {
          setIsOrderStatusOpen(false);
          setIsSupportOpen(true);
        }}
      />

      <AIConversationDrawer
        isOpen={isConversationOpen}
        onClose={() => setIsConversationOpen(false)}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isAiSending}
        tableNumber={tableNumber}
        aiStatus={conversation?.aiStatus || "ACTIVE"}
        cart={cart}
        onOpenPayment={() => {
          if (cart && cart.items.length > 0) {
            handleProceedToPayment("Pesanan via AI Smart Waiter");
          }
        }}
        isCheckingOut={isCheckingOut}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        tableNumber={tableNumber}
        onRequestSupport={handleRequestSupport}
      />
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen customer-canvas-bg flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-xl animate-pulse">
              H
            </div>
            <span className="text-sm font-bold text-sky-950">
              Memuat Havenso Cafe...
            </span>
          </div>
        </div>
      }
    >
      <CustomerView />
    </Suspense>
  );
}
