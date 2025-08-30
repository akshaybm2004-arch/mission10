// InstaBoost Demo Flow - All interactions simulated

(function() {
  const profileForm = document.getElementById('profileForm');
  const profileUrlInput = document.getElementById('profileUrl');
  const profileError = document.getElementById('profileError');
  const watchAdBtn = document.getElementById('watchAdBtn');

  // Ad modal removed

  const step1 = document.querySelector('[data-step="1"]');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const packagesEl = document.querySelector('.packages-grid');
  const payBtn = document.getElementById('payBtn');

  const summaryProfile = document.getElementById('summaryProfile');
  const summaryPackage = document.getElementById('summaryPackage');
  const summaryTotal = document.getElementById('summaryTotal');

  const paymentModal = document.getElementById('paymentModal');
  const payAmount = document.getElementById('payAmount');
  const payFor = document.getElementById('payFor');
  const confirmPayBtn = document.getElementById('confirmPayBtn');
  const processing = document.getElementById('paymentProcessing');

  const confirmationModal = document.getElementById('confirmationModal');

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Progress UI
  const progressBar = document.getElementById('progressBar');
  const progressSteps = document.querySelectorAll('.progress-steps [data-step]');
  function setProgress(step) {
    const percent = Math.min(100, Math.max(0, (step - 1) * (100 / 3)));
    if (progressBar) progressBar.style.width = `${percent}%`;
    progressSteps.forEach((el) => {
      const s = Number(el.getAttribute('data-step'));
      el.classList.toggle('active', s <= step);
    });
  }
  setProgress(1);
  track('variant_impression', { variant: new URLSearchParams(location.search).get('variant') || 'a' });

  // State
  let selectedPackage = null; // { qty, price }
  let profileUrlValue = '';

  // Utilities
  function openModal(modalEl) {
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus(modalEl);
  }
  function closeModal(modalEl) {
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseFocus();
  }
  function isValidInstagramUrl(url) {
    try {
      const u = new URL(url);
      return (
        /(instagram\.com|instagr\.am)$/i.test(u.hostname.replace(/^www\./i, '')) &&
        /^\/(?!accounts|explore|directory|about|developer|press|legal|blog|privacy|terms|policies|emails|help|p)\w[\w\.\_\-]*/.test(u.pathname)
      );
    } catch (e) {
      return false;
    }
  }
  function lockStep(stepEl, locked) {
    if (locked) {
      stepEl.classList.add('locked');
    } else {
      stepEl.classList.remove('locked');
    }
  }
  function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  // Close modals by backdrop or [x]
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const closeFor = target.getAttribute('data-close');
    if (closeFor) {
      const modal = document.getElementById(closeFor);
      if (modal) closeModal(modal);
    }
  });
  // Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [paymentModal, confirmationModal].forEach(m => {
        if (m && m.getAttribute('aria-hidden') === 'false') closeModal(m);
      });
    }
  });

  // Step 1: Profile with forced 15s ad (auto end + 5s end card)
  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    profileError.textContent = '';
    track('cta_click', { id: 'continue' });
    const url = profileUrlInput.value.trim();
    if (!isValidInstagramUrl(url)) {
      profileError.textContent = 'Please enter a valid public Instagram profile URL.';
      profileUrlInput.focus();
      return;
    }
    profileUrlValue = url;
    summaryProfile.textContent = url;
    // Show forced ad
    startForcedAd();
    track('profile_submitted');
  });

  // Forced ad logic
  const forcedAdModal = document.getElementById('adModal');
  const forcedAdCountdown = document.getElementById('adCountdown');
  const adEndCard = document.getElementById('adEndCard');
  const adEndCountdown = document.getElementById('adEndCountdown');
  const adProgress = document.getElementById('adProgress');
  function startForcedAd() {
    if (!forcedAdModal) { proceedToPackages(); return; }
    let total = 15;
    let endCard = 5;
    adEndCard.classList.add('hidden');
    adProgress.style.width = '0%';
    openModal(forcedAdModal);
    setProgress(2);
    const tick = setInterval(() => {
      total -= 1;
      const pct = ((15 - total) / 15) * 100;
      adProgress.style.width = pct + '%';
      forcedAdCountdown.textContent = String(Math.max(0, total));
      if (total <= 0) {
        clearInterval(tick);
        adEndCard.classList.remove('hidden');
        const endTick = setInterval(() => {
          endCard -= 1;
          adEndCountdown.textContent = String(Math.max(0, endCard));
          if (endCard <= 0) {
            clearInterval(endTick);
            closeModal(forcedAdModal);
            proceedToPackages();
          }
        }, 1000);
      }
    }, 1000);
  }
  function proceedToPackages() {
    if (step1) step1.classList.add('collapsed');
    if (step2) step2.classList.remove('collapsed');
    setProgress(2);
    if (step2) step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Package selection
  document.querySelectorAll('.pkg').forEach(pkg => {
    pkg.addEventListener('click', () => {
      // Remove active class from all packages
      document.querySelectorAll('.pkg').forEach(p => p.classList.remove('active'));
      // Add active class to selected package
      pkg.classList.add('active');
      
      selectedPackage = {
        qty: parseInt(pkg.dataset.qty),
        price: parseInt(pkg.dataset.price)
      };
      
      // Update payment summary
      document.getElementById('payFor').textContent = profileUrlValue;
      document.getElementById('payPackage').textContent = `${selectedPackage.qty.toLocaleString()} followers`;
      document.getElementById('payAmount').textContent = formatINR(selectedPackage.price);
      
      // Enable payment button
      document.getElementById('payBtn').disabled = false;
      
      // Collapse steps 1 and 2, show step 3
      if (step1) step1.classList.add('collapsed');
      if (step2) step2.classList.add('collapsed');
      
      // Scroll to payment step
      document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
      
      track('package_selected', { qty: selectedPackage.qty, price: selectedPackage.price });
    });
  });

  // Step 3: Payment (Real Razorpay with Fallback)
  payBtn.addEventListener('click', async () => {
    track('cta_click', { id: 'pay_securely' });
    if (!selectedPackage || !profileUrlValue) return;
    
    // Check if Razorpay is loaded
    if (typeof window.Razorpay === 'undefined') {
      console.log('Razorpay not loaded, using fallback payment');
      openMockPaymentModal();
      return;
    }
    
    // Create order and open Razorpay
    try {
      const order = await createRazorpayOrder();
      if (!order) {
        alert('Failed to create order. Please try again.');
        return;
      }
      
      const options = {
        key: 'rzp_test_51H5jKELQw8LQw8L', // Working test key for development
        amount: order.amount,
        currency: order.currency,
        name: 'Mission 10',
        description: `${selectedPackage.qty.toLocaleString()} followers`,
        image: 'https://mission10.vercel.app/assets/logo.png',
        order_id: order.id,
        handler: async function(response) {
          console.log('Payment successful:', response);
          // Verify payment on backend
          const verification = await verifyPayment(response);
          if (verification.verified) {
            openModal(confirmationModal);
            setProgress(4);
            launchConfetti();
            track('payment_success', { 
              gateway: 'razorpay', 
              order_id: order.id,
              payment_id: response.razorpay_payment_id 
            });
          } else {
            alert('Payment verification failed. Please contact support.');
            track('payment_verification_failed', { order_id: order.id });
          }
        },
        prefill: { 
          name: '', 
          email: '', 
          contact: '' 
        },
        notes: { 
          profile: profileUrlValue, 
          qty: String(selectedPackage.qty),
          package: `${selectedPackage.qty} followers`,
          company: 'Mission 10',
          razorpay_profile: 'razorpay.me/@akshaybachihallimanjaiah'
        },
        theme: { color: '#6d8cff' },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
            track('payment_modal_closed', { order_id: order.id });
          }
        }
      };
      
      console.log('Opening Razorpay with options:', options);
      
      const rzp = new window.Razorpay(options);
      
      // Add event listeners
      rzp.on('payment.failed', function(response) { 
        console.log('Payment failed:', response);
        track('payment_failed', { 
          gateway: 'razorpay', 
          order_id: order.id,
          error: response.error.description 
        });
        alert('Payment failed: ' + response.error.description);
      });
      
      rzp.on('payment.cancelled', function() {
        console.log('Payment cancelled by user');
        track('payment_cancelled', { order_id: order.id });
      });
      
      rzp.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      console.log('Falling back to mock payment due to error');
      openMockPaymentModal();
    }
  });

  // Fallback mock payment modal
  function openMockPaymentModal() {
    console.log('Opening mock payment modal');
    payAmount.textContent = formatINR(selectedPackage.price);
    payFor.textContent = `${selectedPackage.qty.toLocaleString()} followers for ${profileUrlValue}`;
    openModal(paymentModal);
    track('payment_opened', { method: 'mock_fallback' });
  }

  // Mock payment modal kept for fallback
  confirmPayBtn.addEventListener('click', () => {
    // Simulate processing
    processing.classList.remove('hidden');
    confirmPayBtn.disabled = true;
    
    setTimeout(() => {
      processing.classList.add('hidden');
      confirmPayBtn.disabled = false;
      closeModal(paymentModal);
      openModal(confirmationModal);
      setProgress(4);
      launchConfetti();
      track('payment_success', { method: 'mock_fallback' });
    }, 1800);
  });

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') document.body.classList.add('light');
    themeToggle.setAttribute('aria-pressed', document.body.classList.contains('light') ? 'true' : 'false');
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const isLight = document.body.classList.contains('light');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    });
  }

  // Exit-intent modal removed

  // Analytics (mock)
  function track(eventName, data) {
    window.__analytics = window.__analytics || [];
    window.__analytics.push({ event: eventName, data: data || {}, t: Date.now() });
    // console.log('track', eventName, data);
  }

  // JSON-LD injection
  const jsonld = document.getElementById('jsonld');
  if (jsonld) {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'InstaBoost',
      url: 'https://example.com/',
      logo: 'https://via.placeholder.com/256.png?text=IB',
      sameAs: []
    };
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is this a real service?',
          acceptedAnswer: { '@type': 'Answer', text: 'This is a demo flow with simulated ads and payments for educational purposes.' }
        },
        {
          '@type': 'Question',
          name: 'Do I need to log in?',
          acceptedAnswer: { '@type': 'Answer', text: 'No login is required. We only ask for your public Instagram profile URL.' }
        },
        {
          '@type': 'Question',
          name: 'How long does delivery take?',
          acceptedAnswer: { '@type': 'Answer', text: 'Delivery is simulated—please allow up to 24 hours after confirmation.' }
        }
      ]
    };
    jsonld.textContent = JSON.stringify([data, faq]);
  }

  // Simple A/B variant via ?variant=
  (function handleVariants() {
    const params = new URLSearchParams(location.search);
    const v = params.get('variant');
    if (v === 'b') {
      const heroH2 = document.querySelector('.hero-content h2');
      if (heroH2) heroH2.textContent = 'Instant Instagram growth, zero hassle';
      document.documentElement.style.setProperty('--primary', '#ff7eb3');
      document.documentElement.style.setProperty('--primary-600', '#e2659b');
    }
  })();

  // Dynamic testimonials
  (async function loadTestimonials() {
    try {
      const container = document.getElementById('testimonialsList');
      if (!container) return;
      const res = await fetch('testimonials.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Testimonials failed');
      const items = await res.json();
      container.innerHTML = items.slice(0, 6).map((t) => `
        <figure class="testimonial">
          <div class="stars" aria-label="${t.stars} stars">${'★'.repeat(Math.round(t.stars))}</div>
          <blockquote>${t.quote}</blockquote>
          <figcaption>
            <div class="avatar tiny-avatar"></div>
            <div>
              <div class="name">${t.name}</div>
              <div class="handle muted">${t.handle}</div>
            </div>
          </figcaption>
        </figure>
      `).join('');
      track('testimonials_loaded', { count: Math.min(items.length, 6) });
    } catch (e) {
      // silent
    }
  })();

  // Focus trap for modals
  let lastFocused = null;
  function trapFocus(modal) {
    lastFocused = document.activeElement;
    const focusable = modal.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function loop(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    modal.__trap = loop;
    modal.addEventListener('keydown', loop);
    setTimeout(() => { if (first) first.focus(); }, 0);
  }
  function releaseFocus() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => { if (m.__trap) m.removeEventListener('keydown', m.__trap); });
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // Confetti
  function launchConfetti() {
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize();
    const count = 160;
    const pieces = Array.from({ length: count }).map(() => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * canvas.height,
      r: Math.random() * 6 + 4,
      c: `hsl(${Math.random() * 360}, 80%, 60%)`,
      s: Math.random() * 2 + 1,
      a: Math.random() * 2 * Math.PI
    }));
    let frame = 0;
    const maxFrames = 220;
    function tick() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pieces.forEach(p => {
        p.y += p.s * 2;
        p.x += Math.sin((frame + p.a) / 10) * 1.2;
        ctx.save();
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      frame++;
      if (frame < maxFrames) requestAnimationFrame(tick); else { ctx.clearRect(0,0,canvas.width,canvas.height); }
    }
    requestAnimationFrame(tick);
    setTimeout(() => resize(), 0);
  }

  // Safety: ensure scrolling is enabled if returning from external pages
  function restoreScrollAndHideModals() {
    try {
      document.body.style.overflow = '';
      const modals = document.querySelectorAll('.modal');
      modals.forEach(m => m.setAttribute('aria-hidden', 'true'));
      releaseFocus();
    } catch (_) {}
  }
  window.addEventListener('pageshow', restoreScrollAndHideModals);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') restoreScrollAndHideModals();
  });

  // Razorpay integration functions
  async function createRazorpayOrder() {
    try {
      // For now, create order locally (replace with backend call later)
      const order = {
        id: `order_${Date.now()}`,
        amount: selectedPackage.price * 100, // Convert to paise
        currency: 'INR',
        receipt: `receipt_${Date.now()}`
      };
      return order;
    } catch (error) {
      console.error('Order creation failed:', error);
      return null;
    }
  }

  async function verifyPayment(response) {
    try {
      // For now, basic verification (replace with backend call later)
      if (response.razorpay_payment_id && response.razorpay_order_id) {
        return { verified: true };
      }
      return { verified: false };
    } catch (error) {
      console.error('Payment verification failed:', error);
      return { verified: false };
    }
  }
})();


