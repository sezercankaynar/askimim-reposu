# 📖 Tarif Defterim

Instagram, TikTok, YouTube (Shorts dahil), Pinterest veya herhangi bir tarif sitesinin linkini yapıştırın; tarif malzemeleri, Türk mutfağı ölçüleri, adımları, kategorisi ve kapak fotoğrafıyla deftere **otomatik** eklensin. Hiçbir metni kopyalayıp yapıştırmak gerekmez.

- 📱 Telefona kurulabilen uygulama (PWA). Android'de **Paylaş → Tarif Defterim** ile import başlar.
- 🥄 Her malzemenin yanında bardak/kaşık görseli, gram karşılığı; −/+ ile porsiyon ölçekleme.
- 🍳 Pişirme modu: büyük yazı, ekran kapanmaz, "10 dakika pişir" otomatik zamanlayıcı olur.
- 🧺 Alışveriş listesi: seçilen tariflerin malzemeleri birleştirilir.
- 📶 Daha önce açılan tarifler internet olmadan da okunur.

---

## İçindekiler

1. [Nasıl çalışır?](#nasıl-çalışır)
2. [Gerekli hesaplar ve anahtarlar](#gerekli-hesaplar-ve-anahtarlar)
3. [Kurulum adım adım](#kurulum-adım-adım)
   - [Supabase (veritabanı, giriş, fotoğraflar)](#1-supabase)
   - [Vercel (uygulama)](#2-vercel--uygulama)
   - [Render (worker)](#3-render--worker)
   - [Google ile giriş](#4-google-ile-giriş)
   - [Instagram çerezi (isteğe bağlı)](#5-instagram-çerezi-isteğe-bağlı)
4. [Tahmini aylık maliyet](#tahmini-aylık-maliyet)
5. [Geliştirme ve testler](#geliştirme-ve-testler)
6. [Sorun giderme](#sorun-giderme)

---

## Nasıl çalışır?

```
Telefon / PWA ──link──▶ Next.js (Vercel) ──▶ Supabase: import_jobs (sırada)
                                                   ▲             │ Realtime
                                 işi alır │        │             ▼
                     Python worker (Render) ◀──────┘     Arayüzde canlı ilerleme
                     yt-dlp · ffmpeg · Whisper · Claude          çubuğu
                                │
                                ▼
                     recipes tablosu + kapak görseli (Storage)
```

1. Link yapıştırılır → `import_jobs` tablosuna "sırada" olarak yazılır.
2. Worker işi alır: kısa linki açar, platformu tespit eder, aynı link daha önce eklendiyse mevcut tarifi gösterir.
3. **Tarif siteleri:** sayfa indirilir; önce schema.org `Recipe` verisi, yoksa okunabilir ana metin alınır.
4. **Videolar:** yt-dlp ile açıklama/başlık/küçük resim alınır. Açıklamada tarif tam yazıyorsa video indirilmez (maliyet tasarrufu). Değilse en düşük kalitede indirilir, ses Whisper ile yazıya dökülür, sahne değişimlerinden 6-10 kare alınır.
5. Tüm metin ve kareler Claude'a gönderilir; katı JSON şemasıyla tarif çıkarılır (Türkçeye çevirir, birimleri Türk mutfak ölçülerine dönüştürür, kategori seçer, güven skoru verir).
6. Tarif deftere "Yeni eklendi, kontrol et" rozetiyle eklenir. Belirsiz miktarlar "tahmini" olarak işaretlenir.
7. İndirilen video/ses silinir; yalnızca kapak görseli saklanır.

Arayüz tüm adımları canlı gösterir: *Link inceleniyor → Video indiriliyor → Ses yazıya dökülüyor → Görseller okunuyor → Tarif yazılıyor → Deftere eklendi.*

---

## Gerekli hesaplar ve anahtarlar

| Hizmet | Ne için | Ücret | Nereden |
|---|---|---|---|
| **Supabase** | Veritabanı, giriş, fotoğraf depolama, canlı ilerleme | Ücretsiz plan yeterli | https://supabase.com |
| **Vercel** | Uygulamayı yayınlama | Ücretsiz plan yeterli | https://vercel.com |
| **Render** | Worker'ı (Python) çalıştırma | Ücretsiz plan yeterli* | https://render.com |
| **Anthropic (Claude)** | Tarif çıkarma | Kullandıkça öde (tarif başına ~0,01–0,05 $) | https://console.anthropic.com |
| **Groq** | Ses → yazı (Whisper) | Ücretsiz kota | https://console.groq.com |
| **Google Cloud** | Google ile giriş (isteğe bağlı; e-posta ile giriş de var) | Ücretsiz | https://console.cloud.google.com |

\* Render'ın ücretsiz planında servis 15 dakika boşta kalınca uyur; ilk link eklendiğinde 30-60 saniye uyanma süresi olur. Uygulama linki ekleyince worker'ı otomatik dürter.

---

## Kurulum adım adım

> Toplam süre yaklaşık 30-40 dakika. Sırayla gidin; her adımda aldığınız değerleri bir yere not edin.

### 1. Supabase

1. https://supabase.com → **New project**. Bir ad ve güçlü bir veritabanı şifresi verin, bölge olarak **Frankfurt (eu-central-1)** seçin.
2. Proje açılınca sol menüden **SQL Editor** → **New query**. `supabase/setup.sql` dosyasının içeriğini yapıştırıp **Run** deyin (iki migration'ın birleşik hâli; birden fazla kez çalıştırmak güvenlidir).
   - **Telefon/tabletten kopyalıyorsanız:** GitHub'daki dosya sayfasında **Raw** düğmesine basın (ya da `raw.githubusercontent.com/.../supabase/setup.sql` adresini açın), sayfadaki metnin tamamını seçip kopyalayın. Böylece satır numaraları gelmez. Biçimin (girinti, satır sonları) bozulması sorun değildir; SQL bunları önemsemez.
   - Ayrı ayrı çalıştırmak isterseniz: `supabase/migrations/0001_init.sql` sonra `0002_queue.sql`.
3. **Authentication → Providers → Email**: açık olsun. "Confirm email" kapalı kalabilir (giriş bağlantısı zaten e-postayla gelir).
4. **Authentication → URL Configuration**:
   - *Site URL*: Vercel adresiniz (örn. `https://tarif-defterim.vercel.app`) — 2. adımdan sonra doldurun.
   - *Redirect URLs*: `https://tarif-defterim.vercel.app/auth/callback` ve `http://localhost:3000/auth/callback`
5. **Project Settings → API** sayfasından şunları not edin:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
   - `anon public` anahtarı → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` anahtarı → `SUPABASE_SERVICE_ROLE_KEY` (**gizli**; yalnızca Vercel ve Render'a girilir, asla tarayıcıya gitmez)

**Güvenlik (RLS):** Migration dosyası her tabloda satır düzeyinde güvenliği açar; her kullanıcı yalnızca kendi tariflerini, işlerini ve fotoğraflarını görebilir. Storage'da da her kullanıcı yalnızca `{kendi_id}/...` klasörüne erişir.

### 2. Vercel — uygulama

1. Bu depoyu GitHub'a koyun (zaten oradaysa atlayın).
2. https://vercel.com → **Add New → Project** → depoyu seçin.
3. **Root Directory**: `web` seçin. Framework otomatik "Next.js" olur. Install command'ı `pnpm install --frozen-lockfile` olarak, build'i varsayılan bırakın. (Vercel pnpm workspace'i tanır; root'taki `pnpm-workspace.yaml` sayesinde `packages/measure` de kurulur.)
4. **Environment Variables** bölümüne şunları girin (`web/.env.example` dosyasındaki liste):

   | Değişken | Değer |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon anahtarı |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role anahtarı |
   | `NEXT_PUBLIC_SITE_URL` | `https://<projeniz>.vercel.app` |
   | `DAILY_IMPORT_LIMIT` | `20` (kullanıcı başına günlük link sayısı) |
   | `WORKER_URL` | Render adresi (3. adımdan sonra) |
   | `WORKER_SHARED_SECRET` | Uzun rastgele bir şifre (aynı değer Render'a da girilecek) |

5. **Deploy**. Bittiğinde Vercel adresinizi Supabase *Site URL* ve *Redirect URLs* alanlarına yazın (1. adım, madde 4).

### 3. Render — worker

1. https://render.com → **New → Web Service** → depoyu bağlayın.
2. Ayarlar:
   - **Root Directory**: `worker`
   - **Runtime**: Docker (Dockerfile'ı otomatik bulur; içinde ffmpeg ve yt-dlp kurulu gelir)
   - **Instance type**: Free
   - **Health Check Path**: `/health`
3. **Environment** bölümüne `worker/.env.example` listesini girin:

   | Değişken | Değer |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role anahtarı |
   | `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
   | `ANTHROPIC_MODEL` | `claude-opus-5-5` (en iyi sonuç). Daha ucuz seçenek: `claude-sonnet-5-5` |
   | `TRANSCRIBE_PROVIDER` | `groq` |
   | `GROQ_API_KEY` | console.groq.com → API Keys |
   | `WORKER_SHARED_SECRET` | Vercel'e girdiğiniz şifrenin aynısı |
   | `DAILY_IMPORT_LIMIT` | `20` |
   | `YTDLP_COOKIES_B64` | (isteğe bağlı, Instagram için; bkz. 5. adım) |

4. **Create Web Service**. Adres `https://<ad>.onrender.com` olur; bunu Vercel'deki `WORKER_URL` değişkenine yazıp Vercel'i yeniden deploy edin.
5. Kontrol: tarayıcıda `https://<ad>.onrender.com/health` → `{"ok":true,"queue":true}` görmelisiniz.

> Render yerine **Railway** veya **Fly.io** da kullanabilirsiniz; aynı Dockerfile ve aynı ortam değişkenleri geçerlidir.

### 4. Google ile giriş

E-posta ile giriş kurulum gerektirmez. Google ile giriş isterseniz:

1. https://console.cloud.google.com → yeni proje → **APIs & Services → OAuth consent screen** → *External*, uygulama adı "Tarif Defterim", e-postanızı girin, kaydedin.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   - *Authorized JavaScript origins*: `https://<projeniz>.vercel.app`
   - *Authorized redirect URIs*: `https://<supabase-proje-id>.supabase.co/auth/v1/callback` (Supabase → Authentication → Providers → Google sayfasında yazar)
3. Oluşan **Client ID** ve **Client Secret** değerlerini Supabase → **Authentication → Providers → Google** bölümüne yapıştırıp etkinleştirin.

### 5. Instagram çerezi (isteğe bağlı)

Instagram çoğu içerik için giriş ister. Giriş yapmadan deneyince uygulama size "Instagram giriş istiyor; ekran görüntüsü yükleyin" yedeğini sunar — bu yol her zaman çalışır. Daha otomatik olsun isterseniz worker'a kendi Instagram oturum çerezinizi verebilirsiniz:

1. Bilgisayarda Chrome/Firefox ile instagram.com'a **giriş yapın** (tercihen asıl hesabınız değil, ikinci bir hesap).
2. "Get cookies.txt LOCALLY" (Chrome) veya "cookies.txt" (Firefox) eklentisini kurun; instagram.com sayfasındayken **Export** deyip `cookies.txt` dosyasını indirin.
3. Dosyayı base64'e çevirin:
   - Mac/Linux: `base64 -w0 cookies.txt` (Mac'te `base64 -i cookies.txt`)
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("cookies.txt"))`
4. Çıkan uzun metni Render'da `YTDLP_COOKIES_B64` değişkenine yapıştırın, servisi yeniden başlatın.

Uyarılar: Çerez dosyasını kimseyle paylaşmayın; süresi dolunca (birkaç hafta/ay) yenisini çıkarın. Instagram hesabı çok sık istek yapınca geçici kısıtlama uygulayabilir; günlük limiti düşük tutun.

---

## Tahmini aylık maliyet

Ayda **60 tarif** ekleyen tek bir kullanıcı için (yarısı video, yarısı tarif sitesi):

| Kalem | Hesap | Aylık |
|---|---|---|
| Supabase (500 MB veritabanı, 1 GB depolama) | ücretsiz plan | 0 $ |
| Vercel (hobby) | ücretsiz plan | 0 $ |
| Render (worker, 750 saat) | ücretsiz plan | 0 $ |
| Groq Whisper | ücretsiz kota (günde ~2 saat ses) | 0 $ |
| Claude — tarif sitesi (≈3K giriş + 0,6K çıkış token) | 30 × 0,025 $ | ≈ 0,75 $ |
| Claude — video (8 kare ≈ 10K giriş + 0,8K çıkış token) | 30 × 0,06 $ | ≈ 1,80 $ |
| **Toplam** | | **≈ 2,5 $ / ay** (≈ 85 ₺) |

`ANTHROPIC_MODEL=claude-sonnet-5-5` seçilirse Claude kalemi yarıya iner (≈ 1,3 $/ay). Her işin token ve maliyet bilgisi `import_jobs` tablosunda (`input_tokens`, `output_tokens`, `cost_usd`) tutulur; Supabase'den takip edebilirsiniz.

---

## Geliştirme ve testler

```bash
# JS tarafı (Node 20+, pnpm 10)
pnpm install
cp web/.env.example web/.env.local      # değerleri doldurun
pnpm dev                                # http://localhost:3000
pnpm test                               # ölçü paketi + web testleri (25 test)
pnpm lint && pnpm typecheck

# Worker (Python 3.11+, ffmpeg kurulu olmalı)
cd worker
uv venv && uv pip install -e ".[dev]"   # ya da: python -m venv .venv && pip install -e ".[dev]"
cp .env.example .env                    # değerleri doldurun
.venv/bin/uvicorn app.main:app --reload # http://localhost:8000/health
.venv/bin/pytest                        # 30 test: SSRF, normalize, JSON-LD, LLM, platform başına mock'lu uçtan uca hat
```

Klasörler:

- `web/` — Next.js App Router + TypeScript arayüz (giriş, CRUD, canlı ilerleme, PWA, Share Target)
- `worker/` — FastAPI + Postgres kuyruğu; `app/pipeline.py` hattın tamamı
- `packages/measure/` — saf TypeScript ölçü analizi (birimler, yoğunluk tablosu, ölçekleme, SVG görsel mantığı)
- `supabase/migrations/` — şema, RLS, storage politikaları, kuyruk fonksiyonları
- `reference/` — tasarım referansı

Tasarım kuralları: 360 px genişlikte yatay kaydırma yok, tüm dokunma hedefleri en az 44 px, tüm hata mesajları Türkçe ve ne yapılacağını söyler.

---

## Android uygulaması (APK)

`mobile/` klasörü siteyi açan bir Android kabuğudur (Capacitor). Paylaş menüsünde "Tarif Defterim'e ekle" seçeneği ekler ve siteye ait linkleri (e-posta giriş bağlantısı dahil) uygulamanın içinde açar.

```bash
cd mobile && npm install
export ANDROID_HOME=/opt/android-sdk   # Android SDK (platform 35, build-tools 35)
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

İmza anahtarı `mobile/keystore/tarif-defterim.jks` (şifre: `tarifdefterim`). Yayınlanmayan kişisel sürüm için depoda tutulur; mağazaya çıkarmadan önce yeni bir anahtar üretin. Site adresi değişirse `capacitor.config.json`, `MainActivity.java` ve `web/public/.well-known/assetlinks.json` güncellenir.

## Sorun giderme

| Belirti | Sebep / çözüm |
|---|---|
| "Kurulum gerekli" sayfası | `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` girilmemiş. Vercel → Environment Variables'ı kontrol edip yeniden deploy edin. |
| Giriş bağlantısına tıklayınca hata | Supabase → Authentication → URL Configuration'da Redirect URL eksik (`/auth/callback`). |
| Link ekledim, "Sırada bekliyor"da kalıyor | Worker çalışmıyor ya da uyuyor. `https://<worker>/health` açın; `queue:false` ise Render'daki `SUPABASE_*` değişkenleri eksik. Ücretsiz Render 30-60 sn'de uyanır. |
| İlerleme çubuğu canlı güncellenmiyor | SQL'deki `alter publication supabase_realtime add table import_jobs` çalışmamış olabilir; `0001_init.sql`'i tekrar çalıştırın. Arayüz yine de 5 sn'de bir kendini yeniler. |
| "Instagram bu içerik için giriş istiyor" | Beklenen durum. Ekran görüntüsü yükleyin ya da 5. adımdaki çerezi ekleyin. |
| "Video 10 dakikadan uzun" | Sınır `MAX_VIDEO_SECONDS` ile değiştirilebilir; uzun videolar maliyeti artırır. |
| Tarif eklendi ama miktarlar "tahmini" | Videoda miktar söylenmemiş. Tarif detayında sarı vurgulu alanları düzenleyip "Kontrol et" rozetini kaldırın. |
