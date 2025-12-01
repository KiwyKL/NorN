# API Endpoints - Troubleshooting

## Problema Detectado

Los endpoints `/api/*` de Vercel no están respondiendo (404 not found).

## Causa

Falta la dependencia `@vercel/node` en `package.json`, que es necesaria para que Vercel reconozca y compile las funciones serverless TypeScript.

## Solución Aplicada

✅ Agregado `@vercel/node` a dependencies
✅ npm install ejecutado
✅ Cambios pusheados a GitHub 

## Próximo Deploy

Vercel va a auto-deployar con la dependencia correcta.

**Tiempo estimado:** ~3-5 minutos

## Verificación Post-Deploy

Una vez que Vercel termine de deployar, puedes verificar que funcione:

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://nor-n.vercel.app/api/generate-content" `
  -Method Post `
  -Body '{"prompt":"Hola"}' `
  -ContentType "application/json" | Select-Object -ExpandProperty Content
```

**Respuesta esperada:**
```json
{
  "text": "¡Hola! ¿Cómo puedo ayudarte hoy?",
  "candidates": [...]
}
```

## Estado Actual

- ✅ Código correcto en GitHub
- ⏳ Esperando re-deploy de Vercel
- ⏳ Luego compilar APK final

## Dashboard de Vercel

Monitorea el deploy aquí:
https://vercel.com/dashboard

En "Deployments" verás el nuevo build iniciándose automáticamente.
