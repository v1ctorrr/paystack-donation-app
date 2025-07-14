export async function POST(req) {
  try {
    const { amount } = await req.json();
    if (!amount) {
      return new Response(JSON.stringify({ error: 'Missing amount field' }), { status: 400 });
    }
    
    // Use a free exchange rate API to get USD to NGN rate
    const exchangeRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!exchangeRes.ok) {
      return new Response(JSON.stringify({ rate: 1500, fallback: true }), { status: 200 });
    }
    
    const data = await exchangeRes.json();
    const rate = Math.round(data?.rates?.NGN || 1500);
    
    return new Response(JSON.stringify({ rate }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', details: err.message }), { status: 500 });
  }
} 