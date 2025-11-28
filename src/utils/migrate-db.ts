/**
 * Database migration script
 * Adds the 'genres' column to existing tracks table
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(__dirname, '../../data/app.db');

console.log('Starting database migration...');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check if genres column exists
  const tableInfo = db.pragma('table_info(tracks)') as Array<{ name: string }>;
  const hasGenresColumn = tableInfo.some((col) => col.name === 'genres');
  
  if (hasGenresColumn) {
    console.log('✓ Column "genres" already exists. No migration needed.');
  } else {
    console.log('Adding "genres" column to tracks table...');
    
    // Add the genres column
    db.exec('ALTER TABLE tracks ADD COLUMN genres TEXT');
    
    console.log('✓ Migration completed successfully!');
    console.log('✓ Column "genres" has been added to the tracks table.');
  }
  
  db.close();
  console.log('\nDatabase migration finished.');
  
} catch (error: any) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}
