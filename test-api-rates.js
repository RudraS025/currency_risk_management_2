// Test script to check API response
async function testAPI() {
    try {
        const response = await fetch('http://localhost:3000/api/currency-rates');
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        // Check specific rates
        console.log('\nCurrency Rates:');
        data.rates.forEach(rate => {
            console.log(`${rate.pair}: ${rate.spotRate} (Forward 90D: ${rate.forwardRate90D})`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testAPI();
