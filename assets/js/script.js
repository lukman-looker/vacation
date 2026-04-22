const GAS_URL = "https://script.google.com/macros/s/AKfycbyfbM1ZC4C3_2SvVyO3k548AUlNu9ePOf2jQQXRSfkpiDG2eQu35JVxwxnVCHX0dUQeyw/exec";
let existingCategories = [];
document.addEventListener("DOMContentLoaded", function() {
  loadDataKeuangan();
  loadDataPerlengkapan();
  loadNotes();
});

function formatRupiahSummary(angka) {
  let num = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(angka);
  return `Rp\n${num}`;
}

function formatRupiah(angka) {
  return "Rp " + new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(angka);
}

function setLoading(btn, isLoading, text = "Loading...") {
  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.dataset.oldHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    btn.innerHTML = btn.dataset.oldHtml;
  }
}

function callGAS(action, data = {}) {
  data.action = action;
  const formData = new URLSearchParams(data).toString();
  return fetch(GAS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData
  }).then(res => res.json());
}

function showSuggestions(inputText) {
  const box = document.getElementById("suggestions");
  if (!inputText) {
    box.classList.add('hidden');
    return;
  }
  const filtered = existingCategories.filter(cat => String(cat).toLowerCase().includes(inputText.toLowerCase()));
  if (filtered.length === 0) {
    box.classList.add('hidden');
    return;
  }
  box.innerHTML = filtered.map(cat => `<div class="suggestion-item" onclick="selectCategory('${String(cat).replace(/'/g, "\\'")}')">${cat}</div>`).join('');
  box.classList.remove('hidden');
}

function selectCategory(name) {
  document.getElementById("kategori").value = name;
  document.getElementById("suggestions").classList.add('hidden');
}

function loadDataKeuangan() {
  callGAS("getDataKeuangan").then(res => {
    if (res.error) throw res.error;
    document.getElementById("totalMasuk").innerText = formatRupiahSummary(res.ringkasan.masuk);
    document.getElementById("totalKeluar").innerText = formatRupiahSummary(res.ringkasan.keluar);
    document.getElementById("sisaSaldo").innerText = formatRupiahSummary(res.ringkasan.sisa);
    existingCategories = Object.keys(res.kategori);
    let katHtml = "";
    for (const [key, val] of Object.entries(res.kategori)) {
      katHtml += `<span class="tag"><i class="fas fa-tag"></i> ${key}: <b>${formatRupiah(val)}</b></span>`;
    }
    document.getElementById("kategoriList").innerHTML = katHtml;
    let trxHtml = "";
    res.transaksi.forEach((item, i) => {
      let tipe = item[0] ? "text-green" : "text-red";
      let icon = item[0] ? "fa-arrow-down" : "fa-arrow-up";
      let nominal = item[0] || item[2] || 0;
      let keterangan = String(item[1] || item[3] || "-");
      let kategori = String(item[4] || "-");
      let ketSafe = keterangan.replace(/'/g, "\\'");
      let katSafe = kategori.replace(/'/g, "\\'");
      trxHtml += `
          <div class="item-row" onclick="bukaModal(${i}, '${ketSafe}', ${nominal}, '${katSafe}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="${tipe}"><i class="fas ${icon}"></i> ${keterangan}</span>
              <span class="${tipe}" style="font-weight: 700;">${formatRupiah(nominal)}</span>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;"><i class="fas fa-folder"></i> ${kategori}</p>
          </div>
        `;
    });
    document.getElementById("listTransaksi").innerHTML = trxHtml;
  }).catch(err => {
    console.error("Error:", err);
    Swal.fire("Error!", "Gagal memuat data: " + err, "error");
  });
}

function simpanTransaksi() {
  const tipe = document.getElementById("tipe").value;
  const ket = document.getElementById("ket").value;
  const nom = document.getElementById("nominal").value;
  const kat = document.getElementById("kategori").value;
  if (!ket || !nom || !kat) {
    Swal.fire("Oops!", "Lengkapi data dulu!", "warning");
    return;
  }
  const btn = document.getElementById("btnSimpanTrx");
  setLoading(btn, true, "Menyimpan...");
  callGAS("tambahTransaksi", {
    tipe,
    ket,
    nominal: nom,
    kat
  }).then(() => {
    setLoading(btn, false);
    Swal.fire("Berhasil!", "Data tersimpan!", "success");
    document.getElementById("ket").value = "";
    document.getElementById("nominal").value = "";
    document.getElementById("kategori").value = "";
    loadDataKeuangan();
  });
}

function bukaModal(row, ket, nom, kat) {
  document.getElementById("editRow").value = row;
  document.getElementById("editKet").value = ket;
  document.getElementById("editNom").value = nom;
  document.getElementById("editKat").value = kat;
  document.getElementById("modalEdit").classList.remove('hidden');
}

function tutupModal() {
  document.getElementById("modalEdit").classList.add('hidden');
}

function updateData() {
  const row = Number(document.getElementById("editRow").value);
  const ket = document.getElementById("editKet").value;
  const nom = document.getElementById("editNom").value;
  const kat = document.getElementById("editKat").value;
  const btn = event.target;
  setLoading(btn, true, "Menyimpan...");
  callGAS("updateTransaksi", {
    row,
    ket,
    nominal: nom,
    kat
  }).then(() => {
    setLoading(btn, false);
    Swal.fire("Updated!", "Data berhasil diubah!", "info");
    tutupModal();
    loadDataKeuangan();
  });
}

function hapusData() {
  Swal.fire({
    title: 'Yakin hapus?',
    text: "Data tidak bisa dikembalikan!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!'
  }).then((result) => {
    if (result.isConfirmed) {
      const btn = event.target;
      setLoading(btn, true, "Menghapus...");
      const row = Number(document.getElementById("editRow").value);
      callGAS("hapusTransaksi", {
        row
      }).then(() => {
        setLoading(btn, false);
        Swal.fire("Terhapus!", "Data sudah hilang.", "success");
        tutupModal();
        loadDataKeuangan();
      });
    }
  })
}

function loadDataPerlengkapan() {
  callGAS("getDataPerlengkapan").then(data => {
    if (data.error) throw data.error;
    let html = "";
    data.forEach((item, i) => {
      const nama = String(item[0] || "-");
      const orang = String(item[1] || "KAS");
      const status = String(item[2] || "-");
      const cls = status == "SIAP ✅" ? "item-ready" : "item-buy";
      const iconStatus = status == "SIAP ✅" ? "fa-check-circle text-green" : "fa-shopping-cart text-yellow";
      html += `
          <div class="item-row ${cls}" onclick="bukaModalBarang(${i}, '${nama.replace(/'/g, "\\'")}', '${orang.replace(/'/g, "\\'")}')">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-weight: 600; margin-bottom: 3px;"><i class="fas fa-box"></i> ${nama}</h4>
                <p style="font-size: 12px; color: #64748b;"><i class="fas fa-user"></i> Dibawa: ${orang}</p>
              </div>
              <span style="font-size: 12px; font-weight: 600;"><i class="fas ${iconStatus}"></i> ${status}</span>
            </div>
          </div>
        `;
    });
    document.getElementById("listBarang").innerHTML = html;
  });
}

function simpanBarang() {
  const nama = document.getElementById("namaBarang").value;
  const orang = document.getElementById("yangBawa").value;
  if (!nama) {
    Swal.fire("Oops!", "Isi nama barang!", "warning");
    return;
  }
  const btn = document.getElementById("btnSimpanBarang");
  setLoading(btn, true, "Menyimpan...");
  callGAS("tambahBarang", {
    nama,
    orang
  }).then(() => {
    setLoading(btn, false);
    Swal.fire("Ditambahkan!", "Barang masuk list!", "success");
    document.getElementById("namaBarang").value = "";
    document.getElementById("yangBawa").value = "";
    loadDataPerlengkapan();
  });
}

function bukaModalBarang(i, nama, orang) {
  document.getElementById("editIndexBarang").value = i;
  document.getElementById("editNama").value = nama;
  document.getElementById("editOrang").value = orang;
  document.getElementById("modalEditBarang").classList.remove('hidden');
}

function tutupModalBarang() {
  document.getElementById("modalEditBarang").classList.add('hidden');
}

function updateBarang() {
  const i = Number(document.getElementById("editIndexBarang").value);
  const nama = document.getElementById("editNama").value;
  const orang = document.getElementById("editOrang").value;
  const btn = event.target;
  setLoading(btn, true, "Menyimpan...");
  callGAS("updateBarang", {
    i,
    nama,
    orang
  }).then(() => {
    setLoading(btn, false);
    Swal.fire("Updated!", "Data berhasil diubah!", "info");
    tutupModalBarang();
    loadDataPerlengkapan();
  });
}

function hapusBarang() {
  Swal.fire({
    title: 'Yakin hapus?',
    text: "Barang akan dihapus dari list!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!'
  }).then((result) => {
    if (result.isConfirmed) {
      const btn = event.target;
      setLoading(btn, true, "Menghapus...");
      const i = Number(document.getElementById("editIndexBarang").value);
      callGAS("hapusBarang", {
        i
      }).then(() => {
        setLoading(btn, false);
        Swal.fire("Terhapus!", "Barang sudah hilang.", "success");
        tutupModalBarang();
        loadDataPerlengkapan();
      });
    }
  })
}

function loadNotes() {
  callGAS("getNotes").then(data => {
    if (data.error) throw data.error;
    let html = "";
    data.forEach((item, i) => {
      const text = String(item[0] || "");
      const safeText = text.replace(/`/g, "\`").replace(/\\/g, "\\\\");
      html += `
          <div class="item-row item-note" onclick="bukaModalNote(${i}, \`${safeText}\`)">
            <p style="font-size: 14px;"><i class="fas fa-sticky-note text-purple"></i> ${text}</p>
          </div>
        `;
    });
    document.getElementById("listNote").innerHTML = html;
  });
}

function simpanNote() {
  const isi = document.getElementById("isiNote").value;
  if (!isi) {
    Swal.fire("Oops!", "Tulis catatan dulu!", "warning");
    return;
  }
  const btn = document.getElementById("btnSimpanNote");
  setLoading(btn, true, "Menyimpan...");
  callGAS("tambahNote", {
    isi
  }).then(() => {
    setLoading(btn, false);
    Swal.fire("Tersimpan!", "Catatan sudah diposting!", "success");
    document.getElementById("isiNote").value = "";
    loadNotes();
  });
}

function bukaModalNote(i, isi) {
  document.getElementById("editIndexNote").value = i;
  document.getElementById("editIsi").value = isi;
  document.getElementById("modalEditNote").classList.remove('hidden');
}

function tutupModalNote() {
  document.getElementById("modalEditNote").classList.add('hidden');
}

function updateNote() {
  const i = Number(document.getElementById("editIndexNote").value);
  const isi = document.getElementById("editIsi").value;
  const btn = event.target;
  setLoading(btn, true, "Menyimpan...");
  callGAS("updateNote", {
    i,
    isi
  }).then(() => {
    setLoading(btn, false);
    Swal.fire("Updated!", "Catatan berhasil diubah!", "info");
    tutupModalNote();
    loadNotes();
  });
}

function hapusNote() {
  Swal.fire({
    title: 'Yakin hapus?',
    text: "Catatan akan dihapus permanen!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!'
  }).then((result) => {
    if (result.isConfirmed) {
      const btn = event.target;
      setLoading(btn, true, "Menghapus...");
      const i = Number(document.getElementById("editIndexNote").value);
      callGAS("hapusNote", {
        i
      }).then(() => {
        setLoading(btn, false);
        Swal.fire("Terhapus!", "Catatan sudah hilang.", "success");
        tutupModalNote();
        loadNotes();
      });
    }
  })
}