import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DocsSourceHit {
  file: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface DocsAskResult {
  question: string;
  answer: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  sources: DocsSourceHit[];
  suggestedCommands: string[];
  docsRoot: string;
  /** True when the question was rejected as non-English (Docs Chat is English-only). */
  englishOnlyBlocked?: boolean;
}

export const DOCS_CHAT_ENGLISH_ONLY_MESSAGE =
  'Docs Chat is English-only. It searches packaged documentation locally (no cloud LLM) and cannot understand other languages. Ask in English, or run Teach AI and use Cursor / Claude / Cline for multilingual help.';

/** True when letter characters are mostly non-Latin (Arabic, CJK, Cyrillic, …). */
export function looksNonEnglishQuestion(text: string): boolean {
  const letters = [...String(text || '')].filter((ch) => /\p{L}/u.test(ch));
  if (letters.length < 2) return false;
  const latin = letters.filter((ch) => /[A-Za-z]/.test(ch)).length;
  return latin / letters.length < 0.5;
}

interface DocsChunk {
  file: string;
  title: string;
  body: string;
  tokens: Set<string>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[`*_#>\[\](){}|]/g, ' ')
    .split(/[^a-z0-9\u0600-\u06ff.+-]+/i)
    .filter((t) => t.length > 1);
}

/**
 * Resolve packaged docs root (npm install) or repo docs/ during development.
 */
export function resolvePackagedDocsRoot(cwd = process.cwd()): string {
  // 1) Running from installed package: dist/application → ../../docs
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const fromDist = path.resolve(here, '..', '..', 'docs');
    if (fs.existsSync(path.join(fromDist, 'AGENTS.md'))) return fromDist;
  } catch {
    /* ignore */
  }

  // 2) node_modules/@engnadia/veloprove/docs
  const fromNm = path.join(cwd, 'node_modules', '@engnadia', 'veloprove', 'docs');
  if (fs.existsSync(path.join(fromNm, 'AGENTS.md'))) return fromNm;

  // 3) Repo / package root docs next to cwd
  const fromCwd = path.join(cwd, 'docs');
  if (fs.existsSync(path.join(fromCwd, 'AGENTS.md'))) return fromCwd;

  // 4) Walk up looking for package docs
  let dir = cwd;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'docs');
    if (fs.existsSync(path.join(candidate, 'AGENTS.md'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return fromCwd;
}

function listDocFiles(docsRoot: string, packageRoot: string): string[] {
  const files: string[] = [];
  const addIf = (p: string) => {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) files.push(p);
  };

  addIf(path.join(docsRoot, 'AGENTS.md'));
  addIf(path.join(packageRoot, 'README.md'));

  for (const sub of ['guides', 'reference']) {
    const dir = path.join(docsRoot, sub);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith('.md')) addIf(path.join(dir, name));
    }
  }
  return files;
}

function chunkMarkdown(filePath: string, rel: string, content: string): DocsChunk[] {
  const parts = content.split(/\n(?=#{1,3}\s+)/);
  const chunks: DocsChunk[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length < 40) continue;
    const titleMatch = trimmed.match(/^#{1,3}\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(rel, '.md');
    const body = trimmed.slice(0, 1800);
    chunks.push({
      file: rel.replace(/\\/g, '/'),
      title,
      body,
      tokens: new Set(tokenize(`${title} ${body}`))
    });
  }
  if (chunks.length === 0 && content.trim().length > 0) {
    chunks.push({
      file: rel.replace(/\\/g, '/'),
      title: path.basename(rel, '.md'),
      body: content.trim().slice(0, 1800),
      tokens: new Set(tokenize(content))
    });
  }
  return chunks;
}

function extractCommands(text: string): string[] {
  const found = new Set<string>();
  const re = /(?:npx\s+)?veloprove\s+[a-z0-9_-]+|vp\.[a-zA-Z0-9_]+/g;
  for (const m of text.match(re) || []) found.add(m.replace(/^npx\s+/, ''));
  return [...found].slice(0, 12);
}

export class DocsAssistantService {
  public static ask(question: string, cwd = process.cwd()): DocsAskResult {
    const q = (question || '').trim();
    const docsRoot = resolvePackagedDocsRoot(cwd);
    const packageRoot = path.dirname(docsRoot);
    const empty: DocsAskResult = {
      question: q,
      answer:
        'No matching answer found in the packaged VeloProve documentation. Try: npx veloprove teach-ai --force, or open node_modules/@engnadia/veloprove/docs/AGENTS.md',
      confidence: 'none',
      sources: [],
      suggestedCommands: ['veloprove teach-ai --force --mcp', 'veloprove doctor', 'veloprove verify --ci'],
      docsRoot
    };

    if (!q) {
      return { ...empty, answer: 'Please provide a question about VeloProve usage, MCP, CLI, or AI linking.' };
    }

    if (looksNonEnglishQuestion(q)) {
      return {
        ...empty,
        answer: DOCS_CHAT_ENGLISH_ONLY_MESSAGE,
        confidence: 'none',
        englishOnlyBlocked: true,
        suggestedCommands: [
          'veloprove ask "How do I verify my changes?"',
          'veloprove teach-ai --force --mcp',
          'veloprove doctor'
        ]
      };
    }

    if (!fs.existsSync(path.join(docsRoot, 'AGENTS.md'))) {
      return {
        ...empty,
        answer: `Packaged docs not found at ${docsRoot}. Reinstall @engnadia/veloprove or run from the VeloProve repo.`
      };
    }

    const qTokens = tokenize(q);
    if (qTokens.length === 0) return empty;

    const files = listDocFiles(docsRoot, packageRoot);
    const chunks: DocsChunk[] = [];
    for (const abs of files) {
      const rel = path.relative(packageRoot, abs);
      try {
        const content = fs.readFileSync(abs, 'utf8');
        chunks.push(...chunkMarkdown(abs, rel.startsWith('..') ? path.basename(abs) : rel, content));
      } catch {
        /* skip */
      }
    }

    const scored: DocsSourceHit[] = [];
    for (const chunk of chunks) {
      let score = 0;
      for (const t of qTokens) {
        if (chunk.tokens.has(t)) score += 2;
        if (chunk.title.toLowerCase().includes(t)) score += 3;
        if (chunk.body.toLowerCase().includes(t)) score += 1;
      }
      // Boost FAQ / AGENTS for how-to questions
      if (/faq|agents\.md/i.test(chunk.file)) score += 1;
      if (score > 0) {
        scored.push({
          file: chunk.file,
          title: chunk.title,
          excerpt: chunk.body.slice(0, 700),
          score
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 4);
    if (top.length === 0 || top[0].score < 3) {
      return empty;
    }

    const confidence: DocsAskResult['confidence'] =
      top[0].score >= 12 ? 'high' : top[0].score >= 6 ? 'medium' : 'low';

    const answerParts = [
      `Answer from packaged VeloProve docs (confidence: ${confidence}):`,
      '',
      ...top.map((s, i) => `(${i + 1}) ${s.title}\n${s.excerpt.trim()}${s.excerpt.length >= 700 ? '…' : ''}`)
    ];

    const suggestedCommands = [
      ...new Set(top.flatMap((s) => extractCommands(s.excerpt)))
    ].slice(0, 10);

    return {
      question: q,
      answer: answerParts.join('\n\n'),
      confidence,
      sources: top,
      suggestedCommands,
      docsRoot
    };
  }
}
