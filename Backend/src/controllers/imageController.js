'use strict';

const Minio = require('minio');
const { Trade, Session } = require('../models');

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

// Public client — generates presigned URLs signed with the browser-reachable host
const minioPublicClient = new Minio.Client({
  endPoint: process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PUBLIC_PORT) || Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
  region: MINIO_REGION,
});

exports.createUrls = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { tradeId } = req.params;
    const { count } = req.body;

    const trade = await Trade.findByPk(tradeId);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const session = await Session.findByPk(trade.sessionId);
    if (!session || String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

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
        const uploadUrl = await minioPublicClient.presignedPutObject(bucket, objectName, 3600);
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
    const { userId } = req.user;
    const { tradeId } = req.params;
    const bucket = process.env.MINIO_BUCKET;

    const trade = await Trade.findByPk(tradeId);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const session = await Session.findByPk(trade.sessionId);
    if (!session || String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

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
          return { objectName: name, viewUrl: await minioPublicClient.presignedGetObject(bucket, name, 3600) };
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
    const { userId } = req.user;
    const { objectName } = req.body;
    if (!objectName) return res.status(400).json({ message: 'objectName is required' });

    // objectName is "<tradeId>/<file>" — recover the tradeId to check ownership
    const tradeId = objectName.split('/')[0];
    const trade = await Trade.findByPk(tradeId);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const session = await Session.findByPk(trade.sessionId);
    if (!session || String(session.userId) !== String(userId)) return res.status(403).json({ message: 'Unauthorized' });

    await minioClient.removeObject(process.env.MINIO_BUCKET, objectName);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

