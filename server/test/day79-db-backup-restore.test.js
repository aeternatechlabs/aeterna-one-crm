const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { rotateBackups } = require('../src/scripts/backupDatabase');
const { restoreBackup } = require('../src/scripts/restoreDatabase');

describe('Day 79: Database Backup and Recovery Subsystem', () => {
  const tempDir = path.resolve(__dirname, 'temp-backups-test');

  it('rotates older backup archives according to retention threshold', () => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const testFiles = [
      'backup-test-1.json.gz',
      'backup-test-2.json.gz',
      'backup-test-3.json.gz',
      'backup-test-4.json.gz',
    ];

    for (const f of testFiles) {
      fs.writeFileSync(path.join(tempDir, f), 'test-data');
    }

    rotateBackups(tempDir, 2);

    const remaining = fs.readdirSync(tempDir).filter((f) => f.startsWith('backup-test-'));
    assert.equal(remaining.length, 2);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('validates valid backup archive in dry-run mode and calculates document counts', async () => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const mockBackupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        database: 'aeterna_test_db',
        nodeVersion: process.version,
        collectionCount: 2,
      },
      collections: {
        users: [
          { _id: 'u1', name: 'Admin User', role: 'super_admin' },
          { _id: 'u2', name: 'Counsellor', role: 'counsellor' },
        ],
        leads: [
          { _id: 'l1', name: 'Aarav Patel', current_status: 'New' },
        ],
      },
    };

    const rawJson = JSON.stringify(mockBackupData);
    const compressed = zlib.gzipSync(Buffer.from(rawJson, 'utf-8'));
    const testFilePath = path.join(tempDir, 'backup-valid-test.json.gz');
    fs.writeFileSync(testFilePath, compressed);

    const result = await restoreBackup(testFilePath, { dryRun: true });

    assert.equal(result.success, true);
    assert.equal(result.report.dryRun, true);
    assert.equal(result.report.collections.users, 2);
    assert.equal(result.report.collections.leads, 1);
    assert.equal(result.report.totalDocuments, 3);
    assert.ok(result.report.sha256);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('strictly rejects non-existent or corrupted backup file', async () => {
    await assert.rejects(
      async () => {
        await restoreBackup('non-existent-backup-file.json.gz', { dryRun: true });
      },
      {
        message: /Backup file not found/,
      }
    );
  });
});
