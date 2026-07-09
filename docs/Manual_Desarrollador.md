# OxoGems — Manual de Desarrollador

Intranet interna de OxoHotel que centraliza las "Gemas" (asistentes de Google Gemini)
usadas para automatizar auditoría financiera, conciliación de nómina y dispersión de pagos.

Aplicación web construida sobre **Google Apps Script** (HtmlService), sin build step ni
framework de frontend: HTML/CSS/JS vanilla servidos por plantillas `.html` y lógica de
servidor en `.js` (Apps Script las trata como `.gs`).

---

## 1. Stack y requisitos

| Capa | Tecnología |
|---|---|
| Runtime servidor | Google Apps Script (V8) |
| Persistencia | Google Sheets (hoja "Gemas") + `PropertiesService` (Script Properties) |
| Frontend | HTML + CSS variables + JS vanilla, `google.script.run` para RPC |
| Render Markdown | [marked.js](https://cdn.jsdelivr.net/npm/marked/marked.min.js) (CDN) |
| Tipografía | Google Fonts — Inter |
| Despliegue local | [`clasp`](https://github.com/google/clasp) |

Requisitos para desarrollar localmente:

- Node.js + `npm install -g @google/clasp`
- Cuenta de Google con acceso al proyecto de Apps Script (`scriptId` en `.clasp.json`)
- `clasp login` autenticado con esa cuenta

---

## 2. Estructura del proyecto

```
OxoGems/
├── appsscript.json         # Manifiesto del proyecto Apps Script
├── .clasp.json             # Config de clasp (scriptId, extensiones)
├── Code.js                 # doGet() — punto de entrada, enrutamiento y includes
├── Controller.js           # Lógica de negocio: lectura/escritura de Gemas, permisos
├── Utils.js                # Helpers: fechas, propiedades de configuración de la app
├── Index.html               # Layout principal (head, header, modales, includes)
├── Styles.html               # <style> global (variables CSS, temas, componentes)
├── Scripts.html               # <script> cliente (fetch de datos, render, modales, tema)
├── CardComponent.html          # <template> de la tarjeta de una Gema
├── SkeletonComponent.html      # Placeholder de carga (skeleton)
├── ThemeToggle.html             # Botón de cambio de tema claro/oscuro
├── Imagenes_manuales/           # Capturas usadas en el manual de usuario
└── docs/
    ├── OxoGems.xlsx              # Copia/backup de la hoja de datos
    ├── Manual_Usuario.html
    ├── Manual_Desarrollador.md
    └── Instrucciones_Diagrama_Flujo.md
```

Apps Script no tiene subcarpetas reales: todos los archivos viven en la raíz del proyecto
remoto. `docs/` e `Imagenes_manuales/` son puramente organizativos en el repositorio local
y **no se despliegan** con `clasp push` (no son `.js`/`.html`/`.json` relevantes para el
runtime, pero conviene excluirlos si se usa `filePushOrder`/`.claspignore`).

---

## 3. Arquitectura y flujo de datos

```
Usuario → doGet() [Code.js]
        → HtmlService.createTemplateFromFile('Index')
        → Index.html incluye Styles / ThemeToggle / SkeletonComponent / CardComponent / Scripts
              vía <?!= include('Nombre'); ?>  (Code.js:include)

Cliente (Scripts.html) al cargar el DOM:
  1. initTheme()      → lee localStorage('oxo-theme'), aplica data-theme
  2. loadDashboard()  → google.script.run.getDashboardData()
                              │
                              ▼
                     Controller.getDashboardData() [servidor]
                       ├─ getAppProperties()      (Utils.js → ScriptProperties)
                       ├─ getGemsFromSheet()       (Sheets "Gemas")
                       │     └─ fallback: getFallbackGems() si la hoja falla o está vacía
                       └─ Session.getActiveUser()  → isAdmin / role
                              │
                              ▼
                     { config, gems[], user{ email, name, isAdmin, role } }
                              │
                              ▼
  3. renderGems(gems) → clona <template id="cardTemplate"> por cada Gema
  4. muestra/oculta botón "Crear gema" según user.isAdmin
  5. hideSkeletons()

Interacción del usuario:
  - Click "Detalles"   → openModal(gem) → marked.parse() sobre fullDescription/instructions
  - Click "Copiar"     → copyPrompt() → navigator.clipboard.writeText()
  - Click "Explorar"   → <a target="_blank" href="gem.link">  (abre Gemini)
  - Click "Crear gema" (solo admin) → openAdminModal() → submit → handleFormSubmit()
                              │
                              ▼
                     google.script.run.addGemToSheet(formData)
                              │
                              ▼
                     Controller.addGemToSheet() [servidor]
                       ├─ valida email === ptecnologia@oxohotel.com
                       ├─ valida campos requeridos
                       ├─ valida id único
                       └─ sheet.appendRow(...)
                              │
                              ▼
                     éxito → alert() + loadDashboard() (recarga completa de tarjetas)
```

No existe websocket ni polling: cada acción de escritura dispara una recarga completa
de `getDashboardData()` desde el cliente.

---

## 4. Archivos de servidor (`.js` → Apps Script)

### 4.1 `Code.js`

- **`doGet(e)`**: entry point HTTP del web app. Renderiza `Index.html` como plantilla
  (permite `<?!= ... ?>`), fija título, favicon, meta viewport y
  `XFrameOptionsMode.ALLOWALL` (necesario para que la app pueda embebido en un iframe de
  la intranet).
- **`include(filename)`**: helper de composición de plantillas — inyecta el contenido de
  otro `.html` en el punto donde se llama. Usado por `Index.html` para ensamblar
  `Styles`, `ThemeToggle`, `SkeletonComponent`, `CardComponent` y `Scripts`.

### 4.2 `Controller.js`

| Función | Descripción |
|---|---|
| `getDashboardData()` | Punto de entrada de lectura para el cliente. Simula 1s de delay (`Utilities.sleep(1000)`) para que el skeleton sea visible, obtiene `config` (Utils), `gems` (Sheet con fallback) y datos del usuario actual (email, nombre derivado del email, `isAdmin`, `role`). |
| `addGemToSheet(gem)` | Punto de entrada de escritura. **Restringido** al email hardcodeado `ptecnologia@oxohotel.com`; valida campos requeridos y unicidad de `id`; normaliza encabezados vía `HEADER_MAP` y hace `appendRow` en la hoja `Gemas`. |
| `getGemsFromSheet()` | Lee la hoja `Gemas` (o la primera hoja si no existe una con ese nombre), normaliza encabezados con `HEADER_MAP` (soporta variantes en inglés/español con y sin tildes) y devuelve un array de objetos Gema. Ignora filas sin `id`. |
| `setupGemsSpreadsheet()` | Función de **mantenimiento manual** (no se llama desde el cliente). Crea/limpia la hoja `Gemas`, escribe encabezados y carga los datos de `getFallbackGems()`. Debe ejecutarse una sola vez desde el editor de Apps Script al inicializar una hoja nueva. |
| `getFallbackGems()` | Datos hardcodeados de respaldo (3 Gemas reales de auditoría financiera) usados si la hoja de cálculo no existe, está vacía o falla la lectura. También son la semilla inicial que usa `setupGemsSpreadsheet()`. |

**Modelo de datos de una Gema** (columnas esperadas en la hoja `Gemas`, ver `HEADER_MAP`
para alias aceptados):

| Campo | Tipo | Obligatorio al crear | Notas |
|---|---|---|---|
| `id` | string | Sí | Único, se compara case-insensitive |
| `title` | string | Sí | |
| `description` | string | Sí | Texto plano, se ve en la tarjeta |
| `fullDescription` | string (Markdown) | Sí | Renderizado con `marked.js` en el modal |
| `instructions` | string (Markdown) | Sí | Renderizado con `marked.js` en el modal |
| `examplePrompt` | string (texto plano) | Sí | Se copia tal cual al portapapeles |
| `icon` | string | No | Debe existir en el `iconMap` del cliente (`Scripts.html`); si no coincide se usa 💎 |
| `link` | string (URL) | Sí | URL de la Gema en Gemini |
| `status` | `'active'` \| `'upcoming'` | No | `upcoming` deshabilita el botón Explorar y muestra badge |
| `color` | string | No | Debe existir como `--color-{valor}` en `Styles.html`; por defecto `gold` |

### 4.3 `Utils.js`

- **`formatDate(date)`**: formatea con la zona horaria del script (`America/Mexico_City`,
  ver `appsscript.json`).
- **`getAppProperties()`**: lee `PropertiesService.getScriptProperties()` y devuelve
  `{ logoLight, logoDark, mainLink }` con valores por defecto (IDs de archivo de Google
  Drive) si las propiedades no están configuradas.
- **`setupProperties()`**: función de **mantenimiento manual** para inicializar
  `LOGO_LIGHT`, `LOGO_DARK`, `MAIN_LINK` en Script Properties.

### 4.4 Configuración vía Script Properties

| Propiedad | Uso | Valor por defecto |
|---|---|---|
| `SPREADSHEET_ID` | ID de la hoja de cálculo con la pestaña `Gemas` | `1h0vyFn3LUthtUc8bwCVRUsTnAuc7KZX9I34XDXPtTyk` |
| `LOGO_LIGHT` | ID de archivo de Drive del logo en tema claro | `190p1KFkQUoJBomzXW_tA3txZqlMwk94m` |
| `LOGO_DARK` | ID de archivo de Drive del logo en tema oscuro | `1RE1jgKrh7U2GeiB9knfSQ2HY7hT2vj5Z` |
| `MAIN_LINK` | Enlace principal de configuración (actualmente no consumido por la UI) | ver `Utils.js` |

Los IDs de logo se resuelven en el cliente como
`https://lh3.googleusercontent.com/d/{fileId}` (ver `updateLogo()` en `Scripts.html`); el
archivo de Drive debe tener permisos de acceso público/link para que la imagen cargue.

---

## 5. Frontend (plantillas `.html`)

- **`Index.html`**: layout único. Contiene el header (con skeleton propio), la grilla de
  tarjetas (skeletons + contenedor real oculto hasta cargar), el modal de detalle de Gema,
  el modal de administración (formulario de creación) y el `<template>` de tarjeta vía
  `include('CardComponent')`.
- **`Styles.html`**: única hoja de estilos, con variables CSS por tema
  (`:root` = claro, `[data-theme="dark"]` = oscuro) y variable dinámica por tarjeta
  `--card-accent-color`, seteada en JS según `gem.color`.
- **`Scripts.html`**: toda la lógica de cliente (ver tabla de funciones abajo).
- **`CardComponent.html`**: `<template id="cardTemplate">` clonado por Gema en
  `renderGems()`.
- **`SkeletonComponent.html`**: placeholder estático, se incluye 3 veces en `Index.html`
  mientras cargan los datos reales.
- **`ThemeToggle.html`**: botón con dos íconos SVG (sol/luna) alternados por CSS según
  `data-theme`.

### 5.1 Funciones clave de `Scripts.html`

| Función | Responsabilidad |
|---|---|
| `initTheme()` | Restaura tema guardado en `localStorage('oxo-theme')` y liga el listener del toggle. |
| `setTheme(theme)` | Aplica `data-theme` al `<html>`, persiste en `localStorage`, actualiza el logo. |
| `updateLogo(theme)` | Resuelve la URL del logo según tema y `APP_CONFIG`. |
| `loadDashboard()` | Llama `getDashboardData()`, guarda `APP_CONFIG`, dispara `renderGems`, muestra/oculta botón admin, oculta skeletons. |
| `renderGems(gems)` | Clona la plantilla de tarjeta por cada Gema; mapea `icon` a emoji vía `iconMap`; aplica `color`; maneja estado `upcoming`; liga `openModal` al botón Detalles. |
| `hideSkeletons()` | Alterna clases `hidden` entre skeletons y contenido real. |
| `openModal(gem)` / `closeModal()` | Pobla y muestra/oculta el modal de detalle; renderiza Markdown con `marked.parse()`. |
| `copyPrompt()` | Copia el prompt de ejemplo al portapapeles (Clipboard API). |
| `openAdminModal()` / `closeAdminModal()` | Muestra/oculta y resetea el formulario de creación de Gema. |
| `handleFormSubmit(event)` | Serializa el formulario, llama `addGemToSheet()`, maneja estados de carga/error y recarga el dashboard al éxito. |

El mapeo de íconos (`iconMap`) y de colores (`--color-*`) está **hardcodeado en dos
lugares que deben mantenerse sincronizados**: el `<select>` de `Index.html` (para que el
admin elija un valor válido) y el `iconMap`/las variables CSS en `Scripts.html`/`Styles.html`
(para que ese valor se traduzca visualmente). Agregar un ícono o color nuevo requiere
tocar los tres puntos.

---

## 6. Seguridad y permisos

- **`appsscript.json`**: `webapp.executeAs = "USER_DEPLOYING"` (el script corre con los
  permisos de quien lo publicó, no del usuario que navega) y `webapp.access =
  "ANYONE_ANONYMOUS"` (cualquier persona con el enlace puede abrir la app, incluso sin
  cuenta de Google identificada por Apps Script si el dominio lo permite).
- **Autorización de administrador**: hardcodeada como comparación literal de string en
  dos lugares de `Controller.js` (`getDashboardData` y `addGemToSheet`):
  ```js
  const isAdmin = (userEmail === 'ptecnologia@oxohotel.com');
  ```
  No hay lista de roles ni tabla de permisos: es un único email con acceso de escritura.
  Para agregar más administradores, reemplazar esa comparación por una lista/array o por
  una consulta a una hoja/rango de "Admins".
- **Client-side no es una barrera de seguridad**: el botón "Crear gema" se oculta en el
  cliente si `!isAdmin`, pero la validación real ocurre en el servidor
  (`addGemToSheet` lanza `Error` si el email no coincide). Esto es correcto: nunca confiar
  solo en ocultar UI.
- **`Session.getActiveUser().getEmail()`** puede devolver cadena vacía si el usuario no
  está autenticado con una cuenta de Google reconocible por el script (dependiendo de la
  configuración de `access` del despliegue) — de ahí el `|| ''` defensivo en el código.

---

## 7. Flujo de despliegue con `clasp`

```bash
# Autenticarse una vez (abre navegador)
clasp login

# Traer el estado remoto más reciente antes de editar
clasp pull

# Después de editar archivos localmente, subir cambios al proyecto de Apps Script
clasp push

# Abrir el proyecto en el editor web de Apps Script
clasp open

# Crear una nueva versión y desplegarla como Web App
clasp deploy --description "Descripción del cambio"
```

`scriptId` está fijado en `.clasp.json`; no cambiar ese valor salvo que se migre a un
proyecto de Apps Script distinto. `clasp push` sobrescribe el contenido remoto de cada
archivo con el mismo nombre — no hace merge.

### 7.1 Puesta en marcha desde cero (nuevo entorno)

1. `clasp clone <scriptId>` o `clasp create` + copiar los archivos de este repo.
2. En el editor de Apps Script, ejecutar manualmente **una sola vez**:
   - `setupProperties()` (Utils.js) — configura logos y enlace principal.
   - `setupGemsSpreadsheet()` (Controller.js) — crea la hoja `Gemas` con los datos de
     `getFallbackGems()` y guarda `SPREADSHEET_ID` en Script Properties.
3. Publicar como Web App (`Implementar > Nueva implementación > Aplicación web`), con
   `Ejecutar como: Yo` y `Quién tiene acceso` según la política de la organización
   (actualmente `Cualquier usuario`, ver `appsscript.json`).
4. Compartir el logo de Drive (`LOGO_LIGHT`/`LOGO_DARK`) con acceso "Cualquier persona con
   el enlace" para que la imagen renderice fuera del dominio de Drive.

---

## 8. Extender el sistema

**Agregar un nuevo ícono o color de tarjeta:**
1. Agregar la opción en el `<select id="gemIcon">`/`<select id="gemColor">` de `Index.html`.
2. Si es ícono nuevo, agregar la entrada emoji en `iconMap` (`Scripts.html`).
3. Si es color nuevo, declarar la variable `--color-{nombre}` en `:root` de `Styles.html`
   (y su variante en `[data-theme="dark"]` si aplica).

**Agregar/editar una Gema sin usar el formulario:** editar directamente la pestaña
`Gemas` de la hoja de cálculo (`SPREADSHEET_ID`). El sistema lee esa hoja en cada carga
del dashboard, no hay caché.

**Editar o eliminar una Gema existente:** no soportado desde la UI; se hace manualmente
en Google Sheets.

**Agregar más administradores:** modificar la comparación de `isAdmin` en
`Controller.js` (ver sección 6) — idealmente moviendo la lista de emails a Script
Properties en vez de dejarla hardcodeada en el código.

---

## 9. Limitaciones conocidas

- Sin control de concurrencia: dos administradores creando una Gema con el mismo `id` al
  mismo tiempo podrían generar una condición de carrera (lectura-verificación-escritura
  no es atómica sobre Google Sheets).
- Sin paginación: `getGemsFromSheet()` carga todas las filas en cada solicitud; a mayor
  cantidad de Gemas, mayor tiempo de respuesta.
- No hay pruebas automatizadas ni linter configurado en el proyecto.
- El array `iconMap` y las opciones del `<select>` deben mantenerse sincronizados
  manualmente (ver sección 5.1).
