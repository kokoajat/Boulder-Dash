# Boulder Dash – Android

Uusi versio klassisesta Boulder Dash -luolapelistä Android-puhelimelle.
Peli on toteutettu HTML5/Canvas-tekniikalla (`web/`), joten se toimii suoraan
puhelimen selaimessa, kotinäytölle asennettavana PWA-sovelluksena sekä
oikeana Android-sovelluksena (`android/`, WebView-kääre).

## Ominaisuudet

- 12 käsin suunniteltua luolaa (40 × 22 ruutua), vaikeusaste kasvaa luola luolalta.
- Klassiset pelimekaniikat: kaivettava maa, putoavat ja vierivät kivet, timantit,
  tulikärpäset, perhoset (räjähtävät timanteiksi), ameeba, taikaseinä, aikaraja,
  uloskäynti joka aukeaa kun timantteja on kerätty tarpeeksi.
- **Rajattomat elämät** – kuoleman jälkeen luola alkaa alusta, ei game overia.
- **Edistyminen tallentuu** automaattisesti (localStorage): avatut luolat, viimeksi
  pelattu luola, parhaat pisteet luolittain, kuolemien määrä ja asetukset.
- Ohjaus ruudun alareunassa, valittavissa asetuksista:
  - **Nuolinäppäimet** (d-pad) – peukaloa voi liu'uttaa painikkeelta toiselle.
  - **Peukalojoystick** – kosketa mihin tahansa ohjausalueella ja vedä haluttuun suuntaan.
  - **Herkkyys** (matala / keski / korkea) säätää, kuinka pieni peukalon liike riittää.
- Kaksi grafiikkatyyliä: **Moderni** (resoluutiosta riippumaton vektorigrafiikka, sulava
  liike, partikkelit) ja **Retro** (8×8-pikseligrafiikka).
- Näppäimistöllä (nuolet / WASD, Esc = tauko) peli toimii myös tietokoneella.
- Syntetisoidut retroäänet (kytkettävissä pois), toimii ilman verkkoyhteyttä.

## Pelaaminen heti (ilman APK:ta)

### GitHub Pages

Repo sisältää työnkulun (`.github/workflows/pages.yml`), joka julkaisee
`web/`-kansion automaattisesti GitHub Pagesiin, kun peliin tulee muutoksia.
Käyttöönotto kerran:

1. Repon on oltava julkinen (tai tilillä maksullinen GitHub-tilaus), koska
   Pages ei toimi ilmaisen tilin yksityisissä repoissa.
   *Settings → General → Danger Zone → Change repository visibility.*
2. *Settings → Pages → Build and deployment → Source:* valitse **GitHub Actions**.
3. Käynnistä työnkulku: *Actions → "Julkaise peli GitHub Pagesiin" → Run workflow*
   (tai pushaa muutos `web/`-kansioon).
4. Peli on osoitteessa `https://<käyttäjä>.github.io/Boulder-Dash/`.

### Oma palvelin

Tarjoile `web/`-kansio millä tahansa web-palvelimella, esim.
`npx http-server web -p 8080`.

### Asennus puhelimeen

1. Avaa osoite puhelimen Chromessa.
2. Paina valikon painiketta **Asenna sovellus puhelimeen** (näkyy, kun selain
   tarjoaa asennusta) tai valitse Chromen valikosta **Lisää aloitusnäytölle**.
   Peli asentuu koko ruudun PWA-sovellukseksi ja toimii jatkossa myös offline-tilassa.
3. Uudet versiot päivittyvät automaattisesti: service worker versioidaan
   jokaisessa julkaisussa, ja peli lataa uuden version seuraavalla käynnistyksellä
   tai valikkoon palattaessa.

## Android-sovelluksen (APK) kääntäminen

Vaatimukset: Android Studio (tai Android SDK + JDK 17).

```bash
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Tai avaa `android/`-kansio Android Studiossa ja paina **Run**.
Sovellus paketoi `web/`-kansion suoraan asseteikseen (`app/build.gradle.kts`),
joten pelin muutokset näkyvät seuraavassa käännöksessä ilman kopiointia.

Sovellus lukitsee pystysuunnan, piilottaa järjestelmäpalkit ja pitää ruudun
päällä pelin aikana. Takaisin-painike pysäyttää pelin tauolle tai palaa valikkoon.

## Hakemistorakenne

```
web/                 Peli (HTML5)
  index.html         Ruudut: valikko, peli, ohjaimet
  css/style.css      Ulkoasu (mobiili ensin, safe area -marginaalit)
  js/engine.js       Luolan fysiikka ja säännöt
  js/caves.js        Luolien määrittelyt ja generointi
  js/sprites.js      8x8 pikseligrafiikka (retro)
  js/sprites-modern.js  Vektorigrafiikka (moderni)
  js/input.js        D-pad, joystick ja näppäimistö
  js/audio.js        Äänet (WebAudio)
  js/storage.js      Tallennus (localStorage)
  js/main.js         Pelisilmukka, piirto ja ruutujen logiikka
  manifest.webmanifest, sw.js   PWA
android/             Android-kääre (Kotlin, WebView + WebViewAssetLoader)
```

## Uuden luolan lisääminen

Luolat määritellään tiedostossa `web/js/caves.js`. Jokaisella luolalla on
siemenluku (`seed`) ja täyttötodennäköisyydet (`fill`) satunnaista maastoa
varten sekä lista käsin piirrettyjä rakenteita (`objects`): viivoja,
suorakaiteita, yksittäisiä ruutuja, aloituspaikka `P` ja uloskäynti `X`.

## Testit

```bash
node tests/validate-caves.js    # luolien eheystarkistus (lisää "maps" nähdäksesi kartat)
node tests/engine.test.js       # pelimoottorin yksikkötestit
```
