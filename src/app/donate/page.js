"use client";
// NOTE: Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in your .env file for Paystack integration.
// The conversion rate is now fetched from Paystack's transaction initialize endpoint.
import { useState } from 'react';

export default function DonatePage() {
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rate, setRate] = useState(null);

  async function fetchRate(usdAmount) {
    try {
      const res = await fetch('/api/paystack-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: usdAmount }),
      });
      const data = await res.json();
      return data.rate || 1500;
    } catch (e) {
      return 1500;
    }
  }

  function loadPaystackScript() {
    if (document.getElementById('paystack-js')) return;
    const script = document.createElement('script');
    script.id = 'paystack-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    document.body.appendChild(script);
  }

  if (typeof window !== 'undefined') loadPaystackScript();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amount || isNaN(amount) || Number(amount) < 0.01) {
      setError('Please enter an amount greater than $0.01.');
      return;
    }
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter your email address so we can complete your donation.');
      return;
    }
    setLoading(true);
    let usdToNgn = rate;
    if (!usdToNgn) {
      usdToNgn = await fetchRate(amount);
      setRate(usdToNgn);
    }
    const ngnAmount = Math.round(Number(amount) * usdToNgn * 100);
    if (ngnAmount < 10000) { // 10000 kobo = ₦100
      setError('Minimum donation is ₦100 (about $0.07). Please increase your amount.');
      setLoading(false);
      return;
    }
    if (!window.PaystackPop) {
      setError('Paystack script not loaded.');
      setLoading(false);
      return;
    }
    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email,
      amount: ngnAmount,
      currency: 'NGN',
      callback: function(response) {
        setSuccess(true);
        setLoading(false);
      },
      onClose: function() {
        setLoading(false);
      },
    });
    handler.openIframe();
  };

  // Fetch rate when amount changes
  async function handleAmountChange(e) {
    setAmount(e.target.value);
    setRate(null);
    if (e.target.value && !isNaN(e.target.value) && Number(e.target.value) > 0) {
      const newRate = await fetchRate(e.target.value);
      setRate(newRate);
    }
  }

  async function handleEmailChange(e) {
    setEmail(e.target.value);
  }

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'row', background: '#fff' }}>
      {/* Left: Blue with X tweet placeholder */}
      <div style={{ flex: 1, background: '#E8F4FD', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ maxWidth: 350, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'transparent' }}>
          {/* Real X tweet embed */}
          <blockquote className="twitter-tweet" data-theme="dark">
            <p lang="en" dir="ltr">
              👋Building an AI Gmail assistant that:<br/>
              • Auto-categorizes emails into clean labels<br/>
              • auto-responds to your messages<br/>
              • Generates summaries of your emails using AI<br/><br/>
              Think ChatGPT managing your entire inbox while you focus on what matters.
              <a href="https://twitter.com/hashtag/buildinpublic?src=hash&amp;ref_src=twsrc%5Etfw">#buildinpublic</a> <a href="https://twitter.com/hashtag/AI?src=hash&amp;ref_src=twsrc%5Etfw">#AI</a> <a href="https://twitter.com/hashtag/Gmail?src=hash&amp;ref_src=twsrc%5Etfw">#Gmail</a> <a href="https://twitter.com/hashtag/Productivity?src=hash&amp;ref_src=twsrc%5Etfw">#Productivity</a>
            </p>
            &mdash; victorrr (@victorrrolu) <a href="https://twitter.com/victorrrolu/status/1944545946882449650?ref_src=twsrc%5Etfw">July 13, 2025</a>
          </blockquote>
          <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
        </div>
      </div>
      {/* Right: Donation form or thank you */}
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ width: 400, maxWidth: '90vw', padding: 24, border: '1px solid #eee', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {success ? (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: 64, color: '#e25555', marginBottom: 16 }}>❤️</div>
              <div style={{ fontSize: 22, color: '#222', fontWeight: 600 }}>Thank you for your support!</div>
            </div>
          ) : (
            <>
              <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#222' }}>Donate to my SaaS ❤️</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="amount" style={{ display: 'block', marginBottom: 4, color: '#333' }}>Amount (USD)</label>
                  <input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={handleAmountChange}
                    style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#333' }}
                    placeholder="Enter amount in USD"
                    disabled={loading}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: 4, color: '#333' }}>Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#333' }}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
                {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
                <button type="submit" style={{ width: '100%', padding: 10, fontSize: 16, background: '#0070f3', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }} disabled={loading}>
                  {loading ? 'Processing...' : 'Donate'}
                </button>
              </form>
              <div style={{ marginTop: 16, fontSize: 14, color: '#555', textAlign: 'center' }}>
                {false && rate && amount && !isNaN(amount) && Number(amount) > 0 ? (
                  <>
                    You will be charged <b>₦{(Number(amount) * rate).toLocaleString()}</b><br/>
                    <span style={{ fontSize: 13, color: '#888' }}>
                      (Live Paystack rate: ₦{rate}/$1)
                    </span>
                  </>
                ) : null}
                <div style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 6 }}>
                  Currency is converted to receiver&apos;s local currency
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 