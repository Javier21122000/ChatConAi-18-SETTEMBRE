package javiertorres.chatconai18settembre.websocket;

import jakarta.validation.Valid;
import jakarta.validation.ConstraintViolationException;
import javiertorres.chatconai18settembre.dto.ChatDtos.*;
import javiertorres.chatconai18settembre.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.converter.MessageConversionException;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {
    private final ChatService chat;

    @MessageMapping("/chat.send")
    public void send(@Valid @Payload SendRequest request, Principal principal) {
        chat.send(Long.parseLong(principal.getName()), request);
    }

    @MessageExceptionHandler(ResponseStatusException.class)
    @SendToUser(value = "/queue/errors", broadcast = false)
    public ErrorResponse applicationError(ResponseStatusException exception) {
        return new ErrorResponse(exception.getStatusCode().value(), exception.getReason());
    }

    @MessageExceptionHandler({MethodArgumentNotValidException.class,
            ConstraintViolationException.class, MessageConversionException.class})
    @SendToUser(value = "/queue/errors", broadcast = false)
    public ErrorResponse validationError(Exception exception) {
        return new ErrorResponse(400, "Messaggio non valido: controlla destinatario e contenuto (1-4000 caratteri)");
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(value = "/queue/errors", broadcast = false)
    public ErrorResponse unexpectedError(Exception exception) {
        log.error("Errore invio WebSocket: {}", exception.getClass().getSimpleName());
        return new ErrorResponse(500, "Invio non riuscito");
    }
}
