# Proyecto B24–WSP Bridge (Bitrix24 ↔ WhatsApp Cloud)

Integración directa de **WhatsApp Cloud API** con **Bitrix24 Open Channels**.  
Carpeta final del proyecto (única fuente de verdad en local):

```
C:\Users\USER\Apps Christian\WhatsApp Bitrix\b24-wsp
```

Repositorio GitHub:  
[Calzados-Azaleia-Peru-S-A/WhatsApp-Bitrix](https://github.com/Calzados-Azaleia-Peru-S-A/WhatsApp-Bitrix)

---

## ⚙️ Arquitectura

- **WhatsApp Cloud API** (Meta)  
- **Ngrok** (túnel HTTPS público)  
- **Bridge Node.js** (este proyecto)  
- **Bitrix24 Open Line 154**  

Flujo:
```
Cliente WhatsApp → Webhook WSP → Bridge → Bitrix24 (OL 154)
Agente Bitrix → /b24/events → Bridge → WhatsApp Cloud
```

---

## 📦 Requisitos

- Node.js 18+  
- Git  
- Ngrok  
- Cuenta WhatsApp Cloud API activa (Phone Number ID, WSP Token, Verify Token)  
- App local en Bitrix24 (tipo “Solo script (sin interfaz)”)  

---

## 📝 Configuración `.env`

Ejemplo (ajustar valores reales):
```env
PORT=3000
APP_PUBLIC_BASE=https://squirrel-talented-hermit.ngrok-free.app
OPENLINE_ID=154

# WhatsApp Cloud API
WSP_VERIFY_TOKEN=xxxx
WSP_PHONE_NUMBER_ID=xxxx
WSP_TOKEN=EAAJ...

# Bitrix (app local solo script)
B24_USE_WEBHOOK=0
B24_DOMAIN=azaleia-peru.bitrix24.es
B24_CLIENT_ID=local.xxxxx
B24_CLIENT_SECRET=xxxxx

# Opcionales
B24_DEBUG=1
WSP_MARK_READ=1

# Límites máximos Meta
MEDIA_CAP_IMAGE_MB=5
MEDIA_CAP_VIDEO_MB=16
MEDIA_CAP_AUDIO_MB=16
MEDIA_CAP_DOC_MB=100
```

---

## 🚀 Instalación local

```cmd
cd "C:\Users\USER\Apps Christian\WhatsApp Bitrix\b24-wsp"

:: Instalar dependencias
npm install

:: Crear .env desde plantilla
copy .env.example .env
notepad .env

:: Arrancar servidor
npm run dev

:: (en otra consola) Levantar túnel ngrok
ngrok http --url=squirrel-talented-hermit.ngrok-free.app 3000
```

---

## 🔑 Configuración en Bitrix24

1. Crear **Aplicación local** tipo *Solo script (sin interfaz)*.  
2. Configurar rutas:  
   - **Ruta de su controlador** → `https://...ngrok.../b24/install`  
   - **Ruta de instalación inicial** → `https://...ngrok.../b24/install`  
   - **Manejadores de eventos (POST)** → `https://...ngrok.../b24/events`  
3. Permisos: `imconnector`, `imopenlines`, `im`, `user`, `crm`, `placement`.  
4. Pulsa **REINSTALAR** → el Bridge guardará tokens en `.runtime/b24-tokens.json`.

---

## 🛠 Endpoints disponibles

### Salud
```cmd
curl -s "http://localhost:3000/ping"
```

### Probar tokens
```cmd
curl -s "http://localhost:3000/b24/test"
```

### Conector OL 154
```cmd
curl -s "http://localhost:3000/b24/connector/status?line_id=154"
curl -s -X POST "http://localhost:3000/b24/connector/configure?line_id=154"
curl -s -X POST "http://localhost:3000/b24/connector/activate?line_id=154&active=Y"
```

### Demo salida
```cmd
curl -s -X POST "http://localhost:3000/b24/imc/send-demo?to=51999999999&text=hola+desde+demo"
```

### Enviar media
```cmd
curl -s -X POST "http://localhost:3000/media/send" ^
  -H "Content-Type: application/json" ^
  -d "{\"to\":\"519XXXXXXXX\",\"type\":\"image\",\"url\":\"https://.../foto.jpg\"}"
```

---

## 🔥 Funcionalidades urgentes (v1)

1. **Estados** → Enviado / Entregado / Leído / Error (chips + timeline).  
2. **Adjuntos** → Validación de tamaño con límites máximos Meta.  
3. **Título de chat** → `Nombre del Contacto · +51XXXXXXXXX (remitente)`.  
4. **Contactos** → Buscar por teléfono (`+51 9xxxxxxxx`), crear si no existe.  
5. **Quoted reply** → Extracto + miniatura.  
6. **Avatar** → Foto de Bitrix o iniciales.

---

## 🧑‍💻 Flujo GitHub

Carpeta final y única: `b24-wsp`.

```cmd
cd "C:\Users\USER\Apps Christian\WhatsApp Bitrix\b24-wsp"

:: Guardar cambios
git add .
git commit -m "mensaje claro"
git push
```

`.gitignore` debe contener:
```
.env
.env.*
.runtime/
node_modules/
```

---

## 📜 Scripts CMD recomendados

- `start-dev.cmd`
```cmd
cd "C:\Users\USER\Apps Christian\WhatsApp Bitrix\b24-wsp"
npm run dev
```

- `ngrok-fixed.cmd`
```cmd
cd "C:\Users\USER\Apps Christian\WhatsApp Bitrix\b24-wsp"
ngrok http --url=squirrel-talented-hermit.ngrok-free.app 3000
```

- `smoke-tests.cmd`
```cmd
curl -s "http://localhost:3000/ping"
curl -s "http://localhost:3000/b24/test"
curl -s "http://localhost:3000/b24/connector/status?line_id=154"
```

- `git-push.cmd`
```cmd
cd "C:\Users\USER\Apps Christian\WhatsApp Bitrix\b24-wsp"
git add .
git commit -m "auto: cambios locales"
git push
```

---

## ✅ Prueba end-to-end

1. **Inbound**: enviar WhatsApp → ver `[WA webhook] raw...` en nodemon y chat en Bitrix OL 154.  
2. **Outbound**: responder en Bitrix → ver `POST /b24/events` en nodemon y mensaje en WhatsApp.  

```
[WA webhook] raw: ...
[b24:event] event= ONIMCONNECTORDIALOGFINISH ...
```

---

# 🔒 Notas finales

- Nunca subas `.env` ni `.runtime/` a GitHub.  
- Tokens se guardan automáticamente en `.runtime/b24-tokens.json` cuando reinstalas la app.  
- El puente ya está preparado para los **cambios urgentes v1**, y se irá ampliando el panel UI luego.
