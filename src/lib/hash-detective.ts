import type { HashPrediction } from '../types/analysis';

export interface HashDetectionResult {
  rawInput: string;
  normalizedInput: string;
  charLength: number;
  detectedCharset: 'hex' | 'base64' | 'crypt' | 'ascii' | 'unknown';
  primaryMatch: HashPrediction | null;
  candidates: HashPrediction[];
  /** Distinct-character spread. This is not Shannon entropy. */
  charsetSpread: number;
  notes: string[];
}

export function detectHashType(input: string): HashDetectionResult {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const notes: string[] = [];

  if (!trimmed) {
    return {
      rawInput: '',
      normalizedInput: '',
      charLength: 0,
      detectedCharset: 'unknown',
      primaryMatch: null,
      candidates: [],
      charsetSpread: 0,
      notes: ['No hash provided. Enter a hash string to identify its algorithm.'],
    };
  }

  // Determine character set
  const isPureHex = /^[0-9a-fA-F]+$/.test(trimmed);
  const isCryptFormat = trimmed.startsWith('$');
  const isCisco7 = /^[0-9]{2}[0-9a-fA-F]{4,}$/.test(trimmed) && trimmed.length % 2 === 0;
  const isJwt = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(trimmed);

  let detectedCharset: 'hex' | 'base64' | 'crypt' | 'ascii' | 'unknown' = 'unknown';
  if (isPureHex) detectedCharset = 'hex';
  else if (isCryptFormat) detectedCharset = 'crypt';
  else if (/^[A-Za-z0-9+/=]+$/.test(trimmed)) detectedCharset = 'base64';
  else detectedCharset = 'ascii';

  const candidates: HashPrediction[] = [];

  // 1. Specialized formatted hashes
  if (trimmed.startsWith('$2a$') || trimmed.startsWith('$2b$') || trimmed.startsWith('$2y$')) {
    candidates.push({
      name: 'bcrypt',
      category: 'Password Hash',
      confidence: 98,
      bitLength: 192,
      charLength: trimmed.length,
      charset: 'Modular Crypt Format (Base64 variant)',
      description: 'Adaptive blowfish-based password hashing algorithm with configurable cost factor and embedded salt.',
      securityStatus: 'Secure',
      hashcatMode: '-m 3200',
      johnFormat: 'bcrypt',
      sampleUse: 'Linux / OpenBSD / web applications (Ruby on Rails, Node.js bcrypt)',
    });
  }

  if (trimmed.startsWith('$argon2i$') || trimmed.startsWith('$argon2d$') || trimmed.startsWith('$argon2id$')) {
    candidates.push({
      name: 'Argon2 (PHC Winner)',
      category: 'Password Hash',
      confidence: 99,
      bitLength: 256,
      charLength: trimmed.length,
      charset: 'Modular Crypt Format ($argon2...)',
      description: 'Memory-hard password hashing function, winner of the Password Hashing Competition (PHC) 2015. Highly resistant to GPU/ASIC cracking.',
      securityStatus: 'Secure',
      hashcatMode: '-m 34000',
      johnFormat: 'argon2',
      sampleUse: 'Modern password storage, KeePassXC, 1Password, Bitwarden',
    });
  }

  if (trimmed.startsWith('$6$')) {
    candidates.push({
      name: 'SHA-512 Crypt (Unix /etc/shadow)',
      category: 'Password Hash',
      confidence: 97,
      bitLength: 512,
      charLength: trimmed.length,
      charset: 'Unix Crypt B64',
      description: 'Standard Linux /etc/shadow password hash with 5,000+ default rounds of SHA-512.',
      securityStatus: 'Secure',
      hashcatMode: '-m 1800',
      johnFormat: 'sha512crypt',
      sampleUse: 'Modern Linux distributions (Ubuntu, Debian, RHEL, CentOS /etc/shadow)',
    });
  }

  if (trimmed.startsWith('$5$')) {
    candidates.push({
      name: 'SHA-256 Crypt (Unix /etc/shadow)',
      category: 'Password Hash',
      confidence: 97,
      bitLength: 256,
      charLength: trimmed.length,
      charset: 'Unix Crypt B64',
      description: 'Standard Linux /etc/shadow password hash with 5,000+ default rounds of SHA-256.',
      securityStatus: 'Legacy',
      hashcatMode: '-m 7400',
      johnFormat: 'sha256crypt',
      sampleUse: 'Linux systems configured for SHA-256 passwords',
    });
  }

  if (trimmed.startsWith('$1$')) {
    candidates.push({
      name: 'MD5-Crypt (Unix / Apache htpasswd)',
      category: 'Password Hash',
      confidence: 96,
      bitLength: 128,
      charLength: trimmed.length,
      charset: 'Unix Crypt B64',
      description: 'Poul-Henning Kamp MD5 crypt algorithm designed for FreeBSD. Vulnerable to fast GPU brute force.',
      securityStatus: 'Broken',
      hashcatMode: '-m 500',
      johnFormat: 'md5crypt',
      sampleUse: 'Legacy Unix /etc/shadow, Apache HTTP Basic Auth .htpasswd',
    });
  }

  if (isJwt) {
    candidates.push({
      name: 'JSON Web Token (JWT)',
      category: 'Standard Cryptographic',
      confidence: 95,
      bitLength: 256,
      charLength: trimmed.length,
      charset: 'Base64URL with dots',
      description: 'RFC 7519 JSON Web Token containing header, payload claims, and signature (HS256/RS256).',
      securityStatus: 'Informational',
      sampleUse: 'API authentication and OAuth 2.0 bearer tokens',
    });
  }

  if (isCisco7 && trimmed.length >= 6) {
    candidates.push({
      name: 'Cisco Type 7 Password',
      category: 'Legacy / Broken',
      confidence: 88,
      bitLength: trimmed.length * 4,
      charLength: trimmed.length,
      charset: 'Hex digits with 2-digit index prefix',
      description: 'Reversible Vigenère-like XOR obfuscation used in Cisco IOS running-config. Trivial to decode without a key. Hashcat has no mode for Type 7 (mode 5700 is Cisco IOS type 4 / SHA-256). John the Ripper format is cisco7.',
      securityStatus: 'Broken',
      johnFormat: 'cisco7',
      sampleUse: 'Cisco IOS router and switch configuration files',
    });
  }

  // 2. Pure hexadecimal length-based detections
  if (isPureHex) {
    const len = trimmed.length;

    // 8 hex chars (32 bits)
    if (len === 8) {
      candidates.push(
        {
          name: 'CRC-32 / CRC-32B',
          category: 'Checksum / Non-crypto',
          confidence: 72,
          bitLength: 32,
          charLength: 8,
          charset: 'Hexadecimal (32-bit)',
          description: 'Cyclic Redundancy Check polynomial used in Ethernet frames, ZIP, PNG, and error detection.',
          securityStatus: 'Informational',
          hashcatMode: '-m 11500',
          sampleUse: 'File integrity checks, network framing, archive checksums',
        },
        {
          name: 'Adler-32',
          category: 'Checksum / Non-crypto',
          confidence: 20,
          bitLength: 32,
          charLength: 8,
          charset: 'Hexadecimal (32-bit)',
          description: 'Checksum algorithm used in zlib compression library, faster than CRC32 with slightly lower dispersion.',
          securityStatus: 'Informational',
          sampleUse: 'Zlib DEFLATE data streams',
        },
        {
          name: 'FNV-1a (32-bit)',
          category: 'Checksum / Non-crypto',
          confidence: 8,
          bitLength: 32,
          charLength: 8,
          charset: 'Hexadecimal (32-bit)',
          description: 'Fowler–Noll–Vo non-cryptographic fast hash function for hash tables.',
          securityStatus: 'Informational',
          sampleUse: 'Hash tables and indexing',
        }
      );
    }

    // 16 hex chars (64 bits)
    if (len === 16) {
      candidates.push(
        {
          name: 'CRC-64',
          category: 'Checksum / Non-crypto',
          confidence: 45,
          bitLength: 64,
          charLength: 16,
          charset: 'Hexadecimal (64-bit)',
          description: '64-bit Cyclic Redundancy Check used in databases and storage filesystems.',
          securityStatus: 'Informational',
          sampleUse: 'Filesystems (XZ, Redis, SQLite checksums)',
        },
        {
          name: 'MySQL 3.23 (Old Password)',
          category: 'Database Hash',
          confidence: 30,
          bitLength: 64,
          charLength: 16,
          charset: 'Hexadecimal (64-bit)',
          description: 'Legacy MySQL pre-4.1 authentication hash. Easily cracked.',
          securityStatus: 'Broken',
          hashcatMode: '-m 200',
          johnFormat: 'mysql',
          sampleUse: 'Old MySQL 3.23 / 4.0 databases',
        },
        {
          name: 'Half-MD5 (Truncated)',
          category: 'Legacy / Broken',
          confidence: 25,
          bitLength: 64,
          charLength: 16,
          charset: 'Hexadecimal (64-bit)',
          description: 'First or middle 64 bits of an MD5 hash, commonly used in CTF challenges and short IDs.',
          securityStatus: 'Broken',
          hashcatMode: '-m 5100',
          sampleUse: 'Short hash identifiers and CTF obfuscation',
        }
      );
    }

    // 32 hex chars (128 bits) - THE BIG ONE
    if (len === 32) {
      candidates.push(
        {
          name: 'MD5',
          category: 'Legacy / Broken',
          confidence: 52,
          bitLength: 128,
          charLength: 32,
          charset: 'Hexadecimal (128-bit)',
          description: 'RFC 1321 Message Digest Algorithm 5. Collision vulnerabilities discovered in 2004 make it unsafe for security.',
          securityStatus: 'Broken',
          hashcatMode: '-m 0',
          johnFormat: 'raw-md5',
          sampleUse: 'File verification, legacy password stores, CTF challenges',
        },
        {
          name: 'NTLM (Windows NT Lan Manager)',
          category: 'Password Hash',
          confidence: 33,
          bitLength: 128,
          charLength: 32,
          charset: 'Hexadecimal (128-bit)',
          description: 'Microsoft Windows password hash computed as MD4(UTF-16LE(password)). Used across Active Directory.',
          securityStatus: 'Broken',
          hashcatMode: '-m 1000',
          johnFormat: 'nt',
          sampleUse: 'Active Directory SAM / NTDS.dit, Windows user authentication',
        },
        {
          name: 'MD4',
          category: 'Legacy / Broken',
          confidence: 8,
          bitLength: 128,
          charLength: 32,
          charset: 'Hexadecimal (128-bit)',
          description: 'Ronald Rivest pre-cursor to MD5. Cryptographically broken.',
          securityStatus: 'Broken',
          hashcatMode: '-m 900',
          johnFormat: 'raw-md4',
          sampleUse: 'ED2K network, early protocols',
        },
        {
          name: 'RIPEMD-128',
          category: 'Legacy / Broken',
          confidence: 4,
          bitLength: 128,
          charLength: 32,
          charset: 'Hexadecimal (128-bit)',
          description: '128-bit European cryptographic hash designed as an MD4/MD5 drop-in replacement. Hashcat has no RIPEMD-128 mode; -m 6000 is RIPEMD-160.',
          securityStatus: 'Legacy',
          sampleUse: 'European crypto frameworks',
        },
        {
          name: 'LM (LanMan Padded)',
          category: 'Password Hash',
          confidence: 3,
          bitLength: 128,
          charLength: 32,
          charset: 'Hexadecimal (128-bit)',
          description: 'DES-based legacy Windows hash splitting password into two 7-char uppercase chunks. Highly insecure.',
          securityStatus: 'Broken',
          hashcatMode: '-m 3000',
          johnFormat: 'lm',
          sampleUse: 'Windows 95/98/XP legacy credentials',
        }
      );
    }

    // 40 hex chars (160 bits)
    if (len === 40) {
      candidates.push(
        {
          name: 'SHA-1',
          category: 'Legacy / Broken',
          confidence: 76,
          bitLength: 160,
          charLength: 40,
          charset: 'Hexadecimal (160-bit)',
          description: 'Secure Hash Algorithm 1 (NIST FIPS 180-4). SHAttered collision demonstrated in 2017.',
          securityStatus: 'Broken',
          hashcatMode: '-m 100',
          johnFormat: 'raw-sha1',
          sampleUse: 'Git commit hashes, legacy SSL certificates, PGP key fingerprints',
        },
        {
          name: 'RIPEMD-160',
          category: 'Standard Cryptographic',
          confidence: 14,
          bitLength: 160,
          charLength: 40,
          charset: 'Hexadecimal (160-bit)',
          description: '160-bit cryptographic hash function developed by COSIC research group. Used in Bitcoin address generation.',
          securityStatus: 'Secure',
          hashcatMode: '-m 6000',
          johnFormat: 'ripemd-160',
          sampleUse: 'Bitcoin addresses (Hash160 = RIPEMD160(SHA256(pubkey)))',
        },
        {
          name: 'MySQL 4.1+ / MariaDB',
          category: 'Database Hash',
          confidence: 10,
          bitLength: 160,
          charLength: 40,
          charset: 'Hexadecimal (160-bit)',
          description: 'MySQL password authentication hash computed as SHA1(SHA1(password)). Often prefixed with *.',
          securityStatus: 'Legacy',
          hashcatMode: '-m 300',
          johnFormat: 'mysql-sha1',
          sampleUse: 'MySQL `user` table `authentication_string` column',
        }
      );
    }

    // 56 hex chars (224 bits)
    if (len === 56) {
      candidates.push(
        {
          name: 'SHA-224',
          category: 'Standard Cryptographic',
          confidence: 65,
          bitLength: 224,
          charLength: 56,
          charset: 'Hexadecimal (224-bit)',
          description: 'Truncated version of SHA-256 with different initial state vector. NIST FIPS 180-4.',
          securityStatus: 'Secure',
          hashcatMode: '-m 1300',
          johnFormat: 'raw-sha224',
          sampleUse: 'Key exchange algorithms requiring 112-bit security matching 2-Key Triple-DES',
        },
        {
          name: 'SHA3-224',
          category: 'Standard Cryptographic',
          confidence: 35,
          bitLength: 224,
          charLength: 56,
          charset: 'Hexadecimal (224-bit)',
          description: 'Keccak permutation-based sponge construction NIST standard.',
          securityStatus: 'Secure',
          hashcatMode: '-m 17300',
          johnFormat: 'sha3-224',
          sampleUse: 'Next-generation cryptographic digests',
        }
      );
    }

    // 64 hex chars (256 bits)
    if (len === 64) {
      candidates.push(
        {
          name: 'SHA-256',
          category: 'Standard Cryptographic',
          confidence: 58,
          bitLength: 256,
          charLength: 64,
          charset: 'Hexadecimal (256-bit)',
          description: 'Industry gold standard 256-bit hash of the SHA-2 family. Highly secure, no known collisions.',
          securityStatus: 'Secure',
          hashcatMode: '-m 1400',
          johnFormat: 'raw-sha256',
          sampleUse: 'TLS/SSL certificates, Bitcoin proof-of-work, Docker image digests, code signatures',
        },
        {
          name: 'SHA3-256',
          category: 'Standard Cryptographic',
          confidence: 16,
          bitLength: 256,
          charLength: 64,
          charset: 'Hexadecimal (256-bit)',
          description: 'NIST SHA-3 sponge (FIPS 202). Different padding from the original Keccak-256 used by Ethereum, so the digests do not match.',
          securityStatus: 'Secure',
          hashcatMode: '-m 17400',
          johnFormat: 'sha3-256',
          sampleUse: 'NIST SHA-3 deployments and modern protocol digests',
        },
        {
          name: 'Keccak-256',
          category: 'Standard Cryptographic',
          confidence: 12,
          bitLength: 256,
          charLength: 64,
          charset: 'Hexadecimal (256-bit)',
          description: 'Original Keccak sponge, not NIST SHA-3. This is the 256-bit hash used by Ethereum.',
          securityStatus: 'Secure',
          hashcatMode: '-m 17800',
          johnFormat: 'keccak-256',
          sampleUse: 'Ethereum smart contracts, EVM function selectors (bytes4), address creation',
        },
        {
          name: 'BLAKE2s-256',
          category: 'Standard Cryptographic',
          confidence: 7,
          bitLength: 256,
          charLength: 64,
          charset: 'Hexadecimal (256-bit)',
          description: '32-bit-word BLAKE2 variant producing a 256-bit digest. Hashcat mode 600 is BLAKE2b-512, not this hash.',
          securityStatus: 'Secure',
          hashcatMode: '-m 31000',
          sampleUse: 'Embedded and 32-bit platforms that want a BLAKE2 digest',
        },
        {
          name: 'BLAKE2b-256',
          category: 'Standard Cryptographic',
          confidence: 4,
          bitLength: 256,
          charLength: 64,
          charset: 'Hexadecimal (256-bit)',
          description: 'BLAKE2b truncated to 256 bits. The full 512-bit BLAKE2b digest is Hashcat mode 600.',
          securityStatus: 'Secure',
          hashcatMode: '-m 34800',
          sampleUse: 'Argon2 core and libraries that request a 256-bit BLAKE2b digest',
        },
        {
          name: 'GOST R 34.11-94',
          category: 'Legacy / Broken',
          confidence: 3,
          bitLength: 256,
          charLength: 64,
          charset: 'Hexadecimal (256-bit)',
          description: 'Russian federal standard 256-bit cryptographic hash function.',
          securityStatus: 'Legacy',
          hashcatMode: '-m 6900',
          sampleUse: 'Russian banking and government systems',
        }
      );
    }

    // 96 hex chars (384 bits)
    if (len === 96) {
      candidates.push(
        {
          name: 'SHA-384',
          category: 'Standard Cryptographic',
          confidence: 75,
          bitLength: 384,
          charLength: 96,
          charset: 'Hexadecimal (384-bit)',
          description: 'Truncated SHA-512 variant from the SHA-2 family offering 192 bits of collision resistance.',
          securityStatus: 'Secure',
          hashcatMode: '-m 10800',
          johnFormat: 'raw-sha384',
          sampleUse: 'NSA Suite B cryptography, Top Secret government clearance TLS ciphersuites',
        },
        {
          name: 'SHA3-384',
          category: 'Standard Cryptographic',
          confidence: 25,
          bitLength: 384,
          charLength: 96,
          charset: 'Hexadecimal (384-bit)',
          description: 'Keccak 384-bit sponge construction.',
          securityStatus: 'Secure',
          hashcatMode: '-m 17500',
          sampleUse: 'High-security applications',
        }
      );
    }

    // 128 hex chars (512 bits)
    if (len === 128) {
      candidates.push(
        {
          name: 'SHA-512',
          category: 'Standard Cryptographic',
          confidence: 65,
          bitLength: 512,
          charLength: 128,
          charset: 'Hexadecimal (512-bit)',
          description: '512-bit digest from the SHA-2 family using 64-bit word operations. Highly optimized for 64-bit CPU architectures.',
          securityStatus: 'Secure',
          hashcatMode: '-m 1700',
          johnFormat: 'raw-sha512',
          sampleUse: 'Certificate authorities, secure package signing, blockchain roots',
        },
        {
          name: 'BLAKE2b-512',
          category: 'Standard Cryptographic',
          confidence: 18,
          bitLength: 512,
          charLength: 128,
          charset: 'Hexadecimal (512-bit)',
          description: 'High-speed cryptographic hash optimized for 64-bit platforms, immune to length-extension attacks.',
          securityStatus: 'Secure',
          hashcatMode: '-m 600',
          sampleUse: 'IPFS, Zcash, sodium/libsodium default hash',
        },
        {
          name: 'SHA3-512',
          category: 'Standard Cryptographic',
          confidence: 12,
          bitLength: 512,
          charLength: 128,
          charset: 'Hexadecimal (512-bit)',
          description: 'Keccak-512 NIST standard with maximum security margin.',
          securityStatus: 'Secure',
          hashcatMode: '-m 17600',
          sampleUse: 'Military and post-quantum preparedness frameworks',
        },
        {
          name: 'Whirlpool',
          category: 'Standard Cryptographic',
          confidence: 5,
          bitLength: 512,
          charLength: 128,
          charset: 'Hexadecimal (512-bit)',
          description: '512-bit cryptographic hash created by Vincent Rijmen and Paulo Barreto, based on modified AES cipher structure.',
          securityStatus: 'Legacy',
          hashcatMode: '-m 6100',
          johnFormat: 'whirlpool',
          sampleUse: 'TrueCrypt / VeraCrypt system encryption options',
        }
      );
    }
  }

  // If no candidates matched exactly by length or prefix:
  if (candidates.length === 0) {
    notes.push(
      `No standard hash matched length ${trimmed.length} with charset "${detectedCharset}". It may be a custom salted hash, truncated signature, or non-hash token.`
    );
  }

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  return {
    rawInput: input,
    normalizedInput: trimmed,
    charLength: trimmed.length,
    detectedCharset,
    primaryMatch: candidates.length > 0 ? candidates[0] : null,
    candidates,
    charsetSpread: Number((Math.log2(new Set(trimmed).size || 1) * (trimmed.length / 8)).toFixed(2)),
    notes,
  };
}

// Pure JS CRC32 implementation
export function calculateCrc32(bytes: Uint8Array): string {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)) >>> 0;
    }
    table[i] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
  }
  return ((crc ^ (-1)) >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

// Pure JS MD5 implementation for client-side hashing without external heavy libraries
export function calculateMd5(bytes: Uint8Array): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRol(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  const nblk = ((bytes.length + 8) >> 6) + 1;
  const blks = new Int32Array(nblk * 16);
  for (let i = 0; i < bytes.length; i++) {
    blks[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }
  blks[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
  blks[nblk * 16 - 2] = (bytes.length * 8) & 0xffffffff;
  blks[nblk * 16 - 1] = Math.floor((bytes.length * 8) / 0x100000000);

  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;

  for (let i = 0; i < blks.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    a = md5ff(a, b, c, d, blks[i], 7, -680876936);
    d = md5ff(d, a, b, c, blks[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, blks[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, blks[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, blks[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, blks[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, blks[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, blks[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, blks[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, blks[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, blks[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, blks[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, blks[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, blks[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, blks[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, blks[i + 15], 22, 1236535329);

    a = md5gg(a, b, c, d, blks[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, blks[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, blks[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, blks[i], 20, -373897302);
    a = md5gg(a, b, c, d, blks[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, blks[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, blks[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, blks[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, blks[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, blks[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, blks[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, blks[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, blks[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, blks[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, blks[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, blks[i + 12], 20, -1926607734);

    a = md5hh(a, b, c, d, blks[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, blks[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, blks[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, blks[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, blks[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, blks[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, blks[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, blks[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, blks[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, blks[i], 11, -358537222);
    c = md5hh(c, d, a, b, blks[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, blks[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, blks[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, blks[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, blks[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, blks[i + 2], 23, -995338651);

    a = md5ii(a, b, c, d, blks[i], 6, -198630844);
    d = md5ii(d, a, b, c, blks[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, blks[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, blks[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, blks[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, blks[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, blks[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, blks[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, blks[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, blks[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, blks[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, blks[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, blks[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, blks[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, blks[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, blks[i + 9], 21, -343485551);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  function rhex(n: number) {
    let s = '';
    for (let j = 0; j <= 3; j++) {
      s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16);
    }
    return s;
  }

  return (rhex(a) + rhex(b) + rhex(c) + rhex(d)).toLowerCase();
}

// Client-side Web Crypto API for SHA-1, SHA-256, SHA-384, SHA-512
export async function calculateWebCryptoHash(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512', bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, bytes as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
