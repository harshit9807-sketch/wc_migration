const axios = require('axios');

async function testConnection() {
    // Test source connection
    try {
        const sourceAPI = axios.create({
            baseURL: process.env.SOURCE_URL,
            auth: {
                username: process.env.SOURCE_CONSUMER_KEY,
                password: process.env.SOURCE_CONSUMER_SECRET
            }
        });
        
        const response = await sourceAPI.get('/wp-json/wc/v3/products?per_page=1');
        console.log('✓ Source connection successful');
        console.log(`Total products: ${response.headers['x-wp-total']}`);
    } catch (error) {
        console.log('✗ Source connection failed:', error.message);
    }
    
    // Test target connection
    try {
        const targetAPI = axios.create({
            baseURL: process.env.TARGET_URL,
            auth: {
                username: process.env.TARGET_CONSUMER_KEY,
                password: process.env.TARGET_CONSUMER_SECRET
            }
        });
        
        const response = await targetAPI.get('/wp-json/wc/v3/products?per_page=1');
        console.log('✓ Target connection successful');
    } catch (error) {
        console.log('✗ Target connection failed:', error.message);
    }
}

testConnection();