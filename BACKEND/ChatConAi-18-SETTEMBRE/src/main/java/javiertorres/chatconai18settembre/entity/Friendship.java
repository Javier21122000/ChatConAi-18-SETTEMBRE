package javiertorres.chatconai18settembre.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "friendships", indexes = {
        @Index(name = "idx_friendship_requester", columnList = "requester_id"),
        @Index(name = "idx_friendship_recipient", columnList = "recipient_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Friendship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private UserAccount requester;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private UserAccount recipient;

    // A->B e B->A condividono la chiave: UNIQUE impedisce anche duplicati concorrenti.
    @Column(nullable = false, unique = true, length = 41)
    private String pairKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FriendshipStatus status;

    @Column(nullable = false)
    private Instant requestedAt;
    private Instant respondedAt;

    @Version
    private long version;

    public Friendship(UserAccount requester, UserAccount recipient) {
        requestAgain(requester, recipient);
    }

    public static String pairKey(long first, long second) {
        return Math.min(first, second) + ":" + Math.max(first, second);
    }

    public void requestAgain(UserAccount requester, UserAccount recipient) {
        this.requester = requester;
        this.recipient = recipient;
        this.pairKey = pairKey(requester.getId(), recipient.getId());
        this.status = FriendshipStatus.PENDING;
        this.requestedAt = Instant.now();
        this.respondedAt = null;
    }

    public void respond(FriendshipStatus status) {
        this.status = status;
        this.respondedAt = Instant.now();
    }
}
