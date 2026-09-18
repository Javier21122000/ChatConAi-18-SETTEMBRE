package javiertorres.chatconai18settembre.dto;

import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = "[a-zA-Z0-9_]{3,30}") String username,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {}

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 72) String password) {}

    public record AuthResponse(String accessToken, String tokenType, long expiresIn,
                               long userId, String username) {}
}
