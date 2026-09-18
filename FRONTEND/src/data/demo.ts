import type { FriendshipResponse, MessageResponse, Session, UserView } from '../types';

export const demoSession: Session = {
  accessToken: '', tokenType: 'Bearer', expiresIn: 3600, userId: 1, username: 'alex', expiresAt: Infinity,
};
export const demoUsers: UserView[] = [
  { id: 2, username: 'sofia' }, { id: 3, username: 'marco' }, { id: 4, username: 'giulia' },
  { id: 5, username: 'andrea' }, { id: 6, username: 'elena' }, { id: 7, username: 'luca' },
  { id: 8, username: 'chiara' }, { id: 9, username: 'davide' },
];
function todayAt(hour: number, minute: number) {
  const day = new Date(); day.setHours(hour, minute, 0, 0); return day.toISOString();
}
export const demoFriendships: FriendshipResponse[] = demoUsers.slice(0, 7).map((user, i) => ({
  id: i + 1, requester: i < 5 ? { id: 1, username: 'alex' } : user,
  recipient: i < 5 ? user : { id: 1, username: 'alex' },
  status: i < 5 ? 'ACCEPTED' : 'PENDING', requestedAt: todayAt(8, 0),
  respondedAt: i < 5 ? todayAt(8, 10) : null,
}));
export const demoMessages: Record<number, MessageResponse[]> = {
  2: [
    { id: 1, senderId: 2, recipientId: 1, content: 'Ehi! Hai programmi per questo weekend?', sentAt: todayAt(10, 24) },
    { id: 2, senderId: 1, recipientId: 2, content: 'Ancora niente di preciso. Avevi qualcosa in mente?', sentAt: todayAt(10, 25) },
    { id: 3, senderId: 2, recipientId: 1, content: 'Pensavo a una giornata al mare. Un po’ di sole, un libro e zero notifiche ☀️', sentAt: todayAt(10, 26) },
    { id: 4, senderId: 2, recipientId: 1, content: 'Ho trovato anche un posticino per pranzo, proprio sulla spiaggia.', sentAt: todayAt(10, 26) },
    { id: 5, senderId: 1, recipientId: 2, content: 'Mi hai convinto già a “zero notifiche”. Ci sono!', sentAt: todayAt(10, 28) },
    { id: 6, senderId: 2, recipientId: 1, content: 'Perfetto! Partiamo sabato mattina? 🚙', sentAt: todayAt(10, 30) },
  ],
  3: [{ id: 10, senderId: 3, recipientId: 1, content: 'Ti mando la playlist di cui parlavamo 🎧', sentAt: todayAt(9, 42) }],
  4: [{ id: 11, senderId: 1, recipientId: 4, content: 'Grazie ancora per ieri!', sentAt: todayAt(9, 18) }],
  5: [{ id: 12, senderId: 5, recipientId: 1, content: 'Un caffè questa settimana?', sentAt: todayAt(8, 56) }],
  6: [{ id: 13, senderId: 6, recipientId: 1, content: 'Ahaha esattamente 😂', sentAt: todayAt(8, 20) }],
};
