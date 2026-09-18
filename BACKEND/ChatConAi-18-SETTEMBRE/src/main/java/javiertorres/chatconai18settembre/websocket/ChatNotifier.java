package javiertorres.chatconai18settembre.websocket;

import javiertorres.chatconai18settembre.service.ChatService.MessageSaved;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatNotifier {
    private final SimpMessagingTemplate messaging;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyParticipants(MessageSaved event) {
        var message = event.message();
        for (long userId : new long[]{message.senderId(), message.recipientId()}) {
            try {
                messaging.convertAndSendToUser(Long.toString(userId), "/queue/messages", message);
            } catch (MessagingException exception) {
                // Il messaggio è salvato: il client può recuperarlo dalla cronologia REST.
                log.warn("Notifica non consegnata per messaggio {} e utente {}", message.id(), userId);
            }
        }
    }
}
