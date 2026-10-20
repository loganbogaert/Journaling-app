'use strict';

const Minio = require('minio');

// Fixed region avoids the SDK's automatic getBucketRegion lookup, which requires
// actually connecting to `endPoint` — that call fails when MINIO_PUBLIC_ENDPOINT
// is a browser-only host (e.g. "localhost") that isn't reachable from inside this container.
const MINIO_REGION = process.env.MINIO_REGION || 'us-east-1';

// Internal client — used for operations that stay server-side (list, delete)
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
  region: MINIO_REGION,
});

// Public client — generates presigned URLs signed with the browser-reachable host. That
// host is Kong's own public endpoint (MINIO_PUBLIC_ENDPOINT/PORT), so the browser reaches
// MinIO through the gateway instead of MinIO's own port — see toGatewayUrl() below.
const minioPublicClient = new Minio.Client({
  endPoint: process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PUBLIC_PORT) || Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
  region: MINIO_REGION,
});

// Must match the route path in kong/kong.yml's minio service.
const GATEWAY_MINIO_PREFIX = '/minio';

exports.storeGeneratedPng = async (objectName, imageBuffer) => {
  const bucket = process.env.MINIO_BUCKET;
  if (!bucket) throw new Error('Server misconfiguration: MINIO_BUCKET env var is not set');
  await minioClient.putObject(bucket, objectName, imageBuffer, imageBuffer.length, { 'Content-Type': 'image/png' });
};

// Inserts Kong's /minio path prefix into a presigned URL so the browser's request goes
// through Kong. Safe post-signing: Kong strips this prefix (strip_path: true) before
// forwarding, so MinIO receives the exact path/query that was originally signed.
const toGatewayUrl = (presignedUrl) => {
  const parsed = new URL(presignedUrl);
  parsed.pathname = `${GATEWAY_MINIO_PREFIX}${parsed.pathname}`;
  return parsed.toString();
}

exports.createUrls = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const { count } = req.body;

    const parsedCount = Number(count);
    if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
      return res.status(400).json({ message: `Invalid "count": expected a positive integer, got ${JSON.stringify(count)}` });
    }

    const bucket = process.env.MINIO_BUCKET;
    if (!bucket) {
      const err = new Error('Server misconfiguration: MINIO_BUCKET env var is not set');
      err.status = 500;
      throw err;
    }

    const prefix = Date.now();
    const urls = [];

    for (let i = 0; i < parsedCount; i++) {
      // objectName uses tradeId as folder prefix to group a trade's pictures
      const objectName = `${tradeId}/${prefix}-${i}`;
      try {
        const uploadUrl = toGatewayUrl(await minioPublicClient.presignedPutObject(bucket, objectName, 3600));
        urls.push({ uploadUrl, objectName });
      } catch (err) {
        err.message = `Failed to presign upload URL for "${bucket}/${objectName}": ${err.message}`;
        throw err;
      }
    }

    return res.status(200).json({ urls });
  } catch (err) {
    next(err);
  }
};

exports.getUrls = async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    const bucket = process.env.MINIO_BUCKET;

    if (!bucket) {
      const err = new Error('Server misconfiguration: MINIO_BUCKET env var is not set');
      err.status = 500;
      throw err;
    }

    const objectNames = await new Promise((resolve, reject) => {
      const names = [];
      const stream = minioClient.listObjects(bucket, `${tradeId}/`, true);
      stream.on('data', (obj) => names.push(obj.name));
      stream.on('end', () => resolve(names));
      stream.on('error', (err) => {
        err.message = `Failed to list objects for "${bucket}/${tradeId}/": ${err.message}`;
        reject(err);
      });
    });

    const urls = await Promise.all(
      objectNames.map(async (name) => {
        try {
          const viewUrl = toGatewayUrl(await minioPublicClient.presignedGetObject(bucket, name, 3600));
          return { objectName: name, viewUrl };
        } catch (err) {
          err.message = `Failed to presign view URL for "${bucket}/${name}": ${err.message}`;
          throw err;
        }
      }),
    );

    return res.status(200).json({ urls });
  } catch (err) {
    next(err);
  }
};

exports.deleteObject = async (req, res, next) => {
  try {
    const { objectName } = req.body;
    if (!objectName) return res.status(400).json({ message: 'objectName is required' });

    await minioClient.removeObject(process.env.MINIO_BUCKET, objectName);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

