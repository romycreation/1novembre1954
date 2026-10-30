(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector(".site-header");
  const soundButton = document.querySelector(".sound-toggle");
  const soundLabel = document.querySelector(".sound-label");

  // Header and restrained parallax
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 48);
    if (reducedMotion) return;
    const y = window.scrollY;
    document.documentElement.style.setProperty("--scroll", `${y}px`);
    document.querySelectorAll(".mini-flag").forEach((flag, index) => {
      const speed = (index + 1) * 0.025;
      flag.style.translate = `0 ${y * speed}px`;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reveal narrative elements as they enter the frame
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.transitionDelay = `${(index % 3) * 90}ms`;
    revealObserver.observe(element);
  });

  // Soft light follows the visitor without becoming a custom cursor
  if (!reducedMotion && matchMedia("(pointer: fine)").matches) {
    const glow = document.querySelector(".cursor-glow");
    let pointerX = innerWidth / 2;
    let pointerY = innerHeight / 2;
    let currentX = pointerX;
    let currentY = pointerY;
    window.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    }, { passive: true });
    const moveGlow = () => {
      currentX += (pointerX - currentX) * 0.055;
      currentY += (pointerY - currentY) * 0.055;
      glow.style.setProperty("--x", `${currentX}px`);
      glow.style.setProperty("--y", `${currentY}px`);
      requestAnimationFrame(moveGlow);
    };
    moveGlow();
  }

  // Golden dust, deliberately sparse and efficient
  const canvas = document.querySelector("#particles");
  const context = canvas.getContext("2d");
  let particles = [];
  let animationFrame = null;

  const resizeCanvas = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * ratio);
    canvas.height = Math.floor(innerHeight * ratio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(52, Math.max(22, Math.floor(innerWidth / 26)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      size: Math.random() * 1.2 + 0.2,
      speed: Math.random() * 0.12 + 0.025,
      drift: (Math.random() - 0.5) * 0.08,
      alpha: Math.random() * 0.4 + 0.08,
      phase: Math.random() * Math.PI * 2
    }));
  };

  const drawParticles = (time = 0) => {
    context.clearRect(0, 0, innerWidth, innerHeight);
    particles.forEach((particle) => {
      particle.y -= particle.speed;
      particle.x += particle.drift;
      if (particle.y < -3) particle.y = innerHeight + 3;
      if (particle.x < -3) particle.x = innerWidth + 3;
      if (particle.x > innerWidth + 3) particle.x = -3;
      const flicker = particle.alpha * (0.65 + Math.sin(time * 0.001 + particle.phase) * 0.35);
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(206, 177, 105, ${Math.max(0.02, flicker)})`;
      context.fill();
    });
    animationFrame = requestAnimationFrame(drawParticles);
  };

  resizeCanvas();
  if (!reducedMotion) drawParticles();
  else drawParticles(0);
  window.addEventListener("resize", resizeCanvas, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && animationFrame) cancelAnimationFrame(animationFrame);
    else if (!reducedMotion) drawParticles();
  });

  // Optional generative ambience: no autoplay, no external audio file
  let audio = null;
  const createAmbience = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const oscillators = [];
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 1.8);
    filter.type = "lowpass";
    filter.frequency.value = 430;
    filter.Q.value = 0.7;
    filter.connect(master);
    master.connect(ctx.destination);

    [73.42, 110.0, 146.83].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = index === 0 ? "sine" : "triangle";
      osc.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.46 : 0.12;
      lfo.frequency.value = 0.025 + index * 0.012;
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      lfo.start();
      oscillators.push(osc, lfo);
    });
    return { ctx, master, oscillators };
  };

  const stopAmbience = () => {
    if (!audio) return;
    const { ctx, master, oscillators } = audio;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    setTimeout(() => {
      oscillators.forEach((osc) => { try { osc.stop(); } catch (_) {} });
      ctx.close();
    }, 900);
    audio = null;
  };

  soundButton.addEventListener("click", () => {
    const enabled = soundButton.getAttribute("aria-pressed") === "true";
    if (enabled) {
      stopAmbience();
      soundButton.setAttribute("aria-pressed", "false");
      soundButton.setAttribute("aria-label", "Activer l’ambiance sonore");
      soundLabel.textContent = "Son";
      return;
    }
    audio = createAmbience();
    if (!audio) return;
    soundButton.setAttribute("aria-pressed", "true");
    soundButton.setAttribute("aria-label", "Désactiver l’ambiance sonore");
    soundLabel.textContent = "Actif";
  });
})();
