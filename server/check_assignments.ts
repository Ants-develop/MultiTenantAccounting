
import { pool } from "./db";

async function checkAssignments() {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT * FROM user_companies WHERE user_id = 1');
            console.log(JSON.stringify(res.rows, null, 2));
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await pool.end();
    }
}

checkAssignments();
