# Instrucciones para generar el diagrama de flujo de OxoGems

Copia y pega todo el bloque siguiente (desde "PROMPT PARA LA IA" hasta el final) en el
chat de la IA que vaya a generar el diagrama (por ejemplo, otra instancia de Claude,
ChatGPT, o cualquier IA con soporte para Mermaid/diagramas). No requiere acceso al código,
toda la información necesaria está incluida en el prompt.

---

## PROMPT PARA LA IA

Actúa como un ingeniero de software especializado en documentación técnica. Necesito que
generes un **diagrama de flujo del sistema** para una aplicación web llamada **OxoGems**,
construida sobre Google Apps Script. Usa **sintaxis Mermaid** (`flowchart TD`) como salida
principal, y si tu herramienta lo permite, renderiza también la imagen del diagrama.

### Contexto del sistema

OxoGems es una intranet interna que muestra un catálogo de "Gemas" (asistentes de Google
Gemini preconfigurados) para automatizar tareas de auditoría financiera y conciliación de
nómina. Es una single-page app sin backend tradicional: el "backend" es Google Apps
Script, y la "base de datos" es una hoja de Google Sheets llamada `Gemas`. La
comunicación cliente-servidor se hace con `google.script.run` (RPC síncrono/asíncrono
propio de Apps Script, sin API REST ni websockets).

Hay dos tipos de actor:
- **Colaborador**: cualquier usuario autenticado con cuenta corporativa. Solo puede leer
  y usar Gemas.
- **Administrador**: un único usuario identificado por un correo específico
  (hardcodeado en el servidor). Además de todo lo que puede hacer un colaborador, puede
  crear nuevas Gemas.

### Actores / carriles (swimlanes) a representar

1. **Usuario (navegador)**
2. **Cliente (JavaScript en el navegador — `Scripts.html`)**
3. **Servidor Apps Script (`Code.js` / `Controller.js` / `Utils.js`)**
4. **Google Sheets (hoja "Gemas")**
5. **Gemini (aplicación externa donde vive cada Gema)**

### Flujo 1 — Carga inicial del dashboard (flujo principal, todos los usuarios)

1. El usuario abre la URL de la app en su navegador.
2. El servidor (`doGet`) construye la página a partir de una plantilla HTML y la devuelve.
3. El navegador muestra un estado de carga tipo "skeleton" (placeholders animados) mientras
   el cliente pide los datos.
4. El cliente invoca una función remota `getDashboardData()` en el servidor.
5. El servidor:
   a. Obtiene la configuración de la app (logos, enlaces) desde un almacén de
      propiedades de configuración.
   b. Intenta leer la lista de Gemas desde la hoja de Google Sheets "Gemas".
      - Si la hoja falla o está vacía, usa una lista de Gemas de respaldo hardcodeada
        en el propio código (fallback).
   c. Obtiene el correo del usuario autenticado y determina si es el Administrador
      (comparando contra un correo fijo).
   d. Devuelve al cliente: configuración + lista de Gemas + datos del usuario
      (correo, nombre, si es admin).
6. El cliente recibe la respuesta:
   a. Oculta los skeletons y muestra las tarjetas reales, una por Gema.
   b. Muestra el botón "Crear gema" únicamente si el usuario es Administrador.
   c. Aplica el tema (claro/oscuro) guardado localmente en el navegador.

### Flujo 2 — Consultar el detalle de una Gema y usarla (todos los usuarios)

1. El usuario hace clic en "Detalles" sobre una tarjeta.
2. El cliente abre una ventana modal y renderiza (usando una librería de Markdown en el
   navegador) la descripción completa, las instrucciones/protocolos y un prompt de
   ejemplo en texto plano.
3. El usuario, opcionalmente, hace clic en "Copiar" para copiar el prompt al
   portapapeles del sistema operativo.
4. El usuario hace clic en "Explorar Gema" (o directamente en "Explorar" desde la
   tarjeta, sin pasar por el modal).
5. El navegador abre, en una pestaña nueva, la URL externa de la Gema en Gemini.
6. (Fuera del sistema OxoGems) El usuario adjunta archivos y pega el prompt dentro de
   Gemini para ejecutar la Gema.

Nota de bifurcación: si el estado de la Gema es "Próximamente" en lugar de "Activa", el
botón "Explorar" debe representarse como deshabilitado y el flujo termina ahí (no se
abre Gemini).

### Flujo 3 — Crear una nueva Gema (solo Administrador)

1. El Administrador hace clic en el botón "Crear gema" (solo visible para él).
2. El cliente abre un formulario modal con los campos de la nueva Gema (identificador,
   título, descripción corta, descripción detallada, instrucciones, prompt de ejemplo,
   ícono, color, enlace de Gemini, estado).
3. El Administrador completa el formulario y confirma el envío.
4. El cliente envía los datos del formulario al servidor mediante una función remota
   `addGemToSheet(datos)`.
5. El servidor:
   a. Verifica que el correo del usuario que hace la petición sea exactamente el correo
      de Administrador autorizado.
      - Si no lo es → devuelve un error de "Acceso denegado" y el flujo termina aquí
        (bifurcación de error).
   b. Valida que todos los campos obligatorios estén presentes.
      - Si falta alguno → devuelve error de validación (bifurcación de error).
   c. Verifica que el identificador de la nueva Gema no exista ya en la hoja.
      - Si ya existe → devuelve error de "ID duplicado" (bifurcación de error).
   d. Agrega una nueva fila con los datos de la Gema al final de la hoja de Google
      Sheets "Gemas".
6. El servidor responde éxito al cliente.
7. El cliente cierra el formulario modal, muestra una confirmación al usuario y vuelve a
   ejecutar el **Flujo 1** (recarga completa del dashboard) para mostrar la nueva
   tarjeta.

En caso de error en cualquier paso 5a/5b/5c, el cliente debe mostrar el mensaje de error
al usuario y mantener el formulario abierto con los datos ingresados (no se pierde lo
escrito).

### Elementos visuales requeridos en el diagrama

- Diferencia visual clara (color, ícono o carril) entre las acciones que ocurren en el
  navegador del usuario, las que ocurren en el servidor de Apps Script, las que leen o
  escriben en Google Sheets, y la salida hacia Gemini (sistema externo).
- Rombos de decisión explícitos para:
  - ¿La hoja de Sheets respondió correctamente? (Flujo 1)
  - ¿El usuario es Administrador? (Flujo 1 y Flujo 3)
  - ¿El estado de la Gema es Activo o Próximamente? (Flujo 2)
  - ¿Pasó la validación de permisos / campos / ID único? (Flujo 3, puede representarse
    como una sola decisión con tres motivos de fallo o como tres rombos encadenados)
- Un punto de fallback claramente marcado como tal cuando la lectura de Sheets falla y
  se usan las Gemas de respaldo hardcodeadas.
- Un ciclo de retorno explícito desde el final del Flujo 3 (creación exitosa) hacia el
  inicio del Flujo 1 (recarga del dashboard), para representar que no hay una
  "página de confirmación" separada.

### Formato de salida esperado

1. Un diagrama Mermaid (`flowchart TD`) completo y renderizable, usando `subgraph` para
   separar los cinco carriles/actores listados arriba.
2. Una breve leyenda debajo del diagrama explicando la simbología usada (rectángulo =
   proceso, rombo = decisión, paralelogramo = entrada/salida, el color o estilo usado
   para "sistema externo" vs "servidor" vs "cliente").
3. Si tu entorno permite exportar imagen (PNG/SVG), genera también la imagen del
   diagrama además del código Mermaid.

No inventes pantallas, campos o roles que no estén descritos en este prompt; si algo no
está especificado, indícalo como supuesto explícito en la leyenda en vez de asumirlo
silenciosamente.
