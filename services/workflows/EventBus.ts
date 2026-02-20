/**
 * EventBus — Lightweight pub/sub for CRM events.
 *
 * Components and services emit events (e.g., "lead.created", "order.status_changed")
 * and the WorkflowEngine subscribes to trigger automated workflows.
 *
 * Events are typed and scoped to the current user session.
 * No persistence — this is an in-memory bus for the current browser session.
 * Server-side event processing (webhooks, cron) is handled by Edge Functions.
 */

export interface CRMEvent {
  /** Event name, e.g. "lead.created", "opportunity.won", "order.status_changed" */
  type: string;
  /** The entity that triggered the event */
  entity?: string;
  /** The record ID */
  entityId?: string;
  /** Arbitrary payload (the record data, old/new values, etc.) */
  data: Record<string, any>;
  /** ISO timestamp */
  timestamp: string;
  /** User who caused the event */
  userId?: string;
}

type EventHandler = (event: CRMEvent) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private eventLog: CRMEvent[] = [];
  private maxLogSize = 200;

  /**
   * Subscribe to a specific event type.
   * Use '*' to subscribe to all events.
   * Returns an unsubscribe function.
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (eventType === '*') {
      this.wildcardHandlers.add(handler);
      return () => this.wildcardHandlers.delete(handler);
    }

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to events matching a prefix pattern.
   * e.g., "lead.*" matches "lead.created", "lead.updated", etc.
   * Returns an unsubscribe function.
   */
  onPattern(pattern: string, handler: EventHandler): () => void {
    const prefix = pattern.replace(/\.\*$/, '.');
    const wrappedHandler: EventHandler = (event) => {
      if (event.type.startsWith(prefix)) {
        handler(event);
      }
    };
    this.wildcardHandlers.add(wrappedHandler);
    return () => this.wildcardHandlers.delete(wrappedHandler);
  }

  /**
   * Emit an event. All matching handlers are called asynchronously.
   * Errors in handlers are caught and logged, never propagated.
   */
  async emit(event: CRMEvent): Promise<void> {
    // Add to log
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    const handlers: EventHandler[] = [];

    // Exact match handlers
    const exact = this.handlers.get(event.type);
    if (exact) {
      handlers.push(...exact);
    }

    // Wildcard handlers
    handlers.push(...this.wildcardHandlers);

    // Fire all handlers (don't block the emitter)
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        console.warn(`[EventBus] Handler error for "${event.type}":`, err);
      }
    }
  }

  /**
   * Convenience: emit a standard entity event.
   */
  emitEntityEvent(
    action: 'created' | 'updated' | 'deleted' | 'status_changed',
    entity: string,
    entityId: string,
    data: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    return this.emit({
      type: `${entity}.${action}`,
      entity,
      entityId,
      data,
      timestamp: new Date().toISOString(),
      userId,
    });
  }

  /** Get recent event log (for debugging / audit UI). */
  getRecentEvents(limit = 50): CRMEvent[] {
    return this.eventLog.slice(-limit);
  }

  /** Clear all handlers and log. */
  reset(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.eventLog = [];
  }
}

// Singleton
export const eventBus = new EventBus();
