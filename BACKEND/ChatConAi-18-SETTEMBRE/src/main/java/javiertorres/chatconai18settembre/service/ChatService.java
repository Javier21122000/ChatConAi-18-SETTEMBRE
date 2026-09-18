package javiertorres.chatconai18settembre.service;

import jakarta.validation.Valid;
import javiertorres.chatconai18settembre.dto.ChatDtos.*;
import javiertorres.chatconai18settembre.dto.SliceResponse;
import javiertorres.chatconai18settembre.entity.ChatMessage;
import javiertorres.chatconai18settembre.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@RequiredArgsConstructor
public class ChatService {
    private final MessageRepository messages;
    private final FriendshipService friendships;
    private final UserService users;
    private final ApplicationEventPublisher events;

    @Transactional
    public MessageResponse send(long senderId, @Valid SendRequest request) {
        friendships.requireAccepted(senderId, request.recipientId());
        var message = messages.save(new ChatMessage(users.require(senderId),
                users.require(request.recipientId()), request.content().strip()));
        var response = MessageResponse.from(message);
        events.publishEvent(new MessageSaved(response));
        return response;
    }

    @Transactional(readOnly = true)
    public SliceResponse<MessageResponse> history(long me, long other, int page, int size) {
        friendships.requireAccepted(me, other);
        return SliceResponse.from(messages.findConversation(me, other,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "sentAt", "id")))
                .map(MessageResponse::from));
    }

    public record MessageSaved(MessageResponse message) {}
}
