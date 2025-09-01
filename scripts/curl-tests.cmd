@echo off
cd /d "%%~dp0\.."

echo [1] Ping al bridge
curl -s "http://localhost:3000/ping"

echo [2] Probar conexion a Bitrix (/b24/test)
curl -s "http://localhost:3000/b24/test"

echo [3] Simular mensaje entrante de TEXTO (WA -> bridge)
curl -s -X POST http://localhost:3000/webhooks/whatsapp -H "Content-Type: application/json" -d "{^"entry":[{"changes":[{"value":{"messages":[{"id":"wamid.LOCAL.TEXT1","from":"51918131082","type":"text","text":{"body":"hola desde cliente (texto)"}}],"contacts":[{"profile":{"name":"Christian"}}]}}]}]}"

echo [4] Simular mensaje entrante con IMAGEN (WA -> bridge)
curl -s -X POST http://localhost:3000/webhooks/whatsapp -H "Content-Type: application/json" -d "{^"entry":[{"changes":[{"value":{"messages":[{"id":"wamid.LOCAL.IMG1","from":"51918131082","type":"image","image":{"url":"https://placekitten.com/600/400","caption":"foto de prueba"}}],"contacts":[{"profile":{"name":"Christian"}}]}}]}]}"

echo [5] Listo.
