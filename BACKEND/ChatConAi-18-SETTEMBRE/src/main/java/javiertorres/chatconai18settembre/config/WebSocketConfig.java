package javiertorres.chatconai18settembre.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.config.*;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;
import java.util.Arrays;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final WebSocketAuthInterceptor authentication;
    private final String[] origins;

    public WebSocketConfig(WebSocketAuthInterceptor authentication,
                           @Value("${app.cors.allowed-origins}") String origins) {
        this.authentication = authentication;
        this.origins = Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Gli errori del ChannelInterceptor devono raggiungere il gestore STOMP.
        // Con questa versione, preserveReceiveOrder assorbirebbe gli errori di autenticazione.
        registry.setErrorHandler(new StompSubProtocolErrorHandler() {
            @Override
            public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> message, Throwable exception) {
                var accessor = StompHeaderAccessor.create(StompCommand.ERROR);
                accessor.setMessage("Frame rifiutato: verifica JWT e destinazione STOMP");
                accessor.setLeaveMutable(true);
                return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
            }
        });
        registry.addEndpoint("/ws").setAllowedOrigins(origins).withSockJS().setSessionCookieNeeded(false);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        registry.setPreservePublishOrder(true);
        registry.enableSimpleBroker("/queue").setTaskScheduler(stompHeartbeatScheduler())
                .setHeartbeatValue(new long[]{10000, 10000});
    }

    @Bean
    public ThreadPoolTaskScheduler stompHeartbeatScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("stomp-heartbeat-");
        return scheduler;
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authentication);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(authentication.outboundGuard());
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(32768).setSendBufferSizeLimit(262144).setSendTimeLimit(15000);
    }
}
