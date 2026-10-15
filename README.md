# TxTr — Real-Time Chat with AI Reply Suggestions

## 1. Project overview

TxTr is a full-stack messaging application. Users register, send friend requests, chat in real time once a request is accepted, and can ask an LLM to suggest replies. The backend is Spring Boot with JWT authentication, WebSocket (STOMP) messaging and PostgreSQL; the frontend is React with TypeScript.

I built it in September 2026 during the Full Stack AI Developer programme at Epicode. It runs locally and is not deployed publicly.

## 2. Key features

- **Accounts.** Registration and login with email and password (BCrypt hashing). Access is granted with a signed JWT.
- **Users and friends.** Search for users; send, accept or reject friend requests.
- **Friends-only messaging.** Users can only exchange messages with accepted friends. The server enforces this both when a message is sent and when history is read.
- **Real-time delivery.** Messages travel over STOMP/SockJS to per-user queues, with a REST endpoint as an alternative.
- **Paginated data.** Message history and the chat list are paginated.
- **AI reply suggestions.** Three alternative replies are generated from the current conversation (see [AI integration](#5-ai-integration)).
- **Statistics.** Messages sent and received and open chats are shown per user, and can be emailed as an HTML report (Thymeleaf template, SMTP).
- **Frontend.**
  - light and dark themes;
  - a demo mode with sample data, in which friend requests and messages are simulated in the browser.

## 3. Tech stack

| Layer | Technologies |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Security (OAuth2 Resource Server, JWT), Spring WebSocket (STOMP), Spring Data JPA, Validation, Spring Mail, Thymeleaf, Lombok, Maven |
| Database | PostgreSQL |
| LLM provider | OpenAI Chat Completions API (default model `gpt-4o-mini`) |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, @stomp/stompjs, SockJS, Axios, Framer Motion |
| Testing | Vitest |

## 4. Architecture

```
React + TypeScript (Vite)
   │ REST /api (JWT bearer)          │ STOMP over SockJS /ws (JWT on CONNECT)
   ▼                                  ▼
Spring Boot ── controllers ── services ── JPA ── PostgreSQL
                    │                  ├── AiService ──► OpenAI API
                    │                  └── StatisticsEmailService ──► SMTP
                    └── ChatNotifier ──► /user/queue/messages
```

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login` |
| Users | `GET /api/users/me`, `GET /api/users` (search) |
| Friendships | `POST /api/friendships`, `GET /api/friendships`, `PATCH /api/friendships/{id}/accept`, `PATCH /api/friendships/{id}/reject` |
| Messages | `POST /api/messages`, `GET /api/messages/{otherUserId}`, `GET /api/chats`; STOMP destination `/app/chat.send` |
| AI | `POST /api/ai/suggestion` |
| Statistics | `GET /api/statistics`, `POST /api/statistics/email` |

## 5. AI integration

- **Authorisation first.** Before calling the model, the server checks that the two users are accepted friends and that the supplied history contains only those two participants.
- **Prompt.** The system prompt asks for exactly three short alternative replies, each at most 15 words, in the language of the conversation, separated by `||`. It also tells the model to treat the conversation history as context only and not to follow instructions found inside it. This is a prompt-level mitigation against prompt injection, not a guarantee.
- **Request parameters.** `max_tokens: 150`, `temperature: 0.7`, and a configurable read timeout (`OPENAI_TIMEOUT_SECONDS`, default 30 s).
- **Output validation.** The response is rejected (`502`) if:
  - it is empty;
  - it was truncated (`finish_reason: length`);
  - it does not contain exactly three non-blank options.
- **Error mapping:**
  - provider `429` → `503` (quota or rate limit);
  - `401`/`403` → `502` (invalid key);
  - `400`/`404` → `502` (model or request configuration);
  - timeout → `504`.
- **Alternative provider.** An OpenRouter implementation is kept in the source, commented out. Switching provider is a manual change before startup, not an automatic fallback.
- **Context source.** The conversation history is sent by the client in the request; the server does not re-read it from the database for this call.

## 6. Security

- **JWT authentication.** Stateless HS256 tokens validated through Spring Security's OAuth2 Resource Server. Default lifetime is 1 hour, with a configurable issuer.
- **CSRF and CORS.** CSRF protection is disabled because the API uses no authentication cookies. CORS allows only the exact origins listed in `CORS_ALLOWED_ORIGINS`.
- **WebSocket.** The STOMP `CONNECT` frame must carry a valid bearer token. Subscriptions are limited to the user's own queues (`/user/queue/messages`, `/user/queue/errors`), and a WebSocket session stops being accepted once its token expires.
- **Passwords.** Hashed with BCrypt.
- **Secrets.** Database, SMTP, JWT and OpenAI credentials come from environment variables, with no default values in the repository.
- **Error responses.** They do not include internal messages or stack traces.

## 7. Testing

- **Frontend:** 13 Vitest tests covering message utilities, the API client and the WebSocket service.
- **Backend:** one Spring context-load test (`contextLoads`), which needs the full environment. Backend business logic does not have automated tests yet.

## 8. Local setup

**Prerequisites:**
- JDK 21;
- Node.js and npm;
- PostgreSQL with an empty database;
- an SMTP account (for the statistics email);
- an OpenAI API key.

**Backend environment variables:**

| Variable | Required | Purpose |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | yes | PostgreSQL connection |
| `JWT_SECRET` | yes | Base64 key of at least 32 bytes (e.g. `openssl rand -base64 32`) |
| `OPENAI_API_KEY` | yes | OpenAI key |
| `CORS_ALLOWED_ORIGINS` | yes | Frontend origin(s), e.g. `http://localhost:5173` |
| `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | yes | SMTP settings |
| `OPENAI_MODEL`, `OPENAI_TIMEOUT_SECONDS`, `JWT_EXPIRATION`, `JWT_ISSUER`, `MAIL_PORT`, `JPA_DDL_AUTO` | no | Optional overrides |

Spring Boot does not load `.env` files automatically: export the variables in your shell or IDE run configuration.

**Backend:**

```sh
cd BACKEND/ChatConAi-18-SETTEMBRE
./mvnw spring-boot:run        # http://localhost:8080
```

**Frontend.** Copy `FRONTEND/.env.example` to `.env` (it sets the API and WebSocket URLs), then:

```sh
cd FRONTEND
npm ci
npm run dev                   # http://localhost:5173
npm test                      # Vitest
npm run build
```

## 9. Project status

The application works locally; it is not deployed. Known limitations:
- backend automated test coverage is minimal (context load only);
- AI suggestions rely on history supplied by the client;
- the database schema is managed by Hibernate (`ddl-auto`), without versioned migrations.
