# PROGETTAZIONE-18-SETTEMBRE

## STACK TECNOLOGICO

- java 21
- Maven

### Spring

- Lombok
- Spring Boot DevTools
- Spring Web
- Spring Data JPA
- PostgreSQL Driver
- WebSocket
- Validation
- javaemailsender
- Srping security
- bcrypt

### AI

- ho utilizzato inizialmente open router,
- poi per problemi di limiti ho usato una chiave openAI

## ENTITA

principalmente 3

### User

- registrazione e login grazie a spring security e JWT
- id: guid
- username: string
- email: string
- psw: bcrypt
- role: enum

### Friendship

- per le richieste e validazioni amicizie
- id: guid
- sender: FK
- recipient: FK

### Message

- id: guid
- sender: FK
- recipient: FK

## CONTROLLERS ENDPOINTS

### Login e registrazione

- POST per la registrazione
- POST dopo login che da una jwt
- service: validazione delle psw , delle email con chiocciola e Unique

### Utente

- GET per il principal del mio profilo
- GET per tutti gli altri utenti , sia amici che ricercabili
- service: implementata la ricerca minima con 2 caratteri

### Amicizie

- POST per mandare la richiesta
- GET per riceverle
- PATCH per accettare o rifiutare
- service: controlla gli stati di accettati o meno per poi mostrarle

### Statistiche

- GET per vederle in live
- POST per inivartele alla email
- service: calcola le statistiche

### Ai controller

- POST legge tutto e consiglia davvero
- trigger in frontend con il bottone apposito, genera con ai e mi fa modificare ma senza PATCH
- service: valida i 2 amici

## I MIEI STEP

1. creare database e connettere con app properties al backend
2. installare dipendenze giuste per il backend
3. definire subito dopo il primo run , collegamenti CORS e WS
4. definire bene tute le classi e lo scaffolding
5. implementare il frontend iniziale dopo aver verificato il funzionamento del backend e scrittura nel database
6. rifinire il frontend , testare le chiamate in console del browser e osservare il comportamento dell app in live, fare una revisione completa di tutto , commit finale

## STEP AI

1. giro e controllo dipendenze e scaffolding iniziale
2. scrittura entita , controllers e service
3. check e verifiche sia di sicurezza che di funzionamento
4. implementazione frontend e stilizzazione secondo le mie istruzioni
5. aiuto nella revisione di tutto il progetto dalla cartella madre, elenco bug o malfunzionamenti e risoluzione finale
