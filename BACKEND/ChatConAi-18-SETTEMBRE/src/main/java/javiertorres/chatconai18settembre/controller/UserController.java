package javiertorres.chatconai18settembre.controller;

import jakarta.validation.constraints.*;
import javiertorres.chatconai18settembre.dto.*;
import javiertorres.chatconai18settembre.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Validated
public class UserController {
    private final UserService users;

    @GetMapping("/me")
    public UserView me(Principal principal) {
        return users.me(Long.parseLong(principal.getName()));
    }

    @GetMapping
    public SliceResponse<UserView> search(Principal principal,
            @RequestParam @NotBlank @Size(min = 2, max = 30) String query,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return users.search(Long.parseLong(principal.getName()), query, page, size);
    }
}
