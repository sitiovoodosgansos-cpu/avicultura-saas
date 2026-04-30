import { del, put } from "@vercel/blob";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB

export class UploadConfigError extends Error {
  constructor() {
    super(
      "Vercel Blob não está configurado. Conecte um Blob Store ao projeto e a env BLOB_READ_WRITE_TOKEN será injetada automaticamente."
    );
    this.name = "UploadConfigError";
  }
}

function ensureToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new UploadConfigError();
  }
}

export async function uploadImage(
  file: File,
  prefix: string
): Promise<{ url: string }> {
  ensureToken();

  if (!file.type.startsWith("image/")) {
    throw new Error("Apenas imagens são permitidas.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`Imagem muito grande. Máximo ${MAX_BYTES / 1024 / 1024}MB.`);
  }

  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const cleanedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
  const pathname = `${cleanedPrefix}/${id}.${ext}`;

  const result = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false
  });

  return { url: result.url };
}

export async function deleteImage(url: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch {
    // Foto pode ter sido removida do storage por outro motivo. Não falhar a API.
  }
}
