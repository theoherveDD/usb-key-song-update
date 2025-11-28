/**
 * Database check and repair script
 * Verifies and fixes the database schema
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(__dirname, '../../data/app.db');

console.log('🔍 Checking database schema...');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Get table info
  const tableInfo = db.pragma('table_info(tracks)') as Array<{ cid: number; name: string; type: string; notnull: number; dflt_value: any; pk: number }>;
  
  console.log('\n📋 Current columns in tracks table:');
  tableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  const hasGenresColumn = tableInfo.some(col => col.name === 'genres');
  
  if (!hasGenresColumn) {
    console.log('\n⚠️  Missing "genres" column. Adding it now...');
    db.exec('ALTER TABLE tracks ADD COLUMN genres TEXT');
    console.log('✅ Added "genres" column successfully!');
  } else {
    console.log('\n✅ "genres" column exists.');
  }
  
  // Test insertion
  console.log('\n🧪 Testing database operations...');
  
  const testStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tracks
  `);
  const result = testStmt.get() as { count: number };
  console.log(`✅ Database has ${result.count} tracks.`);
  
  db.close();
  console.log('\n✅ Database check completed successfully!');
  
} catch (error: any) {
  console.error('\n❌ Database check failed:', error.message);
  console.error(error);
  process.exit(1);
}
