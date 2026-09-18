import { describe, expect, it } from 'vitest';
import { mergeMessages, suggestionHistory } from './messages';
import type { MessageResponse } from '../types';

const message = (id: number, overrides: Partial<MessageResponse> = {}): MessageResponse => ({
  id, senderId: 1, recipientId: 2, content: `Messaggio ${id}`, sentAt: '2026-09-18T10:00:00Z', ...overrides,
});
describe('conversation synchronization', () => {
  it('deduplicates REST history and the sender STOMP echo, including equal timestamps', () => {
    const result = mergeMessages([message(3), message(2)], [message(2), message(1)]);
    expect(result.map(item => item.id)).toEqual([1, 2, 3]);
  });
  it('orders timestamps before using the ID tie breaker', () => {
    expect(mergeMessages([message(10, { sentAt: '2026-09-17T10:00:00Z' }), message(1)]).map(item => item.id)).toEqual([10, 1]);
  });
  it('sends only the last 20 messages from the current conversation, each within the Java DTO limit', () => {
    const history = Array.from({ length: 25 }, (_, id) => message(id + 1, { content: 'a'.repeat(4000) }));
    history.push(message(30, { senderId: 99 }));
    history.push(message(31, { recipientId: 99 }));
    const result = suggestionHistory(history, 1, 2);
    expect(result).toHaveLength(20);
    expect(result.every(item => item.content.length === 2000 && item.senderId === 1)).toBe(true);
    expect(Object.keys(result[0]).sort()).toEqual(['content', 'senderId']);
  });
});
