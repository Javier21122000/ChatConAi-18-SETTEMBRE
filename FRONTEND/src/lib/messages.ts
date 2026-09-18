import type { MessageResponse, SuggestionRequest } from '../types';

// REST history is descending; the conversation is chronological. IDs also deduplicate STOMP echoes.
export function mergeMessages(...groups: MessageResponse[][]): MessageResponse[] {
  return [...new Map(groups.flat().map(message => [message.id, message])).values()]
    .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id - b.id);
}
export function suggestionHistory(messages: MessageResponse[], me: number, other: number): SuggestionRequest['history'] {
  return messages.filter(m => (m.senderId === me && m.recipientId === other) ||
    (m.senderId === other && m.recipientId === me)).slice(-20)
    .map(({ senderId, content }) => ({ senderId, content: content.slice(0, 2000) }));
}
export function timeLabel(value: string) {
  return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
export function dayLabel(value: string) {
  const date = new Date(value);
  if (date.toDateString() === new Date().toDateString()) return 'Oggi';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(date);
}
