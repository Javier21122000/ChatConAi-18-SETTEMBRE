package javiertorres.chatconai18settembre.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_message_conversation", columnList = "sender_id,recipient_id,sent_at,id"),
        @Index(name = "idx_message_recipient", columnList = "recipient_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false, updatable = false)
    private UserAccount sender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false, updatable = false)
    private UserAccount recipient;

    @Column(nullable = false, length = 4000, updatable = false)
    private String content;

    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;

    public ChatMessage(UserAccount sender, UserAccount recipient, String content) {
        this.sender = sender;
        this.recipient = recipient;
        this.content = content;
        this.sentAt = Instant.now();
    }
}
