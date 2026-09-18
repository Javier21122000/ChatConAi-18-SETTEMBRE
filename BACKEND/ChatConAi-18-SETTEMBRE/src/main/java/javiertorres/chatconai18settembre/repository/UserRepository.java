package javiertorres.chatconai18settembre.repository;

import javiertorres.chatconai18settembre.entity.UserAccount;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    Slice<UserAccount> findByUsernameContainingIgnoreCaseAndIdNot(String username, Long id, Pageable pageable);

    @Query("""
            select u from UserAccount u where
            u.id in (select m.recipient.id from ChatMessage m where m.sender.id = :userId)
            or u.id in (select m.sender.id from ChatMessage m where m.recipient.id = :userId)
            """)
    Slice<UserAccount> findChatPartners(@Param("userId") long userId, Pageable pageable);
}
