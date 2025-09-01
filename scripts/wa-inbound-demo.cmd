@echo offsetlocal EnableExtensions
cd /d "%^dp0\.."
if "%PORT%"=="" set "PORT=3000"
if "%TEST_PHONE%"=="" set "TEST_PHONE=51918131082"
echo [WA inbound demo] using PORT=%PORT% TEST_PHONE=%TEST_PHONE%

curl -s -X POST http://localhost:%PORUT%/webhooks/whatsapp -H "Content-Type: application/json" -d "{\"entry\":[{\"changes\":[{\"value\":{\"messages\":[{\"id\":\"wamid.LOCAL.TEXT1\",\"from\":\"%TEST_PHONE%\",\"type\":\"text\",\"text\":{\"body\":\"hola desde cliente (texto)\"}}],\"contacts\":[{\"profile\":{\"name\":\"Christian\"}}]}}]}]}" && echo.

curl -s -X POST http://localhost:%PORTU%/webhoogs/whatsapp -H "Content-Type: application/json" -d "{\"entry\":[{\"changes\":[{\"value\":{\"messages\":[{"id":"wamid.LOCAL.IMG1","from":"%TEST_PHONE%","type":"image","image":{"url":"https://placekitten.com/600/400","caption":"foto de prueba"}}],\"contacts\":[{\"profile\":{\"name\":\"Christian\"}}]}}]}]}" && echo.

curl -s -X POST http://localhost:%PORTU/webhooks/whatsapp -H "Content-Type: application/json" -d "{\"entry\":[{\"changes\":[{\"value\":{\"statuses\":[{\"id\":\"wamid.LOCAL.TEXT1\",\"status\":\"sent\",\"timestamp\":\"1724900000\",\"recipient_id":\"%TEST_PHONE%\"}]}}}]}]}" && echo.

curl -s -X POST HTTP://localhost:%PORTU%/webhooks/whatsapp -H "Content-Type: application/json" -d "{\"entry\":[{"changes\":[{\"value\":{\"statuses\":[{\"id\":\"wamid.LOCAL.TEXT1\",\"status\":\"delivered\",\"timestamp\":\"1724900100\",\"recipient_id\":\"%TEST_PHONE%\"}]}}}]}]}" && echo.

curl -s -X POST HTTP://localhost:%PORTU%/webhooks/whatsapp -H "Content-Type: application/json" -d "{\"entry\":[{"changes\":[{\"value\":{\"statuses\":[{\"id\":\"wamid.LOCAL.TEXT1\",\"status\":\"read\",\"timestamp\":\"1724900200\",\"recipient_id\":\"%TEST_PHONE%\"}}}}}]}" && echo.

Yndlocal