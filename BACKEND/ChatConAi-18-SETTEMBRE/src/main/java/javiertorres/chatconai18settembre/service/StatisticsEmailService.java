package javiertorres.chatconai18settembre.service;

import jakarta.mail.MessagingException;
import javiertorres.chatconai18settembre.dto.StatisticsResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class StatisticsEmailService {
    private final StatisticsService statistics;
    private final UserService users;
    private final JavaMailSender mail;
    private final TemplateEngine templates;
    private final String from;

    public StatisticsEmailService(StatisticsService statistics, UserService users, JavaMailSender mail,
                                  TemplateEngine templates, @Value("${app.mail.from}") String from) {
        this.statistics = statistics;
        this.users = users;
        this.mail = mail;
        this.templates = templates;
        this.from = from;
    }

    public StatisticsResponse send(long me) {
        var user = users.require(me);
        var report = statistics.calculate(me);
        var context = new Context(Locale.ITALIAN);
        context.setVariable("username", user.getUsername());
        context.setVariable("stats", report);
        String html = templates.process("email/statistics", context);
        try {
            var message = mail.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            // Il destinatario è sempre l'email del titolare autenticato.
            helper.setTo(user.getEmail());
            helper.setSubject("Le tue statistiche su ChatConAi");
            helper.setText(html, true);
            mail.send(message);
            return report;
        } catch (MessagingException | MailException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invio email non riuscito, riprova più tardi");
        }
    }
}
