import sql from 'mssql';
import { db, pool } from '../db';
import { sql as drizzleSql } from 'drizzle-orm';
import { EventEmitter } from 'events';

export interface MigrationProgress {
  migrationId: string;
  type: 'general-ledger' | 'audit' | 'rs';
  tenantCode: number | null;
  tableName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  progress: number;
  startTime: Date;
  endTime?: Date;
  errorMessage?: string;
  batchSize: number;
}

interface MSSQLConfig {
  server: string;
  database: string;
  authentication: {
    type: 'default';
    options: {
      userName: string;
      password: string;
    };
  };
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
}

const migrationEmitter = new EventEmitter();

/**
 * Build MSSQL connection config
 */
function getMSSQLConfig(): MSSQLConfig {
  const config: MSSQLConfig = {
    server: process.env.MSSQL_SERVER || '95.104.94.20',
    database: process.env.MSSQL_DATABASE || 'Audit',
    authentication: {
      type: 'default' as const,
      options: {
        userName: process.env.MSSQL_USERNAME || 'sa',
        password: process.env.MSSQL_PASSWORD || 'asQW12ZX12!!',
      },
    },
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  console.log('🔧 MSSQL Connection Config:');
  console.log('   Server:', config.server);
  console.log('   Database:', config.database);
  console.log('   Username:', config.authentication.options.userName);
  console.log('   Password:', config.authentication.options.password ? '***' + config.authentication.options.password.slice(-4) : 'NOT SET');
  console.log('   Encrypt:', config.options.encrypt);
  console.log('   Trust Certificate:', config.options.trustServerCertificate);

  return config;
}

/**
 * Connect to MSSQL
 */
export async function connectMSSQL(): Promise<sql.ConnectionPool> {
  console.log('\n🔌 Attempting to connect to MSSQL...');
  
  try {
    const config = getMSSQLConfig();
    console.log('📦 Creating connection pool...');
    
    const pool = new sql.ConnectionPool(config);
    
    // Add event listeners for debugging
    pool.on('error', (err) => {
      console.error('❌ MSSQL Pool Error:', err);
    });

    console.log('⏳ Connecting to MSSQL server...');
    const startTime = Date.now();
    
    await pool.connect();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Connected to MSSQL successfully in ${duration}ms`);
    console.log('   Connection State:', pool.connected ? 'CONNECTED' : 'DISCONNECTED');
    console.log('   Pool Size:', pool.size);
    
    return pool;
  } catch (error: any) {
    console.error('\n❌ Failed to connect to MSSQL');
    console.error('   Error Type:', error.constructor.name);
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    
    if (error.originalError) {
      console.error('   Original Error:', error.originalError.message);
    }
    
    // Specific error handling
    if (error.code === 'ESOCKET') {
      console.error('   ⚠️  Socket error - Check if server is reachable');
      console.error('   ⚠️  Verify firewall settings and network connectivity');
    } else if (error.code === 'ELOGIN') {
      console.error('   ⚠️  Login failed - Check username and password');
    } else if (error.code === 'ETIMEOUT') {
      console.error('   ⚠️  Connection timeout - Server may be down or unreachable');
    } else if (error.code === 'EINSTLOOKUP') {
      console.error('   ⚠️  Instance lookup failed - Check server name/instance');
    }
    
    throw error;
  }
}

interface TenantInfo {
  tenantCode: number;
  tenantName: string;
  recordCount: number;
}

/**
 * Get available tenant codes with names and record counts from GeneralLedger
 */
export async function getTenantCodes(mssqlPool: sql.ConnectionPool): Promise<TenantInfo[]> {
  console.log('\n📋 Fetching tenant codes with names and counts from MSSQL...');
  
  try {
    console.log('   Pool connected:', mssqlPool.connected);
    
    // Query to get tenant codes, names, and record counts
    const query = `
      SELECT 
        TenantCode,
        MAX(TenantName) AS TenantName,
        COUNT(*) AS RecordCount
      FROM GeneralLedger
      GROUP BY TenantCode
      ORDER BY TenantCode
    `;
    
    console.log('   Executing query:', query.trim());
    
    const request = mssqlPool.request();
    const startTime = Date.now();
    const result = await request.query(query);
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Query completed in ${duration}ms`);
    console.log(`   Found ${result.recordset.length} tenants`);
    
    const tenants: TenantInfo[] = result.recordset.map((row: any) => ({
      tenantCode: row.TenantCode,
      tenantName: row.TenantName || `Tenant ${row.TenantCode}`,
      recordCount: row.RecordCount || 0,
    }));
    
    console.log('   Tenants:');
    tenants.forEach(t => {
      console.log(`      - Code: ${t.tenantCode}, Name: "${t.tenantName}", Records: ${t.recordCount}`);
    });
    
    return tenants;
  } catch (error: any) {
    console.error('\n❌ Failed to get tenant codes');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'EREQUEST') {
      console.error('   ⚠️  Request error - Check if GeneralLedger table exists');
    }
    
    throw error;
  }
}

/**
 * Convert MSSQL binary(1) to boolean
 */
function convertBinaryToBoolean(value: any): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (Buffer.isBuffer(value)) return value[0] !== 0x00;
  return null;
}

/**
 * Convert MSSQL binary(16) to hex string
 */
function convertBinaryToHex(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (Buffer.isBuffer(value)) return value.toString('hex');
  if (typeof value === 'string') return value;
  return null;
}

/**
 * Convert numeric value safely
 */
function convertDecimal(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Emit progress update
 */
function emitProgress(progress: MigrationProgress): void {
  migrationEmitter.emit('progress', progress);
}

/**
 * Migrate General Ledger from MSSQL to journal_entries
 */
export async function migrateGeneralLedger(
  mssqlPool: sql.ConnectionPool,
  tenantCode: number,
  companyId: number,
  batchSize: number = 1000
): Promise<MigrationProgress> {
  const migrationId = `migration_${Date.now()}`;
  const progress: MigrationProgress = {
    migrationId,
    type: 'general-ledger',
    tenantCode,
    status: 'running',
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    progress: 0,
    startTime: new Date(),
    batchSize,
  };

  try {
    // Get total count
    const countRequest = mssqlPool.request();
    const countResult = await countRequest.query(
      `SELECT COUNT(*) as count FROM GeneralLedger WHERE TenantCode = ${tenantCode}`
    );
    progress.totalRecords = countResult.recordset[0].count;

    if (progress.totalRecords === 0) {
      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      return progress;
    }

    console.log(`📊 Total records to migrate: ${progress.totalRecords}`);

    // Read and migrate data
    const query = `
      SELECT 
        TenantCode, TenantName, Abonent, PostingsPeriod, Register, Branch, Content,
        ResponsiblePerson, AccountDr, AccountNameDr, AnalyticDr, AnalyticRefDr, IDDr,
        LegalFormDr, CountryDr, ProfitTaxDr, WithholdingTaxDr, DoubleTaxationDr,
        PensionSchemeParticipantDr, AccountCr, AccountNameCr, AnalyticCr, AnalyticRefCr,
        IDCr, LegalFormCr, CountryCr, ProfitTaxCr, WithholdingTaxCr, DoubleTaxationCr,
        PensionSchemeParticipantCr, Currency, Amount, AmountCur, QuantityDr, QuantityCr,
        Rate, DocumentRate, TAXInvoiceNumber, TAXInvoiceDate, TAXInvoiceSeries, WaybillNumber,
        AttachedFiles, DocType, DocDate, DocNumber, DocumentCreationDate, DocumentModifyDate,
        DocumentComments, PostingNumber
      FROM GeneralLedger
      WHERE TenantCode = ${tenantCode}
      ORDER BY PostingsPeriod, TenantCode
    `;

    const request = mssqlPool.request();
    let batch: any[] = [];

    request.stream = true;

    request.on('row', async (row: any) => {
      batch.push(row);

      if (batch.length >= batchSize) {
        request.pause();
        try {
          const values = batch.map((r, idx) => [
            companyId,
            `GL-${tenantCode}-${String(progress.processedRecords + idx + 1).padStart(6, '0')}`,
            r.PostingsPeriod || new Date(),
            r.Content || `General Ledger Entry ${progress.processedRecords + idx + 1}`,
            null,
            convertDecimal(r.Amount) || 0,
            null,
            true,
            r.TenantCode,
            r.TenantName,
            r.Abonent,
            r.PostingsPeriod,
            convertBinaryToHex(r.Register),
            r.Branch,
            r.Content,
            r.ResponsiblePerson,
            r.AccountDr,
            r.AccountNameDr,
            r.AnalyticDr,
            convertBinaryToHex(r.AnalyticRefDr),
            r.IDDr,
            r.LegalFormDr,
            r.CountryDr,
            convertBinaryToBoolean(r.ProfitTaxDr),
            convertBinaryToBoolean(r.WithholdingTaxDr),
            convertBinaryToBoolean(r.DoubleTaxationDr),
            convertBinaryToBoolean(r.PensionSchemeParticipantDr),
            r.AccountCr,
            r.AccountNameCr,
            r.AnalyticCr,
            convertBinaryToHex(r.AnalyticRefCr),
            r.IDCr,
            r.LegalFormCr,
            r.CountryCr,
            convertBinaryToBoolean(r.ProfitTaxCr),
            convertBinaryToBoolean(r.WithholdingTaxCr),
            convertBinaryToBoolean(r.DoubleTaxationCr),
            convertBinaryToBoolean(r.PensionSchemeParticipantCr),
            r.Currency,
            convertDecimal(r.Amount),
            convertDecimal(r.AmountCur),
            convertDecimal(r.QuantityDr),
            convertDecimal(r.QuantityCr),
            convertDecimal(r.Rate),
            convertDecimal(r.DocumentRate),
            r.TAXInvoiceNumber,
            r.TAXInvoiceDate,
            r.TAXInvoiceSeries,
            r.WaybillNumber,
            convertDecimal(r.AttachedFiles),
            r.DocType,
            r.DocDate,
            r.DocNumber,
            r.DocumentCreationDate,
            r.DocumentModifyDate,
            r.DocumentComments,
            r.PostingNumber,
          ]);

          for (const val of values) {
            try {
              // Debug: Log array length
              if (progress.processedRecords === 0) {
                console.log(`🔍 Debug first insert - val.length: ${val.length}`);
                console.log(`🔍 Expected 55 values for 55 columns`);
              }
              
              // Use Drizzle SQL template for proper parameter binding
              await db.execute(drizzleSql`INSERT INTO journal_entries (
                company_id, entry_number, date, description, reference, total_amount, user_id, is_posted,
                tenant_code, tenant_name, abonent, postings_period, register, branch, content_text,
                responsible_person, account_dr, account_name_dr, analytic_dr, analytic_ref_dr,
                id_dr, legal_form_dr, country_dr, profit_tax_dr, withholding_tax_dr,
                double_taxation_dr, pension_scheme_participant_dr, account_cr, account_name_cr,
                analytic_cr, analytic_ref_cr, id_cr, legal_form_cr, country_cr, profit_tax_cr,
                withholding_tax_cr, double_taxation_cr, pension_scheme_participant_cr,
                currency, amount, amount_cur, quantity_dr, quantity_cr, rate, document_rate,
                tax_invoice_number, tax_invoice_date, tax_invoice_series, waybill_number,
                attached_files, doc_type, doc_date, doc_number, document_creation_date,
                document_modify_date, document_comments, posting_number
              ) VALUES (
                ${val[0]}, ${val[1]}, ${val[2]}, ${val[3]}, ${val[4]}, ${val[5]}, ${val[6]}, ${val[7]},
                ${val[8]}, ${val[9]}, ${val[10]}, ${val[11]}, ${val[12]}, ${val[13]}, ${val[14]}, ${val[15]},
                ${val[16]}, ${val[17]}, ${val[18]}, ${val[19]}, ${val[20]}, ${val[21]}, ${val[22]}, ${val[23]},
                ${val[24]}, ${val[25]}, ${val[26]}, ${val[27]}, ${val[28]}, ${val[29]}, ${val[30]}, ${val[31]},
                ${val[32]}, ${val[33]}, ${val[34]}, ${val[35]}, ${val[36]}, ${val[37]}, ${val[38]}, ${val[39]},
                ${val[40]}, ${val[41]}, ${val[42]}, ${val[43]}, ${val[44]}, ${val[45]}, ${val[46]}, ${val[47]},
                ${val[48]}, ${val[49]}, ${val[50]}, ${val[51]}, ${val[52]}, ${val[53]}, ${val[54]}, ${val[55]}, ${val[56]}
              )`);
              progress.successCount++;
            } catch (error) {
              console.error('❌ Insert error:', error);
              console.error('   Val length:', val.length);
              progress.errorCount++;
            }
          }

          progress.processedRecords += batch.length;
          progress.progress = (progress.processedRecords / progress.totalRecords) * 100;
          emitProgress(progress);

          batch = [];
          request.resume();
        } catch (error) {
          console.error('❌ Batch error:', error);
          progress.errorCount += batch.length;
          batch = [];
          request.resume();
        }
      }
    });

    request.on('done', async () => {
      // Process remaining batch
      if (batch.length > 0) {
        const values = batch.map((r, idx) => [
          companyId,
          `GL-${tenantCode}-${String(progress.processedRecords + idx + 1).padStart(6, '0')}`,
          r.PostingsPeriod || new Date(),
          r.Content || `General Ledger Entry ${progress.processedRecords + idx + 1}`,
          null,
          convertDecimal(r.Amount) || 0,
          null,
          true,
          r.TenantCode,
          r.TenantName,
          r.Abonent,
          r.PostingsPeriod,
          convertBinaryToHex(r.Register),
          r.Branch,
          r.Content,
          r.ResponsiblePerson,
          r.AccountDr,
          r.AccountNameDr,
          r.AnalyticDr,
          convertBinaryToHex(r.AnalyticRefDr),
          r.IDDr,
          r.LegalFormDr,
          r.CountryDr,
          convertBinaryToBoolean(r.ProfitTaxDr),
          convertBinaryToBoolean(r.WithholdingTaxDr),
          convertBinaryToBoolean(r.DoubleTaxationDr),
          convertBinaryToBoolean(r.PensionSchemeParticipantDr),
          r.AccountCr,
          r.AccountNameCr,
          r.AnalyticCr,
          convertBinaryToHex(r.AnalyticRefCr),
          r.IDCr,
          r.LegalFormCr,
          r.CountryCr,
          convertBinaryToBoolean(r.ProfitTaxCr),
          convertBinaryToBoolean(r.WithholdingTaxCr),
          convertBinaryToBoolean(r.DoubleTaxationCr),
          convertBinaryToBoolean(r.PensionSchemeParticipantCr),
          r.Currency,
          convertDecimal(r.Amount),
          convertDecimal(r.AmountCur),
          convertDecimal(r.QuantityDr),
          convertDecimal(r.QuantityCr),
          convertDecimal(r.Rate),
          convertDecimal(r.DocumentRate),
          r.TAXInvoiceNumber,
          r.TAXInvoiceDate,
          r.TAXInvoiceSeries,
          r.WaybillNumber,
          convertDecimal(r.AttachedFiles),
          r.DocType,
          r.DocDate,
          r.DocNumber,
          r.DocumentCreationDate,
          r.DocumentModifyDate,
          r.DocumentComments,
          r.PostingNumber,
        ]);

        for (const val of values) {
          try {
            // Use Drizzle SQL template for proper parameter binding
            await db.execute(drizzleSql`INSERT INTO journal_entries (
              company_id, entry_number, date, description, reference, total_amount, user_id, is_posted,
              tenant_code, tenant_name, abonent, postings_period, register, branch, content_text,
              responsible_person, account_dr, account_name_dr, analytic_dr, analytic_ref_dr,
              id_dr, legal_form_dr, country_dr, profit_tax_dr, withholding_tax_dr,
              double_taxation_dr, pension_scheme_participant_dr, account_cr, account_name_cr,
              analytic_cr, analytic_ref_cr, id_cr, legal_form_cr, country_cr, profit_tax_cr,
              withholding_tax_cr, double_taxation_cr, pension_scheme_participant_cr,
              currency, amount, amount_cur, quantity_dr, quantity_cr, rate, document_rate,
              tax_invoice_number, tax_invoice_date, tax_invoice_series, waybill_number,
              attached_files, doc_type, doc_date, doc_number, document_creation_date,
              document_modify_date, document_comments, posting_number
            ) VALUES (
              ${val[0]}, ${val[1]}, ${val[2]}, ${val[3]}, ${val[4]}, ${val[5]}, ${val[6]}, ${val[7]},
              ${val[8]}, ${val[9]}, ${val[10]}, ${val[11]}, ${val[12]}, ${val[13]}, ${val[14]}, ${val[15]},
              ${val[16]}, ${val[17]}, ${val[18]}, ${val[19]}, ${val[20]}, ${val[21]}, ${val[22]}, ${val[23]},
              ${val[24]}, ${val[25]}, ${val[26]}, ${val[27]}, ${val[28]}, ${val[29]}, ${val[30]}, ${val[31]},
              ${val[32]}, ${val[33]}, ${val[34]}, ${val[35]}, ${val[36]}, ${val[37]}, ${val[38]}, ${val[39]},
              ${val[40]}, ${val[41]}, ${val[42]}, ${val[43]}, ${val[44]}, ${val[45]}, ${val[46]}, ${val[47]},
              ${val[48]}, ${val[49]}, ${val[50]}, ${val[51]}, ${val[52]}, ${val[53]}, ${val[54]}, ${val[55]}, ${val[56]}
            )`);
            progress.successCount++;
          } catch (error) {
            console.error('❌ Insert error:', error);
            progress.errorCount++;
          }
        }

        progress.processedRecords += batch.length;
        progress.progress = 100;
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
    });

    request.on('error', (error: any) => {
      console.error('❌ Stream error:', error);
      progress.status = 'failed';
      progress.errorMessage = error.message;
      progress.endTime = new Date();
      emitProgress(progress);
    });

    await request.query(query);

    return progress;
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    progress.status = 'failed';
    progress.errorMessage = error.message;
    progress.endTime = new Date();
    emitProgress(progress);
    throw error;
  }
}

/**
 * Export to audit general_ledger table
 */
export async function exportToAudit(
  mssqlPool: sql.ConnectionPool,
  tenantCode: number,
  companyId: number,
  batchSize: number = 1000
): Promise<MigrationProgress> {
  const migrationId = `audit_${Date.now()}`;
  const progress: MigrationProgress = {
    migrationId,
    type: 'audit',
    tenantCode,
    status: 'running',
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    progress: 0,
    startTime: new Date(),
    batchSize,
  };

  try {
    const countRequest = mssqlPool.request();
    const countResult = await countRequest.query(
      `SELECT COUNT(*) as count FROM audit.GeneralLedger WHERE TenantCode = ${tenantCode}`
    );
    progress.totalRecords = countResult.recordset[0].count;

    if (progress.totalRecords === 0) {
      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      return progress;
    }

    console.log(`📊 Total audit records to export: ${progress.totalRecords}`);

    const query = `SELECT TenantCode, TenantName, Abonent, PostingsPeriod, Register, Branch, Content, ResponsiblePerson, AccountDr, AccountNameDr, AnalyticDr, AnalyticRefDr, IDDr, LegalFormDr, CountryDr, ProfitTaxDr, WithholdingTaxDr, DoubleTaxationDr, PensionSchemeParticipantDr, AccountCr, AccountNameCr, AnalyticCr, AnalyticRefCr, IDCr, LegalFormCr, CountryCr, ProfitTaxCr, WithholdingTaxCr, DoubleTaxationCr, PensionSchemeParticipantCr, Currency, Amount, AmountCur, QuantityDr, QuantityCr, Rate, DocumentRate, TAXInvoiceNumber, TAXInvoiceDate, TAXInvoiceSeries, WaybillNumber, AttachedFiles, DocType, DocDate, DocNumber, DocumentCreationDate, DocumentModifyDate, DocumentComments, PostingNumber FROM audit.GeneralLedger WHERE TenantCode = ${tenantCode} ORDER BY PostingsPeriod, TenantCode`;

    const request = mssqlPool.request();
    let batch: any[] = [];

    request.stream = true;

    request.on('row', async (row: any) => {
      batch.push(row);

      if (batch.length >= batchSize) {
        request.pause();
        try {
          const values = batch.map((r) => [
            companyId,
            r.TenantCode,
            r.TenantName,
            r.Abonent,
            r.PostingsPeriod,
            convertBinaryToHex(r.Register),
            r.Branch,
            r.Content,
            r.ResponsiblePerson,
            r.AccountDr,
            r.AccountNameDr,
            r.AnalyticDr,
            convertBinaryToHex(r.AnalyticRefDr),
            r.IDDr,
            r.LegalFormDr,
            r.CountryDr,
            convertBinaryToBoolean(r.ProfitTaxDr),
            convertBinaryToBoolean(r.WithholdingTaxDr),
            convertBinaryToBoolean(r.DoubleTaxationDr),
            convertBinaryToBoolean(r.PensionSchemeParticipantDr),
            r.AccountCr,
            r.AccountNameCr,
            r.AnalyticCr,
            convertBinaryToHex(r.AnalyticRefCr),
            r.IDCr,
            r.LegalFormCr,
            r.CountryCr,
            convertBinaryToBoolean(r.ProfitTaxCr),
            convertBinaryToBoolean(r.WithholdingTaxCr),
            convertBinaryToBoolean(r.DoubleTaxationCr),
            convertBinaryToBoolean(r.PensionSchemeParticipantCr),
            r.Currency,
            convertDecimal(r.Amount),
            convertDecimal(r.AmountCur),
            convertDecimal(r.QuantityDr),
            convertDecimal(r.QuantityCr),
            convertDecimal(r.Rate),
            convertDecimal(r.DocumentRate),
            r.TAXInvoiceNumber,
            r.TAXInvoiceDate,
            r.TAXInvoiceSeries,
            r.WaybillNumber,
            convertDecimal(r.AttachedFiles),
            r.DocType,
            r.DocDate,
            r.DocNumber,
            r.DocumentCreationDate,
            r.DocumentModifyDate,
            r.DocumentComments,
            r.PostingNumber,
            'MSSQL',
            new Date(),
            `audit_${Date.now()}`,
          ]);

          for (const val of values) {
            try {
              // Use Drizzle SQL template for proper parameter binding
              await db.execute(drizzleSql`INSERT INTO general_ledger (
                company_id, tenant_code, tenant_name, abonent, postings_period, register, branch, content,
                responsible_person, account_dr, account_name_dr, analytic_dr, analytic_ref_dr, id_dr,
                legal_form_dr, country_dr, profit_tax_dr, withholding_tax_dr, double_taxation_dr,
                pension_scheme_participant_dr, account_cr, account_name_cr, analytic_cr, analytic_ref_cr,
                id_cr, legal_form_cr, country_cr, profit_tax_cr, withholding_tax_cr, double_taxation_cr,
                pension_scheme_participant_cr, currency, amount, amount_cur, quantity_dr, quantity_cr,
                rate, document_rate, tax_invoice_number, tax_invoice_date, tax_invoice_series, waybill_number,
                attached_files, doc_type, doc_date, doc_number, document_creation_date, document_modify_date,
                document_comments, posting_number, source_system, migrated_at, migration_batch_id
              ) VALUES (
                ${val[0]}, ${val[1]}, ${val[2]}, ${val[3]}, ${val[4]}, ${val[5]}, ${val[6]}, ${val[7]},
                ${val[8]}, ${val[9]}, ${val[10]}, ${val[11]}, ${val[12]}, ${val[13]}, ${val[14]}, ${val[15]},
                ${val[16]}, ${val[17]}, ${val[18]}, ${val[19]}, ${val[20]}, ${val[21]}, ${val[22]}, ${val[23]},
                ${val[24]}, ${val[25]}, ${val[26]}, ${val[27]}, ${val[28]}, ${val[29]}, ${val[30]}, ${val[31]},
                ${val[32]}, ${val[33]}, ${val[34]}, ${val[35]}, ${val[36]}, ${val[37]}, ${val[38]}, ${val[39]},
                ${val[40]}, ${val[41]}, ${val[42]}, ${val[43]}, ${val[44]}, ${val[45]}, ${val[46]}, ${val[47]},
                ${val[48]}, ${val[49]}, ${val[50]}, ${val[51]}, ${val[52]}
              ) ON CONFLICT DO NOTHING`);
              progress.successCount++;
            } catch (error) {
              console.error('❌ Insert error:', error);
              progress.errorCount++;
            }
          }

          progress.processedRecords += batch.length;
          progress.progress = (progress.processedRecords / progress.totalRecords) * 100;
          emitProgress(progress);

          batch = [];
          request.resume();
        } catch (error) {
          console.error('❌ Batch error:', error);
          progress.errorCount += batch.length;
          batch = [];
          request.resume();
        }
      }
    });

    request.on('done', async () => {
      if (batch.length > 0) {
        progress.processedRecords += batch.length;
        progress.progress = 100;
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
    });

    request.on('error', (error: any) => {
      console.error('❌ Stream error:', error);
      progress.status = 'failed';
      progress.errorMessage = error.message;
      progress.endTime = new Date();
      emitProgress(progress);
    });

    await request.query(query);

    return progress;
  } catch (error: any) {
    console.error('❌ Audit export error:', error);
    progress.status = 'failed';
    progress.errorMessage = error.message;
    progress.endTime = new Date();
    emitProgress(progress);
    throw error;
  }
}

/**
 * Migrate RS schema tables from MSSQL
 */
export async function migrateRSTables(
  mssqlPool: sql.ConnectionPool,
  tableName: string,
  companyId: number,
  companyTin: string,
  batchSize: number = 1000
): Promise<MigrationProgress> {
  const migrationId = `rs_${Date.now()}`;
  const progress: MigrationProgress = {
    migrationId,
    type: 'rs',
    tenantCode: null,
    status: 'running',
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    progress: 0,
    startTime: new Date(),
    batchSize,
  };

  try {
    const countRequest = mssqlPool.request();
    const countResult = await countRequest.query(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    progress.totalRecords = countResult.recordset[0].count;

    if (progress.totalRecords === 0) {
      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      return progress;
    }

    console.log(`📊 Total RS records to migrate: ${progress.totalRecords} from table: ${tableName}`);

    const request = mssqlPool.request();
    let batch: any[] = [];

    request.stream = true;

    request.on('row', async (row: any) => {
      batch.push(row);

      if (batch.length >= batchSize) {
        request.pause();
        try {
          // Dynamic column mapping for RS tables
          const columns = Object.keys(row).map(col => col.toLowerCase());
          const placeholders = columns.map((_, idx) => `$${idx + 3}`).join(', ');
          
          const values = batch.map((r) => {
            const vals: any[] = [companyId, companyTin];
            for (const col of columns) {
              let value = r[col];
              if (value && (typeof value === 'object' && Buffer.isBuffer(value))) {
                value = convertBinaryToHex(value);
              } else if (typeof value === 'number') {
                value = convertDecimal(value);
              }
              vals.push(value);
            }
            return vals;
          });

          const colNames = `company_id, company_tin, ${columns.join(', ')}`;
          const insertQuery = `INSERT INTO rs.${tableName} (${colNames}) VALUES ($1, $2, ${placeholders}) ON CONFLICT DO NOTHING`;

          for (const val of values) {
            try {
              // Use raw query execution via database pool
              await db.execute(insertQuery);
              progress.successCount++;
            } catch (error) {
              console.error('❌ RS insert error:', error);
              progress.errorCount++;
            }
          }

          progress.processedRecords += batch.length;
          progress.progress = (progress.processedRecords / progress.totalRecords) * 100;
          emitProgress(progress);

          batch = [];
          request.resume();
        } catch (error) {
          console.error('❌ RS batch error:', error);
          progress.errorCount += batch.length;
          batch = [];
          request.resume();
        }
      }
    });

    request.on('done', async () => {
      if (batch.length > 0) {
        progress.processedRecords += batch.length;
        progress.progress = 100;
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
    });

    request.on('error', (error: any) => {
      console.error('❌ RS stream error:', error);
      progress.status = 'failed';
      progress.errorMessage = error.message;
      progress.endTime = new Date();
      emitProgress(progress);
    });

    await request.query(`SELECT * FROM ${tableName}`);

    return progress;
  } catch (error: any) {
    console.error('❌ RS migration error:', error);
    progress.status = 'failed';
    progress.errorMessage = error.message;
    progress.endTime = new Date();
    emitProgress(progress);
    throw error;
  }
}

/**
 * Migrate audit schema tables from MSSQL
 */
export async function migrateAuditTables(
  mssqlPool: sql.ConnectionPool,
  tableName: string,
  batchSize: number = 1000
): Promise<MigrationProgress> {
  const migrationId = `audit_${Date.now()}`;
  const progress: MigrationProgress = {
    migrationId,
    type: 'audit',
    tenantCode: null,
    status: 'running',
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    progress: 0,
    startTime: new Date(),
    batchSize,
  };

  try {
    const countRequest = mssqlPool.request();
    const countResult = await countRequest.query(
      `SELECT COUNT(*) as count FROM audit.${tableName}`
    );
    progress.totalRecords = countResult.recordset[0].count;

    if (progress.totalRecords === 0) {
      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      return progress;
    }

    console.log(`📊 Total audit records to migrate: ${progress.totalRecords} from table: ${tableName}`);

    const request = mssqlPool.request();
    let batch: any[] = [];

    request.stream = true;

    request.on('row', async (row: any) => {
      batch.push(row);

      if (batch.length >= batchSize) {
        request.pause();
        try {
          // Dynamic column mapping for audit tables
          const columns = Object.keys(row).map(col => col.toLowerCase());
          const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
          
          const values = batch.map((r) => {
            const vals: any[] = [];
            for (const col of columns) {
              let value = r[col];
              if (value && (typeof value === 'object' && Buffer.isBuffer(value))) {
                value = convertBinaryToHex(value);
              } else if (typeof value === 'number') {
                value = convertDecimal(value);
              }
              vals.push(value);
            }
            return vals;
          });

          const colNames = columns.join(', ');
          const insertQuery = `INSERT INTO audit."${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

          for (const val of values) {
            try {
              // Use raw query execution via database pool
              await db.execute(insertQuery);
              progress.successCount++;
            } catch (error) {
              console.error('❌ Audit insert error:', error);
              progress.errorCount++;
            }
          }

          progress.processedRecords += batch.length;
          progress.progress = (progress.processedRecords / progress.totalRecords) * 100;
          emitProgress(progress);

          batch = [];
          request.resume();
        } catch (error) {
          console.error('❌ Audit batch error:', error);
          progress.errorCount += batch.length;
          batch = [];
          request.resume();
        }
      }
    });

    request.on('done', async () => {
      if (batch.length > 0) {
        progress.processedRecords += batch.length;
        progress.progress = 100;
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
    });

    request.on('error', (error: any) => {
      console.error('❌ Audit stream error:', error);
      progress.status = 'failed';
      progress.errorMessage = error.message;
      progress.endTime = new Date();
      emitProgress(progress);
    });

    await request.query(`SELECT * FROM audit.${tableName}`);

    return progress;
  } catch (error: any) {
    console.error('❌ Audit migration error:', error);
    progress.status = 'failed';
    progress.errorMessage = error.message;
    progress.endTime = new Date();
    emitProgress(progress);
    throw error;
  }
}

/**
 * Update existing journal entries (incremental sync)
 */
export async function updateJournalEntries(
  mssqlPool: sql.ConnectionPool,
  tenantCode: number,
  companyId: number,
  batchSize: number = 1000
): Promise<MigrationProgress> {
  const migrationId = `update_${Date.now()}`;
  const progress: MigrationProgress = {
    migrationId,
    type: 'general-ledger',
    tenantCode,
    status: 'running',
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    progress: 0,
    startTime: new Date(),
    batchSize,
  };

  try {
    // Get total count
    const countRequest = mssqlPool.request();
    const countResult = await countRequest.query(
      `SELECT COUNT(*) as count FROM GeneralLedger WHERE TenantCode = ${tenantCode}`
    );
    progress.totalRecords = countResult.recordset[0].count;

    if (progress.totalRecords === 0) {
      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      return progress;
    }

    console.log(`📊 Total records to update: ${progress.totalRecords}`);

    // Read and update data
    const query = `SELECT TenantCode, TenantName, Abonent, PostingsPeriod, Register, Branch, Content, ResponsiblePerson, AccountDr, AccountNameDr, AnalyticDr, AnalyticRefDr, IDDr, LegalFormDr, CountryDr, ProfitTaxDr, WithholdingTaxDr, DoubleTaxationDr, PensionSchemeParticipantDr, AccountCr, AccountNameCr, AnalyticCr, AnalyticRefCr, IDCr, LegalFormCr, CountryCr, ProfitTaxCr, WithholdingTaxCr, DoubleTaxationCr, PensionSchemeParticipantCr, Currency, Amount, AmountCur, QuantityDr, QuantityCr, Rate, DocumentRate, TAXInvoiceNumber, TAXInvoiceDate, TAXInvoiceSeries, WaybillNumber, AttachedFiles, DocType, DocDate, DocNumber, DocumentCreationDate, DocumentModifyDate, DocumentComments, PostingNumber FROM GeneralLedger WHERE TenantCode = ${tenantCode} ORDER BY PostingsPeriod, TenantCode`;

    const request = mssqlPool.request();
    let batch: any[] = [];
    let index = 0;

    request.stream = true;

    request.on('row', async (row: any) => {
      batch.push({ row, index: index++ });

      if (batch.length >= batchSize) {
        request.pause();
        try {
          for (const item of batch) {
            const r = item.row;
            const idx = item.index;
            const entryNumber = `GL-${tenantCode}-${String(idx + 1).padStart(6, '0')}`;

            try {
              // Use Drizzle SQL template for proper parameter binding
              await db.execute(drizzleSql`UPDATE journal_entries SET 
                date = ${r.PostingsPeriod || new Date()}, 
                description = ${r.Content || `General Ledger Entry ${idx + 1}`}, 
                total_amount = ${convertDecimal(r.Amount) || 0}, 
                tenant_code = ${r.TenantCode}, 
                tenant_name = ${r.TenantName}, 
                abonent = ${r.Abonent}, 
                postings_period = ${r.PostingsPeriod}, 
                register = ${convertBinaryToHex(r.Register)}, 
                branch = ${r.Branch}, 
                content_text = ${r.Content}, 
                responsible_person = ${r.ResponsiblePerson}, 
                account_dr = ${r.AccountDr}, 
                account_name_dr = ${r.AccountNameDr}, 
                analytic_dr = ${r.AnalyticDr}, 
                analytic_ref_dr = ${convertBinaryToHex(r.AnalyticRefDr)}, 
                id_dr = ${r.IDDr}, 
                legal_form_dr = ${r.LegalFormDr}, 
                country_dr = ${r.CountryDr}, 
                profit_tax_dr = ${convertBinaryToBoolean(r.ProfitTaxDr)}, 
                withholding_tax_dr = ${convertBinaryToBoolean(r.WithholdingTaxDr)}, 
                double_taxation_dr = ${convertBinaryToBoolean(r.DoubleTaxationDr)}, 
                pension_scheme_participant_dr = ${convertBinaryToBoolean(r.PensionSchemeParticipantDr)}, 
                account_cr = ${r.AccountCr}, 
                account_name_cr = ${r.AccountNameCr}, 
                analytic_cr = ${r.AnalyticCr}, 
                analytic_ref_cr = ${convertBinaryToHex(r.AnalyticRefCr)}, 
                id_cr = ${r.IDCr}, 
                legal_form_cr = ${r.LegalFormCr}, 
                country_cr = ${r.CountryCr}, 
                profit_tax_cr = ${convertBinaryToBoolean(r.ProfitTaxCr)}, 
                withholding_tax_cr = ${convertBinaryToBoolean(r.WithholdingTaxCr)}, 
                double_taxation_cr = ${convertBinaryToBoolean(r.DoubleTaxationCr)}, 
                pension_scheme_participant_cr = ${convertBinaryToBoolean(r.PensionSchemeParticipantCr)}, 
                currency = ${r.Currency}, 
                amount = ${convertDecimal(r.Amount)}, 
                amount_cur = ${convertDecimal(r.AmountCur)}, 
                quantity_dr = ${convertDecimal(r.QuantityDr)}, 
                quantity_cr = ${convertDecimal(r.QuantityCr)}, 
                rate = ${convertDecimal(r.Rate)}, 
                document_rate = ${convertDecimal(r.DocumentRate)}, 
                tax_invoice_number = ${r.TAXInvoiceNumber}, 
                tax_invoice_date = ${r.TAXInvoiceDate}, 
                tax_invoice_series = ${r.TAXInvoiceSeries}, 
                waybill_number = ${r.WaybillNumber}, 
                attached_files = ${convertDecimal(r.AttachedFiles)}, 
                doc_type = ${r.DocType}, 
                doc_date = ${r.DocDate}, 
                doc_number = ${r.DocNumber}, 
                document_creation_date = ${r.DocumentCreationDate}, 
                document_modify_date = ${r.DocumentModifyDate}, 
                document_comments = ${r.DocumentComments}, 
                posting_number = ${r.PostingNumber}
              WHERE company_id = ${companyId} AND entry_number = ${entryNumber}`);
              progress.successCount++;
            } catch (error) {
              console.error('❌ Update error:', error);
              progress.errorCount++;
            }
          }

          progress.processedRecords += batch.length;
          progress.progress = (progress.processedRecords / progress.totalRecords) * 100;
          emitProgress(progress);

          batch = [];
          request.resume();
        } catch (error) {
          console.error('❌ Batch error:', error);
          progress.errorCount += batch.length;
          batch = [];
          request.resume();
        }
      }
    });

    request.on('done', async () => {
      if (batch.length > 0) {
        progress.processedRecords += batch.length;
        progress.progress = 100;
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
    });

    request.on('error', (error: any) => {
      console.error('❌ Stream error:', error);
      progress.status = 'failed';
      progress.errorMessage = error.message;
      progress.endTime = new Date();
      emitProgress(progress);
    });

    await request.query(query);

    return progress;
  } catch (error: any) {
    console.error('❌ Update error:', error);
    progress.status = 'failed';
    progress.errorMessage = error.message;
    progress.endTime = new Date();
    emitProgress(progress);
    throw error;
  }
}

/**
 * Get available audit table names with record counts
 */
export async function getAuditTableNames(mssqlPool: sql.ConnectionPool): Promise<Array<{ tableName: string; recordCount: number }>> {
  console.log('\n📋 Fetching audit table names and record counts...');
  
  try {
    const auditTables = [
      '1690Stock',
      'AccountsSummary',
      'AccruedInterest',
      'Analytics',
      'AnalyticsBalanceSummary',
      'CapitalAccounts',
      'CapitalAccountsSummary',
      'CreditorsAvans',
      'DebitorsAvans',
      'DublicateCreditors',
      'DublicateDebitors',
      'HighAmountPerQuantitySummary',
      'NegativCreditor',
      'NegativDebitor',
      'NegativeBalance141Summary',
      'NegativeBalance311Summary',
      'NegativeBalanceSummary',
      'NegativeLoans',
      'NegativeStock',
      'NegativInterest',
      'NegativSalary',
      'PositiveBalanceSummary',
      'RevaluationStatusSummary',
      'SalaryExpense',
      'WriteoffStock',
    ];

    const tables: Array<{ tableName: string; recordCount: number }> = [];

    for (const tableName of auditTables) {
      try {
        const mssqlTableName = wrapMSSQLTableName(tableName);
        const request = mssqlPool.request();
        const result = await request.query(
          `SELECT COUNT(*) as count FROM audit.${mssqlTableName}`
        );
        
        const recordCount = result.recordset[0]?.count || 0;
        tables.push({ tableName, recordCount });
        
        console.log(`   ✅ ${tableName}: ${recordCount} records`);
      } catch (error: any) {
        console.warn(`   ⚠️  Could not get count for ${tableName}:`, error.message);
        tables.push({ tableName, recordCount: 0 });
      }
    }

    console.log(`\n   Total: ${tables.length} audit tables found`);
    return tables;
  } catch (error: any) {
    console.error('\n❌ Failed to get audit table names');
    console.error('   Error:', error.message);
    throw error;
  }
}

/**
 * Convert MSSQL PascalCase table name to PostgreSQL snake_case
 */
function convertTableNameToSnakeCase(tableName: string): string {
  // Handle special cases first
  const specialCases: Record<string, string> = {
    '1690Stock': '1690_stock',
    'AccountsSummary': 'accounts_summary',
    'AccruedInterest': 'accrued_interest',
    'Analytics': 'analytics',
    'AnalyticsBalanceSummary': 'analytics_balance_summary',
    'CapitalAccounts': 'capital_accounts',
    'CapitalAccountsSummary': 'capital_accounts_summary',
    'CreditorsAvans': 'creditors_avans',
    'DebitorsAvans': 'debitors_avans',
    'DublicateCreditors': 'dublicate_creditors',
    'DublicateDebitors': 'dublicate_debitors',
    'HighAmountPerQuantitySummary': 'high_amount_per_quantity_summary',
    'NegativCreditor': 'negativ_creditor',
    'NegativDebitor': 'negativ_debitor',
    'NegativeBalance141Summary': 'negative_balance_141_summary',
    'NegativeBalance311Summary': 'negative_balance_311_summary',
    'NegativeBalanceSummary': 'negative_balance_summary',
    'NegativeLoans': 'negative_loans',
    'NegativeStock': 'negative_stock',
    'NegativInterest': 'negativ_interest',
    'NegativSalary': 'negativ_salary',
    'PositiveBalanceSummary': 'positive_balance_summary',
    'RevaluationStatusSummary': 'revaluation_status_summary',
    'SalaryExpense': 'salary_expense',
    'WriteoffStock': 'writeoff_stock',
  };

  if (specialCases[tableName]) {
    return specialCases[tableName];
  }

  // Fallback: convert PascalCase to snake_case
  return tableName
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert MSSQL PascalCase column name to PostgreSQL snake_case
 */
function convertColumnNameToSnakeCase(columnName: string): string {
  // Handle special patterns
  return columnName
    // Insert underscore before capitals (e.g., TenantCode -> Tenant_Code)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // Handle multiple capitals (e.g., CompanyID -> Company_ID)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    // Convert to lowercase
    .toLowerCase();
}

/**
 * Wrap MSSQL table name in brackets if it starts with a number or contains special chars
 */
function wrapMSSQLTableName(tableName: string): string {
  // If table name starts with a number, wrap in brackets
  if (/^\d/.test(tableName)) {
    return `[${tableName}]`;
  }
  return tableName;
}

/**
 * Migrate single audit schema table from MSSQL to PostgreSQL
 * 
 * @param mssqlPool - MSSQL connection pool
 * @param tableName - MSSQL table name (PascalCase, e.g., "AccountsSummary")
 * @param currentCompanyId - PostgreSQL company ID to associate records with (becomes company_code column)
 * @param batchSize - Number of records to process per batch
 * 
 * @description
 * This function handles the complete migration of an audit table including:
 * 1. Table name conversion: MSSQL PascalCase → PostgreSQL snake_case
 * 2. Column name conversion: TenantCode → tenant_code, CompanyID → company_id
 * 3. Special handling for numeric table names (e.g., 1690Stock → [1690Stock] in MSSQL)
 * 4. Data type conversions (decimal, date, etc.)
 * 
 * @note Column naming:
 * - company_code (INTEGER) = Our PostgreSQL foreign key to companies table (provided as currentCompanyId)
 * - company_id (VARCHAR) = Original MSSQL CompanyID string value from the audit data
 */
export async function migrateAuditSchemaTable(
  mssqlPool: sql.ConnectionPool,
  tableName: string,
  currentCompanyId: number,
  batchSize: number = 5000  // 🚀 Increased from 1000 for better performance
): Promise<MigrationProgress> {
  const migrationId = `audit_${tableName}_${Date.now()}`;
  const pgTableName = convertTableNameToSnakeCase(tableName);
  
  const progress: MigrationProgress = {
    migrationId,
    type: 'audit',
    tenantCode: null,
    tableName: tableName,
    status: 'running',
    totalRecords: 0,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    progress: 0,
    startTime: new Date(),
    batchSize,
  };

  try {
    // Get total count
    console.log(`\n📊 Starting migration of audit.${tableName} → audit.${pgTableName}`);
    
    const mssqlTableName = wrapMSSQLTableName(tableName);
    const countRequest = mssqlPool.request();
    const countResult = await countRequest.query(
      `SELECT COUNT(*) as count FROM audit.${mssqlTableName}`
    );
    progress.totalRecords = countResult.recordset[0]?.count || 0;

    console.log(`   Total records: ${progress.totalRecords}`);

    if (progress.totalRecords === 0) {
      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      return progress;
    }

    // Get column information for dynamic insertion
    const columnsRequest = mssqlPool.request();
    const columnsResult = await columnsRequest.query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'audit' AND TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `);

    const columns = columnsResult.recordset.map((col: any) => ({
      name: col.COLUMN_NAME,
      type: col.DATA_TYPE,
      maxLength: col.CHARACTER_MAXIMUM_LENGTH,
      precision: col.NUMERIC_PRECISION,
      scale: col.NUMERIC_SCALE,
    }));

    console.log(`   MSSQL Columns (${columns.length}): ${columns.map((c: any) => c.name).join(', ')}`);
    console.log(`   PostgreSQL Columns: company_code (FK), ${columns.map((c: any) => convertColumnNameToSnakeCase(c.name)).join(', ')}`);

    // Query all data
    const columnNames = columns.map((c: any) => c.name).join(', ');
    const query = `SELECT ${columnNames} FROM audit.${mssqlTableName} ORDER BY TenantCode`;

    const request = mssqlPool.request();
    let batch: any[] = [];

    request.stream = true;

    request.on('row', async (row: any) => {
      batch.push(row);

      if (batch.length >= batchSize) {
        request.pause();
        try {
          const values = batch.map((r) => {
            // First value is always our company_code (PostgreSQL foreign key)
            const vals: any[] = [currentCompanyId];
            
            // Then add all MSSQL columns (including their CompanyID which becomes company_id)
            for (const col of columns) {
              let value = r[col.name];
              
              // Type conversions
              if (value === null || value === undefined) {
                vals.push(null);
              } else if (col.type === 'decimal' || col.type === 'numeric') {
                vals.push(convertDecimal(value));
              } else if (col.type === 'int') {
                vals.push(Number.isInteger(value) ? value : null);
              } else if (col.type === 'date' || col.type === 'datetime2') {
                vals.push(value instanceof Date ? value : null);
              } else if (col.type === 'nvarchar' || col.type === 'varchar' || col.type === 'char') {
                vals.push(String(value));
              } else if (col.type === 'binary') {
                vals.push(convertBinaryToHex(value));
              } else {
                vals.push(value);
              }
            }
            return vals;
          });

          // Build dynamic column list for insertion (convert to snake_case)
          const columnList = `company_code, ${columns.map((c: any) => convertColumnNameToSnakeCase(c.name)).join(', ')}`;
          
          // 🚀 BATCH INSERT: Build multi-row VALUES clause
          const numColumns = columns.length + 1; // +1 for company_code
          const valueGroups: string[] = [];
          const flatValues: any[] = [];
          let paramCounter = 1;
          
          for (const val of values) {
            const placeholders = val.map(() => `$${paramCounter++}`).join(', ');
            valueGroups.push(`(${placeholders})`);
            flatValues.push(...val);
          }
          
          const insertQuery = `
            INSERT INTO audit."${pgTableName}" (${columnList})
            VALUES ${valueGroups.join(', ')}
            ON CONFLICT DO NOTHING
          `;

          try {
            await pool.query(insertQuery, flatValues);
            progress.successCount += values.length;
          } catch (error) {
            console.error(`❌ Batch insert error for ${pgTableName}:`, error);
            progress.errorCount += values.length;
          }

          progress.processedRecords += batch.length;
          progress.progress = (progress.processedRecords / progress.totalRecords) * 100;
          emitProgress(progress);

          batch = [];
          request.resume();
        } catch (error) {
          console.error(`❌ Batch error for ${tableName}:`, error);
          progress.errorCount += batch.length;
          batch = [];
          request.resume();
        }
      }
    });

    request.on('done', async () => {
      // Process remaining batch
      if (batch.length > 0) {
        try {
          const values = batch.map((r) => {
            // First value is always our company_code (PostgreSQL foreign key)
            const vals: any[] = [currentCompanyId];
            
            // Then add all MSSQL columns (including their CompanyID which becomes company_id)
            for (const col of columns) {
              let value = r[col.name];
              
              if (value === null || value === undefined) {
                vals.push(null);
              } else if (col.type === 'decimal' || col.type === 'numeric') {
                vals.push(convertDecimal(value));
              } else if (col.type === 'int') {
                vals.push(Number.isInteger(value) ? value : null);
              } else if (col.type === 'date' || col.type === 'datetime2') {
                vals.push(value instanceof Date ? value : null);
              } else if (col.type === 'nvarchar' || col.type === 'varchar' || col.type === 'char') {
                vals.push(String(value));
              } else if (col.type === 'binary') {
                vals.push(convertBinaryToHex(value));
              } else {
                vals.push(value);
              }
            }
            return vals;
          });

          const columnList = `company_code, ${columns.map((c: any) => convertColumnNameToSnakeCase(c.name)).join(', ')}`;
          
          // 🚀 BATCH INSERT: Build multi-row VALUES clause
          const valueGroups: string[] = [];
          const flatValues: any[] = [];
          let paramCounter = 1;
          
          for (const val of values) {
            const placeholders = val.map(() => `$${paramCounter++}`).join(', ');
            valueGroups.push(`(${placeholders})`);
            flatValues.push(...val);
          }
          
          const insertQuery = `
            INSERT INTO audit."${pgTableName}" (${columnList})
            VALUES ${valueGroups.join(', ')}
            ON CONFLICT DO NOTHING
          `;

          try {
            await pool.query(insertQuery, flatValues);
            progress.successCount += values.length;
          } catch (error) {
            console.error(`❌ Final batch insert error for ${pgTableName}:`, error);
            progress.errorCount += values.length;
          }

          progress.processedRecords += batch.length;
          progress.progress = 100;
        } catch (error) {
          console.error(`❌ Final batch error for ${pgTableName}:`, error);
          progress.errorCount += batch.length;
        }
      }

      progress.status = 'completed';
      progress.endTime = new Date();
      emitProgress(progress);
      
      console.log(`✅ Migration of ${tableName} → ${pgTableName} completed: ${progress.successCount} success, ${progress.errorCount} errors`);
    });

    request.on('error', (error: any) => {
      console.error(`❌ Stream error for ${tableName}:`, error);
      progress.status = 'failed';
      progress.errorMessage = error.message;
      progress.endTime = new Date();
      emitProgress(progress);
    });

    await request.query(query);

    return progress;
  } catch (error: any) {
    console.error(`❌ Migration error for ${tableName}:`, error);
    progress.status = 'failed';
    progress.errorMessage = error.message;
    progress.endTime = new Date();
    emitProgress(progress);
    throw error;
  }
}

/**
 * Get migration progress emitter for real-time updates
 */
export function getProgressEmitter(): EventEmitter {
  return migrationEmitter;
}

