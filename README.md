# CyberCalc

> **Decode it. Transform it. Understand it.**

**CyberCalc** is a professional, client-side interactive cybersecurity calculator and byte-analysis workbench. Designed for CTF competitors, reverse engineers, digital forensics analysts, cybersecurity students, and developers, CyberCalc goes beyond simple arithmetic: it demystifies how computers encode, transform, and manipulate binary data.

---

## ⚡ Key Features & Investigative Tools

### 1. 🔍 Byte Detective (Core Centerpiece)
- **Multi-Format Input Parsing**: Directly inspect raw Hexadecimal (spaced or continuous, `0x` prefixes, C-arrays), Binary bitstreams, Decimal byte sequences (0–255), Plain Text (UTF-8), and Base64 payloads.
- **Ambiguity Detection**: Intelligent auto-detection with visual warnings for ambiguous inputs (e.g. `1001` as binary vs decimal).
- **Interactive Hexdump & Byte Grid**:
  - Color-coded by byte semantics: printable ASCII (cyan), null bytes (slate), high bytes (amber).
  - Synchronized hover & selection between hex bytes and ASCII representation.
  - Granular byte inspector showing offset, hex nibbles, 8-bit individual bit states ($2^7 \dots 2^0$), unsigned `uint8` (0–255), signed two's complement `int8` (-128–127), and character representation.
- **Shannon Entropy Engine**: Calculates bit-level entropy ($H = -\sum p_i \log_2 p_i$, 0 to 8 bits/byte). Samples of at least 16 bytes are called high entropy above 7.3 (encrypted or compressed) and low entropy below 2.5 (sparse or padded).
- **File Signature (Magic Bytes) Detection**: Identifies 30 executable, archive, image, and network header signatures (DOS MZ, ELF, Mach-O, PNG, JPEG, PDF, ZIP, GZ, SQLite, WASM, PCAP, WAV, AVI, WebP, etc.). Includes clear forensic disclaimers clarifying that signature match does not guarantee file integrity or absence of malicious payloads.
- **Heuristic Pattern Recognition**: Automatically spots null padding runs, repeated byte sequences, NOP sleds, and extracts contiguous ASCII strings with offsets.
- **File Drag-and-Drop**: Drop a local binary onto the Byte Detective input, or use Load File. Inspection stays in browser memory and previews the first 64 KB so a large file does not freeze the tab.

### 1.5 🕵️ Hash Detective
- **Heuristic Hash Classifier**: Identifies algorithm type, bit length, character set, Hashcat mode flags (`-m`), and John the Ripper formats.
- **Length-and-Format Ranking**: Displays the primary guess alongside alternate candidates. The percentages are priors from length and prefix, not a proof of which algorithm produced the digest.
- **Supports**: MD5, SHA-1, SHA-224, SHA-256, SHA-384, SHA-512, SHA3/Keccak, NTLM, LM, MD4, CRC-32, CRC-64, Bcrypt (`$2a$`, `$2b$`), Argon2id, Unix crypt (`$6$`, `$5$`, `$1$`), Cisco Type 7, and JWTs.
- **Client-Side Live Hasher**: Instantly hash any text or bytes into MD5, SHA-1, SHA-256, SHA-512, and CRC-32 using browser-native Web Crypto and pure JS algorithms.

### 2. 🔄 Conversion Lab
- **Multi-Base Real-Time Synchronizer**: Instantly translates between Binary, Hexadecimal, Unsigned Decimal, Signed Decimal, Octal, ASCII Text, and Base64.
- **Arbitrary Bit-Widths**: Configurable 8-bit, 16-bit, 32-bit, and 64-bit integer modes utilizing JavaScript `BigInt` to eliminate IEEE-754 precision issues with large numbers.
- **Interactive Bit Register**: Click individual bit boxes ($0 \leftrightarrow 1$) to watch all numeric representations update in real-time.
- **Mathematical Step Breakdown**: Displays positional weight formulas ($\sum b_i \times 2^i$ and $\sum h_i \times 16^i$) and two's complement sign calculations.

### 3. ⚙️ Bitwise Operations Lab
- **Bitwise Logic Visualizer**: Interactive XOR, AND, OR, NOT, Logical Left Shift (`<<`), Logical Right Shift (`>>`), Rotate Left (`ROL`), and Rotate Right (`ROR`). Displays glowing bit comparison rows with changed bits highlighted.
- **Repeating-Key XOR Lab**:
  - Cyclically applies arbitrary keys (Hex, Text, or Decimal) across byte sequences.
  - Implements the specification case: `41 42 43 44` XORed with `0x20` $\rightarrow$ `61 62 63 64` ("abcd"), explaining the ASCII bit-5 case toggling.
  - Cryptography educational warning emphasizing that XOR alone does not equal secure encryption and requires a true One-Time Pad (OTP) for information-theoretic security.
- **Single-Byte XOR CTF Breaker**: Brute-forces all 256 keys (0x00–0xFF) scored against English letter frequency tables to automatically crack single-byte ciphertexts.

### 4. 🔬 Reverse-Engineering Tools
- **Endianness Inspector**:
  - Side-by-side Big-Endian vs. Little-Endian evaluation for 16-bit, 32-bit, 64-bit integers, and IEEE 754 Float32/Float64 values.
  - Implements specification case: `01 02 03 04` $\rightarrow$ Big-Endian: `16,909,060` vs Little-Endian: `67,305,985`.
  - Visual memory address layout diagram ($base + 0, +1, +2, +3$) illustrating MSB and LSB placement across x86 vs Network byte orders.
- **Binary Diff (Byte Comparison)**:
  - Compares Sequence A and Sequence B byte-by-byte.
  - Pinpoints matching bytes, differing bytes, insertions, deletions, and percentage similarity.
- **Magic Bytes Signature Explorer**: Filterable database of standard binary headers.

### 5. 🌐 Networking Calculator
- **IPv4 Address Converter**: Translates between dotted-decimal, 32-bit integer, hex integer, and 4-octet binary.
- **CIDR Subnet Calculator**: Computes Network Address, Broadcast Address, Subnet Mask, Wildcard Mask, Usable Host Range, Total Address Count, Usable Host Count, Address Class (A–E), and Scope (RFC 1918 Private, Loopback, Carrier-Grade NAT, Public).
- **Subnet Bit Visualizer**: 32-bit visual representation color-coding Network bits vs. Host bits.
- **TCP Flags Bitmask Inspector**: Interactive 8-bit TCP flag toggles (SYN, ACK, FIN, RST, PSH, URG, ECE, CWR) with explanations of Nmap scan probes (Stealth SYN `-sS`, Xmas scan `-sX`, NULL scan `-sN`, FIN scan `-sF`).
- **IPv6 Analyzer (Stretch Goal)**: RFC 5952 canonical compression and 128-bit full expansion.

### 6. 🧮 Standard Calculator & Hidden Division-by-Zero Easter Egg
- Full-featured conventional calculator for everyday arithmetic supporting $+$, $-$, $\times$, $\div$, $\%$, decimal numbers, nested parentheses, keyboard shortcuts, and calculation tape history.
- **Hidden Easter Egg**:
  - Triggered exclusively when dividing by zero (`x / 0` or `x / (y - y)`).
  - Displays a full-screen retro CRT glitch distortion and alarm banner: `FATAL ERROR: REALITY DIVISION FAILURE`.
  - Simulates a kernel panic dump and attempts tab closure via `window.close()`.
  - Because modern browsers sandbox user-opened tabs from script termination, an emergency containment screen with fake core memory logs and a discreet `[ INITIATE EMERGENCY REBOOT ]` button is provided to cleanly restore the workbench.

### 7. 📜 Session History & Privacy Guarantee
- **Transformation History**: Logs operations, inputs, parameters, outputs, and timestamps with one-click re-load and copy actions.
- **Local-first privacy**: Calculations, hashing, and parsing run in the browser. The open-model button is the only network call, and it sends a short summary after an explicit click. There is no telemetry and no stored upload.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Target ES2022 for native `BigInt` numeric literals)
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) with Cyberpunk / Dark Obsidian theme
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: Node.js Native Test Runner (`node --test`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or newer (tested on Node.js v24)
- npm 9.x or newer

### Installation
```bash
git clone https://github.com/your-username/CyberCalc.git
cd CyberCalc
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Production Build
```bash
npm run build
npm start
```

### Run Unit Tests
```bash
npm test
```

---

## Open-source integrations

CyberCalc wraps three tools. It does not copy their source into `src/`.

- **Converters** live in `src/core/` (hex, binary, decimal, base64, base32, URL encoding, byte units). `npm test` covers empty input, invalid characters, and large values.
- **CyberChef** 11.5.0 (`11b86fec`) is an iframe on `127.0.0.1:8081` with `sandbox="allow-scripts allow-same-origin allow-forms"`. `public/cyberchef/` is only a stub. Port 8080 is left free.
- **Aperi'Solve** 3.7.12 from `pyproject.toml` (`9084bad`) is reached through `/api/aperisolve`. The checkout's Compose file is not edited. `deploy/aperisolve.override.yml` binds `127.0.0.1:5050` and sets `MAX_CONTENT_LENGTH=3145728`. `.env.example` still says `PROJECT_VERSION=3.1.3`; that value is stale.
- **dCode** is a link to https://www.dcode.fr/ with attribution. Its license is unverified.

```bash
scripts/bootstrap-tools.sh   # clone the pinned checkouts into Combined_Repos/ (gitignored)
scripts/cyberchef-up.sh      # serve the CyberChef checkout on 127.0.0.1:8081
scripts/aperisolve-up.sh     # start Aperi'Solve with the CyberCalc override
```

CyberChef's checkout wants Node 24 through 26. Notices are in `THIRD_PARTY_NOTICES.md`. Tradeoffs are in `docs/decisions.md`.

Git: branch from current HEAD as `feat/core-converters`, `feat/cyberchef-embed`, or `feat/aperisolve-proxy`. One PR per slice. Do not commit `Combined_Repos/`, `.env`, or malware samples.

## 📁 Project Structure

```text
cybercalc/
├── public/
│   └── samples/              # Pre-loaded binary header samples & test hashes
├── src/
│   ├── app/
│   │   ├── layout.tsx        # HTML head, dark mode, typography
│   │   ├── page.tsx          # Master workbench view & modal orchestrator
│   │   └── globals.css       # Custom cyber scrollbars & glitch animations
│   ├── components/
│   │   ├── Header.tsx        # Workbench banner, privacy badge, sample launcher
│   │   ├── Navigation.tsx    # 7-tab cyber navigation bar
│   │   ├── ByteGrid.tsx      # Interactive hexdump & 8-bit breakdown panel
│   │   ├── ByteDetectivePanel.tsx  # Flagship Byte Detective inspection engine
│   │   ├── HashDetectivePanel.tsx  # Algorithm classifier & live hash generator
│   │   ├── ConversionLab.tsx # Multi-base synchronizer with bit-flipper register
│   │   ├── BitwiseLab.tsx    # Repeating-key XOR, bitwise logic & CTF breaker
│   │   ├── ReverseEngineeringLab.tsx # Endianness inspector & binary diff
│   │   ├── NetworkingLab.tsx # IPv4 CIDR, TCP flags & IPv6 analyzer
│   │   ├── StandardCalculator.tsx  # Arithmetic calculator with Easter egg hook
│   │   ├── FatalShutdownModal.tsx  # Division-by-zero glitch overlay
│   │   ├── TraceHistoryModal.tsx   # Session transformation history drawer
│   │   └── QuickSamplesModal.tsx   # Curated CTF/forensic sample presets
│   ├── lib/
│   │   ├── parse-input.ts    # Multi-format byte parser & ambiguity detector
│   │   ├── byte-analysis.ts  # Shannon entropy & pattern detection
│   │   ├── signatures.ts     # Magic bytes database (30+ formats)
│   │   ├── hash-detective.ts # Hash recognition & Web Crypto hashing
│   │   ├── conversions.ts    # Multi-base arbitrary-width integer conversions
│   │   ├── xor.ts            # Bitwise operators, repeating XOR & frequency ranker
│   │   ├── endianness.ts     # Byte-order interpretations & binary diffing
│   │   ├── networking.ts     # CIDR subnetting, IP math & TCP flags
│   │   └── calculator.ts     # Shunting-yard expression evaluator
│   └── types/
│       └── analysis.ts       # Shared TypeScript interfaces & types
├── run-tests.mjs             # Node test runner suite
├── package.json
└── README.md
```

---

## 🔒 Privacy & Forensic Integrity Notice

CyberCalc keeps the forensic math in the browser:
- Entropy, signatures, conversions, XOR, and hashing run locally.
- **Ask the open model** sends a short summary (entropy, signature names, and a preview) to DigitalOcean Serverless Inference. The model access key stays on the server. Nothing is sent until that button is clicked.
- Signature matches are accompanied by forensic disclaimers clarifying that matching headers alone do not verify complete file safety or validity.

---

## 📜 License
MIT License. Built for cybersecurity education, digital forensics research, and CTF competitions.
