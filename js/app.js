/* ============================================
   APP.JS - PrecioAlmendra
   Lógica principal: dashboard, charts, calculadora
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initMobileMenu();

    // Cargar datos reales (desde JSON) antes de inicializar componentes
    await loadPriceData();

    // Solo ejecutar en páginas que tengan estos elementos
    if (document.getElementById('priceCards')) initDashboard();
    if (document.getElementById('comparadorChart')) initComparadorChart();
    if (document.getElementById('varietyTableBody')) initVarietyTable();
    if (document.getElementById('calcHectareas')) initCalculadora();
    if (document.getElementById('trendCards')) initTrends();
    if (document.getElementById('alertForm')) initAlertForm();
    if (document.getElementById('lastUpdate')) {
        document.getElementById('lastUpdate').textContent = 'Última actualización: ' + getLastUpdate();
    }

    // Lonja page
    if (document.getElementById('lonjaChart')) initLonjaChart();
    if (document.getElementById('lonjaHistoryBody')) initLonjaHistory();
    if (document.getElementById('lonjaVarietyCards')) initLonjaVarietyCards();

    // Calculadora page
    if (document.getElementById('calcFullForm')) initCalculadoraFull();
});

/* ============================================
   THEME
   ============================================ */
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
}

/* ============================================
   MOBILE MENU
   ============================================ */
function initMobileMenu() {
    const btn = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
        nav.classList.toggle('header__nav--open');
    });
}

/* ============================================
   DASHBOARD - PRICE CARDS
   ============================================ */
function initDashboard() {
    const grid = document.getElementById('priceCards');
    const lonjas = Object.keys(LONJAS);

    for (const key of lonjas) {
        const lonja = LONJAS[key];
        const media = getMediaLonja(key);
        const cambio = getCambioMedioLonja(key);
        const isUp = parseFloat(cambio) > 0;
        const isDown = parseFloat(cambio) < 0;
        const arrow = isUp ? '&#9650;' : isDown ? '&#9660;' : '&#9644;';
        const badgeClass = isUp ? 'up' : isDown ? 'down' : 'neutral';

        const comunaPrice = getPrecioActual(key, 'Comuna');

        const card = document.createElement('a');
        card.href = lonja.url;
        card.className = 'price-card';
        card.innerHTML = `
            <div class="price-card__header">
                <span class="price-card__lonja">${lonja.nombre}</span>
                <span class="price-card__badge price-card__badge--${badgeClass}">
                    ${arrow} ${cambio > 0 ? '+' : ''}${cambio}%
                </span>
            </div>
            <div class="price-card__price">${media} &euro;</div>
            <div class="price-card__unit">Media &euro;/kg pepita</div>
            <div class="price-card__variety">
                Comuna: ${comunaPrice ? comunaPrice.actual.toFixed(2) : '--'} &euro; &middot;
                Marcona: ${getPrecioActual(key, 'Marcona')?.actual.toFixed(2) || '--'} &euro;
            </div>
            <div class="price-card__mini-chart">
                <canvas id="mini-${key}"></canvas>
            </div>
        `;
        grid.appendChild(card);

        // Mini sparkline chart
        setTimeout(() => renderMiniChart(key), 50);
    }
}

function renderMiniChart(lonjaKey) {
    const canvas = document.getElementById(`mini-${lonjaKey}`);
    if (!canvas) return;
    const data = PRECIO_HISTORICO[lonjaKey].comuna;
    const color = LONJAS[lonjaKey].color;

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: PRECIO_HISTORICO[lonjaKey].meses,
            datasets: [{
                data: data,
                borderColor: color,
                borderWidth: 2,
                fill: true,
                backgroundColor: hexToRgba(color, 0.1),
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            interaction: { enabled: false }
        }
    });
}

/* ============================================
   COMPARADOR CHART
   ============================================ */
let comparadorChartInstance = null;

function initComparadorChart() {
    renderComparadorChart('3m');

    document.querySelectorAll('.chip[data-range]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-range]').forEach(b => b.classList.remove('chip--active'));
            btn.classList.add('chip--active');
            renderComparadorChart(btn.dataset.range);
        });
    });
}

function renderComparadorChart(range) {
    const canvas = document.getElementById('comparadorChart');
    if (!canvas) return;

    if (comparadorChartInstance) comparadorChartInstance.destroy();

    let sliceCount;
    switch (range) {
        case '3m': sliceCount = 3; break;
        case '6m': sliceCount = 6; break;
        case '1y': sliceCount = 12; break;
        default: sliceCount = 12;
    }

    const labels = PRECIO_HISTORICO.albacete.meses.slice(-sliceCount);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const datasets = Object.keys(LONJAS).map(key => ({
        label: LONJAS[key].nombre,
        data: PRECIO_HISTORICO[key].comuna.slice(-sliceCount),
        borderColor: LONJAS[key].color,
        backgroundColor: hexToRgba(LONJAS[key].color, 0.08),
        borderWidth: 2.5,
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: LONJAS[key].color
    }));

    comparadorChartInstance = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        color: isDark ? '#9AA5B4' : '#5A6275'
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1E2433' : '#fff',
                    titleColor: isDark ? '#E8ECF1' : '#1A1A2E',
                    bodyColor: isDark ? '#9AA5B4' : '#5A6275',
                    borderColor: isDark ? '#2A3040' : '#E0E4E8',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} €/kg`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: isDark ? '#2A3040' : '#F0F0F0' },
                    ticks: { color: isDark ? '#6B7585' : '#8E95A5' }
                },
                y: {
                    grid: { color: isDark ? '#2A3040' : '#F0F0F0' },
                    ticks: {
                        color: isDark ? '#6B7585' : '#8E95A5',
                        callback: v => v.toFixed(2) + ' €'
                    }
                }
            }
        }
    });
}

/* ============================================
   VARIETY TABLE
   ============================================ */
function initVarietyTable() {
    const tbody = document.getElementById('varietyTableBody');
    const lonjas = Object.keys(LONJAS);

    for (const variedad of VARIEDADES) {
        const tr = document.createElement('tr');
        let precios = [];

        let html = `<td class="td-variety">${variedad}</td>`;

        for (const l of lonjas) {
            const p = getPrecioActual(l, variedad);
            if (p) {
                precios.push(p);
                const cls = p.cambio > 0 ? 'td-up' : p.cambio < 0 ? 'td-down' : '';
                html += `<td class="td-price ${cls}">${p.actual.toFixed(2)} &euro;</td>`;
            } else {
                html += `<td>--</td>`;
            }
        }

        // Media
        const media = precios.reduce((s, p) => s + p.actual, 0) / precios.length;
        html += `<td class="td-price">${media.toFixed(2)} &euro;</td>`;

        // Tendencia
        const avgCambio = precios.reduce((s, p) => s + parseFloat(p.cambioPct), 0) / precios.length;
        const trendIcon = avgCambio > 0 ? '&#9650;' : avgCambio < 0 ? '&#9660;' : '&#9644;';
        const trendClass = avgCambio > 0 ? 'text-up' : avgCambio < 0 ? 'text-down' : '';
        html += `<td class="${trendClass}">${trendIcon} ${avgCambio > 0 ? '+' : ''}${avgCambio.toFixed(1)}%</td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    }
}

/* ============================================
   QUICK CALCULATOR
   ============================================ */
function initCalculadora() {
    const inputs = ['calcHectareas', 'calcRendimiento', 'calcVariedad', 'calcLonja'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateCalc);
        if (el) el.addEventListener('change', updateCalc);
    });
    updateCalc();
}

function updateCalc() {
    const ha = parseFloat(document.getElementById('calcHectareas')?.value) || 0;
    const rend = parseFloat(document.getElementById('calcRendimiento')?.value) || 0;
    const variedad = document.getElementById('calcVariedad')?.value || 'comuna';
    const lonja = document.getElementById('calcLonja')?.value || 'albacete';

    const precio = getPrecioActual(lonja, variedad);
    if (!precio) return;

    const kgTotales = ha * rend;
    const ingresos = kgTotales * precio.actual;

    const elIngresos = document.getElementById('calcIngresos');
    const elDetail = document.getElementById('calcDetail');

    if (elIngresos) elIngresos.textContent = formatCurrency(ingresos);
    if (elDetail) elDetail.textContent = `${kgTotales.toLocaleString('es-ES')} kg x ${precio.actual.toFixed(2)} €/kg`;
}

/* ============================================
   TRENDS
   ============================================ */
function initTrends() {
    const container = document.getElementById('trendCards');
    const comunaAlba = getPrecioActual('albacete', 'Comuna');
    const marconaAlba = getPrecioActual('albacete', 'Marcona');

    // Calcular tendencia general del último trimestre
    const datos3m = PRECIO_HISTORICO.albacete.comuna.slice(-3);
    const tendencia3m = datos3m[2] - datos3m[0];
    const tendencia3mPct = ((tendencia3m / datos3m[0]) * 100).toFixed(1);

    const trends = [
        {
            icon: tendencia3m >= 0 ? 'up' : 'down',
            emoji: tendencia3m >= 0 ? '&#128200;' : '&#128201;',
            title: tendencia3m >= 0 ? 'Tendencia alcista' : 'Tendencia bajista',
            text: `En los últimos 3 meses, el precio medio de la almendra comuna ha ${tendencia3m >= 0 ? 'subido' : 'bajado'} un ${Math.abs(tendencia3mPct)}% en la lonja de Albacete.`
        },
        {
            icon: 'info',
            emoji: '&#127758;',
            title: 'Mercado internacional',
            text: 'La producción californiana y la demanda asiática siguen siendo los principales factores que influyen en la cotización de la almendra española.'
        },
        {
            icon: 'info',
            emoji: '&#127793;',
            title: 'Campaña 2025/2026',
            text: `La Marcona cotiza a ${marconaAlba?.actual.toFixed(2)} €/kg en Albacete, manteniendo el diferencial premium sobre la Comuna (${comunaAlba?.actual.toFixed(2)} €/kg).`
        }
    ];

    for (const t of trends) {
        const card = document.createElement('div');
        card.className = 'trend-card';
        card.innerHTML = `
            <div class="trend-card__icon trend-card__icon--${t.icon}">${t.emoji}</div>
            <h3 class="trend-card__title">${t.title}</h3>
            <p class="trend-card__text">${t.text}</p>
        `;
        container.appendChild(card);
    }
}

/* ============================================
   ALERT FORM
   ============================================ */
function initAlertForm() {
    document.getElementById('alertForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input[type="email"]');
        const btn = e.target.querySelector('button');
        const email = input.value.trim();
        if (!email) return;

        btn.disabled = true;
        btn.textContent = 'Enviando...';

        try {
            const formData = new FormData();
            formData.append('email', email);
            await fetch('https://script.google.com/macros/s/AKfycbwzSojaVtFRsyC_mFKlCUg5mjAZCqZP3k24P5dl71dbtyqcKLkGAahl1O202YhbVE_8iQ/exec', {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });
            e.target.innerHTML = '<p style="font-size:1.1rem;font-weight:600;">&#10003; ¡Registrado! Te avisaremos de cambios importantes.</p>';
        } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Activar alertas';
            input.value = email;
        }
    });
}

/* ============================================
   LONJA PAGE - CHART
   ============================================ */
function initLonjaChart() {
    const canvas = document.getElementById('lonjaChart');
    const lonjaKey = canvas.dataset.lonja;
    if (!lonjaKey || !PRECIO_HISTORICO[lonjaKey]) return;

    const data = PRECIO_HISTORICO[lonjaKey];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const colores = {
        comuna: '#2E7D32',
        marcona: '#E65100',
        largueta: '#1565C0',
        guara: '#7B1FA2'
    };

    const datasets = VARIEDADES.map(v => {
        const key = v.toLowerCase();
        return {
            label: v,
            data: data[key],
            borderColor: colores[key],
            backgroundColor: hexToRgba(colores[key], 0.05),
            borderWidth: 2.5,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: colores[key]
        };
    });

    new Chart(canvas, {
        type: 'line',
        data: { labels: data.meses, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 20, color: isDark ? '#9AA5B4' : '#5A6275' }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1E2433' : '#fff',
                    titleColor: isDark ? '#E8ECF1' : '#1A1A2E',
                    bodyColor: isDark ? '#9AA5B4' : '#5A6275',
                    borderColor: isDark ? '#2A3040' : '#E0E4E8',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} €/kg` }
                }
            },
            scales: {
                x: { grid: { color: isDark ? '#2A3040' : '#F0F0F0' }, ticks: { color: isDark ? '#6B7585' : '#8E95A5' } },
                y: {
                    grid: { color: isDark ? '#2A3040' : '#F0F0F0' },
                    ticks: { color: isDark ? '#6B7585' : '#8E95A5', callback: v => v.toFixed(2) + ' €' }
                }
            }
        }
    });
}

/* ============================================
   LONJA PAGE - HISTORY TABLE
   ============================================ */
function initLonjaHistory() {
    const tbody = document.getElementById('lonjaHistoryBody');
    const lonjaKey = tbody.dataset.lonja;
    if (!lonjaKey) return;

    const data = PRECIO_HISTORICO[lonjaKey];
    // Mostrar en orden inverso (más reciente primero)
    for (let i = data.meses.length - 1; i >= 0; i--) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${data.meses[i]}</td>
            <td class="td-price">${data.comuna[i].toFixed(2)} &euro;</td>
            <td class="td-price">${data.marcona[i].toFixed(2)} &euro;</td>
            <td class="td-price">${data.largueta[i].toFixed(2)} &euro;</td>
            <td class="td-price">${data.guara[i].toFixed(2)} &euro;</td>
        `;
        tbody.appendChild(tr);
    }
}

/* ============================================
   LONJA PAGE - VARIETY CARDS
   ============================================ */
function initLonjaVarietyCards() {
    const container = document.getElementById('lonjaVarietyCards');
    const lonjaKey = container.dataset.lonja;
    if (!lonjaKey) return;

    for (const v of VARIEDADES) {
        const p = getPrecioActual(lonjaKey, v);
        if (!p) continue;
        const isUp = p.cambio > 0;
        const isDown = p.cambio < 0;
        const arrow = isUp ? '&#9650;' : isDown ? '&#9660;' : '&#9644;';
        const badgeClass = isUp ? 'up' : isDown ? 'down' : 'neutral';

        const card = document.createElement('div');
        card.className = 'price-card';
        card.innerHTML = `
            <div class="price-card__header">
                <span class="price-card__lonja">${v}</span>
                <span class="price-card__badge price-card__badge--${badgeClass}">
                    ${arrow} ${p.cambioPct > 0 ? '+' : ''}${p.cambioPct}%
                </span>
            </div>
            <div class="price-card__price">${p.actual.toFixed(2)} &euro;</div>
            <div class="price-card__unit">&euro;/kg pepita</div>
            <div class="price-card__variety">
                Anterior: ${p.anterior.toFixed(2)} &euro; &middot;
                Cambio: ${p.cambio > 0 ? '+' : ''}${p.cambio.toFixed(2)} &euro;
            </div>
        `;
        container.appendChild(card);
    }
}

/* ============================================
   FULL CALCULATOR PAGE
   ============================================ */
function initCalculadoraFull() {
    const form = document.getElementById('calcFullForm');
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(el => {
        el.addEventListener('input', updateCalcFull);
        el.addEventListener('change', updateCalcFull);
    });
    updateCalcFull();
}

function updateCalcFull() {
    const ha = parseFloat(document.getElementById('fullHectareas')?.value) || 0;
    const rend = parseFloat(document.getElementById('fullRendimiento')?.value) || 0;
    const variedad = document.getElementById('fullVariedad')?.value || 'comuna';
    const lonja = document.getElementById('fullLonja')?.value || 'albacete';
    const costes = parseFloat(document.getElementById('fullCostes')?.value) || 0;

    const precio = getPrecioActual(lonja, variedad);
    if (!precio) return;

    const kgTotales = ha * rend;
    const ingresosBrutos = kgTotales * precio.actual;
    const costesTotales = ha * costes;
    const beneficio = ingresosBrutos - costesTotales;
    const margen = ingresosBrutos > 0 ? ((beneficio / ingresosBrutos) * 100).toFixed(1) : 0;

    setResultValue('resKg', kgTotales.toLocaleString('es-ES') + ' kg');
    setResultValue('resIngresos', formatCurrency(ingresosBrutos));
    setResultValue('resCostes', formatCurrency(costesTotales));
    setResultValue('resBeneficio', formatCurrency(beneficio));
    setResultValue('resMargen', margen + '%');
    setResultValue('resPrecioKg', precio.actual.toFixed(2) + ' €/kg');
}

function setResultValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/* ============================================
   UTILITIES
   ============================================ */
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function formatCurrency(value) {
    return value.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}
