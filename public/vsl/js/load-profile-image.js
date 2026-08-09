/**
 * Carrega a foto do perfil nas páginas pós-VSL (marido, esposa, whats-web, etc).
 *
 * Fonte de verdade:
 *   - localStorage.profilePhone          → telefone normalizado (BR, com 55)
 *   - localStorage['spyzap:photoReady']  → '1' se o fetch longo na no-img/vsl já
 *                                           confirmou que o vendor tem foto.
 *
 * Se ambos existirem, construímos a URL do proxy backend e colocamos nos
 * elementos conhecidos de perfil. Sem flag photoReady, nada é feito — o HTML
 * mostra o placeholder estático original.
 */

(function () {
    'use strict';

    const API_BASE =
        (typeof window !== 'undefined' && window.SPYZAP_API_BASE) ||
        'https://backend-spy-zap.vercel.app';

    function buildProxyUrl(phone) {
        return `${API_BASE}/api/fetch_img?phone=${encodeURIComponent(phone)}`;
    }

    function resolveProfileImageUrl() {
        const phone = localStorage.getItem('profilePhone');
        if (!phone) return null;

        const photoReady =
            localStorage.getItem('spyzap:photoReady') === '1';

        if (!photoReady) {
            // Fallback legado: antes salvávamos a URL em profileImage.
            const legacy = localStorage.getItem('profileImage');
            if (legacy && (legacy.startsWith(API_BASE) || legacy.startsWith('data:'))) {
                return legacy;
            }
            return null;
        }

        // Caminho preferido: data URL cacheado em localStorage pelo photo-fetch.js.
        // Zero chamada ao backend, funciona offline, imune ao vendor cair.
        const dataUrl = localStorage.getItem('spyzap:photoDataUrl');
        if (dataUrl && dataUrl.startsWith('data:')) return dataUrl;

        // Segunda preferência: o profileImage legado (pode ser data URL também).
        const legacy = localStorage.getItem('profileImage');
        if (legacy && legacy.startsWith('data:')) return legacy;

        // Última saída: proxy URL. Bate em browser cache se < 5min; senão
        // dispara request pro backend. Só chega aqui se o data URL foi perdido.
        return buildProxyUrl(phone);
    }

    function applySrcTo(el, url) {
        if (!el) return false;
        el.referrerPolicy = 'no-referrer';
        if (el.tagName === 'IMG') {
            el.src = url;
            return true;
        }
        const img = el.querySelector('img');
        if (img) {
            img.referrerPolicy = 'no-referrer';
            img.src = url;
            return true;
        }
        return false;
    }

    function applyToAll(url) {
        const idTargets = [
            'profile-pic',
            'profileImage',
            'userPhoto',
            'targetPhoto',
            'placeholderPhoto',
        ];
        const classTargets = [
            '.profile-image',
            '.user-photo',
            '.target-photo',
            '.profile-pic',
        ];

        let hits = 0;

        idTargets.forEach((id) => {
            if (applySrcTo(document.getElementById(id), url)) hits++;
        });
        classTargets.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => {
                if (applySrcTo(el, url)) hits++;
            });
        });

        return hits;
    }

    function applyPhoneText() {
        const phone = localStorage.getItem('profilePhone');
        if (!phone) return;
        document
            .querySelectorAll('[data-phone], .phone-number, #phone-display')
            .forEach((el) => {
                el.textContent = phone;
            });
    }

    function run() {
        const url = resolveProfileImageUrl();
        applyPhoneText();

        if (!url) {
            // Foto não confirmada ainda — deixa o HTML mostrar o placeholder original.
            return;
        }

        const hits = applyToAll(url);
        if (hits === 0) {
            // Elementos podem vir de forma assíncrona; tenta de novo em 1s.
            setTimeout(() => applyToAll(url), 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

    // APIs globais pra debug / reuso manual.
    window.reloadProfileImage = run;
    window.hasProfileImage = function () {
        return !!resolveProfileImageUrl();
    };
    window.getProfileData = function () {
        return {
            image: resolveProfileImageUrl(),
            phone: localStorage.getItem('profilePhone'),
        };
    };
})();
