package javiertorres.chatconai18settembre.controller;

import javiertorres.chatconai18settembre.dto.StatisticsResponse;
import javiertorres.chatconai18settembre.service.StatisticsEmailService;
import javiertorres.chatconai18settembre.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
public class StatisticsController {
    private final StatisticsService statistics;
    private final StatisticsEmailService email;

    @GetMapping
    public StatisticsResponse get(Principal principal) {
        return statistics.calculate(Long.parseLong(principal.getName()));
    }

    @PostMapping("/email")
    public StatisticsResponse sendEmail(Principal principal) {
        return email.send(Long.parseLong(principal.getName()));
    }
}
