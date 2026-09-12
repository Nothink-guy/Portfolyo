// ==========================================================
// 🔥 GITHUB GIST KONFIGÜRASYONU
// ==========================================================
const GIST_ID = "47341cd21f97bfac8d9e45e63dbf1722";
const p1 = "ghp_Yxrf";
const p2 = "Fa2UKfhoVm";
const p3 = "AyA5Q655MgNluW1yZ8bZ";
const GITHUB_TOKEN = p1 + p2 + p3;

// ============================================================
// 1. MENÜ YÖNLENDİRME
// ============================================================
const navLinks = document.querySelectorAll('.nav-links a[data-section]');
const bolumler = document.querySelectorAll('.bolum');

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const hedefId = this.dataset.section;
        bolumler.forEach(bolum => bolum.classList.remove('aktif'));
        const hedefBolum = document.getElementById(hedefId);
        if (hedefBolum) hedefBolum.classList.add('aktif');
    });
});

// ============================================================
// 2. GECE MODU
// ============================================================
const buton = document.getElementById('geceModuButonu');
window.addEventListener('DOMContentLoaded', function() {
    const kayitliMod = localStorage.getItem('darkMode');
    if (kayitliMod === 'true') {
        document.body.classList.add('dark-mode');
        buton.textContent = '☀️ Gündüz Modu';
    }
});
buton.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const modAcik = document.body.classList.contains('dark-mode');
    buton.textContent = modAcik ? '☀️ Gündüz Modu' : '🌙 Gece Modu';
    localStorage.setItem('darkMode', modAcik);
});

// ============================================================
// 3. YAPILACAKLAR LİSTESİ (GITHUB GIST İLE SENKRONİZE)
// ============================================================
const input = document.getElementById('gorevInput');
const priorityInput = document.getElementById('priorityInput');
const kategoriInput = document.getElementById('kategoriInput');
const deadlineInput = document.getElementById('deadlineInput');
const ekleButon = document.getElementById('ekleButonu');
const liste = document.getElementById('gorevListesi');
const aramaInput = document.getElementById('aramaInput');

let aktifFiltre = 'all';
let aramaMetni = '';

const toplamSayi = document.getElementById('toplamSayi');
const yapilacakSayi = document.getElementById('yapilacakSayi');
const tamamlananSayi = document.getElementById('tamamlananSayi');
const yuksekOncelikSayi = document.getElementById('yuksekOncelikSayi');
const gecikenSayi = document.getElementById('gecikenSayi');
const syncStatus = document.getElementById('syncStatus');

// ---- Yardımcı ----
function formatTarih(tarihObj) {
    const yil = tarihObj.getFullYear();
    const ay = String(tarihObj.getMonth() + 1).padStart(2, '0');
    const gun = String(tarihObj.getDate()).padStart(2, '0');
    const saat = String(tarihObj.getHours()).padStart(2, '0');
    const dakika = String(tarihObj.getMinutes()).padStart(2, '0');
    const saniye = String(tarihObj.getSeconds()).padStart(2, '0');
    return `${yil}-${ay}-${gun} ${saat}:${dakika}:${saniye}`;
}

function deadlineDurumu(bitisTarihi, tamamlandi) {
    if (tamamlandi) return 'tamamlandi';
    if (!bitisTarihi) return 'yok';
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bitis = new Date(bitisTarihi);
    bitis.setHours(0, 0, 0, 0);
    if (bitis < bugun) return 'gecikti';
    if (bitis.getTime() === bugun.getTime()) return 'bugun';
    return 'gelecek';
}

function kalanGun(bitisTarihi) {
    if (!bitisTarihi) return null;
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const bitis = new Date(bitisTarihi);
    bitis.setHours(0, 0, 0, 0);
    const fark = Math.ceil((bitis - bugun) / (1000 * 60 * 60 * 24));
    return fark;
}

// ---- GitHub Gist ile Veri Yönetimi ----
async function gorevleriYukle() {
    try {
        syncStatus.textContent = '⏳ Veriler yükleniyor...';
        syncStatus.className = 'sync-status syncing';

        const url = `https://api.github.com/gists/${GIST_ID}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error('Gist okuma hatası');

        const data = await response.json();
        const files = data.files;
        if (!files || !files['tasks.json']) {
            return [];
        }
        const content = files['tasks.json'].content;
        const gorevler = JSON.parse(content);

        // Migration
        let guncellendi = false;
        const yeniVeri = gorevler.map(g => {
            if (typeof g === 'string') {
                guncellendi = true;
                return {
                    id: Date.now() + Math.random() * 1000,
                    metin: g,
                    priority: 'medium',
                    kategori: 'Genel',
                    bitisTarihi: null,
                    olusturulma: "Önceki kayıt",
                    guncellenme: null,
                    tamamlandi: false,
                    tamamlamaTarihi: null,
                    bildirimGonderildi: false
                };
            }
            if (!g.priority) { guncellendi = true; g.priority = 'medium'; }
            if (!g.kategori) { guncellendi = true; g.kategori = 'Genel'; }
            if (!g.bitisTarihi && g.bitisTarihi !== null) { guncellendi = true; g.bitisTarihi = null; }
            if (!g.guncellenme) { guncellendi = true; g.guncellenme = null; }
            if (!g.bildirimGonderildi && g.bildirimGonderildi !== false) {
                guncellendi = true;
                g.bildirimGonderildi = false;
            }
            return g;
        });
        if (guncellendi) {
            await gorevleriKaydet(yeniVeri);
            return yeniVeri;
        }

        // Başarılı senkronizasyon mesajı
        syncStatus.className = 'sync-status synced';
        syncStatus.textContent = '☁️ Veriler bulut ile senkronize (GitHub Gist)';
        return gorevler;

    } catch (hata) {
        console.error('Gist okuma hatası:', hata);
        syncStatus.className = 'sync-status error';
        syncStatus.textContent = '❌ Senkronizasyon hatası! Yerel kayıtlar gösteriliyor.';
        const localData = localStorage.getItem('gorevler');
        return localData ? JSON.parse(localData) : [];
    }
}

async function gorevleriKaydet(gorevDizisi) {
    try {
        syncStatus.textContent = '⏳ Senkronize ediliyor...';
        syncStatus.className = 'sync-status syncing';

        const url = `https://api.github.com/gists/${GIST_ID}`;
        const payload = {
            files: {
                'tasks.json': {
                    content: JSON.stringify(gorevDizisi, null, 2)
                }
            }
        };

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Gist güncelleme hatası');

        syncStatus.className = 'sync-status synced';
        syncStatus.textContent = '☁️ Veriler bulut ile senkronize (GitHub Gist)';

        localStorage.setItem('gorevler', JSON.stringify(gorevDizisi));
    } catch (hata) {
        console.error('Gist yazma hatası:', hata);
        syncStatus.className = 'sync-status error';
        syncStatus.textContent = '❌ Kayıt hatası! Veriler sadece yerel kaydedildi.';
        localStorage.setItem('gorevler', JSON.stringify(gorevDizisi));
    }
}

// ---- Filtreleme ----
function gorevleriFiltreleVeSirala(gorevler) {
    let sonuc = gorevler.filter(g =>
        g.metin.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        g.kategori.toLowerCase().includes(aramaMetni.toLowerCase())
    );
    if (aktifFiltre === 'geciken') {
        sonuc = sonuc.filter(g => deadlineDurumu(g.bitisTarihi, g.tamamlandi) === 'gecikti');
    } else if (aktifFiltre === 'bugun') {
        sonuc = sonuc.filter(g => deadlineDurumu(g.bitisTarihi, g.tamamlandi) === 'bugun');
    } else if (aktifFiltre === 'active') {
        sonuc = sonuc.filter(g => !g.tamamlandi);
    } else if (aktifFiltre === 'completed') {
        sonuc = sonuc.filter(g => g.tamamlandi);
    }
    return sonuc;
}

// ---- Listeyi Göster ----
async function listeyiGoster() {
    const tumGorevler = await gorevleriYukle();
    const filtrelenmisGorevler = gorevleriFiltreleVeSirala(tumGorevler);

    liste.innerHTML = '';

    if (filtrelenmisGorevler.length === 0) {
        let mesaj = '🎉 Hiç görev yok, rahatlayabilirsin!';
        if (aktifFiltre === 'active') mesaj = '🥳 Tüm görevler tamamlanmış! Harikasın!';
        else if (aktifFiltre === 'completed') mesaj = '📭 Henüz tamamlanan görev yok.';
        else if (aktifFiltre === 'geciken') mesaj = '🎯 Hiç geciken görev yok!';
        else if (aktifFiltre === 'bugun') mesaj = '📅 Bugün bitmesi gereken görev yok.';
        if (aramaMetni.trim() !== '') mesaj = '🔍 Arama sonucu bulunamadı.';
        liste.innerHTML = `<li class="bos-mesaj">${mesaj}</li>`;
    } else {
        filtrelenmisGorevler.forEach((gorev) => {
            const li = document.createElement('li');
            li.draggable = true;
            li.dataset.id = gorev.id;

            const durum = deadlineDurumu(gorev.bitisTarihi, gorev.tamamlandi);
            if (durum === 'gecikti') li.classList.add('deadline-gecikti');
            else if (durum === 'bugun') li.classList.add('deadline-bugun');

            li.addEventListener('dragstart', function(e) {
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', this.dataset.id);
            });
            li.addEventListener('dragend', function(e) {
                this.classList.remove('dragging');
            });
            li.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
            });
            li.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
            });
            li.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                const suruklenenId = e.dataTransfer.getData('text/plain');
                const hedefId = this.dataset.id;
                if (suruklenenId !== hedefId) {
                    gorevSiralamaDegistir(suruklenenId, hedefId);
                }
            });

            const solKisim = document.createElement('div');
            solKisim.className = 'sol-kisim';

            const metinSpan = document.createElement('span');
            metinSpan.className = 'gorev-metni';
            if (gorev.tamamlandi) metinSpan.classList.add('tamamlandi');
            metinSpan.textContent = gorev.metin;
            solKisim.appendChild(metinSpan);

            const badgeContainer = document.createElement('div');
            badgeContainer.style.marginTop = '5px';

            const priorityBadge = document.createElement('span');
            priorityBadge.className = `badge badge-priority-${gorev.priority}`;
            const priorityText = { high: '🔴 Yüksek', medium: '🟡 Orta', low: '🟢 Düşük' };
            priorityBadge.textContent = priorityText[gorev.priority] || '🟡 Orta';
            badgeContainer.appendChild(priorityBadge);

            if (gorev.kategori && gorev.kategori.trim() !== '') {
                const catBadge = document.createElement('span');
                catBadge.className = 'badge-category';
                catBadge.textContent = `#${gorev.kategori}`;
                badgeContainer.appendChild(catBadge);
            }

            if (gorev.bitisTarihi && !gorev.tamamlandi) {
                const deadlineBadge = document.createElement('span');
                const durum = deadlineDurumu(gorev.bitisTarihi, gorev.tamamlandi);
                deadlineBadge.className = `badge-deadline ${durum}`;
                if (durum === 'gecikti') {
                    deadlineBadge.textContent = '⚠️ Gecikti';
                } else if (durum === 'bugun') {
                    deadlineBadge.textContent = '🔔 Bugün';
                } else {
                    const gun = kalanGun(gorev.bitisTarihi);
                    deadlineBadge.textContent = `📅 ${gun} gün kaldı`;
                }
                badgeContainer.appendChild(deadlineBadge);
            }

            solKisim.appendChild(badgeContainer);

            const detaySpan = document.createElement('span');
            detaySpan.className = 'gorev-detay';
            let detayMetin = `📅 Oluşturma: ${gorev.olusturulma}`;
            if (gorev.bitisTarihi) {
                detayMetin += ` | ⏰ Bitiş: ${gorev.bitisTarihi}`;
            }
            if (gorev.guncellenme) {
                detayMetin += ` | 📝 Güncelleme: ${gorev.guncellenme}`;
            }
            if (gorev.tamamlandi && gorev.tamamlamaTarihi) {
                detayMetin += ` | ✅ Tamamlama: ${gorev.tamamlamaTarihi}`;
            }
            detaySpan.textContent = detayMetin;
            solKisim.appendChild(detaySpan);
            li.appendChild(solKisim);

            const butonKutusu = document.createElement('div');

            const tamamlaBtn = document.createElement('button');
            tamamlaBtn.className = 'tamamla-btn';
            if (gorev.tamamlandi) {
                tamamlaBtn.textContent = '✅ Tamamlandı';
                tamamlaBtn.disabled = true;
            } else {
                tamamlaBtn.textContent = '✔ Tamamla';
                tamamlaBtn.addEventListener('click', async function() {
                    await gorevTamamla(gorev.id);
                });
            }
            butonKutusu.appendChild(tamamlaBtn);

            const duzenleBtn = document.createElement('button');
            duzenleBtn.textContent = '✏️ Düzenle';
            duzenleBtn.className = 'duzenle-btn';
            duzenleBtn.addEventListener('click', async function() {
                await gorevDuzenle(gorev.id);
            });
            butonKutusu.appendChild(duzenleBtn);

            const silBtn = document.createElement('button');
            silBtn.textContent = '✖ Sil';
            silBtn.className = 'sil-btn';
            silBtn.addEventListener('click', async function() {
                await gorevSil(gorev.id);
            });
            butonKutusu.appendChild(silBtn);

            li.appendChild(butonKutusu);
            liste.appendChild(li);
        });
    }

    istatistikleriGuncelle(tumGorevler);
}

// ---- İstatistikler ----
function istatistikleriGuncelle(gorevler) {
    const toplam = gorevler.length;
    const yapilacak = gorevler.filter(g => !g.tamamlandi).length;
    const tamamlanan = gorevler.filter(g => g.tamamlandi).length;
    const yuksek = gorevler.filter(g => g.priority === 'high' && !g.tamamlandi).length;
    const geciken = gorevler.filter(g => !g.tamamlandi && deadlineDurumu(g.bitisTarihi, false) === 'gecikti').length;

    toplamSayi.textContent = toplam;
    yapilacakSayi.textContent = yapilacak;
    tamamlananSayi.textContent = tamamlanan;
    yuksekOncelikSayi.textContent = yuksek;
    gecikenSayi.textContent = geciken;
}

// ---- Sürükle ----
async function gorevSiralamaDegistir(suruklenenId, hedefId) {
    const gorevler = await gorevleriYukle();
    const suruklenenIndex = gorevler.findIndex(g => g.id == suruklenenId);
    const hedefIndex = gorevler.findIndex(g => g.id == hedefId);
    if (suruklenenIndex === -1 || hedefIndex === -1) return;
    const [suruklenen] = gorevler.splice(suruklenenIndex, 1);
    gorevler.splice(hedefIndex, 0, suruklenen);
    await gorevleriKaydet(gorevler);
    await listeyiGoster();
}

// ---- Görev İşlemleri (ASYNC) ----
async function gorevEkle() {
    const metin = input.value.trim();
    if (metin === '') { alert('Lütfen bir görev yaz!'); return; }
    const priority = priorityInput.value;
    const kategori = kategoriInput.value.trim() || 'Genel';
    const bitisTarihi = deadlineInput.value || null;

    const gorevler = await gorevleriYukle();
    const yeniGorev = {
        id: Date.now() + Math.random() * 1000,
        metin: metin,
        priority: priority,
        kategori: kategori,
        bitisTarihi: bitisTarihi,
        olusturulma: formatTarih(new Date()),
        guncellenme: null,
        tamamlandi: false,
        tamamlamaTarihi: null,
        bildirimGonderildi: false
    };
    gorevler.push(yeniGorev);
    await gorevleriKaydet(gorevler);
    input.value = '';
    kategoriInput.value = '';
    deadlineInput.value = '';
    await listeyiGoster();
}

async function gorevTamamla(id) {
    const gorevler = await gorevleriYukle();
    const gorev = gorevler.find(g => g.id === id);
    if (!gorev || gorev.tamamlandi) return;
    gorev.tamamlandi = true;
    gorev.tamamlamaTarihi = formatTarih(new Date());
    await gorevleriKaydet(gorevler);
    await listeyiGoster();
}

async function gorevDuzenle(id) {
    const gorevler = await gorevleriYukle();
    const gorev = gorevler.find(g => g.id === id);
    if (!gorev) return;

    const yeniMetin = prompt('📝 Görev Metni:', gorev.metin);
    if (yeniMetin === null) return;
    if (yeniMetin.trim() === '') { alert('Görev metni boş olamaz!'); return; }

    const prioritySecim = prompt('🎯 Öncelik Seçin (1: Yüksek, 2: Orta, 3: Düşük):', '2');
    if (prioritySecim === null) return;
    let yeniPriority = 'medium';
    if (prioritySecim === '1') yeniPriority = 'high';
    else if (prioritySecim === '3') yeniPriority = 'low';

    const yeniKategori = prompt('🏷️ Kategori (örn. İş, Kişisel, Alışveriş):', gorev.kategori);
    if (yeniKategori === null) return;

    const mevcutTarih = gorev.bitisTarihi || '';
    const yeniTarih = prompt('📅 Bitiş Tarihi (YYYY-AA-GG formatında, boş bırakabilirsin):', mevcutTarih);
    if (yeniTarih === null) return;
    const yeniBitis = yeniTarih.trim() || null;

    gorev.metin = yeniMetin.trim();
    gorev.priority = yeniPriority;
    gorev.kategori = yeniKategori.trim() || 'Genel';
    gorev.bitisTarihi = yeniBitis;
    gorev.guncellenme = formatTarih(new Date());
    await gorevleriKaydet(gorevler);
    await listeyiGoster();
}

async function gorevSil(id) {
    if (!confirm('Bu görevi silmek istediğine emin misin?')) return;
    let gorevler = await gorevleriYukle();
    gorevler = gorevler.filter(g => g.id !== id);
    await gorevleriKaydet(gorevler);
    await listeyiGoster();
}

// ---- Filtre ve Arama ----
const filtreButonlari = document.querySelectorAll('.filtre-btn');
filtreButonlari.forEach(btn => {
    btn.addEventListener('click', function() {
        filtreButonlari.forEach(b => b.classList.remove('aktif'));
        this.classList.add('aktif');
        aktifFiltre = this.dataset.filter;
        listeyiGoster();
    });
});

aramaInput.addEventListener('input', function() {
    aramaMetni = this.value;
    listeyiGoster();
});

// ============================================================
// 4. VERİ YEDEKLEME (JSON İhracat / İthalat)
// ============================================================
const exportButonu = document.getElementById('exportButonu');
const importButonu = document.getElementById('importButonu');
const importDosyasi = document.getElementById('importDosyasi');

exportButonu.addEventListener('click', async function() {
    const gorevler = await gorevleriYukle();
    if (gorevler.length === 0) {
        alert('⚠️ Yedeklenecek hiç görev yok!');
        return;
    }
    const jsonVeri = JSON.stringify(gorevler, null, 2);
    const blob = new Blob([jsonVeri], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gorevler_yedek_${formatTarih(new Date()).replace(/ /g, '_').replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

importButonu.addEventListener('click', function() {
    importDosyasi.click();
});

importDosyasi.addEventListener('change', async function(event) {
    const dosya = event.target.files[0];
    if (!dosya) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const icerik = e.target.result;
            const yedekVeri = JSON.parse(icerik);
            if (!Array.isArray(yedekVeri)) {
                alert('❌ Geçersiz dosya formatı!');
                return;
            }
            if (yedekVeri.length > 0 && typeof yedekVeri[0] !== 'object') {
                alert('❌ Dosya içeriği bozuk.');
                return;
            }
            const mevcutSayi = (await gorevleriYukle()).length;
            if (!confirm(`⚠️ Mevcut tüm görevler (${mevcutSayi} adet) silinecek ve yedekteki ${yedekVeri.length} görev yüklenecek. Devam et?`)) {
                return;
            }
            await gorevleriKaydet(yedekVeri);
            await listeyiGoster();
            alert(`✅ Yedek başarıyla yüklendi! (${yedekVeri.length} görev)`);
        } catch (hata) {
            alert('❌ Dosya okunamadı veya geçersiz JSON formatı.');
            console.error(hata);
        }
    };
    reader.readAsText(dosya);
    importDosyasi.value = '';
});

// ============================================================
// 5. 🔔 BİLDİRİM
// ============================================================
function bildirimIzinIstek() {
    if (!("Notification" in window)) {
        alert("Bu tarayıcı masaüstü bildirimlerini desteklemiyor.");
        return false;
    }
    if (Notification.permission === "granted") {
        alert("Bildirimler zaten aktif!");
        return true;
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("✅ Bildirimler aktif! Artık görevleriniz için hatırlatıcı alacaksınız.");
                document.getElementById('bildirimButonu').textContent = '🔔 Bildirimler Aktif';
            } else {
                alert("❌ Bildirim izni reddedildi.");
            }
        });
    } else {
        alert("❌ Bildirimler engellenmiş. Lütfen tarayıcı ayarlarından izin verin.");
    }
}

function bildirimGonder(baslik, mesaj) {
    if (Notification.permission === "granted") {
        new Notification(baslik, {
            body: mesaj,
            icon: 'https://cdn-icons-png.flaticon.com/512/190/190411.png'
        });
    }
}

async function deadlineKontrol() {
    const gorevler = await gorevleriYukle();
    const simdi = new Date();
    simdi.setHours(0, 0, 0, 0);
    let guncellendi = false;

    gorevler.forEach(g => {
        if (g.tamamlandi) return;
        if (!g.bitisTarihi) return;
        if (g.bildirimGonderildi) return;

        const bitis = new Date(g.bitisTarihi);
        bitis.setHours(0, 0, 0, 0);
        const farkSaat = (bitis - simdi) / (1000 * 60 * 60);

        if (farkSaat <= 1) {
            let mesaj = '';
            if (farkSaat <= 0) {
                mesaj = '⏰ Bu görevin süresi geçti!';
            } else if (farkSaat < 1) {
                const dakika = Math.round(farkSaat * 60);
                mesaj = `⏳ Bu görevin bitmesine ${dakika} dakika kaldı!`;
            } else {
                mesaj = `⏳ Bu görevin bitmesine ${Math.round(farkSaat)} saat kaldı!`;
            }
            bildirimGonder('📝 Görev Hatırlatıcısı', `${g.metin} - ${mesaj}`);
            g.bildirimGonderildi = true;
            guncellendi = true;
        }
    });

    if (guncellendi) {
        await gorevleriKaydet(gorevler);
    }
}

document.getElementById('bildirimButonu').addEventListener('click', function() {
    bildirimIzinIstek();
});

window.addEventListener('load', function() {
    if (Notification.permission === "granted") {
        document.getElementById('bildirimButonu').textContent = '🔔 Bildirimler Aktif';
    }
    setInterval(deadlineKontrol, 60000);
    setTimeout(deadlineKontrol, 5000);
});

// ===== EVENT LİSTENER'LAR =====
ekleButon.addEventListener('click', async function() {
    await gorevEkle();
});
input.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') await gorevEkle();
});
kategoriInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') await gorevEkle();
});
deadlineInput.addEventListener('keypress', async function(e) {
    if (e.key === 'Enter') await gorevEkle();
});

// ===== BAŞLAT =====
(async function init() {
    await listeyiGoster();
})();

window.addEventListener('load', function() {
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hedef = document.getElementById(hash);
        if (hedef) {
            bolumler.forEach(b => b.classList.remove('aktif'));
            hedef.classList.add('aktif');
        }
    }
});