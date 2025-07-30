import { IndexFlatL2 } from 'faiss-node';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { logger, GSContext, GSDataSource } from '@godspeedsystems/core';

interface Metadata {
  [docId: string]: {
    content: string;
  };
}

export class HybridVectorStore {
  private indexPath: string;
  private metaPath: string;
  private docIdMapPath: string;
  private model: GoogleGenerativeAIEmbeddings;
  private index: IndexFlatL2;
  public metadata: Metadata = {};
  private docIdByVectorIdx: string[] = [];
  private prisma: GSDataSource;
  private ctx: GSContext;

  constructor(
    ctx: GSContext,
    indexPath = path.resolve(__dirname, '../../index/index.faiss'),
    metaPath = path.resolve(__dirname, '../../index/metadata.json'),
    docIdMapPath = path.resolve(__dirname, '../../index/docIdMap.json')
  ) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Missing GOOGLE_API_KEY in .env');

    this.ctx = ctx;
    this.prisma = ctx.datasources.chatbot;
    this.indexPath = indexPath;
    this.metaPath = metaPath;
    this.docIdMapPath = docIdMapPath;
    this.metadata = {};
    this.docIdByVectorIdx = [];

    this.model = new GoogleGenerativeAIEmbeddings({
      apiKey: apiKey,
      modelName: 'models/embedding-001'
    });

    const dim = 768;
    if (fs.existsSync(this.indexPath)) {
      this.index = IndexFlatL2.read(this.indexPath) as IndexFlatL2;
    } else {
      this.index = new IndexFlatL2(dim);
    }

    if (fs.existsSync(this.metaPath)) {
      this.metadata = JSON.parse(fs.readFileSync(this.metaPath, 'utf-8'));
    }

    if (fs.existsSync(this.docIdMapPath)) {
      this.docIdByVectorIdx = JSON.parse(fs.readFileSync(this.docIdMapPath, 'utf-8'));
    }
  }

  /**
   * Save document metadata to database and return document ID
   */
  async saveDocumentMetadata(docData: any): Promise<string> {
    const result = await this.prisma.execute(this.ctx, {
      meta: {
        entityType: 'Document',
        method: 'create'
      },
      data: {
        userId: docData.userId || null,
        filename: docData.filename,
        originalName: docData.originalName || docData.filename,
        mimeType: docData.mimeType || 'text/plain',
        size: docData.size || 0,
        extractedText: docData.content,
        metadata: docData.metadata || {},
        status: 'PROCESSING'
      }
    });

    return result.data.id;
  }

  /**
   * Save vector chunks to database
   */
  async saveVectorChunks(docId: string, chunks: string[]): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      await this.prisma.execute(this.ctx, {
        meta: {
          entityType: 'VectorChunk',
          method: 'upsert'
        },
        where: {
          docId_chunkIndex: {
            docId,
            chunkIndex: i
          }
        },
        update: {
          content: chunks[i],
          metadata: { lastUpdated: new Date() }
        },
        create: {
          docId,
          chunkIndex: i,
          content: chunks[i],
          metadata: { created: new Date() }
        }
      });
    }
  }

  /**
   * Enhanced upsert with database persistence
   */
  async upsert(docId: string, content: string, docMetadata?: any): Promise<void> {
    // Save to database if metadata provided
    let dbDocId = docId;
    if (docMetadata) {
      dbDocId = await this.saveDocumentMetadata({
        ...docMetadata,
        content
      });
    }

    // Original FAISS logic
    const chunks = this.chunkText(content);
    const embeddings = await this.model.embedDocuments(chunks);
    const flatEmbeddings = embeddings.flat();
    
    this.index.add(flatEmbeddings);
    for (let i = 0; i < embeddings.length; i++) {
      this.docIdByVectorIdx.push(docId);
    }
    
    this.metadata[docId] = { content };
    this.save();

    // Save chunks to database
    if (docMetadata) {
      await this.saveVectorChunks(dbDocId, chunks);
      
      // Update document status
      await this.prisma.execute(this.ctx, {
        meta: {
          entityType: 'Document',
          method: 'update'
        },
        where: { id: dbDocId },
        data: { status: 'COMPLETED' }
      });
    }

    logger.info(`Document ${docId} indexed with ${chunks.length} chunks`);
  }

  async search(query: string, k = 3): Promise<any[]> {
    const queryVec = await this.model.embedQuery(query);
    const queryArray = queryVec;
    
    // Get the actual number of vectors in the index
    const totalVectors = this.index.ntotal();
    
    // Limit k to the number of available vectors to prevent FAISS error
    const effectiveK = Math.min(k, totalVectors);
    
    // If no vectors in index, return empty array
    if (effectiveK === 0) {
      logger.warn('No vectors in index, returning empty search results');
      return [];
    }
    
    logger.info(`Searching ${totalVectors} vectors with k=${effectiveK} (requested k=${k})`);
    
    const result = this.index.search(queryArray, effectiveK);
    const hits = [];
    
    for (let i = 0; i < result.labels.length; i++) {
      const idx = result.labels[i];
      const docId = this.docIdByVectorIdx[idx];
      if (docId && this.metadata[docId]) {
        hits.push({
          docId: docId,
          content: this.metadata[docId].content,
          score: result.distances[i]
        });
      }
    }
    
    return hits;
  }

  async upsertDoc(docId: string, content: string): Promise<void> {
    await this.upsert(docId, content);
  }

  private ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private save(): void {
    try {
      this.ensureDir(this.indexPath);
      this.index.write(this.indexPath);
    } catch (err) {
      logger.error("Failed to write index:", err);
    }

    try {
      this.ensureDir(this.metaPath);
      fs.writeFileSync(this.metaPath, JSON.stringify(this.metadata, null, 2));
    } catch (err) {
      logger.error("Failed to write metadata:", err);
    }

    try {
      this.ensureDir(this.docIdMapPath);
      fs.writeFileSync(this.docIdMapPath, JSON.stringify(this.docIdByVectorIdx, null, 2));
    } catch (err) {
      logger.error("Failed to write docId map:", err);
    }
  }

  async removeDocument(docId: string): Promise<void> {
    if (!(docId in this.metadata)) {
      logger.info(`[${docId}] Not found in index. Skipping removal.`);
      return;
    }

    // Remove from FAISS (existing logic)
    const indicesToRemove = [];
    for (let i = 0; i < this.docIdByVectorIdx.length; i++) {
      if (this.docIdByVectorIdx[i] === docId) {
        indicesToRemove.push(i);
      }
    }

    if (indicesToRemove.length > 0) {
      const removedCount = this.index.removeIds(indicesToRemove);
      logger.info(`[${docId}] Removed ${removedCount} vectors from FAISS index.`);
    }

    delete this.metadata[docId];
    const removalSet = new Set(indicesToRemove);
    this.docIdByVectorIdx = this.docIdByVectorIdx.filter((_, idx) => !removalSet.has(idx));
    this.save();

    // Remove from database
    try {
      await this.prisma.execute(this.ctx, {
        meta: {
          entityType: 'Document',
          method: 'delete'
        },
        where: { id: docId }
      });
    } catch (error) {
      logger.warn(`Could not remove document ${docId} from database:`, error);
    }

    logger.info(`[${docId}] Document fully removed.`);
  }

  chunkText(text: string, maxTokens = 500, overlap = 100) {
    const words = text.split(/\s+/);
    const chunks = [];
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + maxTokens, words.length);
      chunks.push(words.slice(start, end).join(' '));
      start += maxTokens - overlap;
    }
    return chunks;
  }

  /**
   * Get document metadata from database
   */
  async getDocumentMetadata(docId: string): Promise<any> {
    try {
      const result = await this.prisma.execute(this.ctx, {
        meta: {
          entityType: 'Document',
          method: 'findUnique'
        },
        where: { id: docId }
      });
      return result.data;
    } catch (error) {
      logger.error(`Error fetching document ${docId}:`, error);
      return null;
    }
  }

  /**
   * Get all user documents
   */
  async getUserDocuments(userId: string): Promise<any[]> {
    try {
      const result = await this.prisma.execute(this.ctx, {
        meta: {
          entityType: 'Document',
          method: 'findMany'
        },
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return result.data || [];
    } catch (error) {
      logger.error(`Error fetching documents for user ${userId}:`, error);
      return [];
    }
  }
}
