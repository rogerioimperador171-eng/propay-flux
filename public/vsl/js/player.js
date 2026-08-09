/*
 * Player da VSL — sem pular / sem adiantar.
 * Apenas som (toque para ativar) e botão de tela cheia.
 */
(function () {
  "use strict";

  var video = document.getElementById("ezVideo");
  var unmute = document.getElementById("ezUnmute");
  var fill = document.getElementById("ezFill");
  var fsBtn = document.getElementById("ezFs");
  var wrap = document.getElementById("ezPlayer");
  if (!video) return;

  /* ---------- autoplay mudo (política dos navegadores) ---------- */
  function tryPlay() {
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }
  tryPlay();
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && video.paused && !video.ended) tryPlay();
  });

  /* ---------- ativar som ---------- */
  function enableSound() {
    video.muted = false;
    video.volume = 1;
    tryPlay();
    if (unmute) unmute.classList.add("is-hidden");
  }
  if (unmute) unmute.addEventListener("click", enableSound);
  video.addEventListener("click", function () {
    if (video.muted) enableSound();
  });

  /* ---------- bloqueio de avanço (anti-seek) ---------- */
  var maxTime = 0;
  var correcting = false;

  video.addEventListener("timeupdate", function () {
    if (correcting) return;
    if (video.currentTime > maxTime) maxTime = video.currentTime;
    if (fill && video.duration) {
      fill.style.width = ((video.currentTime / video.duration) * 100).toFixed(2) + "%";
    }
  });

  video.addEventListener("seeking", function () {
    if (correcting) return;
    // tolerância de 0,6s para o buffer normal do navegador
    if (video.currentTime > maxTime + 0.6) {
      correcting = true;
      video.currentTime = maxTime;
      tryPlay();
      setTimeout(function () {
        correcting = false;
      }, 250);
    }
  });

  video.addEventListener("ratechange", function () {
    if (video.playbackRate !== 1) video.playbackRate = 1;
  });
  video.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });
  // teclado: setas / espaço não avançam o vídeo
  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (
      k === "ArrowRight" ||
      k === "ArrowLeft" ||
      k === "ArrowUp" ||
      k === "ArrowDown" ||
      k === " " ||
      k === "MediaTrackNext" ||
      k === "MediaTrackPrevious"
    ) {
      if (e.target === video || wrap.contains(e.target)) e.preventDefault();
    }
  });

  /* ---------- tela cheia ---------- */
  if (fsBtn) {
    fsBtn.addEventListener("click", function () {
      var el = wrap;
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); // iOS
    });
  }
})();
