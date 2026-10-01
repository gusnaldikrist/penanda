// tests/search.test.js — Pengujian logika pencarian tiga lapis Penanda V1 (Tiket 03)
// Tanpa kerangka uji pihak ketiga, mencetak tiap kasus, keluar dengan kode 1 jika gagal

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { searchItems } = require('../src/frontend/search.js');

const examplePath = path.resolve(__dirname, '../src/shared/data.example.json');
const rawData = fs.readFileSync(examplePath, 'utf8');
const exampleData = JSON.parse(rawData);
const items = exampleData.items;

let totalTests = 0;
let passedTests = 0;

function runCase(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${totalTests}. ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${totalTests}. ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function getByLapis(result, level) {
  return result.filter(item => item.lapis === level);
}

console.log('--- Mulai Pengujian Pencarian Tiga Lapis (Tiket 03) ---');

// Kasus 1: Toleransi spasi berlebih dan huruf besar/kecil
runCase('Toleransi spasi dan casing: "  Sheet    Admin  " cocok Sheet Admin TA', () => {
  const result = searchItems(items, '  Sheet    Admin  ');
  const lapis1 = getByLapis(result, 1);
  assert.equal(lapis1.length, 1);
  assert.equal(lapis1[0].id, 'sheet-ta-admin');
});

// Kasus 2: Kata kunci kosong
runCase('Kata kunci kosong: mengembalikan 4 item urut updated_at menurun tanpa penanda lapis', () => {
  const result = searchItems(items, '');
  assert.equal(result.length, 4, 'Harus mengembalikan seluruh 4 item');
  for (const item of result) {
    assert.equal(item.lapis, undefined, 'Item tidak boleh memiliki properti lapis saat kata kunci kosong');
    assert.equal(item.penanda, undefined, 'Item tidak boleh memiliki penanda');
  }
  // Verifikasi urutan updated_at menurun
  for (let i = 0; i < result.length - 1; i++) {
    const cmp = result[i].updated_at.localeCompare(result[i + 1].updated_at);
    assert.ok(cmp >= 0, 'Urutan harus updated_at menurun');
  }
});

// Kasus 3: Kata kunci hanya spasi
runCase('Kata kunci hanya spasi: diperlakukan sama seperti kata kunci kosong', () => {
  const result = searchItems(items, '    ');
  assert.equal(result.length, 4, 'Harus mengembalikan seluruh 4 item');
  assert.equal(result[0].lapis, undefined, 'Tanpa penanda lapis');
});

// Kasus 4: Kata kunci "slims" (Verifikasi: hanya SLiMS Bulian di lapis 1)
runCase('Kata kunci "slims": hanya SLiMS Bulian di lapis 1', () => {
  const result = searchItems(items, 'slims');
  const lapis1 = getByLapis(result, 1);
  const lapis2 = getByLapis(result, 2);
  const lapis3 = getByLapis(result, 3);

  assert.equal(lapis1.length, 1, 'Hanya ada 1 item di lapis 1');
  assert.equal(lapis1[0].id, 'slims-bulian', 'Item di lapis 1 harus slims-bulian');

  // Lapis 2 memuat Sheet Admin TA karena berbagi tag "harian"
  assert.equal(lapis2.length, 1, 'Lapis 2 memuat 1 item berbagi tag');
  assert.equal(lapis2[0].id, 'sheet-ta-admin', 'Item lapis 2 harus sheet-ta-admin (tag harian)');

  assert.equal(lapis3.length, 0, 'Lapis 3 harus kosong');
  assert.equal(result.length, 2, 'Total hasil adalah 2 item');
});

// Kasus 5: Kata kunci "sheet admin" (Verifikasi: cocok Sheet Admin TA, admin sheet tidak cocok)
runCase('Kata kunci "sheet admin": cocok pada Sheet Admin TA di lapis 1', () => {
  const result = searchItems(items, 'sheet admin');
  const lapis1 = getByLapis(result, 1);

  assert.equal(lapis1.length, 1, 'Lapis 1 harus ada 1 hasil');
  assert.equal(lapis1[0].id, 'sheet-ta-admin', 'Cocok pada Sheet Admin TA');

  // Lapis 2 memuat 3 item sisa karena semua berbagi tag dengan sheet-ta-admin
  const lapis2 = getByLapis(result, 2);
  assert.equal(lapis2.length, 3, 'Ketiga item sisa berbagi tag dengan sheet-ta-admin');
});

// Kasus 6: Kata kunci "admin sheet" (urutan terbalik tidak boleh cocok di lapis 1)
runCase('Kata kunci "admin sheet": tidak cocok pada apa pun (0 hasil)', () => {
  const result = searchItems(items, 'admin sheet');
  assert.equal(result.length, 0, 'admin sheet tidak boleh menemukan hasil apa pun');
});

// Kasus 7: Kata kunci "wisuda"
runCase('Kata kunci "wisuda": Repository UNIGA dan Sheet Admin TA di lapis 1', () => {
  const result = searchItems(items, 'wisuda');
  const lapis1 = getByLapis(result, 1);
  const lapis2 = getByLapis(result, 2);

  assert.equal(lapis1.length, 2, 'Lapis 1 harus ada 2 item bertag wisuda');
  const ids1 = lapis1.map(i => i.id).sort();
  assert.deepEqual(ids1, ['repo-uniga', 'sheet-ta-admin'], 'Item lapis 1 harus repo-uniga dan sheet-ta-admin');

  // Item lain yang berbagi tag masuk lapis 2
  assert.equal(lapis2.length, 2, 'Item sisa masuk lapis 2 (berbagi tag ta/sheet/harian)');
  assert.equal(result.length, 4, 'Total seluruh 4 item muncul dalam lapis 1 dan 2');
});

// Kasus 8: Kata kunci "ta"
runCase('Kata kunci "ta": cocok pada Repository UNIGA dan Sheet Admin TA di lapis 1', () => {
  const result = searchItems(items, 'ta');
  const lapis1 = getByLapis(result, 1);
  assert.equal(lapis1.length, 2, 'Lapis 1 memuat 2 item bertag ta');
  const ids1 = lapis1.map(i => i.id).sort();
  assert.deepEqual(ids1, ['repo-uniga', 'sheet-ta-admin']);
});

// Kasus 9: Kata kunci "magang"
runCase('Kata kunci "magang": Sheet Job Training di lapis 1, Sheet Admin TA di lapis 2', () => {
  const result = searchItems(items, 'magang');
  const lapis1 = getByLapis(result, 1);
  const lapis2 = getByLapis(result, 2);

  assert.equal(lapis1.length, 1, 'Lapis 1 memuat 1 item');
  assert.equal(lapis1[0].id, 'sheet-job-training');

  assert.equal(lapis2.length, 1, 'Lapis 2 memuat Sheet Admin TA yang berbagi tag sheet');
  assert.equal(lapis2[0].id, 'sheet-ta-admin');
});

// Kasus 10: Kata kunci "sheet"
runCase('Kata kunci "sheet": Sheet Job Training dan Sheet Admin TA di lapis 1', () => {
  const result = searchItems(items, 'sheet');
  const lapis1 = getByLapis(result, 1);
  assert.equal(lapis1.length, 2, 'Ada 2 item sheet di lapis 1');
  const ids1 = lapis1.map(i => i.id).sort();
  assert.deepEqual(ids1, ['sheet-job-training', 'sheet-ta-admin']);
});

// Kasus 11: Lapis 3 pencocokan catatan dengan penanda "dari catatan"
runCase('Lapis 3: kata kunci di catatan menghasilkan lapis 3 dan penanda "dari catatan"', () => {
  // Query "laporan" hanya ada di catatan sheet-job-training: "Terima laporan PKL lalu catat nilai di sheet ini"
  const result = searchItems(items, 'laporan');
  assert.equal(result.length, 1, 'Hanya ada 1 hasil');
  assert.equal(result[0].id, 'sheet-job-training');
  assert.equal(result[0].lapis, 3, 'Harus berada di lapis 3');
  assert.equal(result[0].penanda, 'dari catatan', 'Harus memiliki penanda "dari catatan"');
});

// Kasus 12: Lapis 3 untuk catatan Sheet Admin TA
runCase('Lapis 3: kata kunci "draft" mengangkat Sheet Admin TA di lapis 3', () => {
  // Query "draft" hanya ada di catatan sheet-ta-admin
  const result = searchItems(items, 'draft');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'sheet-ta-admin');
  assert.equal(result[0].lapis, 3);
  assert.equal(result[0].penanda, 'dari catatan');
});

// Kasus 13: Case-insensitivity dan spasi acak
runCase('Pencarian case-insensitive dan toleran spasi acak', () => {
  const lower = searchItems(items, 'wisuda');
  const upper = searchItems(items, 'WISUDA');
  const mixed = searchItems(items, '  WiSuDa   ');
  assert.deepEqual(lower, upper, 'Huruf besar dan kecil harus identik');
  assert.deepEqual(lower, mixed, 'Spasi di ujung dan casing campuran harus identik');
});

// Kasus 14: Tidak ada duplikasi ID antar lapis
runCase('Deduplikasi: item yang sudah masuk lapis sebelumnya tidak boleh muncul lagi', () => {
  const result = searchItems(items, 'wisuda');
  const seen = new Set();
  for (const item of result) {
    assert.equal(seen.has(item.id), false, `Item ${item.id} tidak boleh muncul lebih dari satu kali`);
    seen.add(item.id);
  }
});

// Kasus 15: Isolasi batas tag (mencegah false positive dari penggabungan string tag)
runCase('Isolasi batas tag: query lintas tag "load wi" tidak mencocokkan repo-uniga (upload, wisuda)', () => {
  const result = searchItems(items, 'load wi');
  assert.equal(result.length, 0, 'Query multi-kata tidak boleh cocok menyeberangi dua tag atomik terpisah');
});

// Kasus 16: Ketahanan input jika items bernilai null, undefined, atau bukan array
runCase('Ketahanan input: items null atau undefined mengembalikan array kosong', () => {
  assert.deepEqual(searchItems(null, 'wisuda'), []);
  assert.deepEqual(searchItems(undefined, 'wisuda'), []);
  assert.deepEqual(searchItems('invalid', 'wisuda'), []);
  assert.deepEqual(searchItems(items, null), searchItems(items, ''));
  assert.deepEqual(searchItems(items, undefined), searchItems(items, ''));
});

console.log(`--- Selesai: ${passedTests}/${totalTests} kasus uji lulus 100% ---`);

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
