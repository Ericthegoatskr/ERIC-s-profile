# 蔡承諺 Eric Tsai — 個人作品集

深色、大字體、捲動驅動動畫的單頁式個人網站。
設計方向參考 [graffico.it](https://graffico.it/) 那一類得獎作品集網站的做法。

## 用到的技術

| 技術 | 做什麼用的 |
| --- | --- |
| **Lenis** | 平滑捲動。滾輪滾一下，畫面是「滑」過去而不是「跳」過去 |
| **GSAP** | 動畫引擎，負責所有會動的東西 |
| **GSAP ScrollTrigger** | 「捲到這裡就播這個動畫」的判斷器 |
| **WebGL（原生，無函式庫）** | 首頁背景那片會流動的雲霧，由顯示卡逐像素計算 |
| **原生 HTML / CSS / JavaScript** | 沒有框架、沒有打包工具，打開檔案就能跑 |

函式庫都放在 `assets/vendor/`，直接從檔案載入，不依賴任何 CDN。
所以就算外部網站掛掉，這個網站還是正常的。

## 檔案結構

```
index.html              整個網站的內容
assets/css/style.css    所有樣式
assets/js/gl.js         首頁的 WebGL 背景
assets/js/main.js       所有互動（載入動畫、捲動、游標、表單…）
assets/vendor/          GSAP、ScrollTrigger、Lenis
profile/                最早的舊版本，留著當紀念，沒有被網站使用
```

## 本機預覽

```bash
python3 -m http.server 8000
# 然後打開 http://localhost:8000
```

## 要改內容的話

- **自我介紹、工作經歷、聯絡方式** → 改 `index.html`，裡面有中文註解標示位置
- **顏色** → 改 `assets/css/style.css` 最上面的 `:root` 區塊，改一次全站都會變
- **技能百分比** → 改 `index.html` 裡 `.skill` 的 `data-level="85"`，數字改了長條圖會跟著變
- **新增一段經歷** → 複製 `index.html` 裡一整塊 `<li class="job">` 再改文字

## 部署

### 只需要做一次的設定

到 Repository 的 **Settings → Pages**，把 **Source** 選成 **`GitHub Actions`**
（不是 `Deploy from a branch`），這樣就好，不用選分支也不用按儲存。

### 之後

設定完以後就全自動了。只要有東西推上 `main`，
`.github/workflows/deploy-pages.yml` 就會把整個網站重新發佈一次。

進度在 Repository 的 **Actions** 分頁可以看。
想手動重跑一次：Actions → Deploy to GitHub Pages → Run workflow。

網址會是 `https://ericthegoatskr.github.io/ERIC-s-profile/`。

## 無障礙與相容性

- 支援 `prefers-reduced-motion`：系統設定「減少動態效果」時會自動關掉動畫
- JavaScript 沒載入時，所有文字內容仍然完整顯示
- WebGL 不支援時，首頁背景自動換成 CSS 漸層
- 鍵盤可操作，focus 有明顯外框

## 函式庫授權

GSAP 為 GreenSock 標準「no charge」授權（[greensock.com/standard-license](https://gsap.com/standard-license/)）；
Lenis 為 MIT 授權，授權條款見 `assets/vendor/LENIS-LICENSE`。
