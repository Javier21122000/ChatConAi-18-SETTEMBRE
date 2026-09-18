package javiertorres.chatconai18settembre.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import javiertorres.chatconai18settembre.dto.*;
import javiertorres.chatconai18settembre.dto.ChatDtos.*;
import javiertorres.chatconai18settembre.service.ChatService;
import javiertorres.chatconai18settembre.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Validated
public class ChatController {
    private final ChatService chat;
    private final UserService users;

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse send(Principal principal, @Valid @RequestBody SendRequest request) {
        return chat.send(Long.parseLong(principal.getName()), request);
    }

    @GetMapping("/messages/{otherUserId}")
    public SliceResponse<MessageResponse> history(Principal principal, @PathVariable @Positive long otherUserId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return chat.history(Long.parseLong(principal.getName()), otherUserId, page, size);
    }

    @GetMapping("/chats")
    public SliceResponse<UserView> chats(Principal principal,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return users.chats(Long.parseLong(principal.getName()), page, size);
    }
}
