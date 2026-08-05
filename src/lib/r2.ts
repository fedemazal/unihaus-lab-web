import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = (process.env.R2_BUCKET_NAME ?? "").trim();

function getR2Client() {
  const endpoint = (process.env.R2_ENDPOINT ?? "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID ?? "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();
  if (!endpoint || !accessKeyId || !secretAccessKey || !BUCKET) {
    throw new Error("Faltan variables de entorno R2_*. Revisá .env.local.");
  }
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// Sube un buffer a R2. key es la ruta dentro del bucket (ej: "prod-123/fotos.zip")
export async function r2Upload(key: string, body: Buffer | Uint8Array, contentType: string) {
  await getR2Client().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

// Genera una URL de descarga firmada (válida por defecto 1 hora)
export async function r2SignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

// Genera una URL firmada de SUBIDA directa desde el browser (PUT presigned URL)
export async function r2UploadSignedUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds }
  );
}

// Devuelve el tamaño en bytes de un objeto (para confirmar que la subida fue exitosa)
export async function r2HeadObject(key: string): Promise<{ size: number }> {
  const res = await getR2Client().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return { size: res.ContentLength ?? 0 };
}

// Borra un objeto del bucket
export async function r2Delete(key: string) {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
