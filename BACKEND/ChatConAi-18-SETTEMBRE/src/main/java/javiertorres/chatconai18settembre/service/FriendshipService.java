package javiertorres.chatconai18settembre.service;

import javiertorres.chatconai18settembre.dto.FriendshipDtos.Response;
import javiertorres.chatconai18settembre.dto.SliceResponse;
import javiertorres.chatconai18settembre.entity.Friendship;
import javiertorres.chatconai18settembre.entity.FriendshipStatus;
import javiertorres.chatconai18settembre.repository.FriendshipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FriendshipService {
    private final FriendshipRepository friendships;
    private final UserService users;

    @Transactional
    public Response request(long me, long recipientId) {
        if (me == recipientId) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Non puoi aggiungere te stesso");
        }
        var requester = users.require(me);
        var recipient = users.require(recipientId);
        var friendship = friendships.findByPairKey(Friendship.pairKey(me, recipientId)).orElse(null);
        if (friendship == null) {
            friendship = new Friendship(requester, recipient);
        } else if (friendship.getStatus() == FriendshipStatus.REJECTED) {
            friendship.requestAgain(requester, recipient);
        } else {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Amicizia già richiesta o accettata");
        }
        return Response.from(friendships.saveAndFlush(friendship));
    }

    @Transactional
    public Response respond(long me, long id, FriendshipStatus status) {
        var friendship = friendships.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Richiesta non trovata"));
        if (friendship.getRecipient().getId() != me) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo il destinatario può rispondere");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Richiesta già gestita");
        }
        if (status != FriendshipStatus.ACCEPTED && status != FriendshipStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Risposta non valida");
        }
        friendship.respond(status);
        return Response.from(friendship);
    }

    public SliceResponse<Response> list(long me, int page, int size) {
        return SliceResponse.from(friendships.findByRequesterIdOrRecipientId(me, me,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"))).map(Response::from));
    }

    public void requireAccepted(long me, long other) {
        if (me == other || !friendships.existsByPairKeyAndStatus(
                Friendship.pairKey(me, other), FriendshipStatus.ACCEPTED)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "È necessaria un'amicizia accettata");
        }
    }
}
