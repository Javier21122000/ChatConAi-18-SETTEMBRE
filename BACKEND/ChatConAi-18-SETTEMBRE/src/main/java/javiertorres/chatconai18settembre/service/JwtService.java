package javiertorres.chatconai18settembre.service;

import javiertorres.chatconai18settembre.dto.AuthDtos.AuthResponse;
import javiertorres.chatconai18settembre.entity.UserAccount;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class JwtService {
    private final JwtEncoder encoder;
    private final String issuer;
    private final long expirationMillis;

    public JwtService(JwtEncoder encoder, @Value("${jwt.issuer}") String issuer,
                      @Value("${jwt.expiration}") long expirationMillis) {
        if (expirationMillis < 1000) {
            throw new IllegalArgumentException("JWT_EXPIRATION deve essere almeno 1000 millisecondi");
        }
        this.encoder = encoder;
        this.issuer = issuer;
        this.expirationMillis = expirationMillis;
    }

    public AuthResponse issue(UserAccount user) {
        Instant now = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(issuer).subject(user.getId().toString())
                .issuedAt(now).expiresAt(now.plusMillis(expirationMillis)).build();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new AuthResponse(token, "Bearer", expirationMillis / 1000, user.getId(), user.getUsername());
    }
}
