package javiertorres.chatconai18settembre.repository;

import javiertorres.chatconai18settembre.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageRepository extends JpaRepository<ChatMessage, Long> {
    long countBySenderId(Long userId);
    long countByRecipientId(Long userId);

    @Query("""
            select m from ChatMessage m
            where (m.sender.id = :me and m.recipient.id = :other)
               or (m.sender.id = :other and m.recipient.id = :me)
            """)
    Slice<ChatMessage> findConversation(@Param("me") long me, @Param("other") long other, Pageable pageable);

    @Query(value = """
            select count(distinct case when sender_id = :userId then recipient_id else sender_id end)
            from chat_messages where sender_id = :userId or recipient_id = :userId
            """, nativeQuery = true)
    long countOpenChats(@Param("userId") long userId);
}
