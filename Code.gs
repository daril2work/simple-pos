function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

function getProducts() {
  Logger.log("Mulai getProducts()");
  try {
    const ss = SpreadsheetApp.openById('1e8u-KAqor8-tVSZG3aaqDlgEn1AzCGSvUh6ZJolwCLQ');
    const sheet = ss.getSheetByName('Produk');

    if (!sheet) {
      throw new Error("Sheet 'Produk' tidak ditemukan.");
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow < 2 || lastColumn < 4) { // Memastikan ada data selain header
      Logger.log("Data di sheet 'Produk' kosong atau tidak lengkap.");
      return []; // Mengembalikan array kosong jika tidak ada data
    }


    const data = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues(); // Mengambil data mulai dari baris kedua (setelah header)

    const products = data.map(row => {
      return {
        kode: row[0].toString(), // Memastikan kode berupa string
        nama: row[1].toString(), // Memastikan nama berupa string
        harga: Number(row[2]),   // Mengkonversi harga ke number
        stok: Number(row[3])    // Mengkonversi stok ke number
      };
    });

    Logger.log("Jumlah produk yang ditemukan: " + products.length);
    Logger.log("Contoh produk pertama (JSON): " + JSON.stringify(products[0]));

    return products;
  } catch (error) {
    Logger.log("Terjadi error di getProducts(): " + error);
    return []; // Penting: tetap kembalikan array kosong jika terjadi error
  } finally {
      Logger.log("Selesai getProducts()");
  }
}

function testGetProducts() {
    Logger.log("Mulai testGetProducts()");
    try {
      var products = getProducts();
      Logger.log("Data products:");
      Logger.log(products); // Tampilkan data yang diambil
      if (products.length > 0) {
        Logger.log("Jumlah produk: " + products.length);
        Logger.log("Contoh produk pertama: " + JSON.stringify(products[0])); // Tampilkan contoh produk dalam format JSON
      } else {
        Logger.log("Tidak ada data produk yang ditemukan.");
      }
    } catch (error) {
      Logger.log("Terjadi error: " + error); // Tangkap dan tampilkan error
    }
    Logger.log("Selesai testGetProducts()"); // Penanda akhir
  }

function saveTransaction(transactionData) {
  try {
    const ss = SpreadsheetApp.openById('1e8u-KAqor8-tVSZG3aaqDlgEn1AzCGSvUh6ZJolwCLQ');
    const transaksiSheet = ss.getSheetByName('Transaksi');
    const detailTransaksiSheet = ss.getSheetByName('Detail Transaksi');
    const produkSheet = ss.getSheetByName('Produk');

    const timestamp = new Date();
    const total = transactionData.reduce((sum, item) => sum + (item.jumlah * item.harga), 0);

    let nextTransaksiNumber;
    let nextTransaksiId;

    // Periksa apakah sheet kosong
    if (transaksiSheet.getLastRow() <= 1) {
      nextTransaksiNumber = 0;
      nextTransaksiId = "TR-" + Utilities.formatString("%04d", nextTransaksiNumber);
    } else {
      let lastTransaksiId = transaksiSheet.getRange(transaksiSheet.getLastRow(), 1).getValue();
      // Pastikan lastTransaksiId adalah string sebelum menggunakan substring
      if (typeof lastTransaksiId === 'string' && lastTransaksiId.startsWith("TR-")) {
        nextTransaksiNumber = parseInt(lastTransaksiId.substring(3)) + 1;
        nextTransaksiId = "TR-" + Utilities.formatString("%04d", nextTransaksiNumber);
      } else {
        // Handle jika format ID terakhir tidak valid
        Logger.log("Format ID Transaksi terakhir tidak valid: " + lastTransaksiId);
        nextTransaksiNumber = 0;
        nextTransaksiId = "TR-" + Utilities.formatString("%04d", nextTransaksiNumber); // Reset ke TR-0000
        // Atau throw error jika Anda ingin menghentikan proses
        //throw new Error("Format ID Transaksi terakhir tidak valid.");
      }
    }

    // Simpan data transaksi
    transaksiSheet.appendRow([nextTransaksiId, timestamp, timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), total]);

    // Simpan data detail transaksi secara batch
    const detailTransaksiValues = transactionData.map(item => {
        let nextDetailNumber;
        let nextDetailId;
        if (detailTransaksiSheet.getLastRow() <= 1) {
          nextDetailNumber = 0;
          nextDetailId = "IDD-" + Utilities.formatString("%04d", nextDetailNumber);
        } else {
          let lastDetailId = detailTransaksiSheet.getRange(detailTransaksiSheet.getLastRow(), 1).getValue();
          if (typeof lastDetailId === 'string' && lastDetailId.startsWith("IDD-")) {
            nextDetailNumber = parseInt(lastDetailId.substring(4)) + 1;
            nextDetailId = "IDD-" + Utilities.formatString("%04d", nextDetailNumber);
          } else {
            Logger.log("Format ID Detail terakhir tidak valid: " + lastDetailId);
            nextDetailNumber = 0;
            nextDetailId = "IDD-" + Utilities.formatString("%04d", nextDetailNumber);
          }
        }
        return [nextDetailId, nextTransaksiId, item.kode, item.jumlah, item.jumlah * item.harga];
    });
    detailTransaksiSheet.getRange(detailTransaksiSheet.getLastRow()+1,1,detailTransaksiValues.length,detailTransaksiValues[0].length).setValues(detailTransaksiValues);

    // Update stok produk secara batch (tetap sama)
    transactionData.forEach(item => {
      const productRow = produkSheet.createTextFinder(item.kode).findNext();
      if (productRow) {
        const row = productRow.getRow();
        const currentStock = produkSheet.getRange(row, 4).getValue();
        produkSheet.getRange(row, 4).setValue(currentStock - item.jumlah);
      }
    });

    return { success: true, idTransaksi: nextTransaksiId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
