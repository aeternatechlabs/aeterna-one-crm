const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function restoreBackup(filePath, customOptions = {}) {
  const options = {
    dryRun: false,
    dropExisting: false,
    ...customOptions,
  };

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Backup file not found at path: ${filePath}`);
  }

  const compressed = fs.readFileSync(filePath);
  const decompressed = zlib.gunzipSync(compressed).toString('utf-8');
  const backupData = JSON.parse(decompressed);

  if (!backupData.metadata || !backupData.collections) {
    throw new Error('Invalid backup archive format: missing metadata or collections');
  }

  const hash = crypto.createHash('sha256').update(decompressed).digest('hex');

  const report = {
    file: filePath,
    sha256: hash,
    dryRun: options.dryRun,
    metadata: backupData.metadata,
    collections: {},
    totalDocuments: 0,
  };

  for (const [colName, docs] of Object.entries(backupData.collections)) {
    report.collections[colName] = Array.isArray(docs) ? docs.length : 0;
    report.totalDocuments += report.collections[colName];
  }

  if (options.dryRun) {
    return {
      success: true,
      message: 'Dry-run validation successful. No database records modified.',
      report,
    };
  }

  let ownConnection = false;
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required to restore database');
    }
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    ownConnection = true;
  }

  const db = mongoose.connection.db;

  for (const [colName, docs] of Object.entries(backupData.collections)) {
    if (!Array.isArray(docs) || docs.length === 0) continue;

    const collection = db.collection(colName);
    if (options.dropExisting) {
      try {
        await collection.drop();
      } catch (err) {}
    }

    const operations = docs.map((doc) => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await collection.bulkWrite(operations, { ordered: false });
    }
  }

  if (ownConnection) {
    await mongoose.disconnect();
  }

  return {
    success: true,
    message: 'Database restore completed successfully',
    report,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArgIdx = args.indexOf('--file');
  const filePath = fileArgIdx !== -1 ? args[fileArgIdx + 1] : null;
  const isDryRun = args.includes('--dry-run');

  if (!filePath) {
    console.error('Usage: node restoreDatabase.js --file <path_to_backup.json.gz> [--dry-run]');
    process.exit(1);
  }

  restoreBackup(filePath, { dryRun: isDryRun })
    .then((res) => {
      console.log(res.message);
      console.log(JSON.stringify(res.report, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Restore failed:', err.message);
      process.exit(1);
    });
}

module.exports = {
  restoreBackup,
};
