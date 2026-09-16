/* =========================================================
   main.js — 網站的所有互動
   ---------------------------------------------------------
   用到的工具：
     Lenis        → 平滑捲動（滑鼠滾一下，畫面會「滑」過去而不是跳過去）
     GSAP         → 動畫引擎，負責所有會動的東西
     ScrollTrigger→ GSAP 的外掛，「捲到這裡就播這個動畫」
   ========================================================= */
(function () {
  'use strict';

  var hasGSAP  = typeof window.gsap !== 'undefined';
  var hasST    = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';
  var reduce   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* ==============================================================
     1. 平滑捲動
     Lenis 接管捲動後，ScrollTrigger 必須跟它用同一個「時間軸」，
     否則兩邊會對不上，動畫就會抖。
     ============================================================== */
  var lenis = null;

  function initScroll() {
    if (!hasLenis || reduce) {
      document.documentElement.style.scrollBehavior = reduce ? 'auto' : 'smooth';
      return;
    }
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.6
    });

    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }

  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -10 });
    else {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  /* ==============================================================
     2. 把一段文字拆成一個一個字
     這樣才能做出「字一個接一個跳出來」的效果。
     ============================================================== */
  function splitChars(el) {
    var text = el.textContent;
    var frag = document.createDocumentFragment();
    var chars = [];

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
      var span = document.createElement('span');
      span.className = 'char';
      span.style.display = 'inline-block';
      span.style.willChange = 'transform';
      span.textContent = ch;
      frag.appendChild(span);
      chars.push(span);
    }

    el.textContent = '';
    el.appendChild(frag);
    el.setAttribute('aria-label', text);   // 讓螢幕閱讀器仍然讀到完整句子
    return chars;
  }

  /* ==============================================================
     3. 載入畫面
     從 0 數到 100，數完把黑幕往上拉開，然後才播首頁動畫。
     ============================================================== */
  function runLoader(done) {
    var loader = $('#loader');
    var count  = $('#loaderCount');
    var bar    = $('#loaderBar');

    if (!loader) { done(); return; }

    function finish() {
      loader.classList.add('is-done');
      setTimeout(function () {
        loader.style.display = 'none';
        done();
      }, reduce ? 0 : 750);
    }

    if (!hasGSAP || reduce) { finish(); return; }

    var state = { v: 0 };
    gsap.to(state, {
      v: 100,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: function () {
        var v = Math.round(state.v);
        count.textContent = v < 10 ? '0' + v : String(v);
        bar.style.width = v + '%';
      },
      onComplete: function () { gsap.delayedCall(0.18, finish); }
    });
  }

  /* ==============================================================
     4. 首頁進場動畫
     ============================================================== */
  function introHero() {
    if (window.EricGL) window.EricGL.start();

    // 導覽列滑下來。放在最前面，就算後面的動畫出問題，導覽列也一定會出現。
    var nav = $('#nav');
    if (nav) nav.classList.add('is-ready');

    var titles = $$('.hero__title [data-split]');
    titles.forEach(splitChars);

    if (!hasGSAP || reduce) {
      $$('.hero [data-reveal]').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.hero__title .char', {
        yPercent: 118,
        duration: 1.1,
        stagger: 0.035
      })
      .to('.hero__eyebrow', { opacity: 1, y: 0, duration: 0.8 }, 0.25)
      .to('.hero__cn',      { opacity: 1, y: 0, duration: 0.8 }, '-=0.55')
      .to('.hero__desc',    { opacity: 1, y: 0, duration: 0.8 }, '-=0.62')
      .to('.hero__actions', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6');
  }

  /* ==============================================================
     5. 捲到才出現的動畫
     ============================================================== */
  function initReveals() {
    var items = $$('[data-reveal]').filter(function (el) { return !el.closest('.hero'); });

    if (!hasST || reduce) {
      items.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    } else {
      items.forEach(function (el) {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });
    }

    // 各區塊的大標題，一樣做逐字浮現
    $$('.h2 [data-split]').forEach(function (el) {
      var chars = splitChars(el);
      if (!hasST || reduce) return;
      gsap.from(chars, {
        yPercent: 118,
        duration: 0.95,
        ease: 'power3.out',
        stagger: 0.04,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });
  }

  /* ==============================================================
     6. 數字往上跳（關於我那三張卡片）
     ============================================================== */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      if (isNaN(end)) return;
      if (!hasST || reduce) { el.textContent = end; return; }

      var o = { v: 0 };
      gsap.to(o, {
        v: end,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = Math.round(o.v); }
      });
    });
  }

  /* ==============================================================
     7. 跑馬燈：一直往左跑，捲動方向還會影響它的方向
     ============================================================== */
  function initMarquee() {
    var track = $('#marqueeTrack');
    if (!track || !hasGSAP || reduce) return;

    // HTML 裡放了 3 份一樣的字，跑完 1/3 就跳回原點，看起來就是無限循環
    var tween = gsap.to(track, {
      xPercent: -33.333,
      duration: 22,
      ease: 'none',
      repeat: -1
    });

    if (!hasST) return;

    var dir = 1;
    ScrollTrigger.create({
      onUpdate: function (self) {
        var d = self.direction;
        if (d !== dir) { dir = d; gsap.to(tween, { timeScale: d, duration: 0.4, overwrite: true }); }
      }
    });
  }

  /* ==============================================================
     8. 導覽列：往下捲收起來、往上捲跑出來，並標示目前在哪一段
     ============================================================== */
  function initNav() {
    var nav    = $('#nav');
    var links  = $$('.nav__links a');
    var toggle = $('#navToggle');
    var menu   = $('#navLinks');

    // 手機版選單
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
        document.body.classList.toggle('is-locked', open);
        if (lenis) { open ? lenis.stop() : lenis.start(); }
      });
    }

    function closeMenu() {
      if (!menu || !menu.classList.contains('is-open')) return;
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      if (lenis) lenis.start();
    }

    // 所有站內連結都交給 Lenis 平滑滑過去
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        var wasOpen = !!(menu && menu.classList.contains('is-open'));
        closeMenu();
        // 手機選單關起來需要一點時間，等它收完再滑過去比較順
        setTimeout(function () { scrollTo(el); }, wasOpen ? 420 : 0);
      });
    });

    if (!nav) return;

    var last = 0;
    function onScroll(y) {
      nav.classList.toggle('is-stuck', y > 40);
      // 往下捲且已經離開首頁 → 把導覽列藏起來，讓畫面乾淨一點
      nav.classList.toggle('is-hidden', y > last && y > 420 && !(menu && menu.classList.contains('is-open')));
      last = y;

      var bar = $('#progressBar');
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }
    }

    if (lenis) lenis.on('scroll', function (e) { onScroll(e.scroll); });
    else window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });

    // 目前捲到哪一段，對應的選單項目就亮起來
    if (hasST) {
      $$('main section[id]').forEach(function (sec) {
        var link = links.filter(function (a) { return a.getAttribute('href') === '#' + sec.id; })[0];
        if (!link) return;
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: function (self) { link.classList.toggle('is-active', self.isActive); }
        });
      });
    }
  }

  /* ==============================================================
     9. 自訂游標 + 磁鐵按鈕
     磁鐵按鈕 = 滑鼠靠近時，按鈕會稍微往滑鼠的方向移動。
     ============================================================== */
  function initCursor() {
    var cursor = $('#cursor');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!cursor || !fine || !hasGSAP) return;

    var ring = $('.cursor__ring', cursor);
    var dot  = $('.cursor__dot', cursor);

    var xRing = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    var yRing = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    var xDot  = gsap.quickTo(dot,  'x', { duration: 0.12, ease: 'power3' });
    var yDot  = gsap.quickTo(dot,  'y', { duration: 0.12, ease: 'power3' });

    window.addEventListener('pointermove', function (e) {
      cursor.classList.add('is-on');
      xRing(e.clientX); yRing(e.clientY);
      xDot(e.clientX);  yDot(e.clientY);
    }, { passive: true });

    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });

    $$('[data-hover]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cursor.classList.add('is-hover'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('is-hover'); });
    });
  }

  function initMagnetic() {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || !hasGSAP || reduce) return;

    $$('[data-magnetic]').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });

      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width  / 2) * 0.32);
        yTo((e.clientY - r.top  - r.height / 2) * 0.32);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* ==============================================================
     10. 首頁文字視差：往下捲的時候，標題比背景慢一點
     ============================================================== */
  function initParallax() {
    if (!hasST || reduce) return;

    gsap.to('.hero__inner', {
      yPercent: 16,
      opacity: 0.25,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    gsap.to('.footer__big', {
      xPercent: -6,
      ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
    });
  }

  /* ==============================================================
     11. 中英切換
     ---------------------------------------------------------------
     大部分的翻譯是靠 CSS：HTML 裡兩種語言都寫好，
     <html data-lang> 決定顯示哪一份。
     這裡只處理三件 CSS 做不到的事：
       a. 記住使用者的選擇
       b. 大標題有逐字動畫，不能放兩份，所以要換字後重新拆字
       c. 分頁標題與表單錯誤訊息
     ============================================================== */
  var LANG = { zh: {}, en: {} };
  LANG.zh.title = '蔡承諺 Cheng-Yen Tsai — IT 專案管理 / 資訊科技';
  LANG.en.title = 'Cheng-Yen Tsai — IT Project Management / Information Technology';
  LANG.zh.required = '三個欄位都要填喔。';
  LANG.en.required = 'Please fill in all three fields.';
  LANG.zh.badMail  = '電子郵件的格式看起來怪怪的。';
  LANG.en.badMail  = 'That email address doesn\'t look right.';
  LANG.zh.sent     = '已經幫你開啟信箱程式，確認後按寄出就可以了。';
  LANG.en.sent     = 'Your email app should be opening with the message ready to send.';

  var root = document.documentElement;

  function currentLang() {
    return root.getAttribute('data-lang') === 'en' ? 'en' : 'zh';
  }

  function t(key) { return LANG[currentLang()][key]; }

  // 大標題換成該語言的文字。
  // 第一次載入時只換字（等一下 initReveals 會負責拆字並做動畫）；
  // 之後手動切換語言時，換完字要自己重新拆一次。
  function retitleHeadings(alsoSplit) {
    var en = currentLang() === 'en';
    $$('.h2 [data-split]').forEach(function (el) {
      var zhText = el.getAttribute('data-zh');
      var enText = el.getAttribute('data-en');
      if (!zhText && !enText) return;
      el.textContent = en ? (enText || zhText) : (zhText || enText);
      if (alsoSplit) splitChars(el);
    });
  }

  function setLang(lang, isInitial) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'zh' ? 'zh-Hant' : 'en');
    try { localStorage.setItem('lang', lang); } catch (e) {}

    document.title = LANG[lang].title;

    $$('.langsw button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-setlang') === lang));
    });

    if (isInitial) {
      // 只換字，拆字交給 initReveals，避免同一段文字被拆兩次
      retitleHeadings(false);
      return;
    }

    // 切換之後版面長度會變，要叫 ScrollTrigger 重新量一次
    retitleHeadings(true);
    if (hasST) ScrollTrigger.refresh();

    // 保險：切換後如果有區塊還是透明的（動畫在它被隱藏時跑掉了），直接顯示
    $$('[data-reveal]').forEach(function (el) {
      if (parseFloat(getComputedStyle(el).opacity) < 0.9) {
        gsapSet(el);
      }
    });
  }

  function gsapSet(el) {
    if (hasGSAP) gsap.set(el, { opacity: 1, y: 0 });
    else { el.style.opacity = 1; el.style.transform = 'none'; }
  }

  function initLang() {
    setLang(currentLang(), true);
    $$('.langsw button').forEach(function (b) {
      b.addEventListener('click', function () {
        var next = b.getAttribute('data-setlang');
        if (next === currentLang()) return;
        setLang(next, false);
      });
    });
  }

  /* ==============================================================
     12. 聯絡表單
     這是純靜態網站，沒有伺服器可以幫忙寄信，
     所以按下送出會把內容組成一封信，直接打開你電腦的信箱程式。
     ============================================================== */
  function initForm() {
    var form = $('#contactForm');
    if (!form) return;
    var note = $('#formNote');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.name.value.trim();
      var mail = form.email.value.trim();
      var msg  = form.message.value.trim();

      function fail(text) {
        note.textContent = text;
        note.className = 'form__note is-error';
      }

      if (!name || !mail || !msg) return fail(t('required'));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return fail(t('badMail'));

      var en = currentLang() === 'en';
      var subject = (en ? 'Message from your portfolio — ' : '來自個人網站的訊息 — ') + name;
      var body = (en ? 'Name: ' : '姓名：') + name
               + (en ? '\nEmail: ' : '\n電子郵件：') + mail + '\n\n' + msg;

      window.location.href = 'mailto:tsaieric15@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body='    + encodeURIComponent(body);

      note.textContent = t('sent');
      note.className = 'form__note is-ok';
    });
  }

  /* ==============================================================
     13. 啟動
     ============================================================== */
  function boot() {
    var y = $('#year');
    if (y) y.textContent = new Date().getFullYear();

    initLang();
    initScroll();
    initNav();
    initCursor();
    initMagnetic();
    initReveals();
    initCounters();
    initMarquee();
    initParallax();
    initForm();

    if (hasST) ScrollTrigger.refresh();

    runLoader(introHero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // 網頁字型載入後字寬會變，要叫 ScrollTrigger 重新量一次位置
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (hasST) ScrollTrigger.refresh(); });
  }
})();
