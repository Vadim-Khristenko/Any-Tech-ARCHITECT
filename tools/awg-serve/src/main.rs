//! awg-serve — a tiny static file server for the AmneziaWG Architect archive.
//!
//! One binary, no dependencies, no runtime to install. Point it at a folder
//! (or let it find `dist/` next to itself) and open the printed URL.
//!
//!     awg-serve              # port 8080, finds dist/ automatically
//!     awg-serve 3000         # different port
//!     awg-serve --dir ./dist # explicit folder
//!     awg-serve --no-open    # do not launch a browser
//!
//! The build emits a real index.html for every route, so directory requests
//! resolve to their own file and nothing needs SPA rewriting. An address that
//! matches no file gets 404.html, which is the styled not-found page.

use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::thread;

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn main() {
    let opts = match Options::parse() {
        Ok(o) => o,
        Err(msg) => {
            eprintln!("awg-serve: {msg}");
            eprintln!("try: awg-serve --help");
            std::process::exit(2);
        }
    };

    if opts.help {
        print_help();
        return;
    }

    let root = match opts.resolve_root() {
        Some(r) => r,
        None => {
            eprintln!("awg-serve: could not find a folder containing index.html.");
            eprintln!("Run this next to dist/, or pass --dir <path>.");
            std::process::exit(1);
        }
    };

    let addr = format!("127.0.0.1:{}", opts.port);
    let listener = match TcpListener::bind(&addr) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("awg-serve: cannot bind {addr}: {e}");
            eprintln!("Another process may already be using that port.");
            std::process::exit(1);
        }
    };

    let url = format!("http://{addr}");
    println!("  AmneziaWG Architect — awg-serve {VERSION}");
    println!();
    println!("  serving  {}", root.display());
    println!("  ->  {url}          (Русский)");
    println!("  ->  {url}/en       (English)");
    println!();
    println!("  Ctrl+C to stop.");
    println!();

    if opts.open {
        open_browser(&url);
    }

    for stream in listener.incoming() {
        match stream {
            Ok(s) => {
                let root = root.clone();
                // One thread per connection. Browsers open a handful in
                // parallel; for a local preview that is plenty and keeps the
                // whole thing dependency-free.
                thread::spawn(move || {
                    let _ = handle(s, &root);
                });
            }
            Err(e) => eprintln!("awg-serve: connection failed: {e}"),
        }
    }
}

/* ── Options ─────────────────────────────────────────────────────────────── */

struct Options {
    port: u16,
    dir: Option<PathBuf>,
    open: bool,
    help: bool,
}

impl Options {
    fn parse() -> Result<Self, String> {
        let mut opts = Options { port: 8080, dir: None, open: true, help: false };
        let mut args = env::args().skip(1);

        while let Some(arg) = args.next() {
            match arg.as_str() {
                "-h" | "--help" => opts.help = true,
                "--no-open" => opts.open = false,
                "-d" | "--dir" => {
                    let v = args.next().ok_or("--dir needs a path")?;
                    opts.dir = Some(PathBuf::from(v));
                }
                "-p" | "--port" => {
                    let v = args.next().ok_or("--port needs a number")?;
                    opts.port = v.parse().map_err(|_| format!("bad port: {v}"))?;
                }
                other if other.chars().all(|c| c.is_ascii_digit()) => {
                    opts.port = other.parse().map_err(|_| format!("bad port: {other}"))?;
                }
                other => return Err(format!("unknown option: {other}")),
            }
        }

        Ok(opts)
    }

    /// Find the folder to serve.
    ///
    /// The binary ships both beside `dist/` and inside it, so rather than
    /// assuming a layout it takes the first candidate that actually holds an
    /// index.html.
    fn resolve_root(&self) -> Option<PathBuf> {
        if let Some(d) = &self.dir {
            return has_index(d).then(|| d.clone());
        }

        let exe_dir = env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(Path::to_path_buf));
        let cwd = env::current_dir().ok();

        let mut candidates: Vec<PathBuf> = Vec::new();
        if let Some(d) = &exe_dir {
            candidates.push(d.join("dist"));
            candidates.push(d.clone());
            if let Some(parent) = d.parent() {
                candidates.push(parent.join("dist"));
            }
        }
        if let Some(d) = &cwd {
            candidates.push(d.join("dist"));
            candidates.push(d.clone());
        }

        candidates.into_iter().find(|c| has_index(c))
    }
}

fn has_index(dir: &Path) -> bool {
    dir.join("index.html").is_file()
}

fn print_help() {
    println!(
        "awg-serve {VERSION} — static server for the AmneziaWG Architect build

USAGE
    awg-serve [port] [options]

OPTIONS
    -p, --port <N>    Port to listen on            (default: 8080)
    -d, --dir <PATH>  Folder to serve              (default: find dist/)
        --no-open     Do not open a browser
    -h, --help        This text

Serves on 127.0.0.1 only — nothing is exposed to the network."
    );
}

/* ── Request handling ────────────────────────────────────────────────────── */

fn handle(mut stream: TcpStream, root: &Path) -> std::io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);

    let mut request_line = String::new();
    if reader.read_line(&mut request_line)? == 0 {
        return Ok(());
    }

    // Drain the headers so the client does not see a reset while still writing.
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 || line == "\r\n" || line == "\n" {
            break;
        }
    }

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let raw_target = parts.next().unwrap_or("/");

    if method != "GET" && method != "HEAD" {
        return respond(&mut stream, 405, "text/plain; charset=utf-8", b"Method Not Allowed", true);
    }

    // Strip the query and fragment, then percent-decode.
    let path_part = raw_target.split(['?', '#']).next().unwrap_or("/");
    let decoded = percent_decode(path_part);

    let Some(target) = safe_join(root, &decoded) else {
        return respond(&mut stream, 403, "text/plain; charset=utf-8", b"Forbidden", true);
    };

    // A directory serves its own index.html — the build writes one per route.
    let file = if target.is_dir() {
        target.join("index.html")
    } else {
        target
    };

    let send_body = method == "GET";

    match fs::read(&file) {
        Ok(bytes) => {
            let ct = content_type(&file);
            respond(&mut stream, 200, ct, &bytes, send_body)
        }
        Err(_) => {
            // Fall back to the styled 404 page when the build provides one.
            match fs::read(root.join("404.html")) {
                Ok(bytes) => respond(&mut stream, 404, "text/html; charset=utf-8", &bytes, send_body),
                Err(_) => respond(
                    &mut stream,
                    404,
                    "text/plain; charset=utf-8",
                    b"404 Not Found",
                    send_body,
                ),
            }
        }
    }
}

fn respond(
    stream: &mut TcpStream,
    status: u16,
    content_type: &str,
    body: &[u8],
    send_body: bool,
) -> std::io::Result<()> {
    let reason = match status {
        200 => "OK",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        _ => "OK",
    };

    let header = format!(
        "HTTP/1.1 {status} {reason}\r\n\
         Content-Type: {content_type}\r\n\
         Content-Length: {}\r\n\
         Cache-Control: no-cache\r\n\
         Connection: close\r\n\
         \r\n",
        body.len()
    );

    stream.write_all(header.as_bytes())?;
    if send_body {
        stream.write_all(body)?;
    }
    stream.flush()
}

/// Join a request path onto the root, refusing anything that escapes it.
fn safe_join(root: &Path, request_path: &str) -> Option<PathBuf> {
    let mut out = root.to_path_buf();

    for part in request_path.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        // `..` and absolute or prefixed components are the traversal vectors;
        // rejecting the request outright is simpler to reason about than
        // normalising it and hoping the result stayed inside.
        let candidate = Path::new(part);
        if candidate.components().any(|c| !matches!(c, Component::Normal(_))) {
            return None;
        }
        out.push(part);
    }

    Some(out)
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;

    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(v) = hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }

    String::from_utf8_lossy(&out).into_owned()
}

fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).unwrap_or("") {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "xml" => "application/xml; charset=utf-8",
        "txt" => "text/plain; charset=utf-8",
        "webmanifest" => "application/manifest+json",
        _ => "application/octet-stream",
    }
}

/* ── Browser ─────────────────────────────────────────────────────────────── */

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")]
    let result = Command::new("cmd").args(["/C", "start", "", url]).spawn();

    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(url).spawn();

    #[cfg(all(unix, not(target_os = "macos")))]
    let result = Command::new("xdg-open").arg(url).spawn();

    // Headless boxes have no browser to open, and that is not an error worth
    // interrupting the server for — the URL is printed either way.
    if result.is_err() {
        eprintln!("  (could not open a browser automatically)");
    }
}

/* ── Tests ───────────────────────────────────────────────────────────────── */

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_decoding() {
        assert_eq!(percent_decode("/a%20b"), "/a b");
        assert_eq!(percent_decode("/plain"), "/plain");
        // A malformed escape is left alone rather than dropped.
        assert_eq!(percent_decode("/%zz"), "/%zz");
    }

    #[test]
    fn traversal_is_refused() {
        let root = Path::new("/srv/dist");
        assert!(safe_join(root, "/../etc/passwd").is_none());
        assert!(safe_join(root, "/a/../../b").is_none());
        // Encoded traversal decodes before joining, so it is caught too.
        assert!(safe_join(root, &percent_decode("/%2e%2e/secret")).is_none());
    }

    #[test]
    fn normal_paths_join() {
        let root = Path::new("/srv/dist");
        assert_eq!(safe_join(root, "/en/faq/").unwrap(), root.join("en").join("faq"));
        assert_eq!(safe_join(root, "/").unwrap(), root.to_path_buf());
    }

    #[test]
    fn content_types() {
        assert_eq!(content_type(Path::new("a/b.html")), "text/html; charset=utf-8");
        assert_eq!(content_type(Path::new("a/b.woff2")), "font/woff2");
        assert_eq!(content_type(Path::new("a/b.unknown")), "application/octet-stream");
    }
}
