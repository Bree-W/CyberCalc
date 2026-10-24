#!/usr/bin/env python3
"""Forward 127.0.0.1:8081 to CyberChef on [::1]:8081.

Node binds webpack-dev-server's "localhost" to IPv6 only, and that server
sends Cross-Origin-Resource-Policy: same-origin, which blocks the iframe on
port 3000. This proxy is the IPv4 listener and rewrites that header.
"""

import socket
import sys
import threading

LISTEN = ("127.0.0.1", 8081)
TARGET = ("::1", 8081, 0, 0)


def pipe(src, dst):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        try:
            dst.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def read_until(sock, buf, marker):
    while marker not in buf:
        chunk = sock.recv(65536)
        if not chunk:
            return buf, b""
        buf += chunk
    head, rest = buf.split(marker, 1)
    return head + marker, rest


def read_exact(sock, buf, count):
    while len(buf) < count:
        chunk = sock.recv(65536)
        if not chunk:
            break
        buf += chunk
    return buf[:count], buf[count:]


def rewrite_headers(raw):
    text = raw.decode("latin1")
    text = text.replace(
        "Cross-Origin-Resource-Policy: same-origin",
        "Cross-Origin-Resource-Policy: cross-origin",
    )
    return text.encode("latin1")


def forward_responses(upstream, client):
    buf = b""
    try:
        while True:
            header, buf = read_until(upstream, buf, b"\r\n\r\n")
            if header == b"":
                break
            client.sendall(rewrite_headers(header))
            lower = header.decode("latin1").lower()
            if "transfer-encoding: chunked" in lower:
                while True:
                    line, buf = read_until(upstream, buf, b"\r\n")
                    client.sendall(line)
                    size = int(line.strip().split(b";", 1)[0] or b"0", 16)
                    if size == 0:
                        while True:
                            trailer, buf = read_until(upstream, buf, b"\r\n")
                            client.sendall(trailer)
                            if trailer == b"\r\n":
                                break
                        break
                    body, buf = read_exact(upstream, buf, size + 2)
                    client.sendall(body)
                continue
            length = 0
            for line in lower.split("\r\n"):
                if line.startswith("content-length:"):
                    length = int(line.split(":", 1)[1].strip())
            if length:
                body, buf = read_exact(upstream, buf, length)
                client.sendall(body)
            if "connection: close" in lower:
                if buf:
                    client.sendall(buf)
                pipe(upstream, client)
                break
    except (OSError, ValueError):
        pass
    finally:
        try:
            client.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def handle(client):
    upstream = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    try:
        upstream.connect(TARGET)
    except OSError:
        client.close()
        return
    request = threading.Thread(target=pipe, args=(client, upstream), daemon=True)
    request.start()
    forward_responses(upstream, client)
    request.join(timeout=1)
    client.close()
    upstream.close()


def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(LISTEN)
    except OSError as exc:
        print(f"127.0.0.1:8081 is already open ({exc}). Leaving it.", file=sys.stderr)
        return
    server.listen(64)
    print("Forwarding 127.0.0.1:8081 to [::1]:8081", flush=True)
    while True:
        client, _addr = server.accept()
        threading.Thread(target=handle, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
