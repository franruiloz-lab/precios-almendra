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
        url: 'pages/lonja-albacete.html',
        descripcion: 'La Lonja Agropecuaria de Albacete es una de las principales referencias para la cotización de almendra en España, especialmente para las variedades cultivadas en Castilla-La Mancha.'
    },
    murcia: {
        nombre: 'Murcia',
        nombreCompleto: 'Lonja de Murcia',
        region: 'Región de Murcia',
        color: '#1565C0',
        url: 'pages/lonja-murcia.html',
        descripcion: 'La Lonja de Murcia cubre una de las zonas con mayor producción de almendra de España, siendo referencia clave para el sureste peninsular.'
    },
    reus: {
        nombre: 'Reus',
        nombreCompleto: 'Lonja de Reus',
        region: 'Cataluña (Tarragona)',
        color: '#E65100',
        url: 'pages/lonja-reus.html',
        descripcion: 'La Lonja de Reus es la referencia histórica del mercado de frutos secos en España, con una tradición que se remonta a siglos de comercio en Tarragona.'
    },
    cordoba: {
        nombre: 'Córdoba',
        nombreCompleto: 'Lonja de Córdoba',
        region: 'Andalucía',
        color: '#7B1FA2',
        url: 'pages/lonja-cordoba.html',
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
        meses: ["Mar 25","Abr 25","May 25","Jun 25","Jul 25","Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
        comuna:   [5.20, 5.15, 5.10, 5.05, 5.25, 5.80, 6.10, 5.90, 5.75, 5.60, 5.50, 5.55],
        marcona: [7.00, 6.90, 6.85, 6.80, 7.10, 7.60, 7.90, 7.70, 7.50, 7.35, 7.20, 7.30],
        largueta: [5.80, 5.75, 5.70, 5.65, 5.85, 6.40, 6.70, 6.50, 6.30, 6.15, 6.05, 6.10],
        guara:    [5.40, 5.35, 5.30, 5.25, 5.45, 6.00, 6.30, 6.10, 5.95, 5.80, 5.70, 5.75]
    },
    murcia: {
        meses: ["Mar 25","Abr 25","May 25","Jun 25","Jul 25","Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
        comuna:   [4.78, 5.01, 5.32, 5.42, 4.99, 4.92, 5.14, 5.08, 5.65, 5.50, 5.06, 5.45],
        marcona: [5.70, 5.80, 6.23, 6.31, 5.90, 5.86, 6.02, 6.04, 7.40, 7.25, 6.09, 7.20],
        largueta: [5.20, 5.26, 5.67, 5.75, 5.31, 5.29, 5.49, 5.49, 6.20, 6.05, 5.57, 6.00],
        guara:    [4.98, 5.05, 5.46, 5.56, 5.13, 5.06, 5.25, 5.20, 5.85, 5.70, 5.16, 5.65]
    },
    reus: {
        meses: ["Mar 25","Abr 25","May 25","Jun 25","Jul 25","Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
        comuna:   [4.40, 5.25, 4.90, 5.00, 5.35, 4.65, 4.70, 6.00, 4.70, 5.70, 4.70, 4.65],
        marcona: [5.25, 7.00, 5.15, 5.80, 7.20, 5.70, 5.75, 7.80, 5.75, 7.45, 5.75, 5.70],
        largueta: [4.70, 5.85, 5.15, 5.30, 5.95, 5.15, 5.25, 6.60, 5.30, 6.25, 5.30, 5.25],
        guara:    [4.65, 5.45, 5.75, 5.30, 5.55, 4.90, 4.95, 6.20, 5.00, 5.90, 4.95, 4.90]
    },
    cordoba: {
        meses: ["Mar 25","Abr 25","May 25","Jun 25","Jul 25","Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
        comuna:   [5.05, 5.00, 5.30, 5.30, 5.10, 5.00, 5.25, 5.10, 5.60, 5.45, 5.15, 5.40],
        marcona: [6.80, 6.70, null, null, 6.90, null, null, null, 7.30, 7.15, null, 7.10],
        largueta: [5.65, 5.60, null, null, 5.70, null, null, null, 6.15, 6.00, null, 5.95],
        guara:    [5.25, 5.20, null, null, 5.30, 5.45, 5.46, 5.30, 5.80, 5.65, 5.35, 5.60]
    }
};

/**
 * Intenta cargar datos reales desde data/precios.json.
 * Si falla, usa los datos de fallback embebidos.
 */
async function loadPriceData() {
    // Determinar ruta relativa según si estamos en root o en pages/
    const isSubpage = window.location.pathname.includes('/pages/');
    const jsonPath = isSubpage ? '../data/precios.json' : 'data/precios.json';

    try {
        const response = await fetch(jsonPath);
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

/**
 * Transforma el formato de precios.json al formato PRECIO_HISTORICO del frontend
 */
function transformJsonToHistorico(data) {
    const result = {};
    const lonjas = ['albacete', 'murcia', 'reus', 'cordoba'];
    const variedades = ['comuna', 'marcona', 'largueta', 'guara'];

    for (const lonja of lonjas) {
        const lonjaData = data.lonjas?.[lonja];
        if (!lonjaData?.cotizaciones?.length) continue;

        // Agrupar por mes (último dato de cada mes)
        const porMes = {};
        for (const cot of lonjaData.cotizaciones) {
            const mesKey = cot.fecha.substring(0, 7);
            if (!porMes[mesKey] || cot.fecha > porMes[mesKey].fecha) {
                porMes[mesKey] = cot;
            }
        }

        const mesesOrdenados = Object.keys(porMes).sort().slice(-12);

        result[lonja] = {
            meses: mesesOrdenados.map(m => {
                const [year, month] = m.split('-');
                return `${MESES_MAP[month]} ${year.slice(2)}`;
            })
        };

        for (const v of variedades) {
            result[lonja][v] = mesesOrdenados.map(m =>
                porMes[m]?.precios?.[v] ?? null
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
    if (!datos || datos.length < 2) return null;
    const actual = datos[datos.length - 1];
    const anterior = datos[datos.length - 2];
    if (actual === null || anterior === null) return null;
    const cambio = actual - anterior;
    const cambioPct = ((cambio / anterior) * 100).toFixed(1);
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
    return '20 de febrero de 2026'; // fallback date // fallback date // fallback date // fallback date
}
