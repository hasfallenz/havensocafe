import { RealtimeEvent } from "@/types";

type EventCallback = (event: RealtimeEvent) => void;

class RealtimeEventBus {
  private subscribers: Set<EventCallback> = new Set();

  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  broadcast(type: RealtimeEvent["type"], data: any) {
    const event: RealtimeEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (err) {
        console.error("Error dispatching realtime event callback:", err);
      }
    }
  }
}

// Global singleton for Next.js dev server hot reload
const globalForEvents = globalThis as unknown as { eventBus: RealtimeEventBus };

export const eventBus = globalForEvents.eventBus || new RealtimeEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.eventBus = eventBus;
}
