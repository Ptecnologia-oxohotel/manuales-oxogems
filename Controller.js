/**
 * @file Controller.gs
 * @description Business logic and data fetching for the Dashboard.
 */

/**
 * Returns data for the dashboard gems.
 * @returns {Object} - Object containing gems configuration.
 */
function getDashboardData() {
  // Simulate a delay for skeleton loading visibility
  Utilities.sleep(1000);

  const config = getAppProperties();
  let gems = [];
  
  try {
    gems = getGemsFromSheet();
    if (!gems || gems.length === 0) {
      Logger.log('No gems found in sheet, using fallback gems.');
      gems = getFallbackGems();
    }
  } catch (e) {
    Logger.log('Error reading from sheet, using fallback: ' + e.message);
    gems = getFallbackGems();
  }

  const userEmail = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const isAdmin = (userEmail === 'ptecnologia@oxohotel.com');

  return {
    config: config, // Pass properties to client
    gems: gems,
    user: {
      email: userEmail,
      name: userEmail.split('@')[0] || 'Usuario',
      isAdmin: isAdmin,
      role: isAdmin ? 'Administrador' : 'Colaborador'
    }
  };
}

/**
 * Adds a new gem to the Google Sheet.
 * Restricted to ptecnologia@oxohotel.com.
 * @param {Object} gem - The gem configuration to add.
 * @returns {Object} - Result of the operation.
 */
function addGemToSheet(gem) {
  const userEmail = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (userEmail !== 'ptecnologia@oxohotel.com') {
    throw new Error('Acceso denegado: Solo el administrador ptecnologia@oxohotel.com puede agregar gemas.');
  }

  // Validate required fields
  const requiredFields = ['id', 'title', 'description', 'fullDescription', 'instructions', 'examplePrompt', 'link'];
  for (let field of requiredFields) {
    if (!gem[field] || gem[field].toString().trim() === '') {
      throw new Error('Falta el campo requerido: ' + field);
    }
  }

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '1h0vyFn3LUthtUc8bwCVRUsTnAuc7KZX9I34XDXPtTyk';
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName('Gemas');
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => h.toString().trim());

  // Check if ID already exists to prevent duplicates
  const idIndex = headers.indexOf('id');
  if (idIndex !== -1) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][idIndex].toString().toLowerCase() === gem.id.toString().toLowerCase()) {
        throw new Error('Ya existe una gema con el identificador (ID): ' + gem.id);
      }
    }
  }

  // Header map to standardize column names to matching object keys
  const HEADER_MAP = {
    'id': 'id', 'ID': 'id',
    'title': 'title', 'titulo': 'title', 'título': 'title',
    'description': 'description', 'descripcion': 'description', 'descripción': 'description',
    'fullDescription': 'fullDescription', 'fulldescription': 'fullDescription', 'descripcion_detallada': 'fullDescription', 'descripción detallada': 'fullDescription',
    'instructions': 'instructions', 'instrucciones': 'instructions', 'instructivos': 'instructions',
    'examplePrompt': 'examplePrompt', 'exampleprompt': 'examplePrompt', 'prompt_ejemplo': 'examplePrompt', 'prompt de ejemplo': 'examplePrompt',
    'icon': 'icon', 'icono': 'icon', 'ícono': 'icon',
    'link': 'link', 'enlace': 'link',
    'status': 'status', 'estado': 'status',
    'color': 'color'
  };

  // Build the new row based on spreadsheet headers
  const newRow = headers.map(header => {
    const stdKey = HEADER_MAP[header] || header;
    return gem[stdKey] || '';
  });

  sheet.appendRow(newRow);
  
  // Re-adjust column widths
  sheet.autoResizeColumns(1, headers.length);
  
  return { success: true };
}

/**
 * Reads gems configuration from the Google Spreadsheet.
 * @returns {Array<Object>} - Array of gem objects.
 */
function getGemsFromSheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '1h0vyFn3LUthtUc8bwCVRUsTnAuc7KZX9I34XDXPtTyk';
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName('Gemas');
  if (!sheet) {
    // Fallback to first sheet
    sheet = ss.getSheets()[0];
  }
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(h => h.toString().trim());
  
  // Header map to standardize column names to matching object keys
  const HEADER_MAP = {
    'id': 'id',
    'ID': 'id',
    'title': 'title',
    'titulo': 'title',
    'título': 'title',
    'description': 'description',
    'descripcion': 'description',
    'descripción': 'description',
    'fullDescription': 'fullDescription',
    'fulldescription': 'fullDescription',
    'descripcion_detallada': 'fullDescription',
    'descripción detallada': 'fullDescription',
    'instructions': 'instructions',
    'instrucciones': 'instructions',
    'instructivos': 'instructions',
    'examplePrompt': 'examplePrompt',
    'exampleprompt': 'examplePrompt',
    'prompt_ejemplo': 'examplePrompt',
    'prompt de ejemplo': 'examplePrompt',
    'icon': 'icon',
    'icono': 'icon',
    'ícono': 'icon',
    'link': 'link',
    'enlace': 'link',
    'status': 'status',
    'estado': 'status',
    'color': 'color'
  };

  const gems = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const gem = {};
    let hasId = false;
    
    headers.forEach((header, index) => {
      const standardKey = HEADER_MAP[header] || header;
      let val = row[index];
      
      if (val === null || val === undefined) {
        val = '';
      }
      gem[standardKey] = val;
      if (standardKey === 'id' && val) {
        hasId = true;
      }
    });
    
    if (hasId) {
      gems.push(gem);
    }
  }
  return gems;
}

/**
 * Configures the spreadsheet with the initial data of OxoGems.
 * Run this function manually once to initialize the sheet without losing existing hardcoded data.
 */
function setupGemsSpreadsheet() {
  const spreadsheetId = '1h0vyFn3LUthtUc8bwCVRUsTnAuc7KZX9I34XDXPtTyk';
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
  
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sheet = ss.getSheetByName('Gemas');
  if (!sheet) {
    sheet = ss.insertSheet('Gemas');
  } else {
    sheet.clear();
  }
  
  const headers = [
    'id',
    'title',
    'description',
    'fullDescription',
    'instructions',
    'examplePrompt',
    'icon',
    'link',
    'status',
    'color'
  ];
  
  const initialGems = getFallbackGems();
  
  const rows = [headers];
  initialGems.forEach(gem => {
    rows.push(headers.map(h => gem[h] || ''));
  });
  
  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  
  // Format sheet for readability
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#F3F4F6');
  sheet.autoResizeColumns(1, headers.length);
  
  Logger.log('Spreadsheet configured successfully with name "Gemas" and initial data in Markdown format!');
}

/**
 * Returns original hardcoded fallback data for the dashboard.
 * @returns {Array<Object>} - Hardcoded fallback gems config.
 */
function getFallbackGems() {
  return [
    {
      id: 'gem-1',
      title: 'Sentinela Financiero (Audit-Core 2.0)',
      description: 'Motor de auditoría técnica diseñado para el procesamiento de archivos planos bancarios (PAB/Waya) bajo un protocolo de "Confianza Cero".',
      fullDescription: 'Motor de auditoría técnica diseñado para el procesamiento de archivos planos bancarios (PAB/Waya) bajo un protocolo de "Confianza Cero". El sistema actúa como un script lógico que ignora metadatos de cabecera y calcula la realidad financiera mediante el procesamiento línea por línea del detalle de pagos. Su función es realizar una conciliación tripartita (TXT vs. NQ vs. PEL), validando simultáneamente la identidad, la fecha, el volumen y la integridad monetaria de cada transacción.',
      instructions: `**Archivos a adjuntar:**\n* Archivo TXT bancario (PAB o Waya).`,
      examplePrompt: `# SENTINELA FINANCIERO: EJECUCIÓN DE PROCESAMIENTO\n\n## 1. PARÁMETROS DE CONTROL (Fuente: PDF NQ/PEL)\n* MONTO TOTAL ESPERADO: [Insertar Valor]\n* CANTIDAD EMPLEADOS ESPERADA: [Insertar Cantidad]\n* FECHA DE PAGO (YYYY/MM/DD): [Insertar Fecha]\n* NIT/HOTEL: [Insertar NIT]\n\n## 2. LISTA MAESTRA (Copiar aquí Cédulas y Nombres del NQ)\n[Pega los datos del PDF aquí]\n\n## 3. INSTRUCCIONES\nActúa como el Sentinela Financiero. Ejecuta un pensamiento lógico paso a paso:\n1. Procesa el detalle del archivo TXT adjunto (Ignora la línea 1).\n2. Normaliza las cédulas (Elimina el prefijo '6' si es PAB).\n3. Calcula la sumatoria y el conteo real.\n4. Cruza cada registro contra la Lista Maestra de arriba.\n\n## 4. SALIDA (RESTRICCIÓN: PROHIBIDO GENERAR TABLAS)\nEntrega exclusivamente el siguiente dictamen:\n- Tipo de archivo detectado:\n- Cantidad de registros calculados:\n- Suma total calculada:\n\n- REPORTE DE DISCREPANCIAS (Muestra solo si hay errores):\n  * [Indicar aquí error de NIT, Fecha, Monto o Identidad]\n\n- DICTAMEN FINAL: [🚀 TODO CORRECTO / 🛑 DISCREPANCIA DETECTADA]`,
      icon: 'analytics',
      link: 'https://gemini.google.com/gem/1eRQ6lLptGL9GQ2aOl1bmaoUVj4qLGrE3?usp=sharing',
      status: 'active',
      color: 'gold'
    },
    {
      id: 'gem-2',
      title: 'Validador Maestro (Conciliación vs. Nómina)',
      description: 'Auditor de cumplimiento especializado en la validación de datos de dispersión contra el Maestro de Nómina (NQ).',
      fullDescription: 'Auditor de cumplimiento especializado en la validación de datos de dispersión contra el Maestro de Nómina (NQ). Su función es asegurar que cada registro que está siendo enviado al banco tenga una correspondencia lógica, de identidad y financiera en el reporte oficial de nómina. Elimina la carga administrativa de los certificados individuales, basando toda su validación en el reporte consolidado de la nómina.',
      instructions: `**Archivos a adjuntar:**\n* Archivo TXT de Dispersión.\n* Archivo PDF de Nómina (NQ).`,
      examplePrompt: `# VALIDADOR MAESTRO: CRUCE DE CUMPLIMIENTO\n\n## 1. INSUMOS ADJUNTOS\n* [Archivo TXT de Dispersión]\n* [Archivo PDF de Nómina - NQ]\n\n## 2. INSTRUCCIONES\nActúa como el Validador Maestro. Ejecuta un pensamiento lógico de cruce de datos:\n1. Extrae los datos de pago del archivo TXT (Normaliza cédulas: elimina el '6' si es PAB).\n2. Busca a cada persona en el PDF de Nómina (NQ).\n3. Compara el Monto del TXT vs el "Neto a Pagar" del NQ.\n4. Omite la validación de certificados bancarios físicos; usa el NQ como única fuente de verdad.\n\n## 3. FORMATO DE SALIDA (RESTRICCIÓN: SOLO EXCEPCIONES)\nSi todo es correcto, emite solo el veredicto: "✅ VALIDACIÓN EXITOSA: Todos los registros coinciden con el Maestro de Nómina."\n\nDe lo contrario, genera la siguiente tabla de discrepancias:\n| Cédula | Nombre | Error Detectado | Acción Sugerida |\n| :--- | :--- | :--- | :--- |\n| [Cédula] | [Nombre] | [Cédula no encontrada / Monto errado] | [Descripción del ajuste] |\n\nDICTAMEN FINAL: [🛡️ VALIDACIÓN MAESTRA EXITOSA / 🛑 REQUIERE CORRECCIÓN]`,
      icon: 'security',
      link: 'https://gemini.google.com/gem/1I8nMp3E64k65lSHKajghRdav7t-gKKEm?usp=sharing',
      status: 'active',
      color: 'blue'
    },
    {
      id: 'gem-3',
      title: 'Conciliador de Nómina y Dictamen Final',
      description: 'Actúa como el Director de Tesorería. Su responsabilidad es la conciliación tripartita de alta precisión.',
      fullDescription: 'Actúa como el Director de Tesorería. Su responsabilidad es la conciliación tripartita de alta precisión. No confía en las sumas declaradas, sino que compara el resultado de la extracción del TXT contra los montos oficiales de Nómina (NQ) y Pagos Electrónicos (PEL). Es la última defensa contra errores operativos antes de la dispersión bancaria.',
      instructions: `**Archivos a adjuntar:**\n* Archivo TXT (Banco).\n* Archivo PDF de Nómina (NQ).\n* Archivo PDF de Pagos Electrónicos (PEL).`,
      examplePrompt: `# DICTAMEN FINAL DE TESORERÍA: TRIPLE MATCH\n\n## 1. INSUMOS DE AUDITORÍA\n* [Adjuntar PDF NQ]\n* [Adjuntar PDF PEL]\n* [Adjuntar Archivo TXT]\n\n## 2. PARÁMETROS DE CONTROL (Si ya los tienes calculados)\n* Suma Manual TXT: [Opcional]\n* Conteo Manual TXT: [Opcional]\n\n## 3. INSTRUCCIONES\nActúa como el Auditor Jefe de Conciliación. Ejecuta un pensamiento de "Confianza Cero":\n1. Cruza los montos totales y cantidad de empleados de los TRES archivos.\n2. Verifica que la fecha sea la misma en todos los documentos.\n3. Calcula la diferencia exacta entre las tres fuentes.\n4. Si detectas que una sola persona o un solo peso no cuadra, identifica el origen del error.\n\n## 4. ESTRUCTURA DE SALIDA (REPORTE EJECUTIVO)\n---\n### 📊 RESUMEN DE CONCILIACIÓN\n* **Periodo:** [Fecha detectada]\n* **Matriz de Totales:**\n  - NQ (Nómina): $ [Monto] | [Registros]\n  - PEL (Pagos): $ [Monto] | [Registros]\n  - TXT (Banco): $ [Monto] | [Registros]\n\n### 🔍 VALIDACIÓN DE INTEGRIDAD\n* Estado de Fechas: [✅ / ❌]\n* Estado de Identidad: [Estado de coincidencia de nombres/cédulas]\n\n### 📢 DICTAMEN FINAL\n**[🚀 LISTA PARA DISPERSIÓN / 🛑 REQUIERE CORRECCIÓN]**\n\n**Acciones Preventivas:** (Solo si hay errores: indica el valor exacto de la discrepancia y qué archivo corregir).\n---`,
      icon: 'hotel',
      link: 'https://gemini.google.com/gem/1V19izq-lV_U5m_psHVhuCl8VkvlqSM1I?usp=sharing',
      status: 'active',
      color: 'green'
    }
  ];
}
