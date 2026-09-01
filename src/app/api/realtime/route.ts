import { eventBus } from "@/lib/events";
import { RealtimeEvent } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connected event
      const initialEvent = `data: ${JSON.stringify({
        type: "CONNECTED",
        data: { message: "Connected to Havenso Cafe Realtime Stream" },
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialEvent));

      // 2. Subscribe to global event bus
      unsubscribe = eventBus.subscribe((event: RealtimeEvent) => {
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.error("Failed to enqueue event:", err);
        }
      });

      // 3. Heartbeat every 15 seconds to keep connection alive
      intervalId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (err) {
          if (intervalId) clearInterval(intervalId);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (intervalId) clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
