/* ============================================
   DATA LAYER - PrecioAlmendra
   Carga datos desde data/precios.json (generado por scraper)
   con fallback a datos embebidos.
   ============================================ */

const LONJAS = {
    albacete: {
        nombre: 'Albacete',
        nombreCompleto: 'Lonja de Albacete',
        region: 'Castilla-La Mancha',
        color: '#2E7D32',
        url: '/lonja/albacete/',
        descripcion: 'La Lonja Agropecuaria de Albacete es una de las principales referencias para la cotización de almendra en España, especialmente para las variedades cultivadas en Castilla-La Mancha.'
    },
    murcia: {
        nombre: 'Murcia',
        nombreCompleto: 'Lonja de Murcia',
        region: 'Región de Murcia',
        color: '#1565C0',
        url: '/lonja/murcia/',
        descripcion: 'La Lonja de Murcia cubre una de las zonas con mayor producción de almendra de España, siendo referencia clave para el sureste peninsular.'
    },
    reus: {
        nombre: 'Reus',
        nombreCompleto: 'Lonja de Reus',
        region: 'Cataluña (Tarragona)',
        color: '#E65100',
        url: '/lonja/reus/',
        descripcion: 'La Lonja de Reus es la referencia histórica del mercado de frutos secos en España, con una tradición que se remonta a siglos de comercio en Tarragona.'
    },
    cordoba: {
        nombre: 'Córdoba',
        nombreCompleto: 'Lonja de Córdoba',
        region: 'Andalucía',
        color: '#7B1FA2',
        url: '/lonja/cordoba/',
        descripcion: 'La Lonja de Córdoba es la principal referencia para los productores de almendra de Andalucía, cubriendo una zona de producción creciente.'
    }
};

const VARIEDADES = ['Comuna', 'Marcona', 'Largueta', 'Guara'];

const MESES_MAP = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
};

// ============================================
// DATOS - Se cargan desde JSON o fallback
// ============================================

let PRECIO_HISTORICO = null;
let DATA_SOURCE = 'fallback';
let LAST_UPDATE_DATE = null;

// Datos de fallback (usados si no se puede cargar el JSON)
const FALLBACK_DATA = {
    albacete: {
        meses: ["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26","Abr 26","May 26","Jun 26","Jul 26","Ago 26","Sep 26"],
        comuna:   [5.05, 5.10, 5.60, 5.10, 5.10, 5.10, 5.10, 5.10, 5.10, 5.10, 5.35, 5.40],
        marcona: [6.10, 6.10, 7.35, 6.10, 6.10, 6.10, 6.10, 6.10, 6.10, 6.10, null, 6.40],
        largueta: [5.50, 5.55, 6.15, 5.55, 5.55, 5.55, 5.55, 5.55, 5.55, 5.55, null, 5.65],
        guara:    [5.15, 5.20, 5.80, 5.20, 5.20, 5.20, 5.20, 5.20, 5.20, 5.20, 5.45, 5.50]
    },
    murcia: {
        meses: ["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26","Abr 26","May 26","Jun 26","Jul 26","Ago 26","Sep 26"],
        comuna:   [5.08, 5.65, 5.50, 5.06, 5.01, 4.99, 4.99, 5.03, 5.06, 5.06, 5.16, 5.32],
        marcona: [6.04, 7.40, 7.25, 6.09, 6.06, 6.06, 6.06, 6.12, 6.12, 6.13, 6.18, 6.28],
        largueta: [5.49, 6.20, 6.05, 5.57, 5.50, 5.47, 5.47, 5.50, 5.51, 5.50, 5.58, 5.67],
        guara:    [5.20, 5.85, 5.70, 5.16, 5.11, 5.08, 5.09, 5.14, 5.16, 5.18, 5.27, 5.44]
    },
    reus: {
        meses: ["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26","Abr 26","May 26","Jun 26","Jul 26","Ago 26","Sep 26"],
        comuna:   [6.00, 4.70, 5.70, 4.70, 4.65, 4.65, 4.65, 4.60, 4.55, null, 4.95, 4.95],
        marcona: [7.80, 5.75, 7.45, 5.75, 5.70, 5.70, 5.70, 5.60, 5.55, null, null, null],
        largueta: [6.60, 5.30, 6.25, 5.30, 5.25, 5.25, 5.25, 5.25, 5.15, null, null, null],
        guara:    [6.20, 5.00, 5.90, 4.95, 4.90, 4.90, 4.90, 4.90, 4.85, null, 5.15, 5.25]
    },
    cordoba: {
        meses: ["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26","Abr 26","May 26","Jun 26","Jul 26","Ago 26","Sep 26"],
        comuna:   [5.10, 5.60, 5.45, 5.15, 5.15, 5.05, 5.05, 5.05, 5.05, null, 5.25, 5.35],
        marcona: [null, 7.30, 7.15, null, null, null, null, null, null, null, null, null],
        largueta: [null, 6.15, 6.00, null, null, null, null, null, null, null, null, null],
        guara:    [5.30, 5.80, 5.65, 5.35, 5.35, 5.25, 5.25, 5.25, 5.25, null, null, null]
    }
};

/**
 * Intenta cargar datos reales desde data/precios.json.
 * Si falla, usa los datos de fallback embebidos.
 */
async function loadPriceData() {
    const jsonPath = '/data/precios.json';

    try {
        const response = await fetch(jsonPath, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Transformar JSON a formato del frontend
        const transformed = transformJsonToHistorico(data);
        if (transformed && Object.keys(transformed).length > 0) {
            PRECIO_HISTORICO = transformed;
            DATA_SOURCE = data.source || 'JSON';
            LAST_UPDATE_DATE = data.lastUpdate;
            console.log('Datos cargados desde precios.json');
            return;
        }
    } catch (e) {
        console.log('No se pudo cargar precios.json, usando datos de fallback:', e.message);
    }

    // Fallback
    PRECIO_HISTORICO = FALLBACK_DATA;
    DATA_SOURCE = 'fallback';
}

/*/**
 * Transforma el formato de precios.json al formato PRECIO_HISTORICO del frontend
 */
function transformJsonToHistorico(data) {
    const result = {};
    const lonjas = ['albacete', 'murcia', 'reus', 'cordoba'];
    const variedades = ['comuna', 'marcona', 'largueta', 'guara'];

    // Agrupar cotizaciones por mes para cada lonja
    const porMesPorLonja = {};
    const todosLosMesesSet = new Set();

    for (const lonja of lonjas) {
        const lonjaData = data.lonjas?.[lonja];
        if (!lonjaData?.cotizaciones?.length) continue;

        porMesPorLonja[lonja] = {};
        for (const cot of lonjaData.cotizaciones) {
            const mesKey = cot.fecha.substring(0, 7); // YYYY-MM
            if (!porMesPorLonja[lonja][mesKey] || cot.fecha > porMesPorLonja[lonja][mesKey].fecha) {
                porMesPorLonja[lonja][mesKey] = cot;
            }
            todosLosMesesSet.add(mesKey);
        }
    }

    // Orden cronológico de todos los meses de todas las lonjas
    const mesesOrdenados = Array.from(todosLosMesesSet).sort();
    if (mesesOrdenados.length === 0) return result;

    const mesesLabels = mesesOrdenados.map(m => {
        const [year, month] = m.split('-');
        return `${MESES_MAP[month] || month} ${year.slice(2)}`;
    });

    for (const lonja of lonjas) {
        const cotizacionesMes = porMesPorLonja[lonja] || {};
        result[lonja] = {
            meses: mesesLabels
        };

        for (const v of variedades) {
            result[lonja][v] = mesesOrdenados.map(m =>
                cotizacionesMes[m]?.precios?.[v] ?? null
            );
        }
    }

    return result;
}

// ============================================
// FUNCIONES DE ACCESO A DATOS
// ============================================

function getPrecioActual(lonja, variedad) {
    if (!PRECIO_HISTORICO || !PRECIO_HISTORICO[lonja]) return null;
    const key = variedad.toLowerCase();
    const datos = PRECIO_HISTORICO[lonja][key];
    if (!datos || datos.length === 0) return null;

    let actual = null;
    let anterior = null;
    for (let i = datos.length - 1; i >= 0; i--) {
        if (datos[i] !== null) {
            if (actual === null) {
                actual = datos[i];
            } else if (anterior === null) {
                anterior = datos[i];
                break;
            }
        }
    }

    if (actual === null) return null;
    const cambio = anterior !== null ? actual - anterior : 0;
    const cambioPct = anterior !== null && anterior !== 0 ? ((cambio / anterior) * 100).toFixed(1) : '0.0';
    return { actual, anterior, cambio, cambioPct, datos };
}

function getPrecioMedioActual(variedad) {
    const lonjas = Object.keys(LONJAS);
    let suma = 0;
    let count = 0;
    for (const l of lonjas) {
        const p = getPrecioActual(l, variedad);
        if (p) { suma += p.actual; count++; }
    }
    return count > 0 ? (suma / count).toFixed(2) : '0.00';
}

function getMediaLonja(lonja) {
    let suma = 0;
    let count = 0;
    for (const v of VARIEDADES) {
        const p = getPrecioActual(lonja, v);
        if (p) { suma += p.actual; count++; }
    }
    return count > 0 ? (suma / count).toFixed(2) : '0.00';
}

function getCambioMedioLonja(lonja) {
    let sumaCambio = 0;
    let count = 0;
    for (const v of VARIEDADES) {
        const p = getPrecioActual(lonja, v);
        if (p) { sumaCambio += parseFloat(p.cambioPct); count++; }
    }
    return count > 0 ? (sumaCambio / count).toFixed(1) : '0.0';
}

function getLastUpdate() {
    if (LAST_UPDATE_DATE) {
        const d = new Date(LAST_UPDATE_DATE);
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
    }
    return '10 de octubre de 2026'; // fallback date
}
