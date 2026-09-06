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
import { AIComposer } from "@/components/customer/AIComposer";
import { AIConversationDrawer } from "@/components/customer/AIConversationDrawer";
import { OrderSummaryModal } from "@/components/customer/OrderSummaryModal";
import { PaymentModal } from "@/components/customer/PaymentModal";
import { OrderStatusDrawer } from "@/components/customer/OrderStatusDrawer";
import { SupportModal } from "@/components/customer/SupportModal";
import { Modal } from "@/components/ui/Modal";
import { MessageSquare, ShoppingBag, Clock, MapPin, Check, CheckCircle2, ChefHat, ArrowRight, ChevronDown, Coffee, Bot } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

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

  const prevOrderStatusMapRef = React.useRef<Record<string, string>>({});

  const playCustomerChime = useCallback((type: "cooking" | "ready") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "ready") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      } else {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // Audio autoplay blocked
    }
  }, []);

  // 4. Fetch Active Orders with Real-Time Notification Chime
  const loadOrders = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/orders?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Trigger customer sound alert when kitchen advances status
        data.data.forEach((o: OrderData) => {
          const prevStatus = prevOrderStatusMapRef.current[o.id];
          if (prevStatus && prevStatus !== o.status) {
            if (o.status === "COOKING") {
              playCustomerChime("cooking");
            } else if (o.status === "READY") {
              playCustomerChime("ready");
            }
          }
          prevOrderStatusMapRef.current[o.id] = o.status;
        });

        setActiveOrders(data.data);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  }, [sessionId, playCustomerChime]);

  // Continuous 2.5-second background polling for rock-solid sync
  useEffect(() => {
    if (!sessionId) return;
    loadOrders();
    const interval = setInterval(loadOrders, 2500);
    return () => clearInterval(interval);
  }, [sessionId, loadOrders]);

  // Background polling for AI messages (to catch kitchen notifications in chat)
  useEffect(() => {
    if (!conversation?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/conversations/${conversation.id}/messages`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMessages(json.data);
        }
      } catch (e) {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [conversation?.id]);

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
        setActiveSupportTicket(found || null);
      }
    } catch (err) {
      console.error("Failed to load support tickets:", err);
    }
  }, [tableNumber, tableParam]);

  useEffect(() => {
    loadSupportTicket();
    const interval = setInterval(loadSupportTicket, 2500);
    return () => clearInterval(interval);
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
        setSelectedItemForDetail(null);
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

  const cartItemMap = React.useMemo(() => {
    if (!cart?.items) return {};
    return cart.items.reduce((acc, item) => {
      acc[item.menuItemId] = (acc[item.menuItemId] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);
  }, [cart]);

  const latestActiveOrder = activeOrders.find(
    (o) => o.status === "QUEUED" || o.status === "COOKING" || o.status === "READY"
  );

  const renderMobileExperience = () => (
    <div className="flex-1 flex flex-col relative bg-zinc-100 min-h-0 w-full overflow-hidden">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-zinc-950 text-white shadow-md border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center justify-between px-3 py-2 w-full">
          {/* Left: Havenso Brand & Dine-In Table Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
              <Image
                src="/logohavenso.png"
                alt="Havenso Cafe"
                width={85}
                height={22}
                priority
                className="h-5 w-auto object-contain brightness-0 invert"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsTableSwitchOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25 transition-colors cursor-pointer"
              title="Klik untuk ganti nomor meja"
            >
              <span className="text-[10.5px] font-black tracking-tight">
                Dine-In • Meja {tableNumber}
              </span>
              <ChevronDown className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          {/* Right: Active Order Status or Support Trigger */}
          <div className="flex items-center gap-1.5">
            {latestActiveOrder ? (
              <button
                type="button"
                onClick={() => setIsOrderStatusOpen(true)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-[10.5px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs",
                  latestActiveOrder.status === "COOKING"
                    ? "bg-amber-500 text-zinc-950 border border-amber-400 animate-pulse"
                    : latestActiveOrder.status === "READY"
                    ? "bg-emerald-500 text-zinc-950 border border-emerald-400 animate-bounce"
                    : "bg-sky-500 text-white border border-sky-400"
                )}
              >
                {latestActiveOrder.status === "COOKING" ? (
                  <>
                    <ChefHat className="w-3 h-3" />
                    <span>Dimasak</span>
                  </>
                ) : latestActiveOrder.status === "READY" ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Siap!</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>Antrean</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Live Staff Assistance Tracking Banner (Mobile & Android) */}
      {activeSupportTicket && (
        <div
          className={cn(
            "w-full px-3 py-2 text-xs font-semibold flex items-center justify-between border-b transition-all select-none z-30 shrink-0",
            activeSupportTicket.status === "WAITING"
              ? "bg-amber-50 border-amber-200 text-amber-950"
              : activeSupportTicket.status === "IN_PROGRESS"
              ? "bg-emerald-600 border-emerald-700 text-white shadow-xs animate-pulse"
              : "bg-zinc-900 border-zinc-800 text-white"
          )}
        >
          {activeSupportTicket.status === "WAITING" ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
              </span>
              <div>
                <span className="font-black text-[11px] uppercase tracking-tight block leading-tight">Panggilan Bantuan Terkirim</span>
                <span className="text-[10px] text-amber-800 font-medium">Menunggu staf membaca & merespons...</span>
              </div>
            </div>
          ) : activeSupportTicket.status === "IN_PROGRESS" ? (
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">🏃‍♂️</span>
              <div>
                <span className="font-black text-[11px] uppercase tracking-wide block leading-tight">
                  Staf Sedang OTW ke Meja {tableNumber}!
                </span>
                <span className="text-[10px] text-emerald-100 font-medium">
                  {activeSupportTicket.assignedUserName || "Staff"} sudah membaca & menuju ke meja Anda.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold">Bantuan staf telah selesai dilayani. Terima kasih!</span>
            </div>
          )}

          {activeSupportTicket.status !== "RESOLVED" && (
            <button
              type="button"
              onClick={() => setIsConversationOpen(true)}
              className={cn(
                "ml-2 shrink-0 text-[10px] font-black px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                activeSupportTicket.status === "IN_PROGRESS"
                  ? "bg-white text-emerald-800 hover:bg-emerald-50"
                  : "bg-amber-200 text-amber-950 hover:bg-amber-300"
              )}
            >
              Lihat Chat
            </button>
          )}
        </div>
      )}

      {/* 2-Column Mobile Body */}
      <div className="flex-1 flex flex-row min-h-0 w-full overflow-hidden">
        {/* Left Category Rail */}
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
          activeOrderCount={activeOrders.filter((o) => o.status !== "COMPLETED").length}
          activeSupportTicket={activeSupportTicket}
        />

        {/* Right Menu Content (Compact Rows) */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto bg-white pb-32">
          <MenuGrid
            categoryName={activeCategoryName}
            categorySlug={activeCategory}
            items={menuItems}
            isLoading={isLoadingMenu}
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            onSelectItem={(item) => setSelectedItemForDetail(item)}
            cartItemMap={cartItemMap}
          />
        </main>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartTotalItems > 0 && (
        <div className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:w-[480px] bottom-3 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-zinc-950 hover:bg-zinc-900 active:scale-[0.99] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer border border-zinc-800 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-zinc-950 font-black flex items-center justify-center text-xs shadow-xs">
                {cartTotalItems}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-zinc-400 font-medium leading-none">
                  Meja {tableNumber}
                </span>
                <span className="text-xs font-black text-amber-400 mt-0.5">
                  {formatCurrency(cart?.total || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-black text-white bg-zinc-800 group-hover:bg-amber-500 group-hover:text-zinc-950 px-2.5 py-1 rounded-xl transition-colors">
              <span>Lihat Pesanan</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* AI Composer */}
      <AIComposer
        selectedItems={composerSelectedItems}
        onRemoveSelectedItem={handleRemoveComposerItem}
        onSendMessage={handleSendMessage}
        isLoading={isAiSending}
        onOpenConversation={() => setIsConversationOpen(true)}
        unreadCount={messages.length > 1 ? 1 : 0}
        hasCartBottomBar={cartTotalItems > 0}
      />
    </div>
  );

  const renderDesktopExperience = () => (
    <div className="customer-canvas-bg min-h-screen text-zinc-900 flex flex-row relative">
      {/* Left Sidebar (Full desktop sidebar) */}
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
        activeOrderCount={activeOrders.filter((o) => o.status !== "COMPLETED").length}
        activeSupportTicket={activeSupportTicket}
      />

      {/* Right Main Content Area (Original Desktop Layout) */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-36 flex flex-col max-w-7xl w-full overflow-y-auto">
        {/* Floating Live Kitchen Tracking Banner for Customer */}
        {latestActiveOrder && (
          <div className="mb-6">
            <div
              onClick={() => setIsOrderStatusOpen(true)}
              className={cn(
                "cursor-pointer p-4 rounded-3xl border shadow-xl flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99] backdrop-blur-md",
                latestActiveOrder.status === "COOKING"
                  ? "bg-amber-500/15 border-amber-400/80 text-amber-950 shadow-amber-500/10"
                  : latestActiveOrder.status === "READY"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-950 shadow-emerald-500/15 animate-pulse"
                  : "bg-sky-500/15 border-sky-400/80 text-sky-950 shadow-sky-500/10"
              )}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0",
                    latestActiveOrder.status === "COOKING"
                      ? "bg-amber-600 animate-pulse"
                      : latestActiveOrder.status === "READY"
                      ? "bg-emerald-600 animate-bounce"
                      : "bg-sky-600"
                  )}
                >
                  {latestActiveOrder.status === "COOKING" ? (
                    <ChefHat className="w-6 h-6" />
                  ) : latestActiveOrder.status === "READY" ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base">
                      {latestActiveOrder.status === "COOKING"
                        ? "👨‍🍳 Pesanan Sedang Dimasak / Diracik di Dapur!"
                        : latestActiveOrder.status === "READY"
                        ? "🚀 Pesanan Siap & Sedang Diantar ke Meja Anda!"
                        : "🕒 Pesanan Diterima Dapur (Antrean Masuk)"}
                    </span>
                    <span className="text-[10.5px] font-mono font-black px-2 py-0.5 rounded-full bg-white text-zinc-900 border border-zinc-200 shadow-2xs">
                      {latestActiveOrder.orderNumber}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-600 font-semibold mt-0.5">
                    {latestActiveOrder.status === "COOKING"
                      ? `Tim barista & koki sedang meracik pesanan Meja ${tableNumber} sekarang.`
                      : latestActiveOrder.status === "READY"
                      ? `Makanan/minuman sudah siap dan staf sedang mengantarkannya ke Meja ${tableNumber}!`
                      : `Pesanan Meja ${tableNumber} sudah masuk ke antrean dapur.`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-black text-sky-800 bg-white/90 px-3.5 py-2 rounded-xl border border-sky-200 shrink-0 shadow-2xs hover:bg-sky-50">
                <span>Lacak Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        )}

        {/* Menu Grid (Desktop 3-Col Glass Cards) */}
        <MenuGrid
          categoryName={activeCategoryName}
          categorySlug={activeCategory}
          items={menuItems}
          isLoading={isLoadingMenu}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          onSelectItem={(item) => setSelectedItemForDetail(item)}
          cartItemMap={cartItemMap}
        />
      </main>

      {/* AI Composer (Desktop Bottom-Right) */}
      <AIComposer
        selectedItems={composerSelectedItems}
        onRemoveSelectedItem={handleRemoveComposerItem}
        onSendMessage={handleSendMessage}
        isLoading={isAiSending}
        onOpenConversation={() => setIsConversationOpen(true)}
        unreadCount={messages.length > 1 ? 1 : 0}
        hasCartBottomBar={cartTotalItems > 0}
      />
    </div>
  );

  return (
    <>
      {/* 1. Mobile Phone View (Screen < md): Native compact cafe ordering */}
      <div className="md:hidden min-h-screen flex flex-col">
        {renderMobileExperience()}
      </div>

      {/* 2. Tablet (iPad) & Laptop / Desktop View (Screen >= md): Responsive glass dashboard */}
      <div className="hidden md:block">
        {renderDesktopExperience()}
      </div>

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
        activeOrder={latestActiveOrder}
        onOpenOrderStatus={() => setIsOrderStatusOpen(true)}
        activeSupportTicket={activeSupportTicket}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        tableNumber={tableNumber}
        onRequestSupport={handleRequestSupport}
      />
    </>
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
