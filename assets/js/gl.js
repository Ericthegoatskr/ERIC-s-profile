/* =========================================================
   gl.js — 首頁背景的 WebGL 流動色彩
   ---------------------------------------------------------
   想像成：我們在整個畫面上鋪一張紙，然後叫顯示卡「每一個像素
   你自己算一次顏色」。因為顯示卡是幾千個小工人同時算，
   所以就算全螢幕也不會卡。
   跑不起來（舊瀏覽器 / 沒有 WebGL）就什麼都不做，
   CSS 裡已經準備好一個漸層當備案。
   ========================================================= */
(function () {
  'use strict';

  window.EricGL = { start: function () {} };

  var canvas = document.getElementById('gl');
  if (!canvas) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
        || canvas.getContext('experimental-webgl');
  if (!gl) return;

  /* ---- 頂點著色器：只負責把那張「紙」鋪滿整個畫面 ---- */
  var VERT = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  /* ---- 片段著色器：每個像素要塗什麼顏色，都在這裡決定 ---- */
  var FRAG = [
    'precision mediump float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform vec2  u_mouse;',

    // 這段是經典的 2D simplex noise，用來做出「像雲一樣」的隨機起伏
    'vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }',
    'vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i  = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m*m; m = m*m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',

    // 把好幾層 noise 疊在一起，細節就會變豐富（像山的輪廓）
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++) { v += a * snoise(p); p *= 2.0; a *= 0.5; }',
    '  return v;',
    '}',

    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);',
    '  float t = u_time * 0.055;',

    // 先用 noise 去「扭曲」座標，再算一次 noise = 會流動的雲霧
    '  vec2 q = vec2(fbm(p * 1.5 + t), fbm(p * 1.5 + vec2(3.2, 1.7) - t));',
    '  float n = fbm(p * 1.7 + q * 1.15 + t * 0.6) * 0.5 + 0.5;',

    '  vec3 col = vec3(0.031, 0.031, 0.039);',        // 底色：接近黑
    '  vec3 violet = vec3(0.427, 0.298, 0.984);',
    '  vec3 amber  = vec3(1.000, 0.682, 0.231);',
    '  col = mix(col, violet * 0.60, smoothstep(0.34, 0.95, n) * 0.55);',
    '  col = mix(col, amber,         smoothstep(0.58, 1.00, n) * 0.42);',

    // 滑鼠附近加一點暖光
    '  float d = distance(p, u_mouse);',
    '  col += amber * 0.13 * exp(-d * 2.6);',

    // 四周壓暗，中間才是視覺重點
    '  col *= mix(0.42, 1.0, smoothstep(1.30, 0.22, length(p)));',

    // 一點點顆粒，避免漸層出現一圈一圈的色帶
    '  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[gl] shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[gl] link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // 兩個三角形 = 一個覆蓋整個畫面的長方形
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes   = gl.getUniformLocation(prog, 'u_res');
  var uTime  = gl.getUniformLocation(prog, 'u_time');
  var uMouse = gl.getUniformLocation(prog, 'u_mouse');

  var mouse = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  var running = false, visible = true, rafId = 0, t0 = 0, elapsed = 0;

  function resize() {
    // 限制解析度倍率，手機才不會發燙
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.floor(canvas.clientWidth  * dpr));
    var h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  function draw(time) {
    if (!t0) t0 = time;
    elapsed = (time - t0) / 1000;

    // 讓滑鼠位置慢慢追上去，動起來比較柔和
    mouse.x += (target.x - mouse.x) * 0.05;
    mouse.y += (target.y - mouse.y) * 0.05;

    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (running && visible) rafId = requestAnimationFrame(draw);
    else running = false;
  }

  function play() {
    if (running || !visible) return;
    running = true;
    t0 = 0;                      // 重新計時，避免離開分頁太久後畫面跳一下
    t0 = performance.now() - elapsed * 1000;
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  window.addEventListener('resize', function () { resize(); if (!running) drawOnce(); }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    var m = Math.min(r.width, r.height) || 1;
    target.x =  (e.clientX - r.left - r.width  / 2) / m;
    target.y = -(e.clientY - r.top  - r.height / 2) / m;
  }, { passive: true });

  // 捲出畫面外就暫停，省電
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduce) play(); else stop();
    }, { threshold: 0 }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (visible && !reduce) play();
  });

  function drawOnce() {
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  drawOnce();

  window.EricGL.start = function () {
    resize();
    if (reduce) drawOnce();   // 使用者要求減少動態 → 只畫一張靜止的圖
    else play();
  };
})();
