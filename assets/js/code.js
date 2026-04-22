const SHEET_KEY = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_KEUANGAN = "Keuangan";
const SHEET_PERLENGKAPAN = "Perlengkapan";
const SHEET_NOTE = "Catatan";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ready"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = e.parameter;
    const action = data.action;
    let result;
    switch (action) {
      case "getDataKeuangan":
        result = getDataKeuangan();
        break;
      case "tambahTransaksi":
        result = tambahTransaksi(data.tipe, data.ket, data.nominal, data.kat);
        break;
      case "updateTransaksi":
        result = updateTransaksi(Number(data.row), data.ket, data.nominal, data.kat);
        break;
      case "hapusTransaksi":
        result = hapusTransaksi(Number(data.row));
        break;
      case "getDataPerlengkapan":
        result = getDataPerlengkapan();
        break;
      case "tambahBarang":
        result = tambahBarang(data.nama, data.orang);
        break;
      case "updateBarang":
        result = updateBarang(Number(data.i), data.nama, data.orang);
        break;
      case "hapusBarang":
        result = hapusBarang(Number(data.i));
        break;
      case "getNotes":
        result = getNotes();
        break;
      case "tambahNote":
        result = tambahNote(data.isi);
        break;
      case "updateNote":
        result = updateNote(Number(data.i), data.isi);
        break;
      case "hapusNote":
        result = hapusNote(Number(data.i));
        break;
      default:
        result = {
          error: "Action tidak dikenal"
        };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getDataKeuangan() {
  const sheet = SHEET_KEY.getSheetByName(SHEET_KEUANGAN);
  const data = sheet.getDataRange().getValues();
  data.shift();
  let totalMasuk = 0;
  let totalKeluar = 0;
  const kategori = {};
  data.forEach(row => {
    if (row[0]) totalMasuk += Number(row[0]);
    if (row[2]) totalKeluar += Number(row[2]);
    const kat = row[4] || "LAINNYA";
    const nominal = row[0] || row[2] || 0;
    kategori[kat] = (kategori[kat] || 0) + Number(nominal);
  });
  return {
    transaksi: data,
    ringkasan: {
      masuk: totalMasuk,
      keluar: totalKeluar,
      sisa: totalMasuk - totalKeluar
    },
    kategori: kategori
  };
}

function tambahTransaksi(tipe, ket, nominal, kat) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_KEUANGAN);
  const barisBaru = ["", "", "", "", ""];
  if (tipe == "masuk") {
    barisBaru[0] = Number(nominal);
    barisBaru[1] = ket;
  } else {
    barisBaru[2] = Number(nominal);
    barisBaru[3] = ket;
  }
  barisBaru[4] = kat;
  sheet.appendRow(barisBaru);
  return {
    status: "success"
  };
}

function updateTransaksi(rowIndex, ket, nominal, kat) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_KEUANGAN);
  const rowNum = rowIndex + 2;
  const oldData = sheet.getRange(rowNum, 1, 1, 5).getValues()[0];
  const isMasuk = oldData[0] ? true : false;
  if (isMasuk) {
    sheet.getRange(rowNum, 2).setValue(ket);
    sheet.getRange(rowNum, 1).setValue(Number(nominal));
  } else {
    sheet.getRange(rowNum, 4).setValue(ket);
    sheet.getRange(rowNum, 3).setValue(Number(nominal));
  }
  sheet.getRange(rowNum, 5).setValue(kat);
  return {
    status: "updated"
  };
}

function hapusTransaksi(rowIndex) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_KEUANGAN);
  sheet.deleteRow(rowIndex + 2);
  return {
    status: "deleted"
  };
}

function getDataPerlengkapan() {
  const sheet = SHEET_KEY.getSheetByName(SHEET_PERLENGKAPAN);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function tambahBarang(nama, orang) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_PERLENGKAPAN);
  const status = (!orang || orang.toUpperCase() == "KAS") ? "BELI / SEWA" : "SIAP ✅";
  sheet.appendRow([nama, orang || "KAS", status]);
  return {
    status: "success"
  };
}

function updateBarang(i, nama, orang) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_PERLENGKAPAN);
  const rowNum = i + 2;
  const status = (!orang || orang.toUpperCase() == "KAS") ? "BELI / SEWA" : "SIAP ✅";
  sheet.getRange(rowNum, 1).setValue(nama);
  sheet.getRange(rowNum, 2).setValue(orang || "KAS");
  sheet.getRange(rowNum, 3).setValue(status);
  return {
    status: "updated"
  };
}

function hapusBarang(i) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_PERLENGKAPAN);
  sheet.deleteRow(i + 2);
  return {
    status: "deleted"
  };
}

function getNotes() {
  const sheet = SHEET_KEY.getSheetByName(SHEET_NOTE);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data;
}

function tambahNote(isi) {
  let sheet = SHEET_KEY.getSheetByName(SHEET_NOTE);
  if (!sheet) {
    sheet = SHEET_KEY.insertSheet(SHEET_NOTE);
    sheet.appendRow(["CATATAN / PENGUMUMAN"]);
  }
  sheet.appendRow([isi]);
  return {
    status: "success"
  };
}

function updateNote(i, isi) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_NOTE);
  const rowNum = i + 2;
  sheet.getRange(rowNum, 1).setValue(isi);
  return {
    status: "updated"
  };
}

function hapusNote(i) {
  const sheet = SHEET_KEY.getSheetByName(SHEET_NOTE);
  sheet.deleteRow(i + 2);
  return {
    status: "deleted"
  };
}