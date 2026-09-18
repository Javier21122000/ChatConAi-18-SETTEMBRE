package javiertorres.chatconai18settembre.controller;

import jakarta.validation.Valid;
import javiertorres.chatconai18settembre.dto.AiDtos.*;
import javiertorres.chatconai18settembre.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {
    private final AiService ai;

    @PostMapping("/suggestion")
    public SuggestionResponse suggest(Principal principal, @Valid @RequestBody SuggestionRequest request) {
        return ai.suggest(Long.parseLong(principal.getName()), request);
    }
}
