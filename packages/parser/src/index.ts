export interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  nodeType: "function" | "class" | "module" | "method" | "paragraph" | "block";
  content: string;
  lang: string;
}

interface ChunkOptions {
  maxChunkLines?: number;
  minChunkLines?: number;
}

/**
 * Smart Chunker for Source Code and Markdown files.
 * Extracts functions, classes, methods, or structural blocks with line-level accuracy.
 */
export function parseCodeFile(
  filePath: string,
  content: string,
  lang: string,
  options: ChunkOptions = {}
): CodeChunk[] {
  const maxLines = options.maxChunkLines || 80;
  const lines = content.split("\n");
  
  if (lines.length === 0 || content.trim().length === 0) {
    return [];
  }

  // Handle Markdown / Docs separately
  if (lang === "markdown" || filePath.endsWith(".md") || filePath.endsWith(".txt")) {
    return chunkMarkdown(filePath, lines);
  }

  // Language-specific AST/Regex boundary detection for functions and classes
  const chunks: CodeChunk[] = [];
  const boundaries = findStructuralBoundaries(lines, lang);

  if (boundaries.length > 0) {
    let currentLine = 1;
    for (const boundary of boundaries) {
      // Catch any leading module-level code before block
      if (boundary.startLine > currentLine) {
        const gapLines = lines.slice(currentLine - 1, boundary.startLine - 1);
        const gapText = gapLines.join("\n").trim();
        if (gapText.length > 20) {
          chunks.push({
            filePath,
            startLine: currentLine,
            endLine: boundary.startLine - 1,
            nodeType: "module",
            content: gapLines.join("\n"),
            lang,
          });
        }
      }

      const blockLines = lines.slice(boundary.startLine - 1, boundary.endLine);
      chunks.push({
        filePath,
        startLine: boundary.startLine,
        endLine: boundary.endLine,
        nodeType: boundary.type,
        content: blockLines.join("\n"),
        lang,
      });

      currentLine = boundary.endLine + 1;
    }

    // Catch remaining code after last block
    if (currentLine <= lines.length) {
      const remainingLines = lines.slice(currentLine - 1);
      const remainingText = remainingLines.join("\n").trim();
      if (remainingText.length > 20) {
        chunks.push({
          filePath,
          startLine: currentLine,
          endLine: lines.length,
          nodeType: "module",
          content: remainingLines.join("\n"),
          lang,
        });
      }
    }
  }

  // Fallback to window sliding chunker if no structural boundaries were extracted
  if (chunks.length === 0) {
    return windowChunk(filePath, lines, maxLines, lang);
  }

  return chunks;
}

interface Boundary {
  startLine: number;
  endLine: number;
  type: "function" | "class" | "method";
}

function findStructuralBoundaries(lines: string[], lang: string): Boundary[] {
  const boundaries: Boundary[] = [];
  
  // Patterns for function / class start
  const functionRegex = /^(export\s+)?(async\s+)?function\s+([A-Za-z0-9_$]+)|^(export\s+)?(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(async\s*)?\([^)]*\)\s*=>|^def\s+([A-Za-z0-9_$]+)|^func\s+([A-Za-z0-9_$]+)|^fn\s+([A-Za-z0-9_$]+)/;
  const classRegex = /^(export\s+)?class\s+([A-Za-z0-9_$]+)|^class\s+([A-Za-z0-9_$]+)/;

  let inBlock = false;
  let blockStart = 0;
  let blockType: "function" | "class" = "function";
  let openBrackets = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inBlock) {
      if (classRegex.test(trimmed)) {
        inBlock = true;
        blockStart = i + 1;
        blockType = "class";
        openBrackets = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (functionRegex.test(trimmed)) {
        inBlock = true;
        blockStart = i + 1;
        blockType = "function";
        openBrackets = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      }
    } else {
      // Bracket counting for JS/TS/Go/Java/Rust
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      openBrackets += opens - closes;

      // Check block completion
      if (openBrackets <= 0 && i >= blockStart) {
        boundaries.push({
          startLine: blockStart,
          endLine: i + 1,
          type: blockType,
        });
        inBlock = false;
        openBrackets = 0;
      }
    }
  }

  // Close unclosed trailing block if any
  if (inBlock && blockStart < lines.length) {
    boundaries.push({
      startLine: blockStart,
      endLine: lines.length,
      type: blockType,
    });
  }

  return boundaries;
}

function chunkMarkdown(filePath: string, lines: string[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let currentStart = 1;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      if (currentLines.length > 0) {
        chunks.push({
          filePath,
          startLine: currentStart,
          endLine: i,
          nodeType: "paragraph",
          content: currentLines.join("\n"),
          lang: "markdown",
        });
        currentLines = [];
      }
      currentStart = i + 1;
    }
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    chunks.push({
      filePath,
      startLine: currentStart,
      endLine: lines.length,
      nodeType: "paragraph",
      content: currentLines.join("\n"),
      lang: "markdown",
    });
  }

  return chunks;
}

function windowChunk(filePath: string, lines: string[], maxLines: number, lang: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const total = lines.length;
  const step = Math.max(1, maxLines - 10); // 10 lines overlap

  for (let i = 0; i < total; i += step) {
    const end = Math.min(i + maxLines, total);
    const chunkLines = lines.slice(i, end);
    chunks.push({
      filePath,
      startLine: i + 1,
      endLine: end,
      nodeType: "module",
      content: chunkLines.join("\n"),
      lang,
    });
  }

  return chunks;
}
