#!/usr/bin/env node

/**
 * Database Recovery Script for EventMarketers
 * This script helps with database backup and recovery operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
  host: 'dpg-d38ecjumcj7s7388sk60-a.oregon-postgres.render.com',
  database: 'eventmarketers_db',
  user: 'eventmarketers_user',
  password: 'XMgWHtXJeE9G6tvUvvmbTIOumSD33w9G',
  port: 5432
};

const DATABASE_URL = `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;

class DatabaseRecovery {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a database backup
   */
  createBackup(backupName = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = backupName || `backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupDir, backupFileName);

      console.log('🔄 Creating database backup...');
      console.log(`📁 Backup location: ${backupPath}`);

      const command = `pg_dump "${DATABASE_URL}" > "${backupPath}"`;
      execSync(command, { stdio: 'inherit' });

      console.log('✅ Backup created successfully!');
      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a compressed backup
   */
  createCompressedBackup(backupName = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = backupName || `backup_${timestamp}.sql.gz`;
      const backupPath = path.join(this.backupDir, backupFileName);

      console.log('🔄 Creating compressed database backup...');
      console.log(`📁 Backup location: ${backupPath}`);

      const command = `pg_dump "${DATABASE_URL}" | gzip > "${backupPath}"`;
      execSync(command, { stdio: 'inherit' });

      console.log('✅ Compressed backup created successfully!');
      return backupPath;
    } catch (error) {
      console.error('❌ Compressed backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  restoreFromBackup(backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      console.log('🔄 Restoring database from backup...');
      console.log(`📁 Backup file: ${backupPath}`);

      // Check if it's a compressed backup
      const isCompressed = backupPath.endsWith('.gz');
      
      let command;
      if (isCompressed) {
        command = `gunzip -c "${backupPath}" | psql "${DATABASE_URL}"`;
      } else {
        command = `psql "${DATABASE_URL}" < "${backupPath}"`;
      }

      execSync(command, { stdio: 'inherit' });

      console.log('✅ Database restored successfully!');
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      throw error;
    }
  }

  /**
   * List available backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files.filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'));
      
      console.log('📋 Available backups:');
      if (backups.length === 0) {
        console.log('   No backups found');
        return [];
      }

      backups.forEach((backup, index) => {
        const backupPath = path.join(this.backupDir, backup);
        const stats = fs.statSync(backupPath);
        const size = (stats.size / 1024 / 1024).toFixed(2);
        const date = stats.mtime.toISOString();
        
        console.log(`   ${index + 1}. ${backup}`);
        console.log(`      Size: ${size} MB`);
        console.log(`      Date: ${date}`);
        console.log('');
      });

      return backups;
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      return [];
    }
  }

  /**
   * Reset database using Prisma
   */
  resetDatabase() {
    try {
      console.log('🔄 Resetting database using Prisma...');
      
      // Generate Prisma client
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      // Reset and push schema
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
      
      console.log('✅ Database reset successfully!');
    } catch (error) {
      console.error('❌ Database reset failed:', error.message);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  seedDatabase() {
    try {
      console.log('🔄 Seeding database...');
      
      // Check if seed script exists
      const seedPath = path.join(__dirname, 'prisma', 'seed.ts');
      if (fs.existsSync(seedPath)) {
        execSync('npx prisma db seed', { stdio: 'inherit' });
        console.log('✅ Database seeded successfully!');
      } else {
        console.log('⚠️  No seed script found, skipping seeding');
      }
    } catch (error) {
      console.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  testConnection() {
    try {
      console.log('🔄 Testing database connection...');
      
      const command = `psql "${DATABASE_URL}" -c "SELECT version();"`;
      execSync(command, { stdio: 'inherit' });
      
      console.log('✅ Database connection successful!');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const recovery = new DatabaseRecovery();

  switch (command) {
    case 'backup':
      recovery.createBackup(args[1]);
      break;
      
    case 'backup-compressed':
      recovery.createCompressedBackup(args[1]);
      break;
      
    case 'restore':
      if (!args[1]) {
        console.error('❌ Please provide backup file path');
        process.exit(1);
      }
      recovery.restoreFromBackup(args[1]);
      break;
      
    case 'list':
      recovery.listBackups();
      break;
      
    case 'reset':
      recovery.resetDatabase();
      break;
      
    case 'seed':
      recovery.seedDatabase();
      break;
      
    case 'test':
      recovery.testConnection();
      break;
      
    case 'full-reset':
      console.log('🔄 Performing full database reset...');
      recovery.resetDatabase();
      recovery.seedDatabase();
      break;
      
    default:
      console.log(`
🗄️  Database Recovery Script for EventMarketers

Usage: node database_recovery_script.js <command> [options]

Commands:
  backup [name]              Create a database backup
  backup-compressed [name]   Create a compressed database backup
  restore <backup-file>      Restore database from backup file
  list                       List available backups
  reset                      Reset database using Prisma
  seed                       Seed database with initial data
  test                       Test database connection
  full-reset                 Reset database and seed with initial data

Examples:
  node database_recovery_script.js backup
  node database_recovery_script.js backup-compressed my-backup
  node database_recovery_script.js restore backups/backup_2024-01-15.sql
  node database_recovery_script.js list
  node database_recovery_script.js full-reset
      `);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseRecovery;
