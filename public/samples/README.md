# CyberCalc Forensic & CTF Sample Files

This directory contains binary sample payloads and header dumps designed for testing CyberCalc's investigative workbench tools:

1. **`sample_dos_header.hex`**: Classic DOS MZ / PE executable header (`4D 5A 90 00 ...`). Test in **Byte Detective** to observe file signature matching, PE header verification disclaimer, and hex grid offset mapping.
2. **`sample_png_header.hex`**: Portable Network Graphics 8-byte magic header (`89 50 4E 47 0D 0A 1A 0A ...`).
3. **`sample_shellcode.hex`**: Classic x86 NOP sled (`90 90 90 90 ...`) leading into `execve("/bin/sh")` shellcode. Test in **Byte Detective** to observe heuristic NOP-sled detection and embedded ASCII string extraction.
4. **`sample_repeating_xor.hex`**: Specification test case (`41 42 43 44` XORed with key `0x20` to demonstrate ASCII case toggling from "ABCD" to "abcd").
5. **`sample_hashes.txt`**: Curated list of test hashes (MD5, SHA-1, SHA-256, NTLM, Bcrypt, Argon2id, Cisco Type 7) for **Hash Detective**.
