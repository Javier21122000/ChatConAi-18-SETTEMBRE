// These field names mirror the Java records in backend/dto exactly.
export interface UserView { id: number; username: string }
export interface AuthResponse {
  accessToken: string; tokenType: string; expiresIn: number; userId: number; username: string;
}
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest extends LoginRequest { username: string }
export interface SliceResponse<T> { items: T[]; page: number; hasNext: boolean }
export interface MessageResponse {
  id: number; senderId: number; recipientId: number; content: string; sentAt: string;
}
export interface SendRequest { recipientId: number; content: string }
export interface FriendshipResponse {
  id: number; requester: UserView; recipient: UserView;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'; requestedAt: string; respondedAt: string | null;
}
export interface SuggestionRequest {
  recipientId: number; history: { senderId: number; content: string }[];
}
export interface SuggestionResponse { suggestion: string }
export interface StatisticsResponse {
  sentMessages: number; receivedMessages: number; openChats: number; generatedAt: string;
}
export interface ChatError { status: number; message: string }
export interface Session extends AuthResponse { expiresAt: number }
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'demo';
