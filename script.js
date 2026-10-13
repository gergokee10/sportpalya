let palyak = [];
let foglalasok = [];
let nezet = 'tablazat';

const lista = document.getElementById('lista');
const keres = document.getElementById('keres');
const szuroPalya = document.getElementById('szuroPalya');
const urlap = document.getElementById('foglalasUrlap');
const nev = document.getElementById('nev');
const email = document.getElementById('email');
const telefon = document.getElementById('telefon');
const palya = document.getElementById('palya');
const datum = document.getElementById('datum');
const ora = document.getElementById('ora');
const letszam = document.getElementById('letszam');
const hibaDoboz = document.getElementById('hibak');
const sikerDoboz = document.getElementById('siker');
const felGomb = document.getElementById('felGomb');

// json fájlok betöltése
fetch('palyak.json')
  .then(valasz => valasz.json())
  .then(adat => {
    palyak = adat;
    return fetch('foglalasok.json');
  })
  .then(valasz => valasz.json())
  .then(adat => {
    foglalasok = adat;
    for (const p of palyak) {
      szuroPalya.innerHTML += `<option value="${p.id}">${p.nev}</option>`;
      palya.innerHTML += `<option value="${p.id}">${p.nev} (${p.oradij} Ft/óra)</option>`;
    }
    datum.min = maiDatum();
    megjelenites();
  });

function maiDatum() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function palyaNev(id) {
  return palyak.find(p => p.id == id).nev;
}

// ---------- foglalások listája ----------

function megjelenites() {
  const szurt = foglalasok.filter(f => !f.torolve
    && f.nev.toLowerCase().includes(keres.value.toLowerCase())
    && (szuroPalya.value == '' || f.palyaId == szuroPalya.value));

  let html = '';
  if (nezet == 'tablazat') {
    html = '<div class="table-responsive"><table class="table table-striped table-bordered">'
      + '<tr class="table-dark"><th>Azonosító</th><th>Név</th><th>E-mail</th><th>Telefon</th><th>Pálya</th>'
      + '<th>Dátum</th><th>Időpont</th><th>Létszám</th><th>Összeg</th><th>Törlés</th></tr>';
    for (const f of szurt) {
      html += `<tr><td>${f.id}</td><td>${f.nev}</td><td>${f.email}</td><td>${f.telefon}</td>
        <td>${palyaNev(f.palyaId)}</td><td>${f.datum}</td><td>${f.ora}</td><td>${f.letszam} fő</td>
        <td>${f.osszeg} Ft</td><td><button class="btn btn-danger btn-sm torles" value="${f.id}">Törlés</button></td></tr>`;
    }
    html += '</table></div>';
  } else {
    html = '<div class="row">';
    for (const f of szurt) {
      html += `<div class="col-md-4 mb-3"><div class="card"><div class="card-body">
        <h5>${palyaNev(f.palyaId)}</h5>
        <p>${f.id}<br>Időpont: ${f.datum} ${f.ora}<br>Név: ${f.nev}<br>E-mail: ${f.email}<br>
        Telefon: ${f.telefon}<br>Létszám: ${f.letszam} fő<br>Összeg: <b>${f.osszeg} Ft</b></p>
        <button class="btn btn-danger btn-sm torles" value="${f.id}">Törlés</button>
        </div></div></div>`;
    }
    html += '</div>';
  }

  if (szurt.length == 0) html = '<p>Nincs találat.</p>';
  lista.innerHTML = html;

  for (const gomb of document.querySelectorAll('.torles')) {
    gomb.addEventListener('click', () => torles(gomb.value));
  }
}

// soft delete: nem töröljük a tömbből, csak megjelöljük
function torles(id) {
  if (confirm('Biztosan törlöd?')) {
    foglalasok.find(f => f.id == id).torolve = true;
    megjelenites();
    idopontok();
  }
}

function rendezes(mezo) {
  foglalasok.sort((a, b) => {
    if (mezo == 'osszeg') return a.osszeg - b.osszeg;
    if (mezo == 'nev') return a.nev.localeCompare(b.nev);
    return (a.datum + a.ora).localeCompare(b.datum + b.ora);
  });
  megjelenites();
}

keres.addEventListener('input', megjelenites);
szuroPalya.addEventListener('change', megjelenites);
document.getElementById('gombTablazat').addEventListener('click', () => { nezet = 'tablazat'; megjelenites(); });
document.getElementById('gombKartya').addEventListener('click', () => { nezet = 'kartya'; megjelenites(); });
document.getElementById('rendDatum').addEventListener('click', () => rendezes('datum'));
document.getElementById('rendNev').addEventListener('click', () => rendezes('nev'));
document.getElementById('rendOsszeg').addEventListener('click', () => rendezes('osszeg'));

// ---------- űrlap ----------

// foglalt és elmúlt időpont nem választható
function idopontok() {
  if (palya.value == '' || datum.value == '') {
    ora.innerHTML = '<option value="">Válassz pályát és dátumot!</option>';
    return;
  }
  let html = '<option value="">Válassz időpontot!</option>';
  for (let o = 8; o < 22; o++) {
    const ido = String(o).padStart(2, '0') + ':00';
    const foglalt = foglalasok.some(f => !f.torolve && f.palyaId == palya.value && f.datum == datum.value && f.ora == ido);
    const elmult = datum.value == maiDatum() && o <= new Date().getHours();

    if (foglalt) html += `<option disabled>${ido} - foglalt</option>`;
    else if (elmult) html += `<option disabled>${ido} - elmúlt</option>`;
    else html += `<option>${ido}</option>`;
  }
  ora.innerHTML = html;
}

// ár = óradíj + 500 Ft / fő
function arSzamitas() {
  const p = palyak.find(p => p.id == palya.value);
  const ar = p ? p.oradij + letszam.value * 500 : 0;
  document.getElementById('ar').textContent = ar + ' Ft';
  return ar;
}

palya.addEventListener('change', () => { idopontok(); arSzamitas(); });
datum.addEventListener('change', idopontok);
letszam.addEventListener('input', arSzamitas);

urlap.addEventListener('submit', e => {
  e.preventDefault();
  const hibak = [];

  // üres mezők pirosra
  for (const mezo of [nev, email, telefon, palya, datum, ora, letszam]) {
    mezo.classList.toggle('is-invalid', mezo.value == '');
  }
  if (urlap.querySelector('.is-invalid')) hibak.push('Minden mezőt ki kell tölteni!');

  if (email.value != '' && !/^\S+@\S+\.\S+$/.test(email.value)) hibak.push('Hibás e-mail cím!');
  if (telefon.value != '' && !/^(\+36|06) ?(20|30|31|50|70) ?\d{3} ?\d{4}$/.test(telefon.value)) {
    hibak.push('Hibás telefonszám! (pl. +36 30 123 4567)');
  }
  if (datum.value != '' && datum.value < maiDatum()) hibak.push('Múltbeli napra nem lehet foglalni!');

  const p = palyak.find(p => p.id == palya.value);
  if (p && (letszam.value < 1 || letszam.value > p.maxLetszam)) {
    hibak.push('Erre a pályára 1 és ' + p.maxLetszam + ' fő között lehet foglalni!');
  }

  if (hibak.length > 0) {
    hibaDoboz.innerHTML = hibak.join('<br>');
    hibaDoboz.classList.remove('d-none');
    sikerDoboz.classList.add('d-none');
    return;
  }

  const uj = {
    id: 'F-' + (1001 + foglalasok.length),
    palyaId: p.id,
    nev: nev.value,
    email: email.value,
    telefon: telefon.value,
    datum: datum.value,
    ora: ora.value,
    letszam: Number(letszam.value),
    osszeg: arSzamitas()
  };
  foglalasok.push(uj);

  hibaDoboz.classList.add('d-none');
  sikerDoboz.innerHTML = `<b>Sikeres foglalás!</b><br>Azonosító: ${uj.id}<br>Név: ${uj.nev}<br>
    E-mail: ${uj.email}<br>Telefon: ${uj.telefon}<br>Pálya: ${p.nev}<br>
    Időpont: ${uj.datum} ${uj.ora}<br>Létszám: ${uj.letszam} fő<br>Fizetendő: ${uj.osszeg} Ft`;
  sikerDoboz.classList.remove('d-none');

  urlap.reset();
  idopontok();
  arSzamitas();
  megjelenites();
});

// ---------- vissza a tetejére ----------

window.addEventListener('scroll', () => {
  felGomb.style.display = window.scrollY > 300 ? 'block' : 'none';
});
felGomb.addEventListener('click', () => window.scrollTo(0, 0));
