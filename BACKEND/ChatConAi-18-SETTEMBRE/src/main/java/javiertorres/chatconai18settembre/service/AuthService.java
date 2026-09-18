package javiertorres.chatconai18settembre.service;

import javiertorres.chatconai18settembre.dto.AuthDtos.*;
import javiertorres.chatconai18settembre.entity.UserAccount;
import javiertorres.chatconai18settembre.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwt;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validatePasswordLength(request.password());
        String username = request.username().toLowerCase(Locale.ROOT);
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email) || users.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email o username già utilizzato");
        }
        var user = users.saveAndFlush(new UserAccount(username, email, passwords.encode(request.password())));
        return jwt.issue(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        validatePasswordLength(request.password());
        String email = normalizeEmail(request.email());
        authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        return jwt.issue(users.findByEmail(email).orElseThrow());
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private void validatePasswordLength(String password) {
        // BCrypt ha un limite in byte, diverso dal numero di caratteri Unicode.
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La password supera 72 byte UTF-8");
        }
    }
}
