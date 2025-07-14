"use client";
// NOTE: Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in your .env file for Paystack integration.
// The conversion rate is now fetched from Paystack's transaction initialize endpoint.
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const CRYPTO_OPTIONS = [
  {
    label: 'Bitcoin (BTC)',
    value: 'btc',
    address: 'bc1q3mk9hs692jpm47rq0dxty0rqgslkxxx53eflh7',
    network: 'BTC',
  },
  {
    label: 'Ethereum (ETH)',
    value: 'eth',
    address: '0xBFfe767180Ef4Af4911867b9fEbC7dE2648d322A',
    network: 'ETH',
  },
  {
    label: 'Tether (USDT) - TRC-20',
    value: 'usdt',
    address: 'TSeLmofTazoKcq7nfThYXPDuCuPa5DsdSh',
    network: 'TRC-20',
  },
  {
    label: 'USD Coin (USDC) - BEP-20',
    value: 'usdc',
    address: '0xdbA91F219a0ff6C3122CD0De94879890363Db1b2',
    network: 'BEP-20',
  },
];

const CRYPTO_ICONS = {
  btc: '/assets/btc.svg',
  eth: '/assets/eth.svg',
  usdt: '/assets/usdt.svg',
  usdc: null, // will use inline SVG below
};

const CRYPTO_ICON_BG = {
  btc: '#EAB300',
  eth: '#3C3C3D',
  usdt: '#50AF95',
  usdc: '#2775CA', // fallback blue for USDC
};

export default function DonatePage() {
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [rate, setRate] = useState(null);
  const tweetContainerRef = useRef(null);
  const [tweetLoaded, setTweetLoaded] = useState(false);
  const [crypto, setCrypto] = useState('btc');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Detect when the Twitter widget is loaded
  useEffect(() => {
    setTweetLoaded(false);
    const interval = setInterval(() => {
      if (tweetContainerRef.current && tweetContainerRef.current.querySelector('iframe')) {
        setTweetLoaded(true);
        clearInterval(interval);
      }
    }, 200);
    // Timeout after 10s
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

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

  // Crypto copy handler
  function handleCopyAddress() {
    const selected = CRYPTO_OPTIONS.find(opt => opt.value === crypto);
    if (selected) {
      // Try Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(selected.address)
          .then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 1200);
          })
          .catch(() => fallbackCopy(selected.address));
      } else {
        fallbackCopy(selected.address);
      }
    }
  }

  function fallbackCopy(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 1200);
      } else {
        alert('Copy to clipboard is not supported in this browser.');
      }
    } catch (e) {
      alert('Copy to clipboard is not supported in this browser.');
    }
  }

  return (
    <>
      <div className="donate-root" style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'row', background: '#fff' }}>
        {/* X post (left on desktop, bottom on mobile) */}
        <div className="x-post-section" style={{ flex: 1, background: '#E8F4FD', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, order: 1, paddingTop: 32, paddingBottom: 32 }}>
          <div className="x-post-inner" style={{ maxWidth: 350, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'transparent', minHeight: 320, position: 'relative', margin: '0 auto' }}>
            {/* Placeholder image and shimmer loader, stacked absolutely */}
            <div style={{ width: 340, height: 320, borderRadius: 16, overflow: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto', zIndex: 2, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.4s', opacity: !tweetLoaded && !imageError ? 1 : 0, pointerEvents: !tweetLoaded && !imageError ? 'auto' : 'none' }}>
              <Image
                src="/assets/XPost.png"
                alt="X Post Placeholder"
                fill
                style={{ objectFit: 'cover' }}
                onError={() => setImageError(true)}
              />
            </div>
            {/* Shimmer loader fallback if image fails */}
            <div style={{ width: 340, height: 320, borderRadius: 16, background: '#e5e7eb', overflow: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: 'auto', zIndex: 1, transition: 'opacity 0.4s', opacity: !tweetLoaded && imageError ? 1 : 0, pointerEvents: !tweetLoaded && imageError ? 'auto' : 'none' }}>
              <div className="shimmer" style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
              <style>{`
                @keyframes shimmer {
                  0% { background-position: -200% 0; }
                  100% { background-position: 200% 0; }
                }
              `}</style>
            </div>
            {/* Real X tweet embed (always rendered, hidden until loaded) */}
            {isClient && (
              <div ref={tweetContainerRef} style={{ width: '100%', zIndex: 3, opacity: tweetLoaded ? 1 : 0, transition: 'opacity 0.4s', position: 'relative' }}>
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
                <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>
              </div>
            )}
          </div>
        </div>
        {/* Donation form and crypto section (right on desktop, top on mobile) */}
        <div className="donate-main-section" style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, flexDirection: 'column', order: 2, paddingTop: 32, paddingBottom: 32 }}>
          <div className="donate-section" style={{ width: 400, maxWidth: '90vw', minWidth: 280, padding: 24, border: '1px solid #eee', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', background: '#fff', minHeight: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 16 }}>
            {success ? (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: 64, color: '#e25555', marginBottom: 16 }}>❤️</div>
                <div style={{ fontSize: 22, color: '#222', fontWeight: 600 }}>Thank you for your support!</div>
              </div>
            ) : (
              <>
                <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#222' }}>Donate</h2>
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
          {/* OR separator */}
          <div className="donate-section" style={{ width: 400, maxWidth: '90vw', minWidth: 280, textAlign: 'center', color: '#888', fontWeight: 500, fontSize: 25, margin: '18px 0', letterSpacing: 2 }}>
            — or —
          </div>
          {/* Crypto donation section */}
          <div className="donate-section" style={{ width: 400, maxWidth: '90vw', minWidth: 280, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, marginTop: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 12, color: '#222' }}>Donate with Crypto</div>
            <div style={{ marginBottom: 10 }}>
              <select value={crypto} onChange={e => setCrypto(e.target.value)} style={{ fontSize: 16, padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', color: '#222', width: '100%' }}>
                {CRYPTO_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 15, background: '#fff', borderRadius: 6, padding: '10px 12px', wordBreak: 'break-all', border: '1px solid #e5e7eb', color: '#222', flex: 1, display: 'flex', alignItems: 'center' }}>
                <span style={{ background: CRYPTO_ICON_BG[crypto], borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, minWidth: 28, minHeight: 28, marginRight: 8 }}>
                  {crypto === 'usdc' ? (
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="16" fill="#2775CA"/>
                      <text x="16" y="22" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold">$</text>
                    </svg>
                  ) : (
                    <Image src={CRYPTO_ICONS[crypto]} alt={crypto.toUpperCase()} width={20} height={20} style={{ verticalAlign: 'middle' }} />
                  )}
                </span>
                {CRYPTO_OPTIONS.find(opt => opt.value === crypto)?.address}
              </div>
              <button type="button" onClick={handleCopyAddress} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 2 }} title="Copy address">
                <svg width="22" height="22" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
              </button>
              {copySuccess && <span style={{ color: '#22c55e', fontSize: 13, marginLeft: 4 }}>Copied!</span>}
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>Network: {CRYPTO_OPTIONS.find(opt => opt.value === crypto)?.network}</div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          .donate-root {
            flex-direction: column !important;
            min-height: 100vh;
            width: 100vw;
            overflow-y: auto;
            background: #E8F4FD !important;
          }
          .donate-main-section {
            background: #E8F4FD !important;
          }
          .donate-section {
            width: 92vw !important;
            max-width: 92vw !important;
            min-width: 0 !important;
            margin: 0 auto 14px auto !important;
            border-radius: 12px !important;
            padding: 12px !important;
            font-size: 15px !important;
          }
          .x-post-section {
            margin-bottom: 32px !important;
            order: 2 !important;
            width: 100vw !important;
            justify-content: center !important;
            align-items: center !important;
            display: flex !important;
          }
          .x-post-inner {
            width: 92vw !important;
            max-width: 350px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .x-post-inner blockquote {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .donate-main-section {
            order: 1 !important;
          }
        }
      `}</style>
    </>
  );
} 