/**
 * BUILD SCRIPT - PrecioAlmendra
 *
 * Lee data/precios.json y genera un data.js con los datos
 * pre-renderizados (embebidos directamente en el JS).
 * Esto es CRÍTICO para SEO: Google indexa el contenido
 * sin necesidad de ejecutar fetch() asíncrono.
 *
 * Uso:
 *   node build.js
 *
 * Se ejecuta automáticamente tras el scraper en el workflow de GitHub Actions.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRECIOS_FILE = join(__dirname, '..', 'data', 'precios.json');
const DATA_JS_FILE = join(__dirname, '..', 'js', 'data.js');

const MESES_MAP = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
    '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
};

function transformJsonToHistorico(data) {
    const result = {};
    const lonjas = ['albacete', 'murcia', 'reus', 'cordoba'];
    const variedades = ['comuna', 'marcona', 'largueta', 'guara'];

    for (const lonja of lonjas) {
        const lonjaData = data.lonjas?.[lonja];
        if (!lonjaData?.cotizaciones?.length) continue;

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

function formatDate(isoString) {
    const d = new Date(isoString);
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

function main() {
    console.log('BUILD: Generando data.js con datos pre-renderizados...\n');

    if (!existsSync(PRECIOS_FILE)) {
        console.log('No se encontró data/precios.json. Nada que hacer.');
        return;
    }

    const preciosJson = JSON.parse(readFileSync(PRECIOS_FILE, 'utf-8'));
    const historico = transformJsonToHistorico(preciosJson);

    if (Object.keys(historico).length === 0) {
        console.log('No se pudieron transformar los datos. data.js no modificado.');
        return;
    }

    const lastUpdate = preciosJson.lastUpdate || new Date().toISOString();
    const lastUpdateFormatted = formatDate(lastUpdate);

    // Leer data.js actual
    const currentJS = readFileSync(DATA_JS_FILE, 'utf-8');

    // Reemplazar FALLBACK_DATA con los datos reales
    const fallbackRegex = /const FALLBACK_DATA = \{[\s\S]*?\n\};/;
    if (!fallbackRegex.test(currentJS)) {
        console.log('ERROR: No se encontró FALLBACK_DATA en data.js');
        return;
    }

    // Generar el bloque de datos formateado
    const dataBlock = generateDataBlock(historico);

    let newJS = currentJS.replace(fallbackRegex, `const FALLBACK_DATA = ${dataBlock};`);

    // También actualizar la fecha de fallback
    const dateRegex = /return '.*?';(\s*\/\/ fallback date)?/;
    newJS = newJS.replace(
        /return '\d+ de \w+ de \d+';/,
        `return '${lastUpdateFormatted}'; // fallback date`
    );

    writeFileSync(DATA_JS_FILE, newJS, 'utf-8');

    console.log('data.js actualizado con datos reales:');
    for (const [lonja, data] of Object.entries(historico)) {
        const lastMonth = data.meses[data.meses.length - 1];
        const comunaPrice = data.comuna[data.comuna.length - 1];
        console.log(`  ${lonja}: ${lastMonth} - Comuna: ${comunaPrice} €/kg`);
    }
    console.log(`\nÚltima actualización: ${lastUpdateFormatted}`);
    console.log('BUILD completado.');
}

function generateDataBlock(historico) {
    const lines = ['{'];

    const lonjas = Object.keys(historico);
    lonjas.forEach((lonja, lonjaIdx) => {
        const data = historico[lonja];
        lines.push(`    ${lonja}: {`);
        lines.push(`        meses: ${JSON.stringify(data.meses)},`);

        const variedades = ['comuna', 'marcona', 'largueta', 'guara'];
        variedades.forEach((v, vIdx) => {
            const values = data[v].map(val => val === null ? 'null' : val.toFixed(2)).join(', ');
            const comma = vIdx < variedades.length - 1 ? ',' : '';
            const padding = v === 'comuna' ? '  ' : v === 'guara' ? '   ' : '';
            lines.push(`        ${v}:${padding} [${values}]${comma}`);
        });

        const comma = lonjaIdx < lonjas.length - 1 ? ',' : '';
        lines.push(`    }${comma}`);
    });

    lines.push('}');
    return lines.join('\n');
}

main();
