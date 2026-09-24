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

    // Cidade-polo de cada DDD — o mapa aproxima na região real do número
    const DDD_TO_CITY = {
        11:['São Paulo',-23.55,-46.63], 12:['São José dos Campos',-23.18,-45.88], 13:['Santos',-23.96,-46.33],
        14:['Bauru',-22.31,-49.06], 15:['Sorocaba',-23.50,-47.45], 16:['Ribeirão Preto',-21.18,-47.81],
        17:['São José do Rio Preto',-20.81,-49.38], 18:['Presidente Prudente',-22.12,-51.39], 19:['Campinas',-22.91,-47.06],
        21:['Rio de Janeiro',-22.91,-43.17], 22:['Campos dos Goytacazes',-21.75,-41.32], 24:['Volta Redonda',-22.52,-44.10],
        27:['Vitória',-20.32,-40.34], 28:['Cachoeiro de Itapemirim',-20.85,-41.11],
        31:['Belo Horizonte',-19.92,-43.94], 32:['Juiz de Fora',-21.76,-43.35], 33:['Governador Valadares',-18.85,-41.95],
        34:['Uberlândia',-18.92,-48.28], 35:['Poços de Caldas',-21.79,-46.56], 37:['Divinópolis',-20.14,-44.88],
        38:['Montes Claros',-16.73,-43.86],
        41:['Curitiba',-25.43,-49.27], 42:['Ponta Grossa',-25.09,-50.16], 43:['Londrina',-23.31,-51.16],
        44:['Maringá',-23.42,-51.94], 45:['Cascavel',-24.96,-53.46], 46:['Francisco Beltrão',-26.08,-53.05],
        47:['Joinville',-26.30,-48.85], 48:['Florianópolis',-27.60,-48.55], 49:['Chapecó',-27.10,-52.62],
        51:['Porto Alegre',-30.03,-51.23], 53:['Pelotas',-31.77,-52.34], 54:['Caxias do Sul',-29.17,-51.18],
        55:['Santa Maria',-29.69,-53.81],
        61:['Brasília',-15.79,-47.88], 62:['Goiânia',-16.69,-49.26], 63:['Palmas',-10.18,-48.33],
        64:['Rio Verde',-17.79,-50.92], 65:['Cuiabá',-15.60,-56.10], 66:['Rondonópolis',-16.47,-54.64],
        67:['Campo Grande',-20.47,-54.62], 68:['Rio Branco',-9.97,-67.81], 69:['Porto Velho',-8.76,-63.90],
        71:['Salvador',-12.97,-38.50], 73:['Ilhéus',-14.79,-39.05], 74:['Juazeiro',-9.41,-40.50],
        75:['Feira de Santana',-12.27,-38.97], 77:['Vitória da Conquista',-14.86,-40.84], 79:['Aracaju',-10.91,-37.07],
        81:['Recife',-8.05,-34.88], 82:['Maceió',-9.67,-35.74], 83:['João Pessoa',-7.12,-34.86],
        84:['Natal',-5.79,-35.21], 85:['Fortaleza',-3.73,-38.53], 86:['Teresina',-5.09,-42.80],
        87:['Petrolina',-9.39,-40.50], 88:['Juazeiro do Norte',-7.21,-39.32], 89:['Picos',-7.08,-41.47],
        91:['Belém',-1.46,-48.49], 92:['Manaus',-3.12,-60.02], 93:['Santarém',-2.44,-54.71],
        94:['Marabá',-5.37,-49.12], 95:['Boa Vista',2.82,-60.67], 96:['Macapá',0.03,-51.07],
        97:['Tefé',-3.35,-64.71], 98:['São Luís',-2.53,-44.30], 99:['Imperatriz',-5.52,-47.47]
    };

    function getStateFromInput() {
        // Primeiro tenta extrair DDD do input atual; fallback pra localStorage
        let ddd = null;
        try {
            const digits = (phoneInput.value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').replace(/^0+/, '');
            if (digits.length >= 2) ddd = parseInt(digits.slice(0, 2), 10);
        } catch (_) {}
        if (!DDD_TO_STATE[ddd]) {
            const stored = parseInt(localStorage.getItem('ddd'), 10);
            if (Number.isFinite(stored)) ddd = stored;
        }
        const code = DDD_TO_STATE[ddd] || 'SP';
        const city = DDD_TO_CITY[ddd];
        if (city) {
            return { name: city[0] + ' - ' + code, lat: city[1], lng: city[2], zoom: 10 };
        }
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

        // Tiles escuros da Esri: não exigem API key (os da CARTO passaram a
        // exibir "API KEY REQUIRED" por cima do mapa).
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 16
        }).addTo(map);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 16
        }).addTo(map);

        // Garante que o Leaflet recalcula dimensoes do container apos display:block
        requestAnimationFrame(function () { map.invalidateSize(); });

        // Zoom na cidade-polo do DDD (ou no estado, se o DDD for desconhecido)
        const finalZoom = state.zoom;

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
                    radius: finalZoom >= 10 ? 12000 : 280000, // ~12km na cidade, 280km no estado
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

                L.marker([state.lat, state.lng], {
                    icon: L.divIcon({ className: 'scan-map-label', html: '<span>📍 ' + state.name + '</span>', iconSize: null })
                }).addTo(map);
            }, 2500);
        }, 100);

        // Deixa a região localizada visível por ~2s antes de seguir
        setTimeout(redirectToNextPage, 4800);
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
