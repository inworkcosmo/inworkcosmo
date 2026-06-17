// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5EVkg2K1YoP65Ej3HBGgfHDBOOwnKbSs",
  authDomain: "inworkcosmo.firebaseapp.com",
  projectId: "inworkcosmo",
  storageBucket: "inworkcosmo.firebasestorage.app",
  messagingSenderId: "384225621712",
  appId: "1:384225621712:web:5767b990f5b588a43350d5",
  measurementId: "G-TJH9MJCZHC"
};

// Initialize Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Global State for current subscription purchase
let activePlanId = '';
let activePlanName = '';

document.addEventListener('DOMContentLoaded', () => {
    // Modal Close Button Logic
    const modal = document.getElementById('subscription-modal');
    const form = document.getElementById('subscription-form');
    const closeBtn = document.getElementById('close-modal-btn');

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (form && modal) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            modal.classList.remove('active');
            
            const name = document.getElementById('user-name').value;
            const email = document.getElementById('user-email').value;
            const company = document.getElementById('user-company').value;
            const mobile = document.getElementById('user-mobile').value;

            await processSubscription({
                name,
                email,
                company,
                mobile,
                planId: activePlanId,
                planName: activePlanName
            });
        });
    }

    // Reveal Animations on Scroll
    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => revealObserver.observe(el));

    // Smooth Scroll for Navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                const headerOffset = 100;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Sticky Header Scroll Effect
    const header = document.querySelector('.nav-bar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.height = '70px';
            header.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
        } else {
            header.style.height = '80px';
            header.style.boxShadow = 'none';
        }
    });
});

// Tab Content Data
const suiteData = {
    recruit: {
        title: "Recruit Dashboard",
        desc: "The mission control for your hiring team. Manage thousands of applications, automate communications, and generate deep-dive performance reports instantly.",
        features: ["Automated Pipeline Management", "Built-in Offer Letter Engine", "Advanced Export & Analytics"],
        img: "./src/images/app_recruit.png"
    },
    candidate: {
        title: "Candidate Portal",
        desc: "A premium, mobile-first experience that treats candidates like customers. Multi-step profiles, real-time tracking, and zero-friction applications.",
        features: ["Native-Level Mobile UX", "Interactive Status Timeline", "One-Click Documentation"],
        img: "./src/images/app_candidate.png"
    },
    share: {
        title: "Share Portal",
        desc: "Collaborative hiring made professional. Securely share read-only candidate snapshots with stakeholders. No more messy email attachments.",
        features: ["Secure Token Links", "Inline Document Preview", "Feedback Collection Bridge"],
        img: "./src/images/app_share.png"
    },
};

function switchTab(tabKey) {
    const data = suiteData[tabKey];
    if (!data) return;

    // Update Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(tabKey)) {
            btn.classList.add('active');
        }
    });

    // Animate Content Out
    const content = document.getElementById('tab-content');
    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';

    setTimeout(() => {
        // Update Text & List
        document.getElementById('tab-title').innerText = data.title;
        document.getElementById('tab-desc').innerText = data.desc;
        document.getElementById('tab-img').src = data.img;

        const featuresList = document.getElementById('tab-features');
        featuresList.innerHTML = data.features.map(f => `
            <li style="display: flex; align-items: center; gap: 1rem; font-weight: 600; font-size: 0.95rem;">
                <i class="fas fa-check-circle" style="color: var(--primary);"></i> ${f}
            </li>
        `).join('');

        // Animate Content In
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 250);
}

async function payNow(planName, amount) {
    try {
        // STEP 1: Create Order on the Backend
        const orderResponse = await fetch('/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount * 100, // paise
                currency: 'INR',
                receipt: `receipt_${planName.toLowerCase()}_${Date.now()}`
            })
        });

        const contentType = orderResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await orderResponse.text();
            console.error('Non-JSON response received:', text);
            throw new Error(`Server returned non-JSON response (${orderResponse.status}). Please check Vercel logs.`);
        }

        const orderData = await orderResponse.json();

        if (!orderResponse.ok) {
            throw new Error(orderData.error || 'Failed to create order');
        }

        // STEP 2: Open Razorpay Checkout Modal
        const options = {
            "key": "rzp_live_SqYugAybXREdik", // Live Public Key ID
            "amount": orderData.amount,
            "currency": orderData.currency,
            "name": "Work Cosmo",
            "description": `Subscription for ${planName} Plan`,
            "image": "./src/images/favicon.png",
            "order_id": orderData.order_id,
            "handler": async function (response) {
                // STEP 3: Verify Payment Signature on the Backend
                const verifyResponse = await fetch('/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });

                const verifyData = await verifyResponse.json();

                if (verifyData.success) {
                    // Redirect to Success Page
                    window.location.href = `success.html?order_id=${response.razorpay_order_id}`;
                } else {
                    alert('Payment verification failed: ' + verifyData.message);
                }
            },
            "prefill": {
                "name": "",
                "email": "",
                "contact": ""
            },
            "theme": {
                "color": "#0f172a"
            },
            "modal": {
                "ondismiss": function () {
                    console.log('Checkout modal closed by user');
                }
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response) {
            alert(`Payment Failed: ${response.error.description}`);
        });
        rzp1.open();

    } catch (error) {
        console.error('Checkout Error:', error);
        alert('An error occurred during checkout: ' + error.message);
    }
}

function subscribeNow(planId, planName) {
    activePlanId = planId;
    activePlanName = planName;
    const modal = document.getElementById('subscription-modal');
    if (modal) {
        document.getElementById('subscription-form').reset();
        modal.classList.add('active');
    }
}

async function processSubscription(userDetails) {
    try {
        const { name, email, company, mobile, planId, planName } = userDetails;
        const planSlug = planId === 'plan_SoAKfnYYCTZHDo' ? 'professional' : planId === 'plan_SouJvWzj8xFSgg' ? 'enterprise' : 'starter';
        const planFeatures = ['recruitModule', 'careerPortal', 'shareProfile', 'qrBridgeLogin', 'advancedAnalytics'];

        // Calculate start_at exactly 14 days from now for a 14-days trial
        const now = new Date();
        const trialEndDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
        const startAt = Math.floor(trialEndDate.getTime() / 1000); // Unix timestamp in seconds

        // STEP 1: Create Subscription on the Backend (monthly after the trial)
        const subResponse = await fetch('/api/create-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan_id: planId,
                total_count: 12,
                start_at: startAt,
                notes: {
                    plan_name: planName,
                    customer_name: name,
                    customer_company: company,
                    customer_mobile: mobile
                }
            })
        });

        const contentType = subResponse.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await subResponse.text();
            console.error('Non-JSON response received:', text);
            throw new Error(`Server returned non-JSON response (${subResponse.status}). If you are developing locally, make sure to run using 'vercel dev' instead of Live Server.`);
        }

        const subData = await subResponse.json();

        if (!subResponse.ok) {
            throw new Error(subData.error || 'Failed to create subscription');
        }

        // STEP 2: Open Razorpay Checkout Modal for Subscription
        const options = {
            "key": "rzp_live_SqYugAybXREdik",
            "subscription_id": subData.subscription_id,
            "description": `${planName} Plan - 14-day trial, then monthly billing`,
            "handler": async function (response) {
                try {
                    if (db) {
                        // Save details with subscription_id in Firestore
                        await db.collection("subscriptions").doc(response.razorpay_subscription_id).set({
                            subscription_id: response.razorpay_subscription_id,
                            name: name,
                            email: email,
                            company: company,
                            mobile: mobile,
                            plan_id: planId,
                            plan_name: planName,
                            plan: planSlug,
                            features: planFeatures,
                            created_at: firebase.firestore.FieldValue.serverTimestamp(),
                            status: "active",
                            trialEndsAt: trialEndDate.toISOString()
                        });
                    } else {
                        console.warn("Firebase not initialized or available.");
                    }

                    // Auto-Provision Workspace
                    try {
                        const provisionResponse = await fetch('/api/provision', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                subscriptionId: response.razorpay_subscription_id,
                                name: name,
                                email: email,
                                company: company,
                                mobile: mobile,
                                planId: planId,
                                planName: planName
                            })
                        });
                        const provisionData = await provisionResponse.json();
                        if (provisionData.success) {
                            alert(`🎉 Workspace Provisioned Successfully!\n\nSubdomain: ${provisionData.subdomain}.workcosmo.in/app\nEmail: ${provisionData.email}\nTemp Password: ${provisionData.tempPassword}\n\nPlease save these credentials!`);
                        }
                    } catch (provErr) {
                        console.error('Auto-Provisioning Error:', provErr);
                    }

                    // Redirect to Success Page
                    window.location.href = `success.html?subscription_id=${response.razorpay_subscription_id}`;
                } catch (dbError) {
                    console.error("Payment Process/Firestore Save Error: ", dbError);
                    alert("Payment succeeded but details couldn't be saved. Please contact support with Subscription ID: " + response.razorpay_subscription_id);
                    window.location.href = `success.html?subscription_id=${response.razorpay_subscription_id}`;
                }
            },
            "prefill": {
                "name": name,
                "email": email,
                "contact": mobile
            },
            "theme": {
                "color": "#0f172a"
            }
        };

        const rzp1 = new Razorpay(options);
        rzp1.open();

    } catch (error) {
        console.error('Subscription Error:', error);
        alert('An error occurred: ' + error.message);
    }
}

// Contact Form Submission to Firestore
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.disabled = true;
            submitBtn.innerText = 'Submitting...';

            const formData = new FormData(contactForm);
            const messageData = {
                name: formData.get('name'),
                email: formData.get('email'),
                company_size: formData.get('company_size'),
                message: formData.get('message'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (db) {
                    await db.collection('contact_messages').add(messageData);
                    alert('Thank you for contacting us! We have received your message and will get back to you shortly.');
                    contactForm.reset();
                } else {
                    throw new Error('Database not initialized');
                }
            } catch (error) {
                console.error('Error saving message:', error);
                alert('Oops! Something went wrong while sending your message. Please try again later or contact us directly.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});


