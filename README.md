# DoIt4Me — Prototype v0.1

Questo è un **prototipo interattivo** (HTML/JS/CSS) per simulare il flusso principale di DoIt4Me:

- Home con input della richiesta + feed "Top Task"
- Attesa con animazione e ETA
- Offerta con prezzo/tempo stimato
- Tracking con timeline (stile Uber/Glovo)
- Condivisione nativa (Web Share API)

## Come usarlo
1. Scarica lo zip.
2. Estrai la cartella.
3. Apri `index.html` nel browser (Chrome/Safari). Su iPhone, puoi usare "Aggiungi a Schermata Home" per simulare un'app.
4. Scrivi una richiesta e premi **INVIA**.

## Cosa è mockato
- Matching provider e tracking sono simulati.
- Il feed è statico ma facilmente collegabile a un backend.

## Prossimi passi (MVP reale)
- **Stack consigliato**: Flutter + Node.js + Firestore + Stripe Connect.
- **Funzioni**:
  - Autenticazione Apple/Google.
  - Creazione task + moderazione AI (openAI moderation).
  - Marketplace fornitori (onboarding, KYC, aree coperte).
  - Matching per distanza/tempo.
  - Pagamenti con escrow (Stripe Connect) + commissione.
  - Notifiche push (FCM/APNs).
  - Tracking con WebSockets.
  - Feed pubblico (anonimizzato) con template social.

## Struttura file
- `index.html`
- `styles.css`
- `app.js`
- `assets/` (placeholder)

## Licenza
Solo per uso dimostrativo. Non adatto a produzione.
