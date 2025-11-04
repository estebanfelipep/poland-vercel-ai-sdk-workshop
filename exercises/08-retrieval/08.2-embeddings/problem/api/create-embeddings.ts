import path from 'path';
import { readdir, readFile, writeFile } from 'fs/promises';
import { cosineSimilarity, embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google';
import { existsSync } from 'fs';

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

export type Embeddings = Record<string, number[]>;

const getExistingEmbeddingsPath = (cacheKey: string) => {
  return path.resolve(process.cwd(), 'data', `${cacheKey}.json`);
};

const saveEmbeddings = async (
  cacheKey: string,
  embeddingsResult: Embeddings,
) => {
  const existingEmbeddingsPath =
    getExistingEmbeddingsPath(cacheKey);

  await writeFile(
    existingEmbeddingsPath,
    JSON.stringify(embeddingsResult),
  );
};

export const getExistingEmbeddings = async (
  cacheKey: string,
): Promise<Embeddings | undefined> => {
  const existingEmbeddingsPath =
    getExistingEmbeddingsPath(cacheKey);

  if (!existsSync(existingEmbeddingsPath)) {
    return;
  }

  try {
    const existingEmbeddings = await readFile(
      existingEmbeddingsPath,
      'utf8',
    );
    return JSON.parse(existingEmbeddings);
  } catch (error) {
    return;
  }
};

const myEmbeddingModel = google.textEmbeddingModel(
  'text-embedding-004',
);

export const embedTsDocs = async (
  cacheKey: string,
): Promise<Embeddings> => {
  const existingEmbeddings =
    await getExistingEmbeddings(cacheKey);

  if (existingEmbeddings) {
    return existingEmbeddings;
  }

  const docs = await loadTsDocs();

  const embeddings: Embeddings = {};
  const docValues = Array.from(docs.values());

  // Chunk the values into batches of 99
  const chunkSize = 99;
  const chunks = [];
  for (let i = 0; i < docValues.length; i += chunkSize) {
    chunks.push(docValues.slice(i, i + chunkSize));
  }

  // Process each chunk sequentially
  let processedCount = 0;
  for (const chunk of chunks) {
    const embedManyResult = await embedLotsOfText(chunk);

    embedManyResult.forEach((embedding) => {
      embeddings[embedding.filename] = embedding.embedding;
    });

    processedCount += chunk.length;
  }

  await saveEmbeddings(cacheKey, embeddings);

  return embeddings;
};

export const searchTypeScriptDocs = async (query: string) => {
  const embeddings =
    await getExistingEmbeddings(EMBED_CACHE_KEY);

  if (!embeddings) {
    throw new Error(
      `Embeddings not yet created under this cache key: ${EMBED_CACHE_KEY}`,
    );
  }
  const docs = await loadTsDocs();

  const queryEmbedding = await embedOnePieceOfText(query);

  const scores = Object.entries(embeddings).map(
    ([key, value]) => {
      return {
        score: calculateScore(queryEmbedding, value),
        filename: key,
        content: docs.get(key)!.content,
      };
    },
  );

  return scores.sort((a, b) => b.score - a.score);
};

export const EMBED_CACHE_KEY = 'ts-docs-google';

const embedLotsOfText = async (
  documents: { filename: string; content: string }[],
): Promise<
  {
    filename: string;
    content: string;
    embedding: number[];
  }[]
> => {
  // TODO: Implement this function by using the embedMany function
  const result = await embedMany({
    model: myEmbeddingModel,
    values: documents.map((doc) => doc.content),
    maxRetries: 0,
  });

  return result.embeddings.map((embedding, index) => ({
    filename: documents[index]!.filename,
    content: documents[index]!.content,
    embedding,
  }));
};

const embedOnePieceOfText = async (
  text: string,
): Promise<number[]> => {
  // TODO: Implement this function by using the embed function
  const result = await embed({
    model: myEmbeddingModel,
    value: text,
  });

  return result.embedding;
};

const calculateScore = (
  queryEmbedding: number[],
  embedding: number[],
): number => {
  // TODO: Implement this function by using the cosineSimilarity function
  return cosineSimilarity(queryEmbedding, embedding);
};
