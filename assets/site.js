(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  window.__pageReady = true;
  var enhanced = root.classList.contains('js');
  var ROLE_IDS = ['editor', 'sales', 'pd'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav border on scroll */
  var nav = d.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* toast */
  var toastEl = d.querySelector('.toast');
  var toastTimer;
  function toast(msg, ms) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 2200);
  }

  /* mobile sticky apply button */
  var cta = d.querySelector('.mobile-cta');
  var ctaLink = cta ? cta.querySelector('a') : null;
  var ctaState = { hero: true, apply: false, footer: false, positions: false, roleBtn: false };
  var currentRole = 'editor';
  function updateCta() {
    if (!cta || !ctaLink) return;
    var panel = d.getElementById(currentRole);
    if (enhanced && ctaState.positions && panel && panel.getAttribute('data-mailto')) {
      ctaLink.textContent = panel.getAttribute('data-role') + ' 지원하기';
      ctaLink.setAttribute('href', panel.getAttribute('data-mailto'));
    } else {
      ctaLink.textContent = ctaLink.getAttribute('data-default-label') || '지원하기';
      ctaLink.setAttribute('href', '#apply');
    }
    var show = !ctaState.hero && !ctaState.apply && !ctaState.footer && !ctaState.roleBtn;
    cta.classList.toggle('show', show);
    root.classList.toggle('cta-on', show);
  }

  /* position tabs (only when the enhanced layout is active) */
  var tabs = Array.prototype.slice.call(d.querySelectorAll('.role-tab'));
  var panels = Array.prototype.slice.call(d.querySelectorAll('.role'));
  var tabBar = d.getElementById('role-tabs');

  function select(id, focusTab) {
    currentRole = id;
    tabs.forEach(function (t) {
      var on = t.getAttribute('aria-controls') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    panels.forEach(function (p) { p.hidden = p.id !== id; });
    updateCta();
  }
  function scrollToTabs() {
    if (!tabBar) return;
    tabBar.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function roleFromHash() {
    var h = (location.hash || '').replace('#', '');
    return ROLE_IDS.indexOf(h) > -1 ? h : null;
  }

  if (tabs.length && enhanced) {
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        var id = t.getAttribute('aria-controls');
        select(id);
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) {
          e.preventDefault();
          var id = tabs[n].getAttribute('aria-controls');
          select(id, true);
          if (history.replaceState) history.replaceState(null, '', '#' + id);
        }
      });
    });

    var initial = roleFromHash();
    select(initial || 'editor');
    if (initial) setTimeout(scrollToTabs, 60);

    window.addEventListener('hashchange', function () {
      var r = roleFromHash();
      if (r) { select(r); scrollToTabs(); }
    });

    /* in-page links that point at a role (#editor, #sales, #pd) */
    d.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (ROLE_IDS.indexOf(id) === -1) return;
      e.preventDefault();
      select(id);
      if (history.pushState) history.pushState(null, '', '#' + id);
      scrollToTabs();
    });
  }

  /* clipboard copy: textarea copy inside the tap first (in-app browsers, iOS), then the Clipboard API */
  function copyText(value, ok, fail) {
    var prev = d.activeElement;
    var ta = d.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    ta.style.fontSize = '16px';
    d.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    var done = false;
    try { done = d.execCommand('copy'); } catch (err) { done = false; }
    d.body.removeChild(ta);
    if (prev && prev !== d.body && prev.focus) prev.focus({ preventScroll: true });
    if (done) return ok();
    if (!navigator.clipboard || !window.isSecureContext) return fail();
    var settled = false;
    var once = function (cb) { return function () { if (!settled) { settled = true; cb(); } }; };
    navigator.clipboard.writeText(value).then(once(ok), once(fail));
    setTimeout(once(fail), 1500);
  }

  /* copy buttons: e-mail address or this page's link */
  Array.prototype.forEach.call(d.querySelectorAll('[data-copy]'), function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-copy');
      if (value === 'page') value = location.href.split('#')[0];
      var okMsg = btn.getAttribute('data-toast') || '이메일 주소를 복사했습니다.';
      copyText(value, function () { toast(okMsg); }, function () { toast('길게 눌러 복사해 주세요.'); });
    });
  });

  /* apply buttons copy the address instead of opening a mail app */
  Array.prototype.forEach.call(d.querySelectorAll('[data-js-text]'), function (el) { el.textContent = el.getAttribute('data-js-text'); });
  d.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="mailto:"]') : null;
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    var href = a.getAttribute('href');
    var addr = decodeURIComponent(href.slice(7).split('?')[0]);
    var subject = (href.match(/[?&]subject=([^&]*)/) || [])[1];
    var line = subject ? '\n메일 제목: ' + decodeURIComponent(subject) : '';
    copyText(addr, function () { toast('지원 메일 주소를 복사했습니다.' + line, 4500); },
      function () { toast(addr + '로 보내 주세요.' + line, 7000); });
  });

  /* marquee pause / play */
  var marquee = d.querySelector('.marquee');
  var mToggle = d.querySelector('.marquee-toggle');
  if (marquee && mToggle) {
    mToggle.addEventListener('click', function () {
      var paused = marquee.classList.toggle('paused');
      mToggle.textContent = paused ? '움직임 재생' : '움직임 멈춤';
      mToggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
    });
  }

  /* reveal on scroll */
  var revealEls = Array.prototype.slice.call(d.querySelectorAll('.reveal'));
  if (!('IntersectionObserver' in window) || reduce) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* sticky CTA visibility: after the hero, hidden over the apply card and footer */
  var hero = d.querySelector('.hero');
  var apply = d.getElementById('apply');
  var footer = d.querySelector('.footer');
  var positions = d.getElementById('positions');
  if (cta && hero && apply && 'IntersectionObserver' in window) {
    var watch = function (el, key) {
      if (!el) return;
      new IntersectionObserver(function (entries) {
        ctaState[key] = entries[0].isIntersecting;
        updateCta();
      }, { threshold: 0 }).observe(el);
    };
    watch(hero, 'hero');
    watch(apply, 'apply');
    watch(footer, 'footer');
    watch(positions, 'positions');
    var btnSeen = [];
    var roleBtnIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var i = btnSeen.indexOf(en.target);
        if (en.isIntersecting && i < 0) btnSeen.push(en.target);
        if (!en.isIntersecting && i > -1) btnSeen.splice(i, 1);
      });
      ctaState.roleBtn = btnSeen.length > 0;
      updateCta();
    }, { threshold: 0 });
    Array.prototype.forEach.call(d.querySelectorAll('.role-card .btn, .role-apply .btn'), function (b) { roleBtnIO.observe(b); });
  }
})();
