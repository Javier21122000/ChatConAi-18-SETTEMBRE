package javiertorres.chatconai18settembre.dto;

import java.time.Instant;

public record StatisticsResponse(long sentMessages, long receivedMessages, long openChats, Instant generatedAt) {}
