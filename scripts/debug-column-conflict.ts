import { db } from '../server/db';
import sql from 'mssql';
import { getMSSQLConfig, connectMSSQL } from '../server/services/mssql-migration';

function convertColumnNameToSnakeCase(columnName: string): string {
  return columnName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

async function debug() {
  try {
    console.log('🔍 Debugging Column Conflict\n');
    
    // 1. Check PostgreSQL columns
    console.log('1️⃣ PostgreSQL columns in audit."1690_stock":');
    const pgResult = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema='audit' AND table_name='1690_stock' 
      ORDER BY ordinal_position
    `);
    pgResult.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    // 2. Check MSSQL columns
    console.log('\n2️⃣ MSSQL columns in audit.[1690Stock]:');
    const mssqlPool = await connectMSSQL();
    const mssqlResult = await mssqlPool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'audit' AND TABLE_NAME = '1690Stock'
      ORDER BY ORDINAL_POSITION
    `);
    
    const mssqlColumns = mssqlResult.recordset.map((col: any) => col.COLUMN_NAME);
    mssqlColumns.forEach((col: string) => {
      console.log(`   - ${col} → ${convertColumnNameToSnakeCase(col)}`);
    });
    
    // 3. Build INSERT column list (as code does)
    console.log('\n3️⃣ INSERT column list that would be generated:');
    const columnList = `company_code, ${mssqlColumns.map(convertColumnNameToSnakeCase).join(', ')}`;
    console.log(`   ${columnList}`);
    
    // 4. Check for duplicates
    console.log('\n4️⃣ Checking for duplicates:');
    const columns = columnList.split(', ');
    const duplicates = columns.filter((item, index) => columns.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log(`   ❌ DUPLICATES FOUND: ${duplicates.join(', ')}`);
    } else {
      console.log('   ✅ No duplicates found');
    }
    
    // 5. Check what's in PG but not in MSSQL
    console.log('\n5️⃣ Columns in PostgreSQL but not in MSSQL:');
    const pgColumns = pgResult.rows.map((r: any) => r.column_name);
    const mssqlSnakeCase = mssqlColumns.map(convertColumnNameToSnakeCase);
    const onlyInPg = pgColumns.filter(c => !mssqlSnakeCase.includes(c) && c !== 'company_code');
    if (onlyInPg.length > 0) {
      console.log(`   - ${onlyInPg.join(', ')}`);
    } else {
      console.log('   (none)');
    }
    
    await mssqlPool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debug();

