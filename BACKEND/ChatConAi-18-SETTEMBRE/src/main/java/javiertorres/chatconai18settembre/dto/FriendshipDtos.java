package javiertorres.chatconai18settembre.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import javiertorres.chatconai18settembre.entity.Friendship;
import javiertorres.chatconai18settembre.entity.FriendshipStatus;
import java.time.Instant;

public final class FriendshipDtos {
    private FriendshipDtos() {}

    public record Request(@NotNull @Positive Long recipientId) {}

    public record Response(long id, UserView requester, UserView recipient,
                           FriendshipStatus status, Instant requestedAt, Instant respondedAt) {
        public static Response from(Friendship friendship) {
            return new Response(friendship.getId(), UserView.from(friendship.getRequester()),
                    UserView.from(friendship.getRecipient()), friendship.getStatus(),
                    friendship.getRequestedAt(), friendship.getRespondedAt());
        }
    }
}
