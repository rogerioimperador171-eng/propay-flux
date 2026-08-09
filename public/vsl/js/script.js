/**
 * ============================================================================
 *  VSL EXPERIENCE CONTROLLER
 *  Código modular e configurável para controle da experiência VSL
 * ============================================================================
 *
 *  ARQUITETURA:
 *  ┌─────────────────────────────────────────────────────┐
 *  │  VSL_CONFIG  (configuração centralizada)            │
 *  ├─────────────────────────────────────────────────────┤
 *  │  progressController  → barra de progresso           │
 *  │  toastController     → notificações toast           │
 *  │  ctaController       → botão de ação + scroll       │
 *  │  cardController      → cards de resultado           │
 *  │  timelineEngine      → orquestrador de eventos      │
 *  └─────────────────────────────────────────────────────┘
 *
 *  COMO ALTERAR TEMPOS:
 *  Basta editar o objeto VSL_CONFIG no topo do arquivo.
 *  Todos os tempos são em SEGUNDOS. Porcentagens são de 0 a 100.
 *
 *  BOTÃO CTA:
 *  Aparece quando a barra chega a 100%.
 *  O tempo total da barra = soma dos segmentos.
 *  Tudo controlado aqui, sem dependência do Vturb.
 *
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURAÇÃO CENTRALIZADA
// ============================================================================

const VSL_CONFIG = {

    // --- DELAY INICIAL ---
    // Segundos de espera antes da barra começar (carregamento da página)
    delayInicial: 3,

    // --- BARRA DE PROGRESSO ---
    progresso: {
        // Seletor do container da barra
        seletor: '.progress.neon',

        // Segmentos da barra: cada trecho define uma faixa de % e quanto tempo leva
        // IMPORTANTE: "duracaoSegundos" é o tempo REAL que aquele trecho demora
        //
        // Exemplo atual:
        //   0% → 60%  em 30 segundos  (barra rápida no início)
        //   60% → 100% em 330 segundos (barra lenta no final)
        //   Total: 360 segundos (6 minutos)
        //
        // Para mudar, basta alterar os valores abaixo:
        segmentos: [
            { de: 0,  ate: 60,  duracaoSegundos: 45  },
            { de: 60, ate: 100, duracaoSegundos: 487 }
        ],

        // Mensagens de status que aparecem abaixo da barra
        mensagensStatus: [
            {
                de: 0, ate: 30,
                mensagens: [
                    { texto: 'Iniciando análise...', icone: '🔍', tipo: 'processing' },
                    { texto: 'Conectando ao servidor...', icone: '🌐', tipo: 'processing' }
                ]
            },
            {
                de: 30, ate: 60,
                mensagens: [
                    { texto: 'Analisando pacotes de dados...', icone: '📦', tipo: 'processing' },
                    { texto: 'Verificando registros de chamadas...', icone: '📞', tipo: 'processing' }
                ]
            },
            {
                de: 60, ate: 75,
                mensagens: [
                    { texto: 'Cruzando referências de contatos...', icone: '👥', tipo: 'processing' },
                    { texto: '⚠️ Detectada atividade suspeita.', icone: '⚠️', tipo: 'warning' }
                ]
            },
            {
                de: 75, ate: 90,
                mensagens: [
                    { texto: 'Analisando arquivos de mídia...', icone: '🖼️', tipo: 'processing' },
                    { texto: 'Buscando por imagens ocultas...', icone: '🔍', tipo: 'processing' }
                ]
            },
            {
                de: 90, ate: 100,
                mensagens: [
                    { texto: 'Finalizando varredura profunda...', icone: '🔬', tipo: 'processing' },
                    { texto: 'Compilando relatório final...', icone: '📋', tipo: 'success' },
                    { texto: '✅ Análise concluída!', icone: '✅', tipo: 'success' }
                ]
            }
        ],

        // Intervalo mínimo (ms) entre trocas de mensagem de status
        intervaloMensagemMs: 2000
    },

    // --- TIMELINE DE EVENTOS ---
    // Eventos disparados por porcentagem da barra
    // Tipos: 'toast', 'card', 'custom'
    timeline: [
        // 70% — Toast de mensagens suspeitas + revelar card de mensagens
        {
            gatilho: 70,
            tipo: 'toast',
            config: { tipo: 'error', icone: '💬', titulo: 'Mensagens Suspeitas', mensagem: 'Análise inicial indica padrões suspeitos.' }
        },
        {
            gatilho: 70,
            tipo: 'card',
            config: { seletor: '#card-msg' }
        },

        // 85% — Toast de fotos + revelar card de imagens
        {
            gatilho: 85,
            tipo: 'toast',
            config: { tipo: 'warning', icone: '🖼️', titulo: 'Fotos', mensagem: 'Detecção de imagens potencialmente comprometedoras.' }
        },
        {
            gatilho: 85,
            tipo: 'card',
            config: { seletor: '#card-img' }
        },

        // 90% — Toast de imagens ocultas + revelar card de localização
        {
            gatilho: 90,
            tipo: 'toast',
            config: { tipo: 'error', icone: '📸', titulo: 'Imagens', mensagem: 'Arquivos de imagem ocultos foram encontrados.' }
        },
        {
            gatilho: 90,
            tipo: 'card',
            config: { seletor: '#card-loc' }
        }
    ],

    // --- TOASTS ---
    toasts: {
        // Duração de exibição dos toasts de etapa (ms)
        duracaoEtapaMs: 3000,
        // Duração da animação de saída (ms)
        animacaoSaidaMs: 500,

        // Toast de alerta final (aparece após a barra completar)
        alertaFinal: {
            delayAposCompletoMs: 1000,
            titulo: 'ATENÇÃO: Atividade suspeita!',
            subtitulo: 'Verificação imediata necessária',
            cor: 'red',
            icone: '🚨',
            textoBotao: 'Verificar',
            autoFecharMs: 6000
        }
    },

    // --- BOTÃO CTA ---
    // Aparece quando a barra chega a 100%. Tudo manual, sem Vturb.
    cta: {
        // Seletor do container do botão
        seletor: '.btn-under-vsl',
        // URL de destino ao clicar
        urlDestino: '/verificacao/index.html',
        // Scroll automático até o botão quando ele aparecer
        scrollAutomatico: true,
        // Comportamento do scroll ('smooth' ou 'auto')
        scrollBehavior: 'smooth',
        // Offset em pixels para ajustar a posição do scroll
        // 0 = exatamente no botão, positivo = rola mais para baixo
        scrollOffset: 0
    },

    // --- NÚMEROS ALEATÓRIOS DOS RELATÓRIOS ---
    relatorios: {
        mensagens:    { min: 35, max: 99 },
        imagens:      { min: 15, max: 25 },
        localizacoes: { min: 1,  max: 2  }
    }
};


// ============================================================================
// 2. UTILITÁRIOS
// ============================================================================

const Utils = {
    /**
     * Gera um inteiro aleatório entre min e max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * Seleciona um elemento do DOM com tratamento de erro
     */
    $(seletor) {
        const el = document.querySelector(seletor);
        if (!el) console.warn(`[VSL] Elemento não encontrado: ${seletor}`);
        return el;
    },

    /**
     * Seleciona múltiplos elementos do DOM
     */
    $$(seletor) {
        return document.querySelectorAll(seletor);
    }
};


// ============================================================================
// 3. PROGRESS CONTROLLER — Barra de Progresso
// ============================================================================

const progressController = (() => {
    // Estado interno
    let _progresso = 0;
    let _animationId = null;
    let _lastTime = 0;
    let _onProgressCallbacks = [];
    let _onCompleteCallbacks = [];

    // Elementos do DOM (cacheados)
    let _root = null;
    let _bar = null;
    let _texts = [];
    let _statusText = null;
    let _statusIcon = null;
    let _statusContainer = null;

    // Estado das mensagens de status
    let _intervaloAtual = null;
    let _indiceMensagem = 0;
    let _ultimaTrocaMensagem = 0;

    /**
     * Calcula a taxa de progresso (% por ms) para cada segmento
     * baseado na duração em segundos definida na config.
     *
     * Se você diz "de 0% a 60% em 30 segundos", a taxa é
     * exatamente (60 / 30000) % por ms = previsível e direto.
     */
    function _calcularTaxas() {
        return VSL_CONFIG.progresso.segmentos.map(seg => ({
            de: seg.de,
            ate: seg.ate,
            taxaPorMs: (seg.ate - seg.de) / (seg.duracaoSegundos * 1000)
        }));
    }

    /**
     * Inicializa os elementos do DOM
     */
    function _initDOM() {
        _root = Utils.$(VSL_CONFIG.progresso.seletor);
        if (!_root) return false;

        _bar = _root.querySelector('.progress-bar');
        _texts = _root.querySelectorAll('.progress-text');
        _statusText = document.getElementById('statusText');
        _statusIcon = document.getElementById('statusIcon');
        _statusContainer = Utils.$('.progress-status');

        if (!_bar) {
            console.error('[VSL] Elemento .progress-bar não encontrado');
            return false;
        }

        _atualizarVisual(0);
        return true;
    }

    /**
     * Atualiza os elementos visuais da barra
     */
    function _atualizarVisual(pct) {
        const pctInt = Math.floor(pct);
        const pctStr = pctInt + '%';

        _bar.style.width = pctStr;
        _texts.forEach(t => { t.textContent = pctStr; });
        _root.dataset.width = pctStr;
    }

    /**
     * Atualiza a mensagem de status abaixo da barra
     */
    function _atualizarMensagemStatus(progresso, agora) {
        const config = VSL_CONFIG.progresso;
        const intervalo = config.mensagensStatus.find(
            m => progresso >= m.de && progresso < m.ate
        );

        if (intervalo && intervalo !== _intervaloAtual) {
            _intervaloAtual = intervalo;
            _indiceMensagem = 0;
            _ultimaTrocaMensagem = agora;
        }

        if (intervalo && (agora - _ultimaTrocaMensagem > config.intervaloMensagemMs)) {
            const msg = intervalo.mensagens[_indiceMensagem % intervalo.mensagens.length];

            if (_statusText) {
                _statusText.classList.add('changing');
                setTimeout(() => _statusText.classList.remove('changing'), 500);
                _statusText.textContent = msg.texto;
            }
            if (_statusIcon) _statusIcon.textContent = msg.icone;
            if (_statusContainer) _statusContainer.className = 'progress-status ' + msg.tipo;

            _indiceMensagem++;
            _ultimaTrocaMensagem = agora;
        }
    }

    /**
     * Loop principal de animação (requestAnimationFrame)
     */
    function _tick(agora) {
        const delta = agora - _lastTime;
        _lastTime = agora;

        const taxas = _calcularTaxas();
        const segAtual = taxas.find(s => _progresso >= s.de && _progresso < s.ate);

        if (segAtual) {
            _progresso += delta * segAtual.taxaPorMs;
        }

        _progresso = Math.max(0, Math.min(100, _progresso));

        _atualizarVisual(_progresso);
        _atualizarMensagemStatus(_progresso, agora);

        _onProgressCallbacks.forEach(cb => cb(_progresso));

        if (_progresso < 100) {
            _animationId = requestAnimationFrame(_tick);
        } else {
            _atualizarVisual(100);
            _onCompleteCallbacks.forEach(cb => cb());
        }
    }

    return {
        iniciar() {
            if (!_initDOM()) return;
            _progresso = 0;
            _lastTime = performance.now();
            _animationId = requestAnimationFrame(_tick);
        },

        parar() {
            if (_animationId) {
                cancelAnimationFrame(_animationId);
                _animationId = null;
            }
        },

        resetar() {
            this.parar();
            _progresso = 0;
            if (_root) _atualizarVisual(0);
        },

        onProgress(callback) {
            _onProgressCallbacks.push(callback);
        },

        onComplete(callback) {
            _onCompleteCallbacks.push(callback);
        },

        getProgresso() {
            return _progresso;
        },

        getTempoTotalSegundos() {
            return VSL_CONFIG.progresso.segmentos.reduce(
                (total, seg) => total + seg.duracaoSegundos, 0
            );
        }
    };
})();


// ============================================================================
// 4. TOAST CONTROLLER — Notificações
// ============================================================================

const toastController = (() => {
    let _toastFinalElement = null;
    let _autoCloseTimer = null;

    /**
     * Mostra um toast de etapa (canto superior direito)
     */
    function mostrarToastEtapa(tipo, icone, titulo, mensagem) {
        const container = document.getElementById('stageToastContainer');
        if (!container) {
            console.warn('[VSL] #stageToastContainer não encontrado');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `stage-toast ${tipo}`;
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-icon">${icone}</span>
                <div class="toast-title">${titulo}</div>
            </div>
            <div class="toast-message">${mensagem}</div>
        `;

        container.appendChild(toast);

        const cfg = VSL_CONFIG.toasts;
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, cfg.animacaoSaidaMs);
        }, cfg.duracaoEtapaMs);
    }

    /**
     * Mostra o toast de alerta final (bottom-center)
     */
    function mostrarAlertaFinal() {
        esconderAlertaFinal();

        const cfg = VSL_CONFIG.toasts.alertaFinal;

        _toastFinalElement = document.createElement('div');
        _toastFinalElement.className = `toast-notification ${cfg.cor}`;
        _toastFinalElement.id = 'toastNotification';
        _toastFinalElement.innerHTML = `
            <button class="toast-close" onclick="toastController.esconderAlertaFinal()">&times;</button>
            <span class="toast-icon">${cfg.icone}</span>
            <div class="toast-content">
                <div class="toast-title">${cfg.titulo}</div>
                <div class="toast-subtitle">${cfg.subtitulo}</div>
            </div>
            <button class="toast-button" onclick="toastController.acaoBotaoToast()">${cfg.textoBotao}</button>
        `;

        document.body.appendChild(_toastFinalElement);

        setTimeout(() => {
            if (_toastFinalElement) {
                _toastFinalElement.style.animation = 'slideUp 0.5s ease-out, pulse 2s ease-in-out infinite 1s';
            }
        }, 10);

        if (cfg.autoFecharMs > 0) {
            _autoCloseTimer = setTimeout(() => esconderAlertaFinal(), cfg.autoFecharMs);
        }
    }

    /**
     * Esconde o toast de alerta final
     */
    function esconderAlertaFinal() {
        if (_toastFinalElement) {
            _toastFinalElement.classList.add('hiding');
            setTimeout(() => {
                if (_toastFinalElement && _toastFinalElement.parentNode) {
                    _toastFinalElement.parentNode.removeChild(_toastFinalElement);
                }
                _toastFinalElement = null;
            }, 300);
        }
        if (_autoCloseTimer) {
            clearTimeout(_autoCloseTimer);
            _autoCloseTimer = null;
        }
    }

    /**
     * Ação do botão dentro do toast final
     */
    function acaoBotaoToast() {
        _tentarSom();
        _tentarVibracao();
        // Se o photo-fetch.js já confirmou foto disponível, reroteia pra versão /img/.
        let photoReady = false;
        try {
            photoReady = localStorage.getItem('spyzap:photoReady') === '1';
        } catch (_) {}
        const destino = photoReady
            ? '/verificacao/index.html'
            : VSL_CONFIG.cta.urlDestino;
        window.location.href = destino;
        setTimeout(() => esconderAlertaFinal(), 500);
    }

    function _tentarSom() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.log('[VSL] Som não disponível:', e);
        }
    }

    function _tentarVibracao() {
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
    }

    return {
        mostrarToastEtapa,
        mostrarAlertaFinal,
        esconderAlertaFinal,
        acaoBotaoToast
    };
})();


// ============================================================================
// 5. CARD CONTROLLER — Cards de Resultado
// ============================================================================

const cardController = (() => {
    function revelarCard(seletor) {
        const card = document.querySelector(seletor);
        if (!card) return;

        const titulo = card.querySelector('.card-title');
        const descricao = card.querySelector('.card-description');
        const resultado = card.querySelector('.card-result');

        if (titulo) titulo.style.display = 'none';
        if (descricao) descricao.style.display = 'none';
        if (resultado) resultado.style.display = 'flex';
    }

    function preencherNumeros() {
        const cfg = VSL_CONFIG.relatorios;

        const numeros = {
            mensagens:    Utils.randomInt(cfg.mensagens.min, cfg.mensagens.max),
            imagens:      Utils.randomInt(cfg.imagens.min, cfg.imagens.max),
            localizacoes: Utils.randomInt(cfg.localizacoes.min, cfg.localizacoes.max)
        };

        const elMsg = document.getElementById('num-mensagens');
        const elImg = document.getElementById('num-imagens');
        const elLoc = document.getElementById('num-localizacoes');

        if (elMsg) elMsg.textContent = numeros.mensagens;
        if (elImg) elImg.textContent = numeros.imagens;
        if (elLoc) elLoc.textContent = numeros.localizacoes;

        try{localStorage.setItem('vsl_numeros',JSON.stringify(numeros));}catch(e){}

        return numeros;
    }

    return { revelarCard, preencherNumeros };
})();


// ============================================================================
// 6. CTA CONTROLLER — Botão de Ação + Scroll Automático
// ============================================================================

const ctaController = (() => {
    /**
     * Mostra o botão CTA e faz scroll automático até ele
     */
    function mostrar() {
        const btn = Utils.$(VSL_CONFIG.cta.seletor);
        if (!btn) return;

        btn.style.display = 'block';

        // Scroll automático até o botão
        if (VSL_CONFIG.cta.scrollAutomatico) {
            _scrollParaBotao(btn);
        }
    }

    /**
     * Esconde o botão CTA
     */
    function esconder() {
        const btn = Utils.$(VSL_CONFIG.cta.seletor);
        if (btn) btn.style.display = 'none';
    }

    /**
     * Faz scroll suave até o botão CTA
     * Usa a mesma lógica da classe smartplayer-scroll-event do Vturb,
     * mas controlado manualmente pelo nosso JS.
     */
    function _scrollParaBotao(elemento) {
        const cfg = VSL_CONFIG.cta;

        // Pequeno delay para garantir que o display:block já foi aplicado
        setTimeout(() => {
            const rect = elemento.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetY = scrollTop + rect.top - (window.innerHeight / 2) + (rect.height / 2) + cfg.scrollOffset;

            window.scrollTo({
                top: targetY,
                behavior: cfg.scrollBehavior
            });
        }, 100);
    }

    return { mostrar, esconder };
})();


// ============================================================================
// 7. TIMELINE ENGINE — Orquestrador de Eventos
// ============================================================================

const timelineEngine = (() => {
    let _disparados = new Set();

    function processar(progresso) {
        VSL_CONFIG.timeline.forEach((evento, index) => {
            if (_disparados.has(index)) return;

            if (progresso >= evento.gatilho) {
                _disparados.add(index);
                _executarEvento(evento);
            }
        });
    }

    function _executarEvento(evento) {
        switch (evento.tipo) {
            case 'toast':
                toastController.mostrarToastEtapa(
                    evento.config.tipo,
                    evento.config.icone,
                    evento.config.titulo,
                    evento.config.mensagem
                );
                break;

            case 'card':
                cardController.revelarCard(evento.config.seletor);
                break;

            case 'custom':
                if (typeof evento.config.fn === 'function') {
                    evento.config.fn();
                }
                break;

            default:
                console.warn('[VSL] Tipo de evento desconhecido:', evento.tipo);
        }
    }

    function resetar() {
        _disparados.clear();
    }

    return { processar, resetar };
})();


// ============================================================================
// 8. INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {

    // --- Preencher números aleatórios nos cards ---
    cardController.preencherNumeros();

    // --- Esconder CTA inicialmente ---
    ctaController.esconder();

    // --- Conectar timeline ao progresso ---
    progressController.onProgress(function (progresso) {
        timelineEngine.processar(progresso);
    });

    // --- Ao completar a barra (100%) ---
    progressController.onComplete(function () {
        // Mostrar botão CTA + scroll automático
        ctaController.mostrar();

        // Mostrar toast de alerta final após delay configurado
        setTimeout(function () {
            toastController.mostrarAlertaFinal();
        }, VSL_CONFIG.toasts.alertaFinal.delayAposCompletoMs);
    });

    // --- Iniciar barra com delay inicial (3s para carregamento) ---
    setTimeout(function () {
        progressController.iniciar();
    }, VSL_CONFIG.delayInicial * 1000);

    console.log('[VSL] Experiência inicializada. Tempo total da barra:',
        progressController.getTempoTotalSegundos() + 's');
});


// ============================================================================
// 9. COMPATIBILIDADE GLOBAL
// ============================================================================

// Expor para uso em onclick do HTML
window.toastController = toastController;

// Função de compatibilidade para o onclick do toast no HTML existente
function fecharToast() {
    toastController.esconderAlertaFinal();
}

function mostrarToastPreset(preset) {
    if (preset === 'alertaUrgente') {
        toastController.mostrarAlertaFinal();
    }
}

function mostrarToastPersonalizado(titulo, subtitulo, cor, textoBotao) {
    toastController.mostrarAlertaFinal();
}
