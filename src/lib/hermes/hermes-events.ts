/* ============================================
   Hermes — Event System
   ============================================ */

import type { HermesEvent, HermesEventPayload, HermesListener } from "./hermes-types";

/** Simple pub/sub event bus for Hermes */
class HermesEventBus {
  private listeners = new Map<HermesEvent, HermesListener[]>();

  /** Subscribe to an event */
  on(event: HermesEvent, listener: HermesListener): () => void {
    const arr = this.listeners.get(event) ?? [];
    arr.push(listener);
    this.listeners.set(event, arr);
    return () => {
      const idx = arr.indexOf(listener);
      if (idx >= 0) arr.splice(idx, 1);
    };
  }

  /** Emit an event to all subscribers */
  emit(type: HermesEvent, data?: Record<string, unknown>): void {
    const payload: HermesEventPayload = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    const arr = this.listeners.get(type);
    if (arr) {
      // Use setTimeout to make events async and non-blocking
      for (const listener of arr) {
        setTimeout(() => {
          try {
            listener(payload);
          } catch (err) {
            console.error(`[Hermes] Error in event listener for ${type}:`, err);
          }
        }, 0);
      }
    }
  }

  /** Remove all listeners for a specific event */
  clear(event: HermesEvent): void {
    this.listeners.delete(event);
  }

  /** Remove all listeners */
  clearAll(): void {
    this.listeners.clear();
  }
}

/** Singleton event bus instance */
export const hermesEvents = new HermesEventBus();
