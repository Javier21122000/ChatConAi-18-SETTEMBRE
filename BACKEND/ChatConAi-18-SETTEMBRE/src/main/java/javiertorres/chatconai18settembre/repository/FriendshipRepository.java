package javiertorres.chatconai18settembre.repository;

import javiertorres.chatconai18settembre.entity.Friendship;
import javiertorres.chatconai18settembre.entity.FriendshipStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {
    Optional<Friendship> findByPairKey(String pairKey);
    boolean existsByPairKeyAndStatus(String pairKey, FriendshipStatus status);

    @EntityGraph(attributePaths = {"requester", "recipient"})
    Slice<Friendship> findByRequesterIdOrRecipientId(Long requesterId, Long recipientId, Pageable pageable);
}
