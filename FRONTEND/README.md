# TxTr

Frontend di messaggistica in **React, TypeScript, Vite, Tailwind CSS, Lucide e Framer Motion**, integrato con il backend Spring Boot in `../BACKEND/ChatConAi-18-SETTEMBRE`.

## Avvio locale

Il progetto è stato installato e compilato con Node **24.15.0** e npm **11.12.1**.

```bash
npm ci
npm run dev
```

Apri **http://localhost:5173**. Il backend deve essere avviato su **http://localhost:8080**. Usa esattamente `localhost`, perché l’origine deve coincidere con la configurazione CORS del backend.

Puoi anche scegliere **«Dai un’occhiata alla demo»** nella schermata di accesso: chat, ricerca amici, richieste, suggerimento di esempio e temi funzionano con dati dimostrativi in memoria. La demo non contatta il backend, non invia email e si azzera al ricaricamento. Le schermate reali non usano i dati della demo.

## Dipendenze esatte

Sono già installate; `package-lock.json` conserva le versioni risolte. Per installarle esplicitamente da zero:

```bash
npm install react@19.3.0 react-dom@19.3.0 lucide-react@1.47.0 framer-motion@13.4.0 @stomp/stompjs@7.3.0 sockjs-client@1.6.1 axios@1.20.0

npm install -D vite@8.3.0 @vitejs/plugin-react@6.1.1 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 typescript@7.0.2 @types/react@19.3.0 @types/react-dom@19.3.0 @types/sockjs-client@1.5.4 vitest@5.0.1
```

Tailwind usa il plugin Vite e `@import "tailwindcss"`: non serve una configurazione PostCSS aggiuntiva. Riferimenti ufficiali: [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite), [STOMP con SockJS](https://stomp-js.github.io/guide/stompjs/rx-stomp/using-stomp-with-sockjs.html).

## Configurazione

Le impostazioni predefinite sono già pronte per l’ambiente locale richiesto. Per modificarle:

```bash
cp .env.example .env
```

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=http://localhost:8080/ws
```

Riavvia Vite dopo aver cambiato `.env`. `VITE_API_BASE_URL` è l’origine, **senza** suffisso `/api`; `VITE_WS_URL` è l’URL HTTP(S) SockJS, **non** un URL `ws://`.

Nel backend:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Per usare `npm run preview` sulla porta 4173, aggiungi anche `http://localhost:4173` alle origini backend. OpenRouter, modello Qwen e SMTP restano configurati sul server Java. Non mettere chiavi OpenRouter, credenziali email o segreti JWT nelle variabili `VITE_*`: sono incluse nel codice pubblico del browser.

## Struttura

```text
src/
  components/
    AuthScreen.tsx       Login e registrazione
    Dashboard.tsx        Composizione della schermata chat
    Sidebar.tsx          Conversazioni, ricerca locale e filtro non letti
    Conversation.tsx     Cronologia, messaggi e blocco amicizia
    Composer.tsx         Bozza, invio e AI Assist
    FriendsModal.tsx     Ricerca utenti e richieste
    ProfileModal.tsx     Statistiche, invio email, tema e logout
    ui.tsx               Avatar, dialog, notifiche e controlli condivisi
  hooks/
    useSession.ts        Sessione e scadenza JWT
    useChat.ts           Sincronizzazione REST/STOMP e stato chat
    useTheme.ts          Preferenza chiaro/scuro
  services/
    api.ts               Endpoint REST e gestione errori
    socket.ts            Client STOMP con trasporto SockJS
  lib/
    messages.ts          Ordinamento, deduplicazione e contesto AI
    storage.ts           Accesso alla memoria del browser
  data/demo.ts           Dati dimostrativi separati dai dati reali
  types.ts               Contratti corrispondenti ai DTO Java
  styles.css             Tailwind, token dei temi e layout responsive
```

## Contratto con il backend ispezionato

Sono stati letti DTO, controller REST, controller WebSocket, configurazione di sicurezza, interceptor STOMP e servizi Java prima di creare i componenti.

| Azione | Metodo e percorso | Corpo / risposta rilevante |
| --- | --- | --- |
| Registrazione | `POST /api/auth/register` | `{ username, email, password }` → `AuthResponse` |
| Login | `POST /api/auth/login` | `{ email, password }` → `AuthResponse` |
| Profilo | `GET /api/users/me` | `{ id, username }` |
| Ricerca utenti | `GET /api/users?query=...&page=0&size=20` | `SliceResponse<UserView>` |
| Chat esistenti | `GET /api/chats?page=0&size=100` | `SliceResponse<UserView>` |
| Amicizie | `GET /api/friendships?page=0&size=100` | `SliceResponse<FriendshipResponse>` |
| Richiesta amicizia | `POST /api/friendships` | `{ recipientId }` |
| Accettazione | `PATCH /api/friendships/{id}/accept` | Nessun corpo |
| Rifiuto | `PATCH /api/friendships/{id}/reject` | Nessun corpo |
| Cronologia | `GET /api/messages/{otherUserId}?page=0&size=50` | `SliceResponse<MessageResponse>`, ordine decrescente |
| Invio REST di riserva | `POST /api/messages` | `{ recipientId, content }` |
| Suggerimento AI | `POST /api/ai/suggestion` | `{ recipientId, history: [{ senderId, content }] }` → `{ suggestion }` |
| Statistiche | `GET /api/statistics` | `{ sentMessages, receivedMessages, openChats, generatedAt }` |
| Statistiche via email | `POST /api/statistics/email` | Nessun corpo; ritorna `StatisticsResponse` |

`AuthResponse` contiene `accessToken`, `tokenType`, `expiresIn` **in secondi**, `userId`, `username`. Il campo frontend `expiresAt` è un dato locale derivato e non viene inviato al backend.

`UserView` contiene solo `id` e `username`. Gli avatar sono iniziali derivate dallo username. `MessageResponse` contiene `id`, `senderId`, `recipientId`, `content`, `sentAt`. I timestamp ISO vengono visualizzati nel fuso del browser. `SliceResponse` contiene `items`, `page`, `hasNext`.

### WebSocket

- Connessione SockJS: `/ws`.
- Header STOMP **CONNECT**: `Authorization: Bearer <accessToken>`.
- Invio: `/app/chat.send`, payload `{ recipientId, content }`.
- Messaggi, compresa la conferma al mittente: `/user/queue/messages`.
- Errori applicativi: `/user/queue/errors`, payload `{ status, message }`.
- Riconnessione ogni 5 secondi e heartbeat ogni 10 secondi.
- Alla riconnessione viene recuperata la cronologia della chat selezionata.

Il mittente non viene mai inviato nel DTO di invio: è determinato dal JWT sul server. La bozza viene svuotata solo dopo la risposta REST o l’eco STOMP del messaggio salvato. La deduplicazione per ID evita che un messaggio venga mostrato due volte. Se la conferma STOMP non arriva entro 12 secondi, viene aggiornata la cronologia e la bozza resta disponibile: prima di reinviare, controlla se il server ha già salvato il messaggio. Il backend non espone chiavi di idempotenza.

## Comportamento dell’interfaccia

- Login con email; registrazione con username di 3–30 caratteri alfanumerici/underscore, password di almeno 8 caratteri e al massimo 72 byte UTF-8, come nel backend.
- JWT in `sessionStorage`, valido nella scheda corrente fino alla scadenza; logout e risposte 401 chiudono la sessione. Il backend non ha un endpoint refresh.
- Tema persistente in `localStorage`; alla prima visita segue la preferenza di sistema.
- Layout a due pannelli su desktop e navigazione lista/conversazione su mobile.
- Animazioni dei messaggi basate su `transform` e `opacity`, spring Framer Motion e supporto a `prefers-reduced-motion`. Il frame rate effettivo dipende da dispositivo e browser.
- Bozze distinte per contatto durante la sessione; Invio per inviare, Shift+Invio per andare a capo; composizione IME rispettata.
- Caricamento paginato della cronologia con mantenimento della posizione quando arrivano messaggi precedenti. Se stai leggendo più in alto, i nuovi messaggi non ti portano automaticamente in fondo.
- Il backend restituisce **un solo suggerimento AI**: viene mostrata una pillola reale, senza alternative inventate. Riceve al massimo gli ultimi 20 messaggi dei due partecipanti, limitati a 2000 caratteri ciascuno. Un clic trasferisce il suggerimento alla bozza; l’invio rimane manuale.
- Le richieste vengono aggiornate ogni 30 secondi quando la pagina è visibile e quando la finestra torna attiva. Non esiste un canale STOMP per le amicizie.
- **Non letti:** conteggio dei nuovi messaggi STOMP ricevuti durante questa sessione quando la chat non è visibile/attiva. Il backend non espone stato di lettura o conteggi persistenti, quindi i badge non ricostruiscono i non letti di sessioni precedenti.
- Lo stato «Chat connessa» descrive la connessione del tuo client. Non sono simulati lo stato online del contatto, indicatori di scrittura o ricevute di lettura: il backend non li fornisce. La spunta indica che il server ha salvato il messaggio.
- «Scarica statistiche» invoca l’invio via email, come richiesto dal controller: non scarica un file. La conferma di successo appare soltanto dopo una risposta positiva del server.
- Dialog nativi con gestione del focus e tasto Esc; controlli con etichette accessibili; notifiche visibili anche sopra i dialog.

## Verifiche

```bash
npm test
npm run build
```

Sono presenti **13 test** per corrispondenza di endpoint/payload, paginazione Spring, scadenza su 401, errori `ProblemDetail`, autenticazione e destinazioni STOMP, cleanup, ordinamento/deduplicazione e limiti del contesto AI. Usano adapter/mock di trasporto e non creano utenti o inviano messaggi/email reali.

Verificato sul backend locale: endpoint protetto senza token → 401, preflight CORS da `http://localhost:5173` → 200 con origine accettata, `/ws/info` → 200 con WebSocket abilitato. Il server frontend risponde HTTP 200. Build TypeScript/Vite e tutti i test sono riusciti.

I flussi autenticati con account reali, l’inferenza OpenRouter, la consegna SMTP e la resa su diversi browser/dispositivi non sono stati verificati end-to-end. Per provarli, accedi con due account già predisposti e segui il flusso richiesta → accettazione → chat → AI → statistiche. Le credenziali dei servizi restano quelle configurate nel backend.

La consegna è **esclusivamente locale**, come richiesto; nessuna pubblicazione remota è stata eseguita.
