package javiertorres.chatconai18settembre.service;

import javiertorres.chatconai18settembre.dto.StatisticsResponse;
import javiertorres.chatconai18settembre.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class StatisticsService {
    private final MessageRepository messages;
    private final UserService users;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public StatisticsResponse calculate(long me) {
        users.require(me);
        // Snapshot coerente anche se arrivano messaggi tra una query e l'altra.
        return new StatisticsResponse(messages.countBySenderId(me), messages.countByRecipientId(me),
                messages.countOpenChats(me), Instant.now());
    }
}
