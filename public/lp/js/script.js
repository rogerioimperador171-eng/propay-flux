document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 [INIT] DOM carregado, inicializando aplicação...');

    const phoneInput       = document.getElementById('phoneInput');
    const startScanBtn     = document.getElementById('startScanBtn');
    const scanModal        = document.getElementById('scanModal');
    const displayPhone     = document.getElementById('displayPhone');
    const progressFill     = document.getElementById('progressFill');
    const progressPercent  = document.getElementById('progressPercent');
    // (gifContainer e completionGif removidos — substituidos pelo scanMapContainer/Leaflet)

    // ========= Helpers =========
    const normalizeDigits = (v) => String(v || '').replace(/\D/g, '');
    const ensureBR = (digits) => digits.startsWith('55') ? digits : ('55' + digits);

    // ========= Máscara/formatador visual do input =========
    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            if (value.length <= 2) {
                value = value.replace(/(\d{0,2})/, '($1');
            } else if (value.length <= 7) {
                value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
            }
        }
        e.target.value = value;
    });

    // ========= Clique no botão: valida, mostra modal, inicia varredura =========
    // A foto é buscada depois, na no-img/vsl — aqui o scan é só teatro.
    startScanBtn.addEventListener('click', function (e) {
        e.preventDefault?.();

        if (startScanBtn.disabled) return;

        const typed = phoneInput.value.trim();
        const digits = normalizeDigits(typed);

        if (!digits || digits.length < 10) {
            alert('Por favor, digite um número de telefone válido com DDD!');
            return;
        }

        startScanBtn.disabled = true;

        const brDigits = ensureBR(digits);
        localStorage.setItem('profilePhone', brDigits);
        // DDD do número digitado — usado pelas páginas /esposa e /marido
        // para exibir o mesmo DDD (+55 XX 9XXXX-....) do lead.
        try {
            const local = digits.replace(/^55/, '').replace(/^0+/, '');
            if (local.length >= 2) localStorage.setItem('ddd', local.slice(0, 2));
        } catch (_) {}
        // Reseta flags da sessão anterior — o fetch só roda 1x por sessão na no-img/vsl.
        localStorage.removeItem('spyzap:photoReady');
        localStorage.removeItem('spyzap:fetchDone');
        localStorage.removeItem('spyzap:photoDataUrl');
        localStorage.removeItem('profileImage');

        scanModal.style.display = 'flex';
        scanModal.style.alignItems = 'center';
        scanModal.style.justifyContent = 'center';
        displayPhone.textContent = typed;

        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        const mapContainerReset = document.getElementById('scanMapContainer');
        if (mapContainerReset) mapContainerReset.style.display = 'none';

        startProgressBar();
    });

    // ========= Barra de progresso =========
    function startProgressBar() {
        const duration = 3000;
        const interval = 30;
        const steps = duration / interval;
        let currentStep = 0;

        const progressInterval = setInterval(function () {
            currentStep++;
            const percentage = Math.min(100, Math.round((currentStep / steps) * 100));

            progressFill.style.width = percentage + '%';
            progressPercent.textContent = percentage + '%';

            if (percentage >= 100) {
                clearInterval(progressInterval);
                showCompletionGif();
            }
        }, interval);
    }

    // ========= Mapeamento DDD → Estado e coordenadas =========
    const DDD_TO_STATE = {
        11:'SP', 12:'SP', 13:'SP', 14:'SP', 15:'SP', 16:'SP', 17:'SP', 18:'SP', 19:'SP',
        21:'RJ', 22:'RJ', 24:'RJ',
        27:'ES', 28:'ES',
        31:'MG', 32:'MG', 33:'MG', 34:'MG', 35:'MG', 37:'MG', 38:'MG',
        41:'PR', 42:'PR', 43:'PR', 44:'PR', 45:'PR', 46:'PR',
        47:'SC', 48:'SC', 49:'SC',
        51:'RS', 53:'RS', 54:'RS', 55:'RS',
        61:'DF', 62:'GO', 64:'GO', 63:'TO',
        65:'MT', 66:'MT', 67:'MS',
        68:'AC', 69:'RO',
        71:'BA', 73:'BA', 74:'BA', 75:'BA', 77:'BA',
        79:'SE',
        81:'PE', 87:'PE',
        82:'AL', 83:'PB', 84:'RN',
        85:'CE', 88:'CE',
        86:'PI', 89:'PI',
        91:'PA', 93:'PA', 94:'PA',
        92:'AM', 97:'AM',
        95:'RR', 96:'AP',
        98:'MA', 99:'MA'
    };

    const STATES = {
        AC: { name: 'Acre',                lat: -8.77,  lng: -70.55, zoom: 6 },
        AL: { name: 'Alagoas',             lat: -9.62,  lng: -36.66, zoom: 7 },
        AP: { name: 'Amapá',               lat: 1.41,   lng: -51.77, zoom: 6 },
        AM: { name: 'Amazonas',            lat: -3.42,  lng: -65.96, zoom: 5 },
        BA: { name: 'Bahia',               lat: -12.96, lng: -41.71, zoom: 5 },
        CE: { name: 'Ceará',               lat: -5.20,  lng: -39.53, zoom: 6 },
        DF: { name: 'Distrito Federal',    lat: -15.83, lng: -47.86, zoom: 8 },
        ES: { name: 'Espírito Santo',      lat: -19.19, lng: -40.34, zoom: 7 },
        GO: { name: 'Goiás',               lat: -15.83, lng: -49.24, zoom: 6 },
        MA: { name: 'Maranhão',            lat: -5.42,  lng: -45.44, zoom: 6 },
        MT: { name: 'Mato Grosso',         lat: -12.64, lng: -55.42, zoom: 5 },
        MS: { name: 'Mato Grosso do Sul',  lat: -20.51, lng: -54.54, zoom: 6 },
        MG: { name: 'Minas Gerais',        lat: -18.10, lng: -44.38, zoom: 6 },
        PA: { name: 'Pará',                lat: -3.79,  lng: -52.48, zoom: 5 },
        PB: { name: 'Paraíba',             lat: -7.28,  lng: -36.72, zoom: 7 },
        PR: { name: 'Paraná',              lat: -24.89, lng: -51.55, zoom: 6 },
        PE: { name: 'Pernambuco',          lat: -8.38,  lng: -37.86, zoom: 7 },
        PI: { name: 'Piauí',               lat: -7.72,  lng: -42.73, zoom: 6 },
        RJ: { name: 'Rio de Janeiro',      lat: -22.25, lng: -42.66, zoom: 7 },
        RN: { name: 'Rio Grande do Norte', lat: -5.81,  lng: -36.59, zoom: 7 },
        RS: { name: 'Rio Grande do Sul',   lat: -30.17, lng: -53.50, zoom: 6 },
        RO: { name: 'Rondônia',            lat: -10.83, lng: -63.34, zoom: 6 },
        RR: { name: 'Roraima',             lat: 1.99,   lng: -61.33, zoom: 6 },
        SC: { name: 'Santa Catarina',      lat: -27.45, lng: -50.95, zoom: 6 },
        SP: { name: 'São Paulo',           lat: -22.19, lng: -48.79, zoom: 6 },
        SE: { name: 'Sergipe',             lat: -10.57, lng: -37.45, zoom: 8 },
        TO: { name: 'Tocantins',           lat: -10.17, lng: -48.33, zoom: 6 }
    };

    function getStateFromInput() {
        // Primeiro tenta extrair DDD do input atual; fallback pra localStorage
        let ddd = null;
        try {
            const digits = (phoneInput.value || '').replace(/\D/g, '').replace(/^55/, '').replace(/^0+/, '');
            if (digits.length >= 2) ddd = parseInt(digits.slice(0, 2), 10);
        } catch (_) {}
        if (!ddd) {
            const stored = parseInt(localStorage.getItem('ddd'), 10);
            if (Number.isFinite(stored)) ddd = stored;
        }
        const code = DDD_TO_STATE[ddd] || 'SP';
        return STATES[code];
    }

    // ========= Mapa de localização (substitui o GIF) =========
    function showCompletionGif() {
        document.querySelector('.progress-container').style.display = 'none';
        document.querySelector('.phone-display').style.display = 'none';
        document.querySelector('.modal-header').style.display = 'none';
        // Esconde os aneis do loader (ficam ate a barra terminar)
        const photoContainer = document.querySelector('.photo-container');
        if (photoContainer) photoContainer.style.display = 'none';

        const mapContainer = document.getElementById('scanMapContainer');

        // Fallback: se Leaflet ou container não disponível, redireciona em 3s sem animação
        if (!mapContainer || typeof L === 'undefined') {
            setTimeout(redirectToNextPage, 3000);
            return;
        }

        mapContainer.style.display = 'block';

        const state = getStateFromInput();

        // Inicia em vista do globo (zoom 2, centro do Brasil)
        const map = L.map('scanMap', {
            center: [-14.235, -51.9253],
            zoom: 2,
            zoomControl: false,
            attributionControl: false,
            scrollWheelZoom: false,
            dragging: false,
            touchZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
        }).addTo(map);

        // Garante que o Leaflet recalcula dimensoes do container apos display:block
        requestAnimationFrame(function () { map.invalidateSize(); });

        // Zoom mais aberto: -1 nível em relação ao state.zoom, mínimo 5 (estado inteiro)
        const finalZoom = Math.max(state.zoom - 1, 5);

        // Animação de zoom em ~2.4s, ajusta texto, deixa marker, redireciona aos 3s
        setTimeout(function () {
            map.invalidateSize();
            map.flyTo([state.lat, state.lng], finalZoom, {
                duration: 2.4,
                easeLinearity: 0.5
            });

            // Após o zoom completar, adiciona círculo radar GRANDE cobrindo a região
            setTimeout(function () {
                const radarCircle = L.circle([state.lat, state.lng], {
                    radius: 280000, // 280km — cobre estado inteiro
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.18,
                    weight: 2,
                    dashArray: '8,6'
                }).addTo(map);

                // Aplica classe CSS no SVG pra animação de pulso
                try {
                    const el = radarCircle.getElement();
                    if (el) el.classList.add('radar-circle-anim');
                } catch (e) { /* noop */ }
            }, 2400);
        }, 100);

        setTimeout(redirectToNextPage, 3000);
    }

    function getUTMParams() {
        const params = new URLSearchParams(window.location.search);
        const utms = {};
        const keep = new Set([
             'gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid',
            'sck', 'xcod', 'subid', 'aff_sub', 'aff_sub2',
            'campaign_id', 'adset_id', 'ad_id', 'src'
        ]);
        for (const [key, value] of params.entries()) {
            if (key.startsWith("utm_") || keep.has(key.toLowerCase())) utms[key] = value;
        }
        return utms;
    }
    function buildUTMQuery(utms) {
        const q = new URLSearchParams(utms);
        return q.toString() ? `?${q.toString()}` : "";
    }

    // Todos vão pra no-img/vsl. A foto é buscada lá dentro (photo-fetch.js) e,
    // quando vier 200, a flag spyzap:photoReady faz o botão reroutear pra /img/
    // na próxima etapa.
    function redirectToNextPage() {
        const utms = getUTMParams();
        const utmQuery = buildUTMQuery(utms);
        sessionStorage.setItem('ALLOW_EXIT', 'true');
        window.location.href = '/vsl/index.html' + utmQuery;
    }

    // ========= UX extra =========
    window.addEventListener('click', function (event) {
        if (event.target === scanModal) {
            scanModal.style.display = 'none';
        }
    });
    phoneInput.addEventListener('keypress', function (e) {
        const char = String.fromCharCode(e.which);
        if (!/[0-9]/.test(char) && e.which !== 8 && e.which !== 0) {
            e.preventDefault();
        }
    });

    function playBeepSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (_) {}
    }
    startScanBtn.addEventListener('click', playBeepSound);
// ========= Data dinâmica "Ferramenta Atualizada" (sempre 7 dias antes de hoje) =========
    (function setupDynamicUpdateDate() {
        const subtitle = document.querySelector('.info-subtitle');
        if (!subtitle) return;
        try {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            const formatter = new Intl.DateTimeFormat('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            const formatted = formatter.format(d);
            const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
            subtitle.textContent = `Ferramenta Atualizada: ${capitalized}`;
        } catch (_) {}
    })();

    // ========= Help Toast (aparece após 30s se lead ainda não iniciou varredura) =========
    (function setupHelpToast() {
        const toast = document.getElementById('helpToast');
        if (!toast) return;

        const okBtn = document.getElementById('helpToastOk');

        const helpTimer = setTimeout(function () {
            if (!startScanBtn.disabled) toast.hidden = false;
        }, 30000);

        function dismissToast() {
            clearTimeout(helpTimer);
            toast.hidden = true;
        }

        function focusPhoneInput() {
            if (!phoneInput) return;
            phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Aguarda fim do scroll pra dar focus (evita conflito visual em mobile)
            setTimeout(function () { phoneInput.focus(); }, 350);
        }

        if (okBtn) {
            okBtn.addEventListener('click', function () {
                dismissToast();
                focusPhoneInput();
            });
        }

        // Se lead clicou em iniciar varredura, esconde toast (não aparece mais)
        startScanBtn.addEventListener('click', dismissToast);
    })();
});
