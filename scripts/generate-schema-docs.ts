/**
 * Generate Database Schema Documentation
 * 
 * This script generates documentation of the database schema in markdown format.
 * It's useful for understanding the database structure and verifying migrations.
 */
import * as fs from 'fs';
import * as path from 'path';
import { db, pool } from '../server/db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';

async function generateSchemaDocs() {
  console.log('Generating database schema documentation...');
  
  const schemaPath = path.join(process.cwd(), 'SCHEMA.md');
  let markdown = `# TeamKick Soccer Manager - Database Schema\n\n`;
  markdown += `*Documentation generated on: ${new Date().toLocaleString()}*\n\n`;
  
  // Attempt to get the database version
  try {
    const result = await pool.query('SELECT version();');
    if (result.rows.length > 0) {
      markdown += `Database: PostgreSQL ${result.rows[0].version.split(' ')[1]}\n\n`;
    }
  } catch (error) {
    console.error('Error fetching database version:', error);
    markdown += `Database: PostgreSQL\n\n`;
  }
  
  // Get table information from PostgreSQL schema
  try {
    const tables = await pool.query(`
      SELECT 
        table_name,
        obj_description(('"' || table_schema || '"."' || table_name || '"')::regclass, 'pg_class') as table_comment
      FROM 
        information_schema.tables 
      WHERE 
        table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY 
        table_name;
    `);
    
    markdown += `## Tables\n\n`;
    markdown += `This database contains ${tables.rows.length} tables.\n\n`;
    
    // Process each table
    for (const table of tables.rows) {
      const tableName = table.table_name;
      markdown += `### ${tableName}\n\n`;
      
      if (table.table_comment) {
        markdown += `${table.table_comment}\n\n`;
      }
      
      // Get column information
      const columns = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          udt_name,
          col_description(('"' || table_schema || '"."' || table_name || '"')::regclass, ordinal_position) as column_comment
        FROM 
          information_schema.columns
        WHERE 
          table_schema = 'public' 
          AND table_name = $1
        ORDER BY 
          ordinal_position;
      `, [tableName]);
      
      // Add column details
      markdown += `| Column | Type | Nullable | Default | Description |\n`;
      markdown += `|--------|------|----------|---------|-------------|\n`;
      
      for (const column of columns.rows) {
        let type = column.data_type;
        if (column.data_type === 'USER-DEFINED') {
          type = column.udt_name;
        } else if (column.data_type === 'character varying' && column.character_maximum_length) {
          type = `varchar(${column.character_maximum_length})`;
        }
        
        markdown += `| ${column.column_name} | ${type} | ${column.is_nullable === 'YES' ? 'Yes' : 'No'} | ${column.column_default || ''} | ${column.column_comment || ''} |\n`;
      }
      
      // Get primary key information
      const primaryKeys = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name
        FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        WHERE
          tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY
          kcu.ordinal_position;
      `, [tableName]);
      
      if (primaryKeys.rows.length > 0) {
        markdown += `\n**Primary Key:** ${primaryKeys.rows.map(pk => pk.column_name).join(', ')}\n`;
      }
      
      // Get foreign key information
      const foreignKeys = await pool.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM
          information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE
          tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = $1;
      `, [tableName]);
      
      if (foreignKeys.rows.length > 0) {
        markdown += `\n**Foreign Keys:**\n`;
        for (const fk of foreignKeys.rows) {
          markdown += `- ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})\n`;
        }
      }
      
      // Get index information
      const indexes = await pool.query(`
        SELECT
          indexname,
          indexdef
        FROM
          pg_indexes
        WHERE
          schemaname = 'public'
          AND tablename = $1
        ORDER BY
          indexname;
      `, [tableName]);
      
      if (indexes.rows.length > 0) {
        markdown += `\n**Indexes:**\n`;
        for (const idx of indexes.rows) {
          // Filter out primary key indexes (already covered)
          if (!idx.indexname.endsWith('_pkey')) {
            markdown += `- ${idx.indexname}: ${idx.indexdef.replace(`CREATE INDEX ${idx.indexname} ON public.${tableName} USING `, '')}\n`;
          }
        }
      }
      
      markdown += `\n\n`;
    }
    
    // Add schema diagrams or additional information here if needed
    
    // Write to file
    fs.writeFileSync(schemaPath, markdown);
    console.log(`Schema documentation written to ${schemaPath}`);
    
  } catch (error) {
    console.error('Error generating schema documentation:', error);
  }
  
  // Close connection
  await pool.end();
}

// Execute the function
generateSchemaDocs()
  .then(() => {
    console.log('Schema documentation generation completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });