// ==============================================================================
// UniBox League 2026 - Neon Serverless PostgreSQL Database Connector
// Website: https://neon.tech
// ==============================================================================

// 1. NEON POSTGRES CREDENTIALS
// Paste your Neon Database URL from Neon Dashboard (SQL Console -> Connection Details):
// Example: 'postgres://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require'
const NEON_DATABASE_URL = 'YOUR_NEON_DATABASE_URL';

// 2. HELPER TO CHECK IF NEON IS CONFIGURED
const isNeonConfigured = () => {
    return NEON_DATABASE_URL && 
           NEON_DATABASE_URL !== 'YOUR_NEON_DATABASE_URL' &&
           NEON_DATABASE_URL.includes('neon.tech');
};

// 3. NEON HTTP QUERY EXECUTOR
async function queryNeon(sqlQuery, params = []) {
    if (!isNeonConfigured()) {
        throw new Error('Neon database URL is not configured.');
    }

    // Convert standard postgres connection string to Neon HTTP query endpoint
    // Endpoint: https://<host>/sql
    let urlString = NEON_DATABASE_URL;
    if (urlString.startsWith('postgres://') || urlString.startsWith('postgresql://')) {
        const urlObj = new URL(urlString);
        const host = urlObj.hostname;
        const password = urlObj.password;
        urlString = `https://${host}/sql`;
    }

    const response = await fetch(urlString, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NEON_DATABASE_URL}`
        },
        body: JSON.stringify({
            query: sqlQuery,
            params: params
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Neon DB Error (${response.status}): ${errText}`);
    }

    return await response.json();
}

// 4. NEON DB API INTERFACE
const UniBoxNeonDb = {
    isConfigured: isNeonConfigured,
    query: queryNeon,

    // Execute raw SQL query directly on Neon
    executeSql: async (query, params = []) => {
        try {
            const res = await queryNeon(query, params);
            return { data: res.rows || res, error: null };
        } catch (err) {
            console.warn('Neon DB execution warning:', err);
            return { data: null, error: err };
        }
    }
};

// Export to global window
if (typeof window !== 'undefined') {
    window.UniBoxNeonDb = UniBoxNeonDb;
}
