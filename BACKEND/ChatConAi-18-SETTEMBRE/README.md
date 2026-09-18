# ChatConAi — backend

Java 21, Maven, Spring Boot 3.5, PostgreSQL, JWT, STOMP/SockJS, OpenAI e email HTML.
L'implementazione OpenRouter originale è conservata integralmente come alternativa commentata.

## 1. Configurazione: application.properties

Il primo file da configurare è `src/main/resources/application.properties`. Tutte le credenziali
provengono dall'ambiente: non inserire segreti nel codice o nel repository.

Imposta queste variabili nella configurazione Run di IntelliJ oppure nella shell da cui avvii Maven:

| Variabile obbligatoria | Contenuto |
| --- | --- |
| `DB_URL` | URL JDBC del database già creato, es. `jdbc:postgresql://localhost:5432/chatconai` |
| `DB_USERNAME` | Utente PostgreSQL |
| `DB_PASSWORD` | Password PostgreSQL |
| `JWT_SECRET` | Chiave casuale Base64, almeno 32 byte prima della codifica |
| `MAIL_HOST` | Server SMTP |
| `MAIL_USERNAME` | Account SMTP |
| `MAIL_PASSWORD` | Password SMTP o password applicativa del provider |
| `MAIL_FROM` | Indirizzo mittente autorizzato dal server SMTP |
| `OPENAI_API_KEY` | Chiave API OpenAI per il provider attivo |
| `CORS_ALLOWED_ORIGINS` | Origini frontend esatte separate da virgola, es. `http://localhost:5173` |

Genera `JWT_SECRET` con `openssl rand -base64 32` e salva il risultato nell'ambiente.
Non cambiare la chiave a ogni avvio: cambiarla invalida i token già emessi.
Un file `.env` non viene caricato automaticamente da Spring Boot.

Su questo Mac la configurazione privata è salvata in `~/.config/chatconai/environment.sh`,
fuori dal progetto e leggibile solo dall'utente. `~/.zshenv` la carica nelle nuove shell;
il LaunchAgent `~/Library/LaunchAgents/local.chatconai.environment.plist` la applica
all'ambiente delle nuove applicazioni macOS a ogni login. Dopo una modifica riapri IntelliJ
e, se usato per avviarlo, JetBrains Toolbox. Per applicare modifiche subito:

```sh
source ~/.config/chatconai/environment.sh
~/.config/chatconai/load-launchd-environment.sh
```

Non copiare il contenuto di questi file nei log o nel repository.

Variabili opzionali:

| Variabile | Valore predefinito |
| --- | --- |
| `JWT_EXPIRATION` | `3600000` millisecondi (un'ora) |
| `JWT_ISSUER` | `chatconai` |
| `MAIL_PORT` | `587` con STARTTLS obbligatorio |
| `JPA_DDL_AUTO` | `update`, comodo durante lo sviluppo |
| `OPENAI_API_URL` | `https://api.openai.com/v1/chat/completions` |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `OPENAI_TIMEOUT_SECONDS` | `30` |
| `OPENROUTER_API_URL` | `https://openrouter.ai/api/v1/chat/completions` |
| `OPENROUTER_MODEL` | `nvidia/nemotron-3-super-120b-a12b:free` |
| `OPENROUTER_TIMEOUT_SECONDS` | `30` |
| `OPENROUTER_RETRY_AFTER_MAX_SECONDS` | `8` |

**Provider attivo: OpenAI.** Usa `gpt-4o-mini`, `max_tokens: 150` e restituisce tre proposte
separate da `||` nello stesso campo `suggestion`. Il backend verifica che siano tre opzioni non vuote.
Le chiamate seguono la [documentazione ufficiale Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

**Nota per il professore — ripristino OpenRouter:** basta invertire i commenti dei blocchi
OpenRouter/OpenAI in `application.properties` e delle due implementazioni complete in `AiService.java`.
Togli `/*` e `*/` attorno alla classe OpenRouter e racchiudi la classe OpenAI in `/* ... */`;
lascia package e import condivisi. Mantieni una sola classe attiva, poi ricompila e riavvia.
Non è un fallback automatico: scegli il provider prima dell'avvio.
La chiave `OPENROUTER_API_KEY` serve solo quando riattivi quel provider;
tutte le variabili OpenRouter già configurate sul Mac rimangono disponibili.

Nel fallback OpenRouter, il modello predefinito è `nvidia/nemotron-3-super-120b-a12b:free`. I modelli gratuiti possono comunque essere
limitati dal provider: il backend rispetta `Retry-After` per attese brevi e restituisce un errore
distinto se la chiave o il modello non sono configurati correttamente. Per uso reale imposta
un modello a pagamento e una chiave OpenRouter con credito/quota.

Con JDK 21 selezionato:

```sh
./mvnw -DskipTests package
./mvnw spring-boot:run
```

Il server ascolta sulla porta `8080`. `package` compila anche il test di contesto già presente,
ma `-DskipTests` evita di eseguirlo senza un ambiente configurato. Non sono stati aggiunti test unitari.
Il database va creato prima dell'avvio; Hibernate crea/aggiorna le tabelle. In produzione gestisci
lo schema con migrazioni e usa `JPA_DDL_AUTO=validate` dopo averlo predisposto.

## 2. Entity e repository

- `UserAccount`: username ed email univoci, password BCrypt, data di creazione.
- `Friendship`: due relazioni `ManyToOne` verso richiedente e destinatario, stato e date.
  La chiave canonica `min(id):max(id)` è univoca e impedisce richieste duplicate A→B/B→A.
  `@Version` rileva aggiornamenti concorrenti. Solo il destinatario può accettare o rifiutare.
  Una richiesta rifiutata può essere inviata nuovamente; una pendente o accettata produce `409`.
- `ChatMessage`: relazioni `ManyToOne` verso mittente e destinatario, testo e timestamp UTC.

Le relazioni sono unidirezionali e lazy: ogni utente può essere associato a molti messaggi e amicizie,
senza caricare collezioni intere sull'utente. Le API restituiscono DTO, mai entity o hash password.
Non ci sono cancellazioni a cascata della cronologia.

Una **chat aperta** è una conversazione con un altro utente in cui esiste almeno un messaggio,
in qualsiasi direzione. Una sola amicizia accettata non conta come chat aperta.
I repository calcolano conteggi e cronologia direttamente nel database.

## 3. Servizi

`AuthService` registra gli utenti e verifica il login con Spring Security. Email e username
vengono normalizzati in minuscolo; gli username accettano lettere ASCII, numeri e underscore.
La password deve avere almeno 8 caratteri e al massimo 72 byte UTF-8, limite di BCrypt.
`JwtService` emette JWT HS256 con l'ID utente nel subject, issuer e scadenza.

`FriendshipService.requireAccepted` è il controllo condiviso da invio messaggi, cronologia e AI.
`ChatService` salva il messaggio in transazione e pubblica un evento. `ChatNotifier` lo invia
alle code private dei due partecipanti **dopo il commit**. Il mittente deriva dal JWT e non dal JSON.

`AiService` invia al provider attivo solo la cronologia passata dal frontend: massimo 20 messaggi,
2000 caratteri ciascuno, appartenenti ai due partecipanti. È contesto fornito dal client,
non una cronologia certificata dal database. Il suggerimento non viene salvato e non viene
trasmesso tramite WebSocket. La chiamata remota ha timeout e non tiene aperta una transazione DB.
OpenAI restituisce, per esempio, `{ "suggestion": "Certo, a che ora?||Volentieri, ci sono!||Sì, organizziamoci!" }`.
Il frontend può ottenere le tre proposte con `response.suggestion.split('||')`.
Il blocco OpenRouter conserva il comportamento originale con una singola proposta.

`StatisticsService` calcola inviati, ricevuti e conversazioni nello stesso snapshot PostgreSQL.
`StatisticsEmailService` processa `templates/email/statistics.html` con Thymeleaf e invia il risultato
con `JavaMailSender` soltanto all'email dell'utente autenticato. L'invio è sincrono:
`200` significa che SMTP ha accettato l'email, non che sia già arrivata nella casella.

## 4. Contratto REST

Le rotte richiedono `Authorization: Bearer <accessToken>`, tranne registrazione e login.
Le liste usano `page` (da 0) e `size` (1–100) e restituiscono `{ "items": [], "page": 0, "hasNext": false }`.

| Metodo | Rotta | Input / risultato |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ "username": "alice", "email": "alice@example.com", "password": "..." }` → token, `201` |
| POST | `/api/auth/login` | `{ "email": "alice@example.com", "password": "..." }` → token |
| GET | `/api/users/me` | ID e username autenticati |
| GET | `/api/users?query=bo` | Ricerca username, minimo 2 caratteri; email private |
| POST | `/api/friendships` | `{ "recipientId": 2 }` → richiesta, `201` |
| GET | `/api/friendships` | Richieste ricevute e inviate, tutti gli stati |
| PATCH | `/api/friendships/{id}/accept` | Accetta una richiesta ricevuta e pendente |
| PATCH | `/api/friendships/{id}/reject` | Rifiuta una richiesta ricevuta e pendente |
| POST | `/api/messages` | `{ "recipientId": 2, "content": "Ciao!" }` → messaggio, `201` |
| GET | `/api/messages/{otherUserId}` | Cronologia dal più recente, ordinata per data e ID decrescenti |
| GET | `/api/chats` | Interlocutori con almeno un messaggio scambiato |
| POST | `/api/ai/suggestion` | Cronologia recente → `{ "suggestion": "..." }` |
| GET | `/api/statistics` | Statistiche personali |
| POST | `/api/statistics/email` | Invio email e restituzione delle statistiche inviate |

Registrazione e login restituiscono:

```json
{
  "accessToken": "...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "userId": 1,
  "username": "alice"
}
```

Esempio di richiesta AI, con cronologia ordinata dal messaggio meno recente al più recente:

```json
{
  "recipientId": 2,
  "history": [
    { "senderId": 1, "content": "Ci vediamo domani?" },
    { "senderId": 2, "content": "Volentieri, a che ora?" }
  ]
}
```

Statistiche: `sentMessages`, `receivedMessages`, `openChats`, `generatedAt` (UTC).
Errori applicativi REST in formato ProblemDetail: `400` input non valido, `401` credenziali/token,
`403` accesso vietato o amicizia non accettata, `404` risorsa assente, `409` conflitto.
Errori JWT intercettati dal filtro di sicurezza possono avere risposta vuota con header
`WWW-Authenticate`. Provider AI/SMTP non disponibili danno `502`; limite o quota AI `503`, timeout AI `504`.
Con OpenAI anche una risposta vuota, troncata o senza esattamente tre opzioni valide dà `502`.

## 5. WebSocket STOMP/SockJS

Endpoint SockJS: `http://localhost:8080/ws`. Il token va nell'header STOMP **CONNECT**,
non nella query string. Spring autentica il frame con un `ChannelInterceptor`, come descritto nella
[documentazione Spring](https://docs.spring.io/spring-framework/reference/web/websocket/stomp/authentication-token-based.html).

Esempio frontend con `@stomp/stompjs` e `sockjs-client`:

```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
  connectHeaders: { Authorization: `Bearer ${accessToken}` },
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  onConnect: () => {
    client.subscribe('/user/queue/messages', frame => {
      const message = JSON.parse(frame.body);
      // Inserire/aggiornare per message.id: anche il mittente riceve il messaggio.
      console.log(message);
    });
    client.subscribe('/user/queue/errors', frame => console.error(JSON.parse(frame.body)));
  },
  onStompError: frame => console.error(frame.headers.message)
});
client.activate();

// Eseguire soltanto dopo onConnect e dopo l'accettazione dell'amicizia.
function sendMessage(recipientId, content) {
  client.publish({
    destination: '/app/chat.send',
    body: JSON.stringify({ recipientId, content })
  });
}
```

Invia ciascun messaggio via STOMP oppure via REST: entrambi salvano e notificano,
quindi inviarlo con tutti e due crea duplicati. I payload notificati hanno
`id`, `senderId`, `recipientId`, `content`, `sentAt`.
Le sole sottoscrizioni consentite sono `/user/queue/messages` e `/user/queue/errors`.
Le code interne del broker e le destinazioni di altri utenti non sono accessibili ai client.
Gli errori applicativi vanno alla coda privata della sessione; errori di autenticazione o
destinazione generano un frame STOMP ERROR e possono chiudere la connessione.

Alla scadenza del JWT sono bloccati nuovi invii e consegne sulle sottoscrizioni esistenti:
effettua nuovamente il login e riconnetti con il nuovo token. Non è previsto un refresh token.
Al reconnect recupera la cronologia via REST per i messaggi persi e deduplica per ID.
Il broker semplice è in memoria e adatto a una singola istanza del backend.

L'integrazione AI segue il formato ufficiale
[OpenRouter Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion).

## Verifica eseguita

Compilazione e creazione del JAR riuscite con JDK 21 e `./mvnw -DskipTests package`.
Controlli di integrazione eseguiti su un PostgreSQL temporaneo e poi rimosso:

- Registrazione, login, validazione, richieste duplicate e permessi di accettazione/rifiuto.
- Messaggi vietati prima dell'accettazione, persistenza e cronologia privata.
- STOMP e trasporto SockJS, consegna ai due partecipanti e blocco delle code non autorizzate.
- JWT scaduti rifiutati su REST, invio STOMP e consegna su sottoscrizioni già aperte.
- Statistiche corrette; suggerimento AI senza variazioni nei messaggi salvati.
- Risposta AI e limiti del provider simulati; email HTML renderizzata ricevuta da SMTP locale.

OpenRouter e SMTP reali richiedono le tue variabili d'ambiente e non sono stati chiamati durante
questi controlli. Non sono stati aggiunti test unitari o script di verifica al progetto.

Verifica della successiva integrazione OpenAI:

- Build Java 21 riuscita e compilazione separata del blocco OpenRouter originale conservato.
- Avvio del backend senza variabili OpenRouter; verifica locale di Bearer, modello e `max_tokens: 150`.
- Verifica delle tre opzioni, risposte vuote/incomplete, errori del provider e assenza di scritture nel DB.
- Una chiamata reale a OpenAI con una conversazione inventata ha restituito `200` e tre opzioni valide.
- Chiave OpenAI salvata solo nella configurazione privata del Mac, disponibile alle nuove shell e app.
