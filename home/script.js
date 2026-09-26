(() => {
  'use strict';

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smoothstep = (start, end, value) => {
    const progress = clamp((value - start) / (end - start));
    return progress * progress * (3 - 2 * progress);
  };

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const navigation = document.querySelector('[data-nav]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const closeMenu = () => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.textContent = '메뉴';
    navigation.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menuButton.textContent = willOpen ? '닫기' : '메뉴';
      navigation.classList.toggle('is-open', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
    });

    navigation.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  const scenes = [...document.querySelectorAll('[data-scene]')];
  const revealElements = [...document.querySelectorAll('[data-reveal]')];
  const activeSections = new Set();
  const targetProgress = new WeakMap();
  const renderedProgress = new WeakMap();
  const rootStyles = window.getComputedStyle(document.documentElement);
  const scrollResponse = Number.parseFloat(rootStyles.getPropertyValue('--motion-scroll-response')) || 96;
  const readMotionToken = (name, fallback) => Number.parseFloat(rootStyles.getPropertyValue(name)) || fallback;
  const heroMotion = Object.freeze({
    brandEnd: readMotionToken('--hero-phase-brand-end', 0.2),
    wordStart: readMotionToken('--hero-phase-word-start', 0.1),
    wordStep: readMotionToken('--hero-phase-word-step', 0.24),
    wordEnter: readMotionToken('--hero-phase-word-enter', 0.08),
    wordHold: readMotionToken('--hero-phase-word-hold', 0.1),
    wordExit: readMotionToken('--hero-phase-word-exit', 0.08),
    profileStart: readMotionToken('--hero-phase-profile-start', 0.84),
    profileEnd: readMotionToken('--hero-phase-profile-end', 0.96),
    wordDistance: readMotionToken('--hero-word-enter-distance', 64),
    brandDistance: readMotionToken('--hero-brand-exit-distance', 80),
    profileDistance: readMotionToken('--hero-profile-enter-distance', 48),
    wordRestScale: readMotionToken('--hero-word-rest-scale', 0.94),
    brandExitScale: readMotionToken('--hero-brand-exit-scale', 0.92),
  });

  const sceneObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) activeSections.add(entry.target);
            else activeSections.delete(entry.target);
          });
          scheduleUpdate(true);
        },
        { rootMargin: '20% 0px 20% 0px' },
      )
    : null;

  scenes.forEach((section) => {
    if (sceneObserver) sceneObserver.observe(section);
    else activeSections.add(section);
  });

  const revealObserver = !reducedMotion.matches && 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
      )
    : null;

  revealElements.forEach((element) => {
    if (revealObserver) revealObserver.observe(element);
    else element.classList.add('is-revealed');
  });

  const getProgress = (element) => {
    const rect = element.getBoundingClientRect();
    const travel = Math.max(rect.height - window.innerHeight, 1);
    return clamp(-rect.top / travel);
  };

  const clearSceneStyles = () => {
    scenes.forEach((scene) => {
      scene.style.removeProperty('--scene-progress');
      scene.querySelector('[data-hero-copy]')?.removeAttribute('style');
      scene.querySelector('[data-hero-brand]')?.removeAttribute('style');
      scene.querySelector('[data-hero-wordmark]')?.removeAttribute('style');
      scene.querySelector('[data-scroll-cue]')?.removeAttribute('style');
      const profile = scene.querySelector('[data-hero-profile]');
      profile?.removeAttribute('style');
      if (profile) profile.inert = false;
      scene.querySelectorAll('[data-hero-word]').forEach((word) => word.removeAttribute('style'));
    });

    revealElements.forEach((element) => element.classList.add('is-revealed'));
  };

  const updateHero = (scene, progress) => {
    const copy = scene.querySelector('[data-hero-copy]');
    const brand = scene.querySelector('[data-hero-brand]');
    const wordmark = scene.querySelector('[data-hero-wordmark]');
    const scrollCue = scene.querySelector('[data-scroll-cue]');
    const profile = scene.querySelector('[data-hero-profile]');
    const words = [...scene.querySelectorAll('[data-hero-word]')];
    if (!copy || !brand || !wordmark || !profile || words.length === 0) return;

    const brandExit = smoothstep(heroMotion.wordStart / 2, heroMotion.brandEnd, progress);
    const brandOpacity = 1 - brandExit;
    const brandScale = 1 - (1 - heroMotion.brandExitScale) * brandExit;
    const cueEnd = heroMotion.wordStart + heroMotion.wordEnter / 2;
    const cueOpacity = 1 - smoothstep(0, cueEnd, progress);
    const profileReveal = smoothstep(heroMotion.profileStart, heroMotion.profileEnd, progress);

    copy.style.setProperty('--hero-copy-opacity', '1');
    copy.style.setProperty('--hero-copy-y', '0px');

    brand.style.setProperty('--hero-brand-opacity', brandOpacity.toFixed(3));
    brand.style.setProperty('--hero-brand-y', `${(-heroMotion.brandDistance * brandExit).toFixed(2)}px`);

    wordmark.style.setProperty('--hero-wordmark-opacity', brandOpacity.toFixed(3));
    wordmark.style.setProperty('--hero-wordmark-y', '0px');
    wordmark.style.setProperty('--hero-wordmark-scale', brandScale.toFixed(4));

    if (scrollCue) scrollCue.style.setProperty('--scroll-cue-opacity', cueOpacity.toFixed(3));

    words.forEach((word, index) => {
      const start = heroMotion.wordStart + heroMotion.wordStep * index;
      const enterEnd = start + heroMotion.wordEnter;
      const holdEnd = enterEnd + heroMotion.wordHold;
      const exitEnd = holdEnd + heroMotion.wordExit;
      const enter = smoothstep(start, enterEnd, progress);
      const exit = 1 - smoothstep(holdEnd, exitEnd, progress);
      const focus = enter * exit;
      const wordY = (1 - enter) * heroMotion.wordDistance - (1 - exit) * heroMotion.wordDistance;
      const wordScale = heroMotion.wordRestScale + (1 - heroMotion.wordRestScale) * focus;

      word.style.setProperty('--hero-word-opacity', focus.toFixed(3));
      word.style.setProperty('--hero-word-y', `${wordY.toFixed(2)}px`);
      word.style.setProperty('--hero-word-scale', wordScale.toFixed(4));
    });

    profile.style.setProperty('--hero-profile-opacity', profileReveal.toFixed(3));
    profile.style.setProperty('--hero-profile-y', `${(heroMotion.profileDistance * (1 - profileReveal)).toFixed(2)}px`);
    profile.style.pointerEvents = profileReveal > 0.8 ? 'auto' : 'none';
    profile.inert = profileReveal <= 0.8;
  };

  let animationFrame = 0;
  let previousFrameTime = 0;

  const updateTargets = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 16);

    if (reducedMotion.matches) {
      clearSceneStyles();
      return;
    }

    scenes.forEach((scene) => {
      targetProgress.set(scene, getProgress(scene));
    });
  };

  const animatePage = (timestamp) => {
    const elapsed = previousFrameTime ? Math.min(timestamp - previousFrameTime, scrollResponse) : scrollResponse;
    previousFrameTime = timestamp;
    const blend = 1 - Math.exp(-elapsed / scrollResponse);
    let needsAnotherFrame = false;

    scenes.forEach((scene) => {
      const target = targetProgress.get(scene) ?? getProgress(scene);
      const current = renderedProgress.get(scene) ?? target;
      const next = current + (target - current) * blend;
      renderedProgress.set(scene, next);
      scene.style.setProperty('--scene-progress', next.toFixed(4));
      if (scene.dataset.scene === 'hero') updateHero(scene, next);
      if (Math.abs(target - next) > 0.0005) needsAnotherFrame = true;
    });

    if (needsAnotherFrame) {
      animationFrame = window.requestAnimationFrame(animatePage);
      return;
    }

    animationFrame = 0;
    previousFrameTime = 0;
  };

  function scheduleUpdate(refreshTargets = true) {
    if (refreshTargets) updateTargets();
    if (reducedMotion.matches || animationFrame) return;
    animationFrame = window.requestAnimationFrame(animatePage);
  }

  window.addEventListener('scroll', () => scheduleUpdate(true), { passive: true });
  window.addEventListener('resize', () => {
    closeMenu();
    scheduleUpdate(true);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      clearSceneStyles();
    } else {
      revealElements.forEach((element) => element.classList.add('is-revealed'));
      scheduleUpdate(true);
    }
  });

  scheduleUpdate(true);
})();
