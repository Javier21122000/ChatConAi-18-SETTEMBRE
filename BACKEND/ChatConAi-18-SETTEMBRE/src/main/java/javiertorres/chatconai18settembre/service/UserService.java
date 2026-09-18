package javiertorres.chatconai18settembre.service;

import javiertorres.chatconai18settembre.dto.*;
import javiertorres.chatconai18settembre.entity.UserAccount;
import javiertorres.chatconai18settembre.repository.UserRepository;
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
public class UserService {
    private final UserRepository users;

    public UserAccount require(long id) {
        return users.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Utente non trovato"));
    }

    public UserView me(long id) {
        return UserView.from(require(id));
    }

    public SliceResponse<UserView> search(long me, String query, int page, int size) {
        return SliceResponse.from(users.findByUsernameContainingIgnoreCaseAndIdNot(query.strip(), me,
                PageRequest.of(page, size, Sort.by("username", "id"))).map(UserView::from));
    }

    public SliceResponse<UserView> chats(long me, int page, int size) {
        return SliceResponse.from(users.findChatPartners(me,
                PageRequest.of(page, size, Sort.by("username", "id"))).map(UserView::from));
    }
}
