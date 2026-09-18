package javiertorres.chatconai18settembre.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import javiertorres.chatconai18settembre.dto.FriendshipDtos.*;
import javiertorres.chatconai18settembre.dto.SliceResponse;
import javiertorres.chatconai18settembre.entity.FriendshipStatus;
import javiertorres.chatconai18settembre.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
@Validated
public class FriendshipController {
    private final FriendshipService friendships;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Response request(Principal principal, @Valid @RequestBody Request request) {
        return friendships.request(Long.parseLong(principal.getName()), request.recipientId());
    }

    @GetMapping
    public SliceResponse<Response> list(Principal principal,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return friendships.list(Long.parseLong(principal.getName()), page, size);
    }

    @PatchMapping("/{id}/accept")
    public Response accept(Principal principal, @PathVariable @Positive long id) {
        return friendships.respond(Long.parseLong(principal.getName()), id, FriendshipStatus.ACCEPTED);
    }

    @PatchMapping("/{id}/reject")
    public Response reject(Principal principal, @PathVariable @Positive long id) {
        return friendships.respond(Long.parseLong(principal.getName()), id, FriendshipStatus.REJECTED);
    }
}
