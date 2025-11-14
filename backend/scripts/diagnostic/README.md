# SMTP Diagnostic Tools

Strumenti di diagnostica per risolvere problemi SMTP/IMAP in produzione.

## 🔬 diagnose-smtp-issue.js

**Strumento diagnostico completo** che verifica tutti gli aspetti del sistema SMTP.

### Cosa Testa:

1. ✅ **Environment Variables** - Verifica presenza di tutte le variabili richieste
2. 🔐 **Encryption** - Test di encryption/decryption credentials
3. 💾 **Database** - Connettività Supabase e query accounts
4. 🌐 **DNS Resolution** - Risoluzione hostname server mail
5. 🔌 **TCP Connectivity** - Test connessione TCP alle porte SMTP/IMAP
6. 📧 **SMTP Authentication** - Test autenticazione account configurati
7. 📥 **IMAP Authentication** - Test connessione IMAP per inbox sync

### Utilizzo:

```bash
# Dalla directory backend
cd backend
node scripts/diagnostic/diagnose-smtp-issue.js

# Output completo con tutti i test
```

### Output Esempio:

```
🔬 Complete SMTP Diagnostic Tool
======================================================================

1️⃣  CHECKING ENVIRONMENT VARIABLES
✅ SUPABASE_URL: https://xxx.supabase.co
✅ SUPABASE_SERVICE_KEY: ✓ Set
✅ EMAIL_ENCRYPTION_KEY: ✓ Set
✅ JWT_SECRET: ✓ Set

2️⃣  CHECKING ENCRYPTION KEY
✅ Encryption key is valid (32 bytes)
✅ Encryption/Decryption test passed

3️⃣  CHECKING DATABASE CONNECTIVITY
✅ Database connection successful

4️⃣  CHECKING SMTP ACCOUNTS IN DATABASE
✅ Found 1 SMTP account(s) in database
   • your-email@domain.com (ID: abc123...)

5️⃣  CHECKING DNS RESOLUTION
✅ smtp.ionos.it → 213.165.67.98
✅ imap.ionos.it → 212.227.17.183

6️⃣  CHECKING TCP CONNECTIVITY TO MAIL SERVERS
✅ IONOS SMTP (TLS) (smtp.ionos.it:587) - Connected
✅ IONOS IMAP (SSL) (imap.ionos.it:993) - Connected

7️⃣  TESTING SMTP AUTHENTICATION
✅ SMTP authentication successful (150ms)
✅ IMAP authentication successful (114ms)

🎯 DIAGNOSTIC SUMMARY
✅ Environment: OK
✅ Database: OK
✅ Encryption: OK
✅ SMTP Accounts: 1 configured
```

### Quando Usarlo:

- ❌ SMTP non funziona in produzione
- ❌ "Connection timeout" errors
- ❌ Account SMTP non invia email
- 🔍 Debug problemi firewall/rete
- 📊 Verifica configurazione sistema

---

## 🧪 test-ionos-connection.js

**Tester specifico per IONOS** che prova tutte le combinazioni di porte e protocolli.

### Cosa Testa:

- 📤 SMTP Port 587 (STARTTLS)
- 📤 SMTP Port 465 (SSL)
- 📥 IMAP Port 993 (SSL)
- 📥 IMAP Port 143 (STARTTLS)
- ⏱️ Timing di connessione per ogni test
- 🎯 Raccomandazioni configurazione ottimale

### Utilizzo:

```bash
# Dalla directory backend
cd backend
node scripts/diagnostic/test-ionos-connection.js your-email@domain.com your-password
```

### Output Esempio:

```
🧪 IONOS Connection Test
==================================================
Email: your-email@domain.com

🔧 SMTP Tests:
==================================================

📤 Testing: SMTP Port 587 (STARTTLS - Recommended)
   Host: smtp.ionos.it:587
   Secure: false
   ✅ SUCCESS (181ms)

📤 Testing: SMTP Port 465 (SSL)
   Host: smtp.ionos.it:465
   Secure: true
   ✅ SUCCESS (244ms)

🔧 IMAP Tests:
==================================================

📥 Testing: IMAP Port 993 (SSL - Recommended)
   Host: imap.ionos.it:993
   TLS: true
   ✅ SUCCESS (114ms)

📥 Testing: IMAP Port 143 (STARTTLS)
   Host: imap.ionos.it:143
   TLS: true
   ✅ SUCCESS (156ms)

==================================================
✅ Test completed!

Recommended configuration:
  SMTP: smtp.ionos.it:587 (secure: false)
  IMAP: imap.ionos.it:993 (secure: true)
==================================================
```

### Quando Usarlo:

- 🔧 Setup nuovo account IONOS
- ❓ Non sai quale porta/protocollo usare
- 🐛 Problemi connessione IONOS
- ⚡ Ottimizzare performance connessione

---

## 🚀 Uso in Produzione

### 1. Carica gli Script sul Server:

```bash
# Dalla tua macchina locale
scp -r scripts/diagnostic/ user@server.com:/path/to/backend/
scp .env user@server.com:/path/to/backend/
```

### 2. Esegui sul Server:

```bash
# SSH nel server
ssh user@server.com
cd /path/to/backend

# Esegui diagnostic completo
node scripts/diagnostic/diagnose-smtp-issue.js

# Test IONOS specifico
node scripts/diagnostic/test-ionos-connection.js email@domain.com password
```

### 3. Confronta Risultati:

**Locale (tutto OK):**
```
✅ IONOS SMTP (TLS) (smtp.ionos.it:587) - Connected
✅ IONOS IMAP (SSL) (imap.ionos.it:993) - Connected
✅ SMTP authentication successful (150ms)
```

**Produzione (firewall blocca):**
```
❌ IONOS SMTP (TLS) (smtp.ionos.it:587) - Timeout
❌ IONOS IMAP (SSL) (imap.ionos.it:993) - ECONNREFUSED
❌ SMTP authentication failed: Connection timeout
```

---

## 🛠️ Risolvere Problemi Comuni

### Problema: "Connection timeout" o "ECONNREFUSED"

**Causa:** Firewall server blocca porte SMTP/IMAP

**Soluzione A - Apri Porte nel Firewall:**
```bash
# iptables
sudo iptables -A OUTPUT -p tcp --dport 587 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 465 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 993 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 143 -j ACCEPT
sudo iptables-save

# UFW
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp
sudo ufw allow out 993/tcp
```

**Soluzione B - Contatta Hosting Provider:**
- Chiedi di sbloccare porte SMTP in uscita
- Molti shared hosting bloccano SMTP per prevenire spam

**Soluzione C - Usa SMTP Relay Service:**
- SendGrid (100 email/giorno gratis)
- Mailgun (5000 email/mese gratis)
- Brevo (300 email/giorno gratis)
- Amazon SES (molto economico)

### Problema: "Authentication failed" (EAUTH)

**Causa:** Credenziali errate o account non configurato

**Soluzioni:**
1. Verifica username sia email completa (`user@domain.com`)
2. Controlla password (niente spazi extra)
3. IONOS: Verifica "Client di posta esterno" attivo
4. Gmail: Usa App Password (non password normale)
5. Outlook: Controlla 2FA e app passwords

### Problema: "DNS resolution failed"

**Causa:** Server non risolve hostname IONOS

**Soluzioni:**
```bash
# Test DNS manualmente
nslookup smtp.ionos.it
dig smtp.ionos.it

# Usa DNS pubblici (Google, Cloudflare)
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf
```

---

## 📊 Interpretare i Risultati

### Tutti i Test Passano ✅
Sistema funziona correttamente. Se hai ancora problemi:
- Controlla log backend per errori specifici
- Verifica rate limiting
- Controlla bounce rate

### Test TCP Fallisce ❌
**Problema di rete/firewall**. Porte bloccate dal server.
- Soluzione: Apri porte firewall o usa relay SMTP

### Test Authentication Fallisce ❌
**Problema credenziali**. SMTP raggiungibile ma login fallisce.
- Soluzione: Verifica username/password, controlla provider email

### Test DNS Fallisce ❌
**Problema risoluzione DNS**. Server non trova hostname.
- Soluzione: Configura DNS pubblici o verifica /etc/resolv.conf

---

## 🎯 Quick Reference

| Test | Scopo | Soluzione se Fallisce |
|------|-------|----------------------|
| Environment | Verifica .env | Aggiungi variabili mancanti |
| Encryption | Test crypto | Rigenera EMAIL_ENCRYPTION_KEY |
| Database | Connessione Supabase | Verifica SUPABASE_URL/KEY |
| DNS | Risoluzione hostname | Configura DNS pubblici |
| TCP | Connessione porte | Apri firewall |
| SMTP Auth | Login SMTP | Verifica credenziali |
| IMAP Auth | Login IMAP | Verifica credenziali |

---

## 📝 Note

- **Timeout aumentati a 30s**: Gli script usano timeout lunghi per reti lente
- **Non salvano dati**: Tutti i test sono read-only, nessuna modifica al DB
- **Sicurezza password**: I log non mostrano password in chiaro
- **Esecuzione multipla**: Puoi eseguire gli script più volte senza problemi

---

**Last Updated:** 2025-11-14
**Maintainer:** Backend Team
**Support:** Se hai problemi, esegui `diagnose-smtp-issue.js` e condividi l'output
