const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BACKUP_DIR = path.resolve(__dirname, '../../backups');
const MAX_BACKUPS_TO_RETAIN = 10;

async function createBackup(customOptions = {}) {
  const options = {
    retention: MAX_BACKUPS_TO_RETAIN,
    outputDir: BACKUP_DIR,
    ...customOptions,
  };

  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  let ownConnection = false;
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required to create a database backup');
    }
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    ownConnection = true;
  }

  const db = mongoose.connection.db;
  const collections = await db.collections();

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      database: db.databaseName,
      nodeVersion: process.version,
      collectionCount: collections.length,
    },
    collections: {},
  };

  for (const col of collections) {
    const colName = col.collectionName;
    if (colName.startsWith('system.')) continue;

    const docs = await col.find({}).toArray();
    backupData.collections[colName] = docs;
  }

  const rawJson = JSON.stringify(backupData);
  const hash = crypto.createHash('sha256').update(rawJson).digest('hex');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${db.databaseName}-${timestamp}.json.gz`;
  const filePath = path.join(options.outputDir, filename);

  const compressed = zlib.gzipSync(Buffer.from(rawJson, 'utf-8'));
  fs.writeFileSync(filePath, compressed);

  rotateBackups(options.outputDir, options.retention);

  if (ownConnection) {
    await mongoose.disconnect();
  }

  return {
    success: true,
    file: filePath,
    filename,
    sizeBytes: compressed.length,
    sha256: hash,
    collectionsCount: Object.keys(backupData.collections).length,
    timestamp: backupData.metadata.timestamp,
  };
}

function rotateBackups(dir, retention) {
  if (!fs.existsSync(dir)) return;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.json.gz'))
    .map((f) => {
      const fullPath = path.join(dir, f);
      return {
        name: f,
        path: fullPath,
        time: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.time - a.time);

  if (files.length > retention) {
    const toDelete = files.slice(retention);
    for (const item of toDelete) {
      try {
        fs.unlinkSync(item.path);
      } catch (err) {}
    }
  }
}

if (require.main === module) {
  createBackup()
    .then((res) => {
      console.log(`Database backup successful: ${res.filename} (${(res.sizeBytes / 1024).toFixed(2)} KB, SHA256: ${res.sha256.substring(0, 16)}...)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backup failed:', err.message);
      process.exit(1);
    });
}

module.exports = {
  createBackup,
  rotateBackups,
  BACKUP_DIR,
};
