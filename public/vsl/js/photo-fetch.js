/**
 * photo-fetch.js — busca "longa" da foto do perfil na no-img/vsl.
 *
 * Contrato:
 *   - 1 request HTTP por sessão (flag spyzap:fetchDone).
 *   - Timeout de 55s no AbortController (alinhado ao budget do backend).
 *   - Sucesso: seta spyzap:photoReady='1', injeta a foto no #vsl-photo-block.
 *   - Falha/404/timeout: esconde o bloco silenciosamente.
 *   - Reload com photoReady='1' → injeta a foto direto via proxy URL
 *     (browser cache cobre até 5min; depois disso re-fetch via proxy).
 *   - Botões/âncoras com [data-next-step] são reroteados se a flag estiver
 *     setada no momento do clique.
 */
(function () {
    'use strict';

    const API_BASE =
        (typeof window !== 'undefined' && window.SPYZAP_API_BASE) ||
        'https://backend-spy-zap.vercel.app';

    const FETCH_TIMEOUT_MS = 55000;

    function proxyUrl(phone) {
        return `${API_BASE}/api/fetch_img?phone=${encodeURIComponent(phone)}`;
    }

    function $(id) {
        return document.getElementById(id);
    }

    function showPhotoFromUrl(url) {
        const block = $('vsl-photo-block');
        if (!block) return;
        const img = block.querySelector('.photo-image');
        if (!img) return;
        img.src = url;
        img.onload = () => {
            block.classList.remove('loading');
            block.classList.add('loaded');
        };
        img.onerror = () => {
            hideBlock();
        };
    }

    function hideBlock() {
        const block = $('vsl-photo-block');
        if (!block) return;
        block.classList.add('hidden');
    }

    function markPhotoReady() {
        try {
            localStorage.setItem('spyzap:photoReady', '1');
        } catch (_) {}
    }

    function markFetchDone() {
        try {
            localStorage.setItem('spyzap:fetchDone', '1');
        } catch (_) {}
    }

    function rotateStatusText() {
        const statusEl = document.querySelector('#vsl-photo-block .photo-status');
        if (!statusEl) return;
        const phases = [
            { at: 15000, text: 'Processando foto do perfil...' },
            { at: 35000, text: 'Finalizando análise de imagem...' },
        ];
        phases.forEach(({ at, text }) => {
            setTimeout(() => {
                const block = $('vsl-photo-block');
                if (block && block.classList.contains('loading')) {
                    statusEl.textContent = text;
                }
            }, at);
        });
    }

    async function fetchPhoto(phone) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

        try {
            const response = await fetch(proxyUrl(phone), {
                signal: ctrl.signal,
                credentials: 'omit',
            });

            if (!response.ok) {
                hideBlock();
                return;
            }

            const blob = await response.blob();
            const objUrl = URL.createObjectURL(blob);
            showPhotoFromUrl(objUrl);
            markPhotoReady();

            // Persiste a imagem como data URL base64 no localStorage.
            // Isso permite que páginas pós-VSL (marido, esposa, whats-web)
            // exibam a foto SEM nova chamada ao backend — mesmo se o vendor
            // estiver fora do ar ou o cache HTTP do navegador expirou.
            try {
                const reader = new FileReader();
                reader.onloadend = () => {
                    try {
                        if (typeof reader.result === 'string') {
                            localStorage.setItem(
                                'spyzap:photoDataUrl',
                                reader.result
                            );
                            // Compat com scripts inline antigos que leem profileImage.
                            localStorage.setItem('profileImage', reader.result);
                        }
                    } catch (_) {
                        // localStorage quota exceeded — segue sem persistir.
                    }
                };
                reader.readAsDataURL(blob);
            } catch (_) {}

            try {
                window.dispatchEvent(new CustomEvent('spyzap:photo-ready'));
            } catch (_) {}
        } catch (_) {
            hideBlock();
        } finally {
            clearTimeout(timer);
        }
    }

    function wireNextStepElements() {
        const nodes = document.querySelectorAll('[data-next-step]');
        nodes.forEach((el) => {
            el.addEventListener('click', function (event) {
                const photoReady =
                    localStorage.getItem('spyzap:photoReady') === '1';
                const imgHref = el.getAttribute('data-img-href');
                const defaultHref = el.getAttribute('data-default-href');
                const target = photoReady && imgHref ? imgHref : defaultHref;
                if (!target) return;
                // Para <a>, queremos controlar a navegação mesmo com href default,
                // pra garantir consistência com <button>.
                event.preventDefault();
                window.location.href = target;
            });
            // Ajusta href default em anchors pra acessibilidade / middle-click.
            if (el.tagName === 'A' && el.getAttribute('data-default-href')) {
                el.setAttribute('href', el.getAttribute('data-default-href'));
            }
        });
    }

    function init() {
        wireNextStepElements();

        const phone = localStorage.getItem('profilePhone');
        const block = $('vsl-photo-block');

        if (!phone || !block) {
            hideBlock();
            return;
        }

        const photoReady = localStorage.getItem('spyzap:photoReady') === '1';
        const fetchDone = localStorage.getItem('spyzap:fetchDone') === '1';

        if (photoReady) {
            showPhotoFromUrl(proxyUrl(phone));
            return;
        }

        if (fetchDone) {
            hideBlock();
            return;
        }

        // Sessão nova sem tentativa prévia — trava pra não repetir em reload
        // e dispara a única busca longa.
        markFetchDone();
        rotateStatusText();
        fetchPhoto(phone);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
