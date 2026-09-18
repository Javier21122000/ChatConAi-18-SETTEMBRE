package javiertorres.chatconai18settembre.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import lombok.extern.slf4j.Slf4j;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final JwtDecoder decoder;
    private final Map<String, Instant> expirations = new ConcurrentHashMap<>();
    private static final Set<String> SUBSCRIPTIONS = Set.of("/user/queue/messages", "/user/queue/errors");

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            throw new AccessDeniedException("Frame STOMP non valido");
        }
        var command = accessor.getCommand();
        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new BadCredentialsException("JWT mancante");
            }
            try {
                var jwt = decoder.decode(header.substring(7));
                accessor.setUser(new JwtAuthenticationToken(jwt, java.util.List.of()));
                expirations.put(accessor.getSessionId(), jwt.getExpiresAt());
                return message;
            } catch (JwtException exception) {
                log.debug("WebSocket CONNECT rifiutato: JWT non valido");
                throw new BadCredentialsException("JWT non valido o scaduto");
            }
        }
        if (command == StompCommand.DISCONNECT) {
            return message;
        }
        if (!(accessor.getUser() instanceof JwtAuthenticationToken authentication)
                || !authentication.isAuthenticated() || !isActive(accessor.getSessionId())) {
            throw new AccessDeniedException("Sessione non autenticata o JWT scaduto");
        }
        if (command == StompCommand.SEND && "/app/chat.send".equals(accessor.getDestination())) {
            return message;
        }
        if (command == StompCommand.SUBSCRIBE && accessor.getDestination() != null
                && SUBSCRIPTIONS.contains(accessor.getDestination())) {
            return message;
        }
        if (command == StompCommand.UNSUBSCRIBE || command == null) {
            return message;
        }
        // Impedisce invii diretti al broker e sottoscrizioni alle code di altri utenti.
        throw new AccessDeniedException("Destinazione STOMP non consentita");
    }

    public ChannelInterceptor outboundGuard() {
        return new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
                var type = SimpMessageHeaderAccessor.getMessageType(message.getHeaders());
                // Anche le sottoscrizioni esistenti smettono di ricevere dati a token scaduto.
                if (type == org.springframework.messaging.simp.SimpMessageType.MESSAGE && !isActive(sessionId)) {
                    return null;
                }
                return message;
            }
        };
    }

    private boolean isActive(String sessionId) {
        Instant expiration = sessionId == null ? null : expirations.get(sessionId);
        return expiration != null && expiration.isAfter(Instant.now());
    }

    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        expirations.remove(event.getSessionId());
        log.debug("WebSocket disconnesso: {}", event.getSessionId());
    }
}
