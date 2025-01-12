function generateStruk(idTransaksi) {
  try {
    const ss = SpreadsheetApp.openById('1e8u-KAqor8-tVSZG3aaqDlgEn1AzCGSvUh6ZJolwCLQ');
    const transaksiSheet = ss.getSheetByName('Transaksi');
    const detailTransaksiSheet = ss.getSheetByName('Detail Transaksi');
    const produkSheet = ss.getSheetByName('Produk');

    if (!transaksiSheet || !detailTransaksiSheet || !produkSheet) {
      throw new Error("Salah satu sheet tidak ditemukan.");
    }

    const transaksiRow = transaksiSheet.createTextFinder(idTransaksi).findNext();
    if (!transaksiRow) {
        throw new Error("Data transaksi dengan ID " + idTransaksi + " tidak ditemukan.");
    }
    const transaksi = transaksiSheet.getRange(transaksiRow.getRow(), 1, 1, transaksiSheet.getLastColumn()).getValues()[0];

    const detailData = detailTransaksiSheet.getRange(2, 1, detailTransaksiSheet.getLastRow()-1, detailTransaksiSheet.getLastColumn()).getValues().filter(row => row[1] == idTransaksi);

    if (!detailData || detailData.length === 0) {
      throw new Error("Data detail transaksi dengan ID Transaksi " + idTransaksi + " tidak ditemukan.");
    }

    const produkData = detailData.map(detail => {
      const produk = produkSheet.createTextFinder(detail[2]).findNext(); // detail[2] adalah Kode Produk
      if (produk) {
        const row = produk.getRow();
        return produkSheet.getRange(row, 1, 1, produkSheet.getLastColumn()).getValues()[0];
      } else {
        Logger.log("Produk dengan kode " + detail[2] + " tidak ditemukan.");
        return null; // Handle jika produk tidak ditemukan
      }
    });

    const templateId = '1vdkDPJyT3h_zCPYrPYy-EU3oEqqwTI6Gc_yw3gGqhjM'; // ID Template
    const templateFile = DriveApp.getFileById(templateId);
    const newFileName = "Struk Transaksi " + idTransaksi;
    const newFile = templateFile.makeCopy(newFileName); // Membuat salinan baru

    const doc = DocumentApp.openById(newFile.getId());
    const body = doc.getBody();

    body.replaceText("{{ID_TRANSAKSI}}", transaksi[0]);
    body.replaceText("{{TANGGAL}}", transaksi[1]);
    body.replaceText("{{WAKTU}}", transaksi[2]);

    let detailStruk = "";
    let totalHarga = 0;
    for (let i = 0; i < detailData.length; i++) {
        if (produkData[i]) {
            detailStruk += produkData[i][1] + " x " + detailData[i][3] + " = Rp. " + detailData[i][4] + "\n";
            totalHarga += detailData[i][4];
        } else {
            detailStruk += "Produk tidak ditemukan\n";
        }
    }
    body.replaceText("{{DETAIL_TRANSAKSI}}", detailStruk);
    body.replaceText("{{TOTAL}}", totalHarga);

    doc.saveAndClose();

    // Opsional: Mendapatkan URL file baru
    const fileUrl = newFile.getUrl();
    return { success: true, fileUrl: fileUrl }; // Mengembalikan URL file
  } catch (error) {
    Logger.log("Error di generateStruk: " + error);
    return { success: false, error: error.message };
  }
}
