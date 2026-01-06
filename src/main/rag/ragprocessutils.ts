import * as ort from 'onnxruntime-node';
import { InferenceSession } from 'onnxruntime-node';
import { AutoTokenizer } from '@huggingface/transformers';
import path from 'path';
import { app } from 'electron';

let MODEL_PATH: string;

if (app.isPackaged) {
  const exeDir = path.dirname(app.getPath('exe'));
  MODEL_PATH = path.join(exeDir, 'embedding_model');
} else {
  MODEL_PATH = 'C:\\Users\\Alessandro\\Desktop\\embedding_model';
}

const MODEL_ONNX_PATH = path.join(MODEL_PATH, 'onnx', 'model_fp16.onnx');

// -------------------- TOKENIZER --------------------
export async function tokenizeTextUnified(segments: string[]) {
  if (!segments || segments.length === 0) {
    throw new Error(
      'tokenizeTextUnified: nessun testo fornito per il tokenizing.',
    );
  }

  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_PATH);
  const text = segments.join(' ').trim();

  if (!text) {
    throw new Error(
      'tokenizeTextUnified: testo vuoto dopo il join dei segmenti.',
    );
  }

  const encoded = tokenizer(text, {
    padding: 'max_length',
    truncation: true,
    max_length: 512,
    return_attention_mask: true,
    return_tensors: 'pt',
  });

  if (!encoded.input_ids || !encoded.attention_mask) {
    throw new Error(
      'tokenizeTextUnified: il tokenizer non ha restituito input_ids o attention_mask.',
    );
  }

  return {
    text,
    input_ids: encoded.input_ids.data as BigInt64Array,
    attention_mask: encoded.attention_mask.data as BigInt64Array,
  };
}

// -------------------- MODELLO --------------------
export async function loadModel(): Promise<InferenceSession> {
  try {
    return await ort.InferenceSession.create(MODEL_ONNX_PATH);
  } catch (err) {
    throw new Error(
      `Errore nel caricamento del modello ONNX: ${(err as Error).message}`,
    );
  }
}

// -------------------- INFERENZA --------------------
export async function runOnnxUnified(
  session: InferenceSession,
  segmentData: {
    text: string;
    input_ids: BigInt64Array;
    attention_mask: BigInt64Array;
  },
) {
  if (!session)
    throw new Error('Sessione ONNX non valida o non inizializzata.');
  if (!segmentData.input_ids || !segmentData.attention_mask) {
    throw new Error(
      'SegmentData incompleto: input_ids o attention_mask mancanti.',
    );
  }

  const seqLength = segmentData.input_ids.length;

  const inputIdsTensor = new ort.Tensor('int64', segmentData.input_ids, [
    1,
    seqLength,
  ]);
  const attentionMaskTensor = new ort.Tensor(
    'int64',
    segmentData.attention_mask,
    [1, seqLength],
  );
  const tokenTypeIdsTensor = new ort.Tensor(
    'int64',
    new BigInt64Array(seqLength),
    [1, seqLength],
  );

  const feeds: Record<string, ort.Tensor> = {
    input_ids: inputIdsTensor,
    attention_mask: attentionMaskTensor,
    token_type_ids: tokenTypeIdsTensor,
  };

  const output = await session.run(feeds);
  const lastHiddenState = output['last_hidden_state'] as ort.Tensor;

  if (!lastHiddenState) {
    throw new Error('Output ONNX mancante: "last_hidden_state" non trovato.');
  }

  const pooled = meanPooling(
    lastHiddenState.data as Float32Array,
    Array.from(lastHiddenState.dims),
    segmentData.attention_mask,
  );

  return { text: segmentData.text, embedding: pooled };
}

// -------------------- POOLING --------------------
function meanPooling(
  hiddenStates: Float32Array,
  dims: number[],
  attentionMask: BigInt64Array,
): Float32Array {
  const [batchSize, seqLength, hiddenSize] = dims;
  const pooled = new Float32Array(hiddenSize);
  let validCount = 0;

  for (let t = 0; t < seqLength; t++) {
    if (attentionMask[t] === 1n) {
      for (let h = 0; h < hiddenSize; h++) {
        pooled[h] += hiddenStates[t * hiddenSize + h];
      }
      validCount++;
    }
  }

  if (validCount === 0) {
    throw new Error(
      'meanPooling: nessun token valido trovato nell’attention mask.',
    );
  }

  for (let h = 0; h < hiddenSize; h++) {
    pooled[h] /= validCount;
  }

  return pooled;
}

// -------------------- CHUNKING --------------------
async function chunkText(
  text: string,
  maxTokens = 512,
  modelPath = MODEL_PATH,
): Promise<string[]> {
  if (!text.trim()) throw new Error('chunkText: testo vuoto o non valido.');

  const tokenizer = await AutoTokenizer.from_pretrained(modelPath);
  const tokens = tokenizer.encode(text);

  if (!tokens || tokens.length === 0) {
    throw new Error('chunkText: tokenizer non ha restituito alcun token.');
  }

  const chunks: string[] = [];
  for (let i = 0; i < tokens.length; i += maxTokens) {
    const chunkTokens = tokens.slice(i, i + maxTokens);
    chunks.push(tokenizer.decode(chunkTokens));
  }

  return chunks;
}

// -------------------- EMBEDDING DOCUMENTO --------------------
export async function embedLongText(
  text: string,
  session: InferenceSession,
  modelPath = MODEL_PATH,
) {
  const chunks = await chunkText(text, 512, modelPath);
  const results = [];

  for (const chunk of chunks) {
    const tokenized = await tokenizeTextUnified([chunk]);
    const embedding = await runOnnxUnified(session, tokenized);
    results.push(embedding);
  }

  return results;
}

// -------------------- EMBEDDING SINGOLO SEGMENTO --------------------
export async function embeddingFullSegment(
  segments: string[],
  session: InferenceSession,
) {
  const tokenized_segments = await tokenizeTextUnified(segments);
  return await runOnnxUnified(session, tokenized_segments);
}
