package javiertorres.chatconai18settembre.dto;

import jakarta.validation.constraints.*;
import javiertorres.chatconai18settembre.entity.ChatMessage;
import java.time.Instant;

public final class ChatDtos {
    private ChatDtos() {}

    // Il mittente non viene accettato nel payload: deriva sempre dal JWT.
    public record SendRequest(@NotNull @Positive Long recipientId,
                              @NotBlank @Size(max = 4000) String content) {}

    public record MessageResponse(long id, long senderId, long recipientId, String content, Instant sentAt) {
        public static MessageResponse from(ChatMessage message) {
            return new MessageResponse(message.getId(), message.getSender().getId(),
                    message.getRecipient().getId(), message.getContent(), message.getSentAt());
        }
    }

    public record ErrorResponse(int status, String message) {}
}
