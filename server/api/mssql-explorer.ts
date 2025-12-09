import express from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { connections, insertConnectionSchema, type Connection } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import sql from "mssql";
import { Client } from "ssh2";

const router = express.Router();

router.use(requireAuth);

// --- Connection Management ---

// List all saved connections
router.get("/connections", async (req, res) => {
    try {
        const type = req.query.type as string; // Optional filter

        let query = db.select().from(connections).orderBy(desc(connections.createdAt));

        if (type) {
            query = db.select().from(connections).where(eq(connections.type, type)).orderBy(desc(connections.createdAt));
        }

        const allConnections = await query;

        // Mask passwords/keys
        const safeConnections = allConnections.map(conn => ({
            ...conn,
            password: conn.password ? "***" : null,
            privateKey: conn.privateKey ? "***" : null,
            passwordSet: !!conn.password,
            privateKeySet: !!conn.privateKey
        }));

        res.json(safeConnections);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new connection
router.post("/connections", async (req, res) => {
    try {
        const data = insertConnectionSchema.parse(req.body);

        const [newConnection] = await db
            .insert(connections)
            .values(data)
            .returning();

        res.json({
            ...newConnection,
            password: "***",
            privateKey: "***",
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a connection
router.delete("/connections/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.delete(connections).where(eq(connections.id, parseInt(id)));
        res.json({ message: "Connection deleted" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// --- Connection Logic & Testing ---

async function getMssqlPool(config: any) {
    const sqlConfig: sql.config = {
        user: config.username,
        password: config.password,
        database: config.database,
        server: config.server,
        port: config.port || 1433,
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        },
        options: {
            encrypt: config.encrypt !== false,
            trustServerCertificate: config.trustServerCertificate !== false
        }
    };
    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    return pool;
}

async function testSshConnection(config: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.exec('uptime', (err, stream) => {
                if (err) {
                    conn.end();
                    return reject(err);
                }
                let output = '';
                stream.on('close', () => {
                    conn.end();
                    resolve(`SSH Ready. Uptime: ${output.trim()}`);
                }).on('data', (data: any) => {
                    output += data;
                }).stderr.on('data', (data: any) => {
                    output += data;
                });
            });
        }).on('error', (err) => {
            reject(err);
        }).connect({
            host: config.server,
            port: config.port || 22,
            username: config.username,
            password: config.password,
            privateKey: config.privateKey,
            readyTimeout: 20000 // 20s timeout
        });
    });
}

// Test a connection (can be saved or ephemeral)
router.post("/test", async (req, res) => {
    try {
        const config = req.body;
        const type = config.type || 'mssql';

        if (type === 'mssql') {
            let pool;
            try {
                pool = await getMssqlPool(config);
                const result = await pool.request().query("SELECT @@VERSION as version");
                res.json({
                    success: true,
                    message: "Connected successfully",
                    version: result.recordset[0].version
                });
            } finally {
                if (pool) await pool.close();
            }
        } else if (type === 'ssh') {
            const message = await testSshConnection(config);
            res.json({
                success: true,
                message: "SSH Connection Successful",
                version: message
            });
        } else {
            throw new Error(`Unknown connection type: ${type}`);
        }

    } catch (error: any) {
        console.error("Connection test error:", error);
        res.status(400).json({
            success: false,
            message: error.message,
            code: error.code
        });
    }
});

// --- MSSQL Data Explorer (Specific to MSSQL) ---

router.get("/:id/tables", async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        const [savedConn] = await db.select().from(connections)
            .where(and(eq(connections.id, parseInt(id)), eq(connections.type, 'mssql')))
            .limit(1);

        if (!savedConn) return res.status(404).json({ message: "Connection not found or not MSSQL" });

        pool = await getMssqlPool(savedConn);

        const result = await pool.request().query(`
            SELECT 
                t.name,
                s.name AS schema_name,
                SUM(p.rows) AS row_count
            FROM 
                sys.tables t
            INNER JOIN 
                sys.schemas s ON t.schema_id = s.schema_id
            INNER JOIN      
                sys.partitions p ON t.object_id = p.object_id
            WHERE 
                p.index_id < 2
            GROUP BY 
                t.name, s.name
            ORDER BY 
                s.name, t.name
        `);

        res.json(result.recordset);
    } catch (error: any) {
        console.error("List tables error:", error);
        res.status(500).json({ message: error.message });
    } finally {
        if (pool) await pool.close();
    }
});

router.post("/:id/query", async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        const { query } = req.body;

        const [savedConn] = await db.select().from(connections)
            .where(and(eq(connections.id, parseInt(id)), eq(connections.type, 'mssql')))
            .limit(1);

        if (!savedConn) return res.status(404).json({ message: "Connection not found or not MSSQL" });

        pool = await getMssqlPool(savedConn);

        const request = pool.request();
        const result = await request.query(query);

        res.json({
            rows: result.recordset,
            rowsAffected: result.rowsAffected,
            columns: result.recordset && result.recordset.length > 0 ? Object.keys(result.recordset[0]) : []
        });

    } catch (error: any) {
        console.error("Query error:", error);
        res.status(400).json({ message: error.message });
    } finally {
        if (pool) await pool.close();
    }
});

export default router;
