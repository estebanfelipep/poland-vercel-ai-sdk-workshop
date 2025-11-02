import path from 'path';
import { readdir, readFile } from 'fs/promises';

export const loadTsDocs = async () => {
  const TS_DOCS_LOCATION = path.resolve(
    import.meta.dirname,
    '../../../../../datasets/ts-docs',
  );

  const files = await readdir(TS_DOCS_LOCATION);

  const docs = await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(TS_DOCS_LOCATION, file);
      const content = await readFile(filePath, 'utf8');
      return {
        filename: file,
        content,
      };
    }),
  );

  return new Map(docs.map((doc) => [doc.filename, doc]));
};

const RRF_K = 60;

export function reciprocalRankFusion(
  rankings: { filename: string; content: string }[][],
): { filename: string; content: string }[] {
  const rrfScores = new Map<string, number>();
  const documentMap = new Map<
    string,
    { filename: string; content: string }
  >();

  // Process each ranking list
  rankings.forEach((ranking) => {
    ranking.forEach((doc, index) => {
      // Get current RRF score for this document
      const currentScore = rrfScores.get(doc.filename) || 0;

      // Add contribution from this ranking list
      const contribution = 1 / (RRF_K + index);
      rrfScores.set(doc.filename, currentScore + contribution);

      // Store document reference
      documentMap.set(doc.filename, doc);
    });
  });

  // Sort by RRF score (descending)
  return Array.from(rrfScores.entries())
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([docId]) => documentMap.get(docId)!);
}
