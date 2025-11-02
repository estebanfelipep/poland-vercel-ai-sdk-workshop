import { searchTypeScriptDocsViaBM25 } from './bm25.ts';
import { searchTypeScriptDocsViaEmbeddings } from './embeddings.ts';
import { reciprocalRankFusion } from './utils.ts';

export const searchTypeScriptDocs = async (opts: {
  keywordsForBM25: string[];
  embeddingsQuery: string;
}) => {
  const bm25SearchResults = await searchTypeScriptDocsViaBM25(
    opts.keywordsForBM25,
  );

  const embeddingsSearchResults =
    await searchTypeScriptDocsViaEmbeddings(
      opts.embeddingsQuery,
    );

  console.log('ep:', 'bm25');
  console.dir(
    bm25SearchResults
      .slice(0, 5)
      .map((result) => result.filename),
    { depth: null },
  );

  console.log('ep:', 'embeddings');
  console.dir(
    embeddingsSearchResults
      .slice(0, 5)
      .map((result) => result.filename),
    {
      depth: null,
    },
  );

  const rrfResults = reciprocalRankFusion([
    bm25SearchResults,
    embeddingsSearchResults,
  ]);

  return rrfResults;
};
