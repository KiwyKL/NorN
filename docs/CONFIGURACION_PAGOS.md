# Guía de Configuración - Google Play Billing

## 📋 Resumen
Esta app usa **Google Play Billing** para vender llamadas con Santa. Tú recibes el dinero directamente en tu cuenta bancaria.

---

## 💰 Cómo Recibes el Dinero

### 1. Crear Cuenta en Google Play Console
- **URL:** https://play.google.com/console/signup
- **Costo:** $25 USD (pago único, de por vida)
- **Tiempo:** 24-48 horas para verificación

### 2. Configurar Cuenta de Pagos
Una vez creada tu cuenta:

1. Ve a **Settings** (⚙️) → **Payments profile**
2. Click en **Add payment method**
3. Opciones:
   - **Cuenta bancaria** (recomendado)
   - **Tarjeta de crédito**
4. Ingresa tus datos bancarios

### 3. Comisiones y Pagos
- **Google se queda:** 15% de cada venta
- **Tú recibes:** 85% 
- **Ejemplo:** Venta de $10 → Tú recibes $8.50

**Calendario de pagos:**
- Google paga **mensualmente**
- Entre el **15-20 de cada mes**
- Por las ventas del mes anterior
- Demora 48 horas desde la compra (anti-fraude)

---

## 📦 Configurar Productos

### Productos a Crear
Debes crear 3 productos en Google Play Console:

#### Producto 1: 1 Llamada
- **Product ID:** `santa_call_1`
- **Nombre:** "1 Llamada con Santa"
- **Precio base:** $3.99 USD
- **Tipo:** Consumable (se gasta al usar)

#### Producto 2: 3 Llamadas  
- **Product ID:** `santa_call_3`
- **Nombre:** "3 Llamadas con Santa"
- **Precio base:** $9.99 USD
- **Badge:** "Popular"
- **Tipo:** Consumable

#### Producto 3: 5 Llamadas
- **Product ID:** `santa_call_5`
- **Nombre:** "5 Llamadas con Santa"  
- **Precio base:** $14.99 USD
- **Badge:** "Mejor Valor"
- **Tipo:** Consumable

### ⚠️ IMPORTANTE: Product IDs exactos
Los IDs deben ser **EXACTAMENTE** como arriba. Si cambias aunque sea una letra, la app no funcionará.

---

## 🌍 Precios Regionales

Google Play permite ajustar precios por país. **Recomendación:**

### Paso 1: Precio Base (USD)
Configura el precio en dólares (ya indicado arriba).

### Paso 2: Ajuste por Región
En Google Play Console → Product → Pricing:

**Latinoamérica** (Argentina, Colombia, México, etc.):
- Reducir **20-30%** del precio convertido
- Ejemplo: $3.99 USD → ~$2.80 USD equivalente local

**India / Sudeste Asiático**:
- Reducir **40-50%**
- Ejemplo: $3.99 USD → ~$2.00 USD equivalente local

**Europa / US / Canadá**:
- Mantener precio auto-convertido por Google

**Herramienta:** Google tiene un botón "Use pricing template" que te sugiere precios por país.

---

## 🧪 Probar Compras (Sin Gastar Dinero)

### 1. Agregar Usuario de Prueba
1. Google Play Console → **Setup** → **License testing**
2. Agrega tu email
3. Los usuarios de prueba **NO pagan** pero ven el flujo completo

### 2. Publicar en Pruebas Internas
1. **Testing** → **Internal testing** → **Create release**
2. Sube el APK que compilamos
3. Agrega tu email como tester
4. Descarga desde el link que te envían

### 3. Realizar Compra de Prueba
- Abre la app
- Intenta comprar llamadas
- Google mostrará "Test purchase - no charge"
- ¡Funciona como compra real pero gratis!

---

## ✅ Checklist de Configuración

Sigue este orden:

- [ ] 1. Crear cuenta Google Play Console ($25)
- [ ] 2. Esperar verificación (24-48h)
- [ ] 3. Configurar cuenta de pagos (tu banco)
- [ ] 4. Crear los 3 productos con IDs exactos
- [ ] 5. Configurar precios regionales
- [ ] 6. Agregar tu email como tester
- [ ] 7. Subir APK a pruebas internas
- [ ] 8. Descargar app desde link de prueba
- [ ] 9. Hacer compra de prueba (gratis)
- [ ] 10. Verificar que funcione

---

## 🚨 Errores Comunes

### "Product not found"
- ✅ Verifica que los Product IDs sean exactos
- ✅ Espera 2-3 horas después de crear productos
- ✅ Asegúrate que productos estén "Active"

### "Item unavailable in your country"
- ✅ Configura precios para ese país específico

### "You already own this item"
- ✅ Normal en pruebas: ve a Google Play → Account → Purchase history → Cancel

---

## 📞 Soporte

Si algo falla:
- Google Play Console tiene chat de soporte 24/7
- Documentación: https://developer.android.com/google/play/billing

**¡Listo para recibir pagos!** 💰
