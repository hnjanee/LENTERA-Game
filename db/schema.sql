-- ============================================================
-- LENTERA — schema.sql
-- Skema Database Relasional (MySQL / PostgreSQL Compatible)
-- Platform Asesmen Kesehatan Mental & Pelaporan Bullying
-- ============================================================
-- 
-- ARSITEKTUR TABEL:
-- ─────────────────────────────────────────────────────────
--  schools          → Data sekolah yang menggunakan platform
--  users_bk         → Akun Guru BK / Admin per sekolah
--  sessions         → Satu sesi permainan per pemain
--  pos1_responses   → Data asesmen terselubung (Balai Rasa)
--  pos2_responses   → Respons roleplay per skenario (Pasar Interaksi)
--  pos3_results     → Hasil puzzle kata (Taman Urup)
--  mental_profiles  → Profil mental hasil kalkulasi akhir
--  laporan_bully    → Laporan kasus bullying dari Pos 4
--  konseling_req    → Permintaan sesi konseling
--  audit_log        → Log akses admin untuk keamanan data
-- ─────────────────────────────────────────────────────────
--  CATATAN KEAMANAN:
--  - Semua kolom nama pemain NULL-able (support anonim)
--  - isi_laporan disimpan terenkripsi (AES-256 di aplikasi)
--  - audit_log mencatat setiap akses data sensitif
-- ============================================================

-- ── Pastikan encoding UTF-8 ────────────────────────────────
-- MySQL:
-- SET NAMES utf8mb4;
-- SET CHARACTER SET utf8mb4;

-- ══════════════════════════════════════════════════════════
-- TABEL 1: SEKOLAH
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS schools (
    id            SERIAL PRIMARY KEY,
    kode_sekolah  VARCHAR(20)  NOT NULL UNIQUE,   -- Kode unik sekolah (NPSN)
    nama_sekolah  VARCHAR(200) NOT NULL,
    kota          VARCHAR(100),
    provinsi      VARCHAR(100),
    jenjang       VARCHAR(20)  CHECK (jenjang IN ('SMP', 'SMA', 'SMK', 'MA')),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  schools              IS 'Data sekolah yang menggunakan platform LENTERA';
COMMENT ON COLUMN schools.kode_sekolah IS 'Nomor Pokok Sekolah Nasional (NPSN)';

-- ══════════════════════════════════════════════════════════
-- TABEL 2: AKUN GURU BK / ADMIN
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users_bk (
    id            SERIAL PRIMARY KEY,
    school_id     INTEGER      NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    username      VARCHAR(80)  NOT NULL UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    -- Password di-hash dengan bcrypt (min cost factor 12) di aplikasi
    password_hash VARCHAR(255) NOT NULL,
    nama_lengkap  VARCHAR(150) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'bk'
                  CHECK (role IN ('bk', 'admin_sekolah', 'superadmin')),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users_bk             IS 'Akun Guru BK dan admin yang mengakses dashboard';
COMMENT ON COLUMN users_bk.role        IS 'bk=Guru BK biasa, admin_sekolah=Kepala Sekolah, superadmin=Platform Admin';
COMMENT ON COLUMN users_bk.password_hash IS 'Hash bcrypt, JANGAN simpan plain-text';

-- ══════════════════════════════════════════════════════════
-- TABEL 3: SESI PERMAINAN
-- Satu record per satu kali bermain
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
    id              SERIAL PRIMARY KEY,
    session_uuid    VARCHAR(50)  NOT NULL UNIQUE,  -- ID unik dari localStorage (ln_xxx)
    school_id       INTEGER      REFERENCES schools(id) ON DELETE SET NULL,

    -- Data pemain — nama NULL jika anonim
    nama_pemain     VARCHAR(100),                  -- NULL jika anonim
    is_anonim       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- Status sesi
    status          VARCHAR(20)  NOT NULL DEFAULT 'started'
                    CHECK (status IN ('started', 'pos1_done', 'pos2_done', 'pos3_done', 'completed', 'abandoned')),

    -- Metadata teknis (non-PII)
    user_agent_hash VARCHAR(64),                   -- Hash dari user agent (bukan plain text)
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    duration_secs   INTEGER,                       -- Durasi bermain (detik)

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  sessions             IS 'Satu record per sesi permainan LENTERA';
COMMENT ON COLUMN sessions.session_uuid IS 'ID sesi dari client (format: ln_timestamp36_random6)';
COMMENT ON COLUMN sessions.nama_pemain IS 'NULL jika pemain memilih Anonim';

-- Index untuk query dashboard
CREATE INDEX IF NOT EXISTS idx_sessions_school    ON sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status    ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started   ON sessions(started_at DESC);

-- ══════════════════════════════════════════════════════════
-- TABEL 4: RESPONS POS 1 — BALAI RASA (Asesmen Terselubung)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pos1_responses (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    -- Pilihan kustomisasi avatar (data asesmen terselubung)
    cuaca_hati      VARCHAR(20)  CHECK (cuaca_hati IN ('cerah', 'kabut', 'mendung')),
    cuaca_skor      SMALLINT     CHECK (cuaca_skor BETWEEN 1 AND 3),
    -- cuaca: cerah=3(stabil), kabut=2(cemas), mendung=1(sedih)

    tas_pilihan     VARCHAR(20)  CHECK (tas_pilihan IN ('buku', 'hp', 'kaca')),
    tas_stres_type  VARCHAR(20)  CHECK (tas_stres_type IN ('akademik', 'sosial', 'insecurity')),
    -- tas: buku=akademik, hp=sosial, kaca=insecurity

    qte_pilihan     VARCHAR(20)  CHECK (qte_pilihan IN ('menunduk', 'panik', 'senyum')),
    qte_skor        SMALLINT     CHECK (qte_skor BETWEEN 1 AND 3),
    -- qte: menunduk=1(pasif), panik=2(people pleaser), senyum=3(resiliensi)

    baterai_pilihan VARCHAR(20)  CHECK (baterai_pilihan IN ('keramaian', 'pojok', 'pohon')),
    baterai_skor    SMALLINT     CHECK (baterai_skor BETWEEN 1 AND 3),
    -- baterai: keramaian=1(aman sosial), pojok=2(butuh ruang), pohon=3(menarik diri)

    -- Skor agregat pos1
    skor_resiliensi_pos1 SMALLINT DEFAULT 0,  -- cuaca_skor + qte_skor (max 6)
    skor_isolasi         SMALLINT DEFAULT 0,  -- baterai_skor (1-3)

    recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  pos1_responses IS 'Data asesmen terselubung dari Pos 1 Balai Rasa';
COMMENT ON COLUMN pos1_responses.cuaca_hati     IS 'Pilihan cuaca = indikator mood dasar';
COMMENT ON COLUMN pos1_responses.tas_stres_type IS 'Tipe stres dari pilihan isi tas ransel';
COMMENT ON COLUMN pos1_responses.qte_pilihan    IS 'Respons cepat saat tersenggol NPC = tekanan';
COMMENT ON COLUMN pos1_responses.baterai_pilihan IS 'Tempat duduk = tingkat isolasi sosial';

CREATE INDEX IF NOT EXISTS idx_pos1_session ON pos1_responses(session_id);

-- ══════════════════════════════════════════════════════════
-- TABEL 5: RESPONS POS 2 — PASAR INTERAKSI (Roleplay Bullying)
-- Satu record per skenario (3 baris per sesi)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pos2_responses (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    skenario_id     SMALLINT     NOT NULL CHECK (skenario_id BETWEEN 1 AND 3),
    -- 1=Body Shaming, 2=Meremehkan Pencapaian, 3=Pengucilan Halus

    tema            VARCHAR(50),
    -- Deskripsi tema skenario untuk referensi BK

    pilihan         CHAR(1)      NOT NULL CHECK (pilihan IN ('A', 'B', 'C')),
    -- A=Pasif/Menarik diri, B=Reaktif/Defensif, C=Asertif (Lathi to Urup)

    tipe_respons    VARCHAR(20)  NOT NULL
                    CHECK (tipe_respons IN (
                        'pasif', 'internalisasi', 'menarikdiri',
                        'reaktif', 'defensif',
                        'asertif'
                    )),

    skor_resiliensi SMALLINT     NOT NULL CHECK (skor_resiliensi BETWEEN 1 AND 3),
    -- 1=pasif, 2=reaktif, 3=asertif

    recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  pos2_responses IS 'Respons roleplay per skenario bullying di Pos 2';
COMMENT ON COLUMN pos2_responses.tipe_respons IS 'Klasifikasi psikologis respons pemain';
COMMENT ON COLUMN pos2_responses.skor_resiliensi IS '1=rentan, 2=pertengahan, 3=resilien';

CREATE INDEX IF NOT EXISTS idx_pos2_session  ON pos2_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_pos2_skenario ON pos2_responses(skenario_id);
CREATE INDEX IF NOT EXISTS idx_pos2_tipe     ON pos2_responses(tipe_respons);

-- ══════════════════════════════════════════════════════════
-- TABEL 6: HASIL POS 3 — TAMAN URUP (Puzzle Kata)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pos3_results (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    total_puzzles   SMALLINT     NOT NULL DEFAULT 3,
    puzzles_correct SMALLINT     NOT NULL DEFAULT 0,
    -- Jumlah puzzle yang diselesaikan dengan benar (max 3)

    attempts_total  SMALLINT     DEFAULT 0,
    -- Total percobaan (termasuk yang salah)

    completed       BOOLEAN      NOT NULL DEFAULT FALSE,
    duration_secs   INTEGER,
    -- Durasi mengerjakan semua puzzle

    recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pos3_results IS 'Statistik penyelesaian puzzle kata di Pos 3 Taman Urup';

CREATE INDEX IF NOT EXISTS idx_pos3_session ON pos3_results(session_id);

-- ══════════════════════════════════════════════════════════
-- TABEL 7: PROFIL MENTAL AKHIR
-- Hasil kalkulasi algoritmik setelah semua pos selesai
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mental_profiles (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    -- Skor dimensi (0-100%)
    skor_resiliensi_total  SMALLINT NOT NULL DEFAULT 0 CHECK (skor_resiliensi_total BETWEEN 0 AND 100),
    skor_koneksi_sosial    SMALLINT NOT NULL DEFAULT 0 CHECK (skor_koneksi_sosial BETWEEN 0 AND 100),
    skor_asertivitas       SMALLINT NOT NULL DEFAULT 0 CHECK (skor_asertivitas BETWEEN 0 AND 100),
    skor_keseluruhan       SMALLINT NOT NULL DEFAULT 0 CHECK (skor_keseluruhan BETWEEN 0 AND 100),

    -- Tipe hasil (MBTI-style)
    tipe_mental     VARCHAR(20)  NOT NULL CHECK (tipe_mental IN ('ksatria', 'daun')),
    -- ksatria=Ksatria Lentera (resiliensi tinggi), daun=Daun Terduduk (perlu perhatian)

    -- Konteks stres
    stres_type      VARCHAR(20)  CHECK (stres_type IN ('akademik', 'sosial', 'insecurity')),

    -- Flag untuk tindak lanjut BK
    perlu_tindak_lanjut BOOLEAN NOT NULL DEFAULT FALSE,
    -- TRUE jika tipe='daun' atau ada laporan bullying

    ditandai_bk     BOOLEAN      NOT NULL DEFAULT FALSE,
    -- TRUE jika Guru BK sudah menandai kasus ini untuk diproses

    catatan_bk      TEXT,
    -- Catatan dari Guru BK (diisi via dashboard)

    calculated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  mental_profiles IS 'Hasil kalkulasi profil mental akhir per sesi';
COMMENT ON COLUMN mental_profiles.perlu_tindak_lanjut IS 'Flag prioritas untuk dashboard BK';
COMMENT ON COLUMN mental_profiles.ditandai_bk IS 'Guru BK sudah acknowledge kasus ini';

CREATE INDEX IF NOT EXISTS idx_mental_session     ON mental_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_mental_tipe        ON mental_profiles(tipe_mental);
CREATE INDEX IF NOT EXISTS idx_mental_tindaklanjut ON mental_profiles(perlu_tindak_lanjut)
    WHERE perlu_tindak_lanjut = TRUE;

-- ══════════════════════════════════════════════════════════
-- TABEL 8: LAPORAN BULLYING (Pos 4 — Bilik Lentera)
-- DATA PALING SENSITIF — Akses ketat!
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS laporan_bully (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    school_id       INTEGER      REFERENCES schools(id) ON DELETE SET NULL,

    -- Identitas pengiriman
    is_anonim       BOOLEAN      NOT NULL DEFAULT TRUE,
    nama_pelapor    VARCHAR(100),
    -- NULL jika anonim. Dienkripsi AES-256 di application layer sebelum INSERT.

    -- Isi laporan
    -- !! WAJIB DIENKRIPSI sebelum disimpan (AES-256-GCM di aplikasi) !!
    isi_laporan_enc TEXT         NOT NULL,
    -- Ciphertext dari isi laporan
    encryption_iv   VARCHAR(64),
    -- Initialization Vector untuk dekripsi (hex-encoded)

    -- Panjang asli (untuk validasi setelah dekripsi, tanpa menyimpan plain-text)
    panjang_karakter INTEGER,

    -- Indikator urgensi (ditentukan oleh NLP/keyword matching di backend)
    urgensi         VARCHAR(20)  NOT NULL DEFAULT 'normal'
                    CHECK (urgensi IN ('normal', 'sedang', 'tinggi', 'kritis')),
    -- kritis = ada kata kunci self-harm / kekerasan fisik → notifikasi segera

    -- Kata kunci sensitif terdeteksi (array JSON, tanpa isi laporan)
    kata_kunci_flag JSONB,
    -- Contoh: ["self-harm", "kekerasan-fisik"]

    -- Status penanganan
    status_penanganan VARCHAR(30) NOT NULL DEFAULT 'belum_dibaca'
                    CHECK (status_penanganan IN (
                        'belum_dibaca',
                        'sudah_dibaca',
                        'dalam_proses',
                        'selesai',
                        'dirujuk'
                    )),

    dibaca_oleh     INTEGER      REFERENCES users_bk(id) ON DELETE SET NULL,
    dibaca_at       TIMESTAMPTZ,
    diproses_at     TIMESTAMPTZ,
    diselesaikan_at TIMESTAMPTZ,

    catatan_bk      TEXT,
    -- Catatan tindak lanjut dari Guru BK

    submitted_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  laporan_bully IS '⚠️ DATA SENSITIF: Laporan bullying dari Pos 4. Isi laporan dienkripsi AES-256.';
COMMENT ON COLUMN laporan_bully.isi_laporan_enc IS 'Ciphertext AES-256-GCM. Dekripsi hanya di application layer.';
COMMENT ON COLUMN laporan_bully.urgensi IS 'kritis=notifikasi segera ke BK + kepala sekolah';
COMMENT ON COLUMN laporan_bully.kata_kunci_flag IS 'Keyword sensitif (self-harm, dll) untuk triase cepat';

CREATE INDEX IF NOT EXISTS idx_laporan_session  ON laporan_bully(session_id);
CREATE INDEX IF NOT EXISTS idx_laporan_school   ON laporan_bully(school_id);
CREATE INDEX IF NOT EXISTS idx_laporan_urgensi  ON laporan_bully(urgensi);
CREATE INDEX IF NOT EXISTS idx_laporan_status   ON laporan_bully(status_penanganan);
CREATE INDEX IF NOT EXISTS idx_laporan_submitted ON laporan_bully(submitted_at DESC);

-- ══════════════════════════════════════════════════════════
-- TABEL 9: PERMINTAAN KONSELING
-- Saat pemain klik tombol "Jadwalkan Ngobrol Santai"
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS konseling_req (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    school_id       INTEGER      REFERENCES schools(id) ON DELETE SET NULL,
    bk_id           INTEGER      REFERENCES users_bk(id) ON DELETE SET NULL,

    -- Kontak — NULL jika tidak diisi
    nama_siswa      VARCHAR(100),
    kontak          VARCHAR(200),
    -- Email/WA (dienkripsi di app layer)

    -- Preferensi
    metode          VARCHAR(20)  DEFAULT 'zoom'
                    CHECK (metode IN ('zoom', 'chat', 'tatap_muka')),
    waktu_pilihan   TEXT,
    -- Teks bebas (misal: "Selasa atau Rabu sore")

    -- Status
    status          VARCHAR(20)  NOT NULL DEFAULT 'menunggu'
                    CHECK (status IN ('menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan')),
    jadwal_konfirmasi TIMESTAMPTZ,
    link_meeting    VARCHAR(500),
    -- Link Zoom/Meet yang dikirim BK

    requested_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE konseling_req IS 'Permintaan sesi konseling dari pemain yang membutuhkan dukungan';

CREATE INDEX IF NOT EXISTS idx_konseling_school  ON konseling_req(school_id);
CREATE INDEX IF NOT EXISTS idx_konseling_status  ON konseling_req(status);
CREATE INDEX IF NOT EXISTS idx_konseling_bk      ON konseling_req(bk_id);

-- ══════════════════════════════════════════════════════════
-- TABEL 10: AUDIT LOG (Keamanan & Compliance)
-- Setiap akses ke data sensitif dicatat
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL    PRIMARY KEY,
    user_bk_id      INTEGER      REFERENCES users_bk(id) ON DELETE SET NULL,
    aksi            VARCHAR(80)  NOT NULL,
    -- Contoh: 'BACA_LAPORAN', 'UPDATE_STATUS', 'LOGIN', 'EXPORT_DATA'

    target_tabel    VARCHAR(50),
    target_id       INTEGER,
    -- Tabel dan ID record yang diakses

    deskripsi       TEXT,
    ip_address      INET,
    user_agent_hash VARCHAR(64),
    -- Hash dari user agent string

    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  audit_log IS 'Log audit untuk semua akses data sensitif — tidak boleh dihapus';
COMMENT ON COLUMN audit_log.aksi IS 'Aksi yang dilakukan, untuk compliance dan forensik';

CREATE INDEX IF NOT EXISTS idx_audit_user    ON audit_log(user_bk_id);
CREATE INDEX IF NOT EXISTS idx_audit_aksi    ON audit_log(aksi);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ══════════════════════════════════════════════════════════
-- VIEWS: Untuk Dashboard Guru BK
-- ══════════════════════════════════════════════════════════

-- View 1: Ringkasan sesi per sekolah (tidak ada data PII)
CREATE OR REPLACE VIEW v_dashboard_ringkasan AS
SELECT
    s.id                                                        AS school_id,
    s.nama_sekolah,
    COUNT(DISTINCT ss.id)                                       AS total_sesi,
    COUNT(DISTINCT ss.id) FILTER (WHERE ss.status = 'completed') AS sesi_selesai,
    ROUND(
        COUNT(DISTINCT ss.id) FILTER (WHERE ss.status = 'completed') * 100.0
        / NULLIF(COUNT(DISTINCT ss.id), 0), 1
    )                                                           AS pct_selesai,
    COUNT(DISTINCT mp.id) FILTER (WHERE mp.tipe_mental = 'ksatria') AS tipe_ksatria,
    COUNT(DISTINCT mp.id) FILTER (WHERE mp.tipe_mental = 'daun')    AS tipe_daun,
    COUNT(DISTINCT lb.id)                                       AS total_laporan,
    COUNT(DISTINCT lb.id) FILTER (WHERE lb.status_penanganan = 'belum_dibaca') AS laporan_belum_dibaca,
    COUNT(DISTINCT lb.id) FILTER (WHERE lb.urgensi IN ('tinggi', 'kritis'))     AS laporan_urgen
FROM schools s
LEFT JOIN sessions      ss ON ss.school_id = s.id
LEFT JOIN mental_profiles mp ON mp.session_id = ss.id
LEFT JOIN laporan_bully  lb ON lb.school_id = s.id
WHERE s.is_active = TRUE
GROUP BY s.id, s.nama_sekolah
ORDER BY laporan_urgen DESC, laporan_belum_dibaca DESC;

COMMENT ON VIEW v_dashboard_ringkasan IS 'Ringkasan dashboard per sekolah — tidak berisi data PII';

-- View 2: Antrian laporan untuk BK (tanpa isi laporan — isi hanya dibuka saat klik)
CREATE OR REPLACE VIEW v_laporan_antrian AS
SELECT
    lb.id                   AS laporan_id,
    lb.school_id,
    sc.nama_sekolah,
    lb.is_anonim,
    CASE WHEN lb.is_anonim THEN '[Anonim]' ELSE '🔒 Klik untuk dekripsi' END AS identitas,
    lb.urgensi,
    lb.status_penanganan,
    lb.kata_kunci_flag,
    lb.submitted_at,
    lb.dibaca_at,
    mp.tipe_mental,
    mp.skor_keseluruhan,
    mp.skor_resiliensi_total
FROM laporan_bully lb
JOIN sessions       ss ON ss.id = lb.session_id
JOIN schools        sc ON sc.id = lb.school_id
LEFT JOIN mental_profiles mp ON mp.session_id = lb.session_id
ORDER BY
    CASE lb.urgensi
        WHEN 'kritis' THEN 1
        WHEN 'tinggi' THEN 2
        WHEN 'sedang' THEN 3
        ELSE 4
    END,
    lb.submitted_at DESC;

COMMENT ON VIEW v_laporan_antrian IS 'Antrian laporan bullying untuk BK — isi laporan tidak ditampilkan di view ini';

-- View 3: Statistik tipe respons pos2 per sekolah (untuk analisis BK)
CREATE OR REPLACE VIEW v_analisis_respons AS
SELECT
    sc.nama_sekolah,
    p2.skenario_id,
    p2.tema,
    p2.tipe_respons,
    COUNT(*)                                        AS jumlah,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (
        PARTITION BY sc.id, p2.skenario_id
    ), 1)                                           AS persen
FROM pos2_responses p2
JOIN sessions       ss ON ss.id = p2.session_id
JOIN schools        sc ON sc.id = ss.school_id
GROUP BY sc.id, sc.nama_sekolah, p2.skenario_id, p2.tema, p2.tipe_respons
ORDER BY sc.nama_sekolah, p2.skenario_id, jumlah DESC;

COMMENT ON VIEW v_analisis_respons IS 'Distribusi tipe respons per skenario per sekolah — untuk analisis intervensi BK';

-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (PostgreSQL) — Isolasi Data Antar Sekolah
-- ══════════════════════════════════════════════════════════
-- Guru BK hanya bisa melihat data sekolahnya sendiri

-- ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE laporan_bully  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mental_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE konseling_req  ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY bk_isolation_sessions ON sessions
--     USING (school_id = current_setting('app.current_school_id')::INTEGER);

-- CREATE POLICY bk_isolation_laporan ON laporan_bully
--     USING (school_id = current_setting('app.current_school_id')::INTEGER);

-- ══════════════════════════════════════════════════════════
-- TRIGGER: Auto-update updated_at timestamps
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'schools', 'users_bk', 'sessions',
        'mental_profiles', 'laporan_bully', 'konseling_req'
    ] LOOP
        EXECUTE FORMAT(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
            t, t
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════
-- DATA SEED: Sekolah contoh & akun BK demo
-- (HANYA untuk development/testing — hapus di production!)
-- ══════════════════════════════════════════════════════════
INSERT INTO schools (kode_sekolah, nama_sekolah, kota, provinsi, jenjang)
VALUES
    ('20400001', 'SMA Negeri 1 Yogyakarta', 'Yogyakarta', 'DI Yogyakarta', 'SMA'),
    ('20400002', 'SMA Negeri 2 Semarang',   'Semarang',   'Jawa Tengah',   'SMA'),
    ('20400003', 'SMP Negeri 5 Solo',        'Surakarta',  'Jawa Tengah',   'SMP')
ON CONFLICT (kode_sekolah) DO NOTHING;

-- Akun BK demo (password: 'Lentera@2024' — di-hash bcrypt cost 12)
-- Hash ini hanya ilustrasi — generate ulang dengan bcrypt di aplikasi nyata
INSERT INTO users_bk (school_id, username, email, password_hash, nama_lengkap, role)
VALUES
    (1, 'bk_sman1yk', 'bk@sman1yk.sch.id',
     '$2b$12$PLACEHOLDER_HASH_GANTI_DI_APLIKASI', 'Ibu Sari Wulandari, S.Pd', 'bk'),
    (2, 'bk_sman2smg', 'bk@sman2smg.sch.id',
     '$2b$12$PLACEHOLDER_HASH_GANTI_DI_APLIKASI', 'Pak Budi Santoso, M.Pd', 'bk')
ON CONFLICT (username) DO NOTHING;

-- ══════════════════════════════════════════════════════════
-- CATATAN IMPLEMENTASI
-- ══════════════════════════════════════════════════════════
/*
  ENKRIPSI LAPORAN:
  ─────────────────
  Sebelum INSERT ke laporan_bully.isi_laporan_enc:
    1. Generate random IV (16 bytes)
    2. Encrypt isi laporan dengan AES-256-GCM menggunakan MASTER_KEY
    3. Simpan ciphertext (hex/base64) ke isi_laporan_enc
    4. Simpan IV (hex) ke encryption_iv
    5. MASTER_KEY disimpan di environment variable / AWS KMS / Vault
       JANGAN PERNAH simpan MASTER_KEY di database!

  Saat BK membaca laporan (via dashboard):
    1. Fetch ciphertext + IV dari DB
    2. Decrypt di application layer dengan MASTER_KEY
    3. Tampilkan plain-text hanya di browser BK (dalam memory)
    4. Catat ke audit_log: aksi='BACA_LAPORAN', target_id=laporan.id

  BACKUP & RETENTION:
  ─────────────────
  - laporan_bully: Retain 3 tahun (compliance pendidikan)
  - sessions: Retain 1 tahun
  - audit_log: Retain 5 tahun (forensik)
  - Backup harian ke offsite (encrypted)

  API ENDPOINTS (Backend — Node.js/Express atau Django):
  ─────────────────
  POST   /api/sessions              → Buat sesi baru
  PUT    /api/sessions/:id/pos1     → Simpan data pos1
  PUT    /api/sessions/:id/pos2     → Simpan respons pos2
  PUT    /api/sessions/:id/pos3     → Simpan hasil pos3
  POST   /api/laporan               → Kirim laporan bullying (terenkripsi)
  GET    /api/bk/dashboard          → Data dashboard (auth required)
  GET    /api/bk/laporan/:id        → Dekripsi & baca laporan (auth + audit)
  PUT    /api/bk/laporan/:id/status → Update status laporan
  POST   /api/bk/konseling          → Konfirmasi jadwal konseling
*/
