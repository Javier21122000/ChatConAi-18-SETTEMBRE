package javiertorres.chatconai18settembre.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public final class AiDtos {
    private AiDtos() {}

    public record HistoryMessage(@NotNull @Positive Long senderId,
                                 @NotBlank @Size(max = 2000) String content) {}

    public record SuggestionRequest(
            @NotNull @Positive Long recipientId,
            @NotNull @Size(min = 1, max = 20) List<@NotNull @Valid HistoryMessage> history) {}

    public record SuggestionResponse(String suggestion) {}
}
