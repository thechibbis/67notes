import { useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

const CONTEXT = 5; // lines of context shown on each side of a match

interface Line {
  n: number; // 1-based line number
  text: string;
  match: boolean;
}
interface Block {
  lines: Line[];
}
interface FileResult {
  path: string;
  count: number; // number of matching lines
  blocks: Block[];
}

// Split a line into plain/highlighted segments around case-insensitive matches.
function highlight(text: string, q: string): ReactNode[] {
  if (!q) return [text];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  for (;;) {
    const idx = lower.indexOf(needle, i);
    if (idx < 0) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(<mark key={k++}>{text.slice(idx, idx + q.length)}</mark>);
    i = idx + q.length;
  }
  return out;
}

// Build merged ±CONTEXT context blocks for one file's content.
function buildBlocks(content: string, q: string): { count: number; blocks: Block[] } {
  const lines = content.split("\n");
  const needle = q.toLowerCase();
  const hits: number[] = []; // 0-based indices of matching lines
  lines.forEach((ln, i) => {
    if (ln.toLowerCase().includes(needle)) hits.push(i);
  });
  if (hits.length === 0) return { count: 0, blocks: [] };

  // Each hit expands to a ±CONTEXT window; merge windows that overlap or touch
  // (so matches within CONTEXT lines collapse into a single block).
  const ranges: [number, number][] = [];
  for (const h of hits) {
    const start = Math.max(0, h - CONTEXT);
    const end = Math.min(lines.length - 1, h + CONTEXT);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  }

  const hitSet = new Set(hits);
  const blocks: Block[] = ranges.map(([s, e]) => ({
    lines: Array.from({ length: e - s + 1 }, (_, k) => {
      const i = s + k;
      return { n: i + 1, text: lines[i], match: hitSet.has(i) };
    }),
  }));
  return { count: hits.length, blocks };
}

export default function Search({
  query,
  onOpen,
}: {
  query: string;
  onOpen: (path: string) => void;
}) {
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const matches = await api.search(q);
        const paths = [...new Set(matches.map((m) => m.path))];
        const files = await Promise.all(
          paths.map(async (path): Promise<FileResult | null> => {
            const note = await api.getNote(path);
            const { count, blocks } = buildBlocks(note.content, q);
            if (count === 0) return null;
            return { path, count, blocks };
          }),
        );
        if (cancelled) return;
        setResults(files.filter((f): f is FileResult => f !== null));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="empty">
        <div className="empty-card">
          <h2>Search your notes</h2>
          <p>Type a query in the bar above and press Enter.</p>
        </div>
      </div>
    );
  }

  const total = results?.reduce((n, r) => n + r.count, 0) ?? 0;

  return (
    <div className="searchpage">
      <div className="searchpage-head">
        {loading
          ? "Searching…"
          : `${total} match${total === 1 ? "" : "es"} in ${
              results?.length ?? 0
            } file${results?.length === 1 ? "" : "s"} for “${query.trim()}”`}
      </div>

      {error && <div className="error">{error}</div>}

      {!loading && results && results.length === 0 && !error && (
        <div className="searchpage-empty">No matches found.</div>
      )}

      <div className="search-files">
        {results?.map((r) => (
          <section key={r.path} className="search-file">
            <button className="search-file-head" onClick={() => onOpen(r.path)}>
              <span className="search-file-path">{r.path}</span>
              <span className="search-file-count">{r.count}</span>
            </button>
            <div className="search-file-body">
              {r.blocks.map((b, bi) => (
                <div key={bi} className="search-block">
                  {bi > 0 && <div className="search-gap" />}
                  <pre className="search-snippet">
                    {b.lines.map((ln) => (
                      <div
                        key={ln.n}
                        className={`search-line${ln.match ? " match" : ""}`}
                        onClick={() => onOpen(r.path)}
                      >
                        <span className="ln">{ln.n}</span>
                        <span className="lc">
                          {ln.match ? highlight(ln.text, query.trim()) : ln.text}
                        </span>
                      </div>
                    ))}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
