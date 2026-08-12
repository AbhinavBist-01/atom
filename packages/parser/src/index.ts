export interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  nodeType: string;
  content: string;
  lang: string;
}

export function parseCodeFile(filePath: string, content: string, lang: string): CodeChunk[] {
  return [
    {
      filePath,
      startLine: 1,
      endLine: content.split("\n").length,
      nodeType: "module",
      content,
      lang
    }
  ];
}
