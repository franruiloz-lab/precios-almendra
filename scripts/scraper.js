/**
 * Scraper de precios de almendra - Lonjas españolas
 *
 * Fuentes:
 *  1. SynergyNuts UPCT (Universidad Politécnica de Cartagena) - Fuente principal
 *  2. Fallback a datos manuales si el scraping falla
 *
 * Uso:
 *   node scraper.js              → Ejecuta scraping y guarda en data/
 *   node scraper.js --dry-run    → Ejecuta scraping sin guardar (test)
 *
 * Automatización:
 *   Ejecutar semanalmente (los jueves tras publicación de lonjas)
 *   Se puede usar cron, Task Scheduler de Windows, o GitHub Actions
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const PRECIOS_FILE = join(DATA_DIR, 'precios.json');
const HISTORICO_FILE = join(DATA_DIR, 'historico.json');
const JS_DATA_FILE = join(__dirname, '..', 'js', 'data.js');

const DRY_RUN = process.argv.includes('--dry-run');

// ============================================
// CONFIGURACIÓN DE FUENTES
// ============================================

const FUENTES = {
    upct: {
        nombre: 'SynergyNuts UPCT',
        urls: {
            general: 'https://synergynuts.upct.es/precio-almendra/',
            albacete: 'https://synergynuts.upct.es/precio-almendra/lonja-albacete/',
            murcia: 'https://synergynuts.upct.es/precio-almendra/lonja-murcia/',
            reus: 'https://synergynuts.upct.es/precio-almendra/lonja-reus/',
            cordoba: 'https://synergynuts.upct.es/precio-almendra/lonja-cordoba/'
        }
    }
};

// Variedades que buscamos en las tablas
const VARIEDADES_MAP = {
    'comuna': 'comuna',
    'comunas': 'comuna',
    'marcona': 'marcona',
    'largueta': 'largueta',
    'guara': 'guara',
    'ferragnes': 'ferragnes',
    'ferraganes': 'ferragnes',
    'ecológica': 'ecologica',
    'ecologica': 'ecologica',
    'belona': 'belona',
    'lauranne': 'lauranne',
    'soleta': 'soleta'
};

// ============================================
// SCRAPER PRINCIPAL
// ============================================

async function fetchPage(url) {
    console.log(`  Fetching: ${url}`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PrecioAlmendraScraper/1.0; +https://precioalmendra.com)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'es-ES,es;q=0.9'
            },
            timeout: 15000
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error(`  Error fetching ${url}: ${error.message}`);
        return null;
    }
}

/**
 * Parsea una tabla de precios HTML.
 * Las tablas suelen tener formato:
 *   Fecha | Variedad1 | Variedad2 | ...
 *   01/01/2026 | 5.50 | 7.20 | ...
 *
 * O alternativamente:
 *   Variedad | Precio | Fecha
 */
function parseTable(html, lonjaKey) {
    const $ = cheerio.load(html);
    const results = [];

    // Buscar todas las tablas en la página
    $('table').each((tableIdx, table) => {
        const headers = [];
        $(table).find('thead th, thead td, tr:first-child th, tr:first-child td').each((i, el) => {
            headers.push($(el).text().trim().toLowerCase());
        });

        // Determinar el formato de la tabla
        const hasDateColumn = headers.some(h =>
            h.includes('fecha') || h.includes('date') || h.match(/\d{2}\/\d{2}/)
        );
        const hasVarietyColumns = headers.some(h => {
            const normalized = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return Object.keys(VARIEDADES_MAP).some(v => normalized.includes(v));
        });

        if (!hasDateColumn && !hasVarietyColumns) return;

        // Mapear headers a variedades
        const columnMap = {};
        let dateColumnIdx = -1;

        headers.forEach((h, idx) => {
            const normalized = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (normalized.includes('fecha') || normalized.includes('date')) {
                dateColumnIdx = idx;
            }
            for (const [key, value] of Object.entries(VARIEDADES_MAP)) {
                if (normalized.includes(key)) {
                    columnMap[idx] = value;
                }
            }
        });

        // Si no encontramos columna de fecha, asumir que es la primera
        if (dateColumnIdx === -1) dateColumnIdx = 0;

        // Parsear filas de datos
        $(table).find('tbody tr, tr').each((rowIdx, row) => {
            if (rowIdx === 0 && $(row).find('th').length > 0) return; // Skip header row

            const cells = [];
            $(row).find('td, th').each((i, cell) => {
                cells.push($(cell).text().trim());
            });

            if (cells.length < 2) return;

            const fechaRaw = cells[dateColumnIdx];
            const fecha = parseDate(fechaRaw);
            if (!fecha) return;

            const precios = {};
            for (const [colIdx, variedad] of Object.entries(columnMap)) {
                const idx = parseInt(colIdx);
                if (idx < cells.length) {
                    const precio = parsePrice(cells[idx]);
                    if (precio !== null) {
                        precios[variedad] = precio;
                    }
                }
            }

            if (Object.keys(precios).length > 0) {
                results.push({ fecha, precios, lonja: lonjaKey });
            }
        });
    });

    return results;
}

function parseDate(str) {
    if (!str) return null;
    // Intentar DD/MM/YYYY
    const match1 = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (match1) {
        return `${match1[3]}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
    }
    // Intentar YYYY-MM-DD
    const match2 = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match2) return str;
    return null;
}

function parsePrice(str) {
    if (!str) return null;
    // Limpiar: quitar €, espacios, y convertir coma a punto
    const cleaned = str.replace(/[€\s]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    // Precio razonable de almendra: entre 1 y 15 €/kg
    if (!isNaN(num) && num >= 1 && num <= 15) return num;
    return null;
}

// ============================================
// SCRAPER POR LONJA
// ============================================

async function scrapeLonja(lonjaKey) {
    const url = FUENTES.upct.urls[lonjaKey];
    if (!url) {
        console.log(`  No hay URL para lonja: ${lonjaKey}`);
        return [];
    }

    const html = await fetchPage(url);
    if (!html) return [];

    const datos = parseTable(html, lonjaKey);
    console.log(`  ${lonjaKey}: ${datos.length} registros encontrados`);
    return datos;
}

// ============================================
// GESTIÓN DE DATOS
// ============================================

function loadExistingData(filepath) {
    try {
        if (existsSync(filepath)) {
            return JSON.parse(readFileSync(filepath, 'utf-8'));
        }
    } catch (e) {
        console.error(`  Error leyendo ${filepath}: ${e.message}`);
    }
    return null;
}

function mergeData(existing, newData) {
    if (!existing) {
        return {
            lastUpdate: new Date().toISOString(),
            source: 'SynergyNuts UPCT',
            lonjas: {}
        };
    }

    const merged = { ...existing, lastUpdate: new Date().toISOString() };

    for (const entry of newData) {
        if (!merged.lonjas[entry.lonja]) {
            merged.lonjas[entry.lonja] = { cotizaciones: [] };
        }

        const cotizaciones = merged.lonjas[entry.lonja].cotizaciones;

        // Comprobar si ya existe esta fecha
        const existingIdx = cotizaciones.findIndex(c => c.fecha === entry.fecha);
        if (existingIdx >= 0) {
            // Actualizar precios existentes
            cotizaciones[existingIdx].precios = {
                ...cotizaciones[existingIdx].precios,
                ...entry.precios
            };
        } else {
            cotizaciones.push({
                fecha: entry.fecha,
                precios: entry.precios
            });
        }

        // Ordenar por fecha descendente
        cotizaciones.sort((a, b) => b.fecha.localeCompare(a.fecha));
    }

    return merged;
}

/**
 * Genera el fichero data.js que consume el frontend.
 * Transforma los datos JSON en el formato que espera app.js
 */
function generateFrontendData(data) {
    const lonjas = ['albacete', 'murcia', 'reus', 'cordoba'];
    const variedades = ['comuna', 'marcona', 'largueta', 'guara'];

    const historico = {};
    const mesesMap = {
        '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
    };

    for (const lonja of lonjas) {
        const lonjaData = data.lonjas?.[lonja];
        if (!lonjaData || !lonjaData.cotizaciones?.length) {
            console.log(`  No hay datos para ${lonja}, usando datos de ejemplo`);
            continue;
        }

        // Agrupar por mes (último dato de cada mes)
        const porMes = {};
        for (const cot of lonjaData.cotizaciones) {
            const mesKey = cot.fecha.substring(0, 7); // YYYY-MM
            if (!porMes[mesKey] || cot.fecha > porMes[mesKey].fecha) {
                porMes[mesKey] = cot;
            }
        }

        // Tomar los últimos 12 meses
        const mesesOrdenados = Object.keys(porMes).sort().slice(-12);

        historico[lonja] = {
            meses: mesesOrdenados.map(m => {
                const [year, month] = m.split('-');
                return `${mesesMap[month]} ${year.slice(2)}`;
            })
        };

        for (const v of variedades) {
            historico[lonja][v] = mesesOrdenados.map(m => {
                return porMes[m]?.precios?.[v] ?? null;
            });
        }
    }

    return historico;
}

function saveDataJS(historico) {
    // Leer el data.js actual
    const currentDataJS = readFileSync(JS_DATA_FILE, 'utf-8');

    // Encontrar y reemplazar el bloque PRECIO_HISTORICO
    const startMarker = '// INICIO_DATOS_REALES';
    const endMarker = '// FIN_DATOS_REALES';

    if (currentDataJS.includes(startMarker)) {
        // Si ya tiene marcadores, reemplazar
        const before = currentDataJS.substring(0, currentDataJS.indexOf(startMarker));
        const after = currentDataJS.substring(currentDataJS.indexOf(endMarker) + endMarker.length);
        const newContent = `${before}${startMarker}\nconst PRECIO_HISTORICO = ${JSON.stringify(historico, null, 4)};\n${endMarker}${after}`;
        writeFileSync(JS_DATA_FILE, newContent, 'utf-8');
    } else {
        // Si no tiene marcadores, reemplazar el PRECIO_HISTORICO existente
        const regex = /const PRECIO_HISTORICO = \{[\s\S]*?\n\};/;
        if (regex.test(currentDataJS)) {
            const newContent = currentDataJS.replace(
                regex,
                `// INICIO_DATOS_REALES\nconst PRECIO_HISTORICO = ${JSON.stringify(historico, null, 4)};\n// FIN_DATOS_REALES`
            );
            writeFileSync(JS_DATA_FILE, newContent, 'utf-8');
            console.log('  data.js actualizado con datos reales');
        }
    }
}

// ============================================
// EJECUCIÓN PRINCIPAL
// ============================================

async function main() {
    console.log('========================================');
    console.log('PrecioAlmendra - Scraper de Precios');
    console.log(`Fecha: ${new Date().toLocaleString('es-ES')}`);
    console.log(`Modo: ${DRY_RUN ? 'DRY RUN (sin guardar)' : 'PRODUCCIÓN'}`);
    console.log('========================================\n');

    const lonjas = ['albacete', 'murcia', 'reus', 'cordoba'];
    const allData = [];

    for (const lonja of lonjas) {
        console.log(`\nScraping ${lonja.toUpperCase()}...`);
        const datos = await scrapeLonja(lonja);
        allData.push(...datos);
    }

    console.log(`\n--- Resumen ---`);
    console.log(`Total registros obtenidos: ${allData.length}`);

    if (allData.length === 0) {
        console.log('\nNo se obtuvieron datos. Posibles causas:');
        console.log('  - Las páginas han cambiado su estructura');
        console.log('  - Error de red o timeout');
        console.log('  - La fuente no tiene datos nuevos');
        console.log('\nUsa el panel admin (admin.html) para introducir datos manualmente.');
        return;
    }

    if (DRY_RUN) {
        console.log('\n[DRY RUN] Datos que se guardarían:');
        console.log(JSON.stringify(allData.slice(0, 5), null, 2));
        console.log(`... y ${Math.max(0, allData.length - 5)} más`);
        return;
    }

    // Cargar datos existentes y mergear
    const existing = loadExistingData(PRECIOS_FILE);
    const merged = mergeData(existing, allData);

    // Guardar JSON crudo
    writeFileSync(PRECIOS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    console.log(`\nDatos guardados en: ${PRECIOS_FILE}`);

    // Guardar histórico acumulado
    const historicoExisting = loadExistingData(HISTORICO_FILE) || { entries: [] };
    historicoExisting.entries.push({
        timestamp: new Date().toISOString(),
        count: allData.length
    });
    writeFileSync(HISTORICO_FILE, JSON.stringify(historicoExisting, null, 2), 'utf-8');

    // Generar datos para el frontend
    const frontendData = generateFrontendData(merged);
    if (Object.keys(frontendData).length > 0) {
        saveDataJS(frontendData);
        console.log('Frontend data.js actualizado');
    }

    console.log('\n¡Scraping completado con éxito!');
}

main().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
