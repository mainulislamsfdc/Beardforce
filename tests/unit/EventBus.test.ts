import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventBus, type CRMEvent } from '../../services/workflows/EventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.reset();
  });

  it('calls handler on matching event type', async () => {
    const handler = vi.fn();
    eventBus.on('lead.created', handler);

    await eventBus.emit({
      type: 'lead.created',
      data: { name: 'Test Lead' },
      timestamp: new Date().toISOString(),
    });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lead.created', data: { name: 'Test Lead' } })
    );
  });

  it('does not call handler for non-matching event type', async () => {
    const handler = vi.fn();
    eventBus.on('lead.created', handler);

    await eventBus.emit({
      type: 'order.created',
      data: {},
      timestamp: new Date().toISOString(),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('wildcard (*) handler receives all events', async () => {
    const handler = vi.fn();
    eventBus.on('*', handler);

    await eventBus.emit({ type: 'lead.created', data: {}, timestamp: '' });
    await eventBus.emit({ type: 'order.deleted', data: {}, timestamp: '' });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('onPattern matches prefix patterns', async () => {
    const handler = vi.fn();
    eventBus.onPattern('lead.*', handler);

    await eventBus.emit({ type: 'lead.created', data: {}, timestamp: '' });
    await eventBus.emit({ type: 'lead.updated', data: {}, timestamp: '' });
    await eventBus.emit({ type: 'order.created', data: {}, timestamp: '' });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe removes the handler', async () => {
    const handler = vi.fn();
    const unsub = eventBus.on('lead.created', handler);

    await eventBus.emit({ type: 'lead.created', data: {}, timestamp: '' });
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    await eventBus.emit({ type: 'lead.created', data: {}, timestamp: '' });
    expect(handler).toHaveBeenCalledOnce(); // Still 1, not 2
  });

  it('emitEntityEvent builds a proper CRMEvent', async () => {
    const handler = vi.fn();
    eventBus.on('leads.created', handler);

    await eventBus.emitEntityEvent('created', 'leads', 'abc-123', { name: 'Bob' }, 'user-1');

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'leads.created',
        entity: 'leads',
        entityId: 'abc-123',
        data: { name: 'Bob' },
        userId: 'user-1',
      })
    );
  });

  it('getRecentEvents returns event history', async () => {
    await eventBus.emit({ type: 'a', data: {}, timestamp: '1' });
    await eventBus.emit({ type: 'b', data: {}, timestamp: '2' });
    await eventBus.emit({ type: 'c', data: {}, timestamp: '3' });

    const recent = eventBus.getRecentEvents(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].type).toBe('b');
    expect(recent[1].type).toBe('c');
  });

  it('handler errors do not propagate to emitter', async () => {
    const badHandler = vi.fn().mockRejectedValue(new Error('handler fail'));
    const goodHandler = vi.fn();

    eventBus.on('test', badHandler);
    eventBus.on('test', goodHandler);

    // Should not throw
    await eventBus.emit({ type: 'test', data: {}, timestamp: '' });

    expect(badHandler).toHaveBeenCalledOnce();
    expect(goodHandler).toHaveBeenCalledOnce();
  });

  it('reset clears all handlers and log', async () => {
    const handler = vi.fn();
    eventBus.on('test', handler);
    await eventBus.emit({ type: 'test', data: {}, timestamp: '' });

    expect(eventBus.getRecentEvents()).toHaveLength(1);
    eventBus.reset();
    expect(eventBus.getRecentEvents()).toHaveLength(0);

    // After reset, handler should no longer fire
    await eventBus.emit({ type: 'test', data: {}, timestamp: '' });
    expect(handler).toHaveBeenCalledOnce(); // Only the pre-reset call
    // But the event is still logged (emit always logs)
    expect(eventBus.getRecentEvents()).toHaveLength(1);
  });
});
