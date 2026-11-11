import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 9223;
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://127.0.0.1:8000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@primebyactivist.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "PrimeAdmin@2026!";

function getBrowserExecutablePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidatePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  for (const p of candidatePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return "chrome";
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1000));
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result ? res.result.value : null;
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runE2EWorkflows() {
  console.log("===============================================================");
  console.log("       PRIME BY ACTIVIST - PHASE W11 E2E WORKFLOW SUITE        ");
  console.log("===============================================================\n");

  const results = {
    total: 7,
    passed: 0,
    failed: 0,
    workflows: [],
  };

  const browserPath = getBrowserExecutablePath();
  console.log(`Using browser executable: ${browserPath}`);

  // Launch headless browser for browser-driven workflows
  const chromeProc = spawn(browserPath, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1600));

  let cdp = null;
  try {
    const list = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    console.log("Successfully connected CDP client.\n");
  } catch (err) {
    console.error("Warning: Failed to connect CDP directly, proceeding with API client workflows:", err.message);
  }

  // --- E2E-01: Public Visitor Flow ---
  console.log("▶ [E2E-01] Testing Public Visitor Flow...");
  try {
    if (cdp) {
      await cdp.navigate(`${BASE_URL}/`);
      const homeTitle = await cdp.evaluate(`document.title`);
      const navLinksCount = await cdp.evaluate(`document.querySelectorAll('nav a').length`);
      console.log(`  - Home page rendered: title="${homeTitle}", nav links=${navLinksCount}`);
    }

    // Public catalog query
    const catalogRes = await fetch(`${API_URL}/api/v1/products`).then(r => r.json());
    const products = Array.isArray(catalogRes) ? catalogRes : catalogRes.items;
    if (!products || products.length === 0) {
      throw new Error("No products returned from public catalogue");
    }
    console.log(`  - Public catalog retrieved ${products.length} verified products`);

    // Submit public inquiry
    const testEnquiry = {
      full_name: "Dr. E2E Visitor",
      email: `visitor_${Date.now()}@clinic-test.org`,
      company: "St. Jude Clinic",
      message: "Requesting quotation for wholesale vitamins and pediatric drops.",
      category: "wholesale_inquiry",
    };
    const enquiryRes = await fetch(`${API_URL}/api/v1/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testEnquiry),
    });
    if (!enquiryRes.ok) {
      throw new Error(`Enquiry submission failed with status ${enquiryRes.status}`);
    }
    const enquiryData = await enquiryRes.json();
    console.log(`  - Inquiry successfully created and persisted with ID: ${enquiryData.id}`);

    results.passed++;
    results.workflows.push({ id: "E2E-01", name: "Public Visitor Flow", status: "PASSED" });
    console.log("✔ [E2E-01] Public Visitor Flow: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-01", name: "Public Visitor Flow", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-01] Public Visitor Flow: FAILED (${err.message})\n`);
  }

  // --- E2E-02: Customer Authentication Flow ---
  console.log("▶ [E2E-02] Testing Customer Authentication Flow...");
  try {
    const customerEmail = `buyer_${Date.now()}@medipharm.com`;
    const customerPassword = "CustomerSecure@2026!";

    // 1. Register
    const regRes = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "Apex Healthcare Purchaser",
        email: customerEmail,
        password: customerPassword,
        account_type: "Hospital / Healthcare Facility",
      }),
    });
    if (!regRes.ok) throw new Error(`Customer registration failed: ${regRes.status}`);
    const regData = await regRes.json();
    console.log(`  - Customer registered: ${regData.email} (ID: ${regData.id})`);

    // 2. Login
    const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: customerEmail, password: customerPassword }),
    });
    if (!loginRes.ok) throw new Error(`Customer login failed: ${loginRes.status}`);
    const authData = await loginRes.json();
    const token = authData.access_token;
    console.log(`  - Customer logged in, received JWT token`);

    // 3. Profile me check
    const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!meRes.ok) throw new Error(`Me profile verification failed: ${meRes.status}`);
    const meData = await meRes.json();
    if (meData.role !== "customer") throw new Error(`Expected role 'customer', got '${meData.role}'`);
    console.log(`  - Session verified: role=${meData.role}`);

    // 4. Update profile
    const updateRes = await fetch(`${API_URL}/api/v1/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: "Apex Chief Pharmacist",
        phone_number: "+255 777 999 888",
      }),
    });
    if (!updateRes.ok) throw new Error(`Profile update failed: ${updateRes.status}`);
    const updatedUser = await updateRes.json();
    if (updatedUser.full_name !== "Apex Chief Pharmacist") {
      throw new Error(`Profile name mismatch: ${updatedUser.full_name}`);
    }
    console.log(`  - Profile updated: full_name="${updatedUser.full_name}"`);

    results.passed++;
    results.workflows.push({ id: "E2E-02", name: "Customer Authentication Flow", status: "PASSED" });
    console.log("✔ [E2E-02] Customer Authentication Flow: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-02", name: "Customer Authentication Flow", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-02] Customer Authentication Flow: FAILED (${err.message})\n`);
  }

  // Admin Token for Admin Workflows
  let adminToken = "";
  try {
    const adminLogin = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    }).then(r => r.json());
    adminToken = adminLogin.access_token;
  } catch (e) {
    console.error("Failed to obtain admin token:", e.message);
  }

  // --- E2E-03: Admin Product Management ---
  console.log("▶ [E2E-03] Testing Admin Product Management Workflow...");
  try {
    const adminHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    };

    const uniqueSku = `PRIME-E2E-${Date.now().toString().slice(-6)}`;
    // 1. Create Product
    const createProdRes = await fetch(`${API_URL}/api/v1/admin/products`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        name: "Amoxicillin Trihydrate 500mg",
        sku: uniqueSku,
        category: "Capsules",
        dosage_form: "Hard Gelatin Capsule",
        pack_size: "10 x 10 Blister",
        description: "Broad-spectrum antibacterial formulation for bacterial infections.",
        status: "Published",
      }),
    });
    if (!createProdRes.ok) throw new Error(`Product creation failed: ${createProdRes.status}`);
    const newProd = await createProdRes.json();
    console.log(`  - Created product: "${newProd.name}" (${newProd.sku}) with ID ${newProd.id}`);

    // 2. Verify in public catalog
    const pubCheck = await fetch(`${API_URL}/api/v1/products?search=${uniqueSku}`).then(r => r.json());
    const publicItems = Array.isArray(pubCheck) ? pubCheck : pubCheck.items;
    if (!publicItems || !publicItems.some(p => p.sku === uniqueSku)) {
      throw new Error(`Created product not found in public catalog`);
    }
    console.log(`  - Product successfully reflected in public catalog`);

    // 3. Update / Archive
    const patchRes = await fetch(`${API_URL}/api/v1/admin/products/${newProd.id}`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "Archived",
      }),
    });
    if (!patchRes.ok) throw new Error(`Product update failed: ${patchRes.status}`);
    const updatedProd = await patchRes.json();
    if (updatedProd.status !== "Archived") throw new Error("Expected product status to be Archived");
    console.log(`  - Product updated & archived: status=${updatedProd.status}`);

    results.passed++;
    results.workflows.push({ id: "E2E-03", name: "Admin Product Management", status: "PASSED" });
    console.log("✔ [E2E-03] Admin Product Management: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-03", name: "Admin Product Management", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-03] Admin Product Management: FAILED (${err.message})\n`);
  }

  // --- E2E-04: Order Lifecycle Workflow ---
  console.log("▶ [E2E-04] Testing Order Lifecycle Workflow...");
  try {
    const adminHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    };

    // 1. Create Order
    const orderRes = await fetch(`${API_URL}/api/v1/admin/orders`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        customer_name: "Muhimbili National Hospital",
        customer_email: "procurement@mnh.or.tz",
        organization: "MNH Ministry of Health",
        country: "Tanzania",
        delivery_terms: "CIF Port of Dar es Salaam",
        internal_notes: "Priority institutional order for antibiotics and supplements",
        items: [
          {
            product_id: "prod-tab-001",
            product_name: "Daily Multivitamin Plus",
            sku: "TAB-001",
            quantity: 50,
            target_pack_size: "60 Tablets"
          }
        ]
      }),
    });
    if (!orderRes.ok) throw new Error(`Order creation failed: ${orderRes.status}`);
    const order = await orderRes.json();
    console.log(`  - Order created: ${order.order_number} (status: ${order.status})`);

    // 2. Valid status transition: Submitted -> In Review
    const trans1 = await fetch(`${API_URL}/api/v1/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "In Review", reason: "Under clinical pharmacist review" }),
    });
    if (!trans1.ok) throw new Error(`Transition to In Review failed: ${trans1.status}`);
    const inReviewOrder = await trans1.json();
    console.log(`  - Status transitioned to: ${inReviewOrder.status}`);

    // 3. Valid status transition: In Review -> Confirmed
    const trans2 = await fetch(`${API_URL}/api/v1/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "Confirmed", reason: "Order confirmed with hospital procurement" }),
    });
    if (!trans2.ok) throw new Error(`Transition to Confirmed failed: ${trans2.status}`);
    console.log(`  - Status transitioned to: Confirmed`);

    // 4. Invalid status transition: Confirmed -> Submitted (backwards transition not allowed)
    const invalidTrans = await fetch(`${API_URL}/api/v1/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "Submitted" }),
    });
    if (invalidTrans.status !== 400 && invalidTrans.status !== 422) {
      throw new Error(`Expected invalid status to be rejected with 400/422, got ${invalidTrans.status}`);
    }
    console.log(`  - Invalid status transition properly rejected with ${invalidTrans.status}`);

    results.passed++;
    results.workflows.push({ id: "E2E-04", name: "Order Lifecycle Workflow", status: "PASSED" });
    console.log("✔ [E2E-04] Order Lifecycle Workflow: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-04", name: "Order Lifecycle Workflow", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-04] Order Lifecycle Workflow: FAILED (${err.message})\n`);
  }

  // --- E2E-05: Quotation Workflow ---
  console.log("▶ [E2E-05] Testing Quotation Workflow...");
  try {
    const adminHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    };

    // 1. Create quotation with multiple line items
    const quotePayload = {
      recipient_name: "Dr. Catherine Simba",
      recipient_email: "catherine.simba@agakhanhealth.org",
      organization: "Aga Khan Health Services",
      country: "Tanzania",
      valid_days: 45,
      currency: "USD",
      commercial_terms: "FOB Dar es Salaam, 30 days payment net.",
      items: [
        { product_id: "tab-001", product_name: "Daily Multivitamin Plus", sku: "TAB-001", quantity: 100, unit_price: 15.0 },
        { product_id: "drp-001", product_name: "Vitality Kids Zinc Drops", sku: "DRP-001", quantity: 50, unit_price: 12.0 }
      ]
    };
    const quoteRes = await fetch(`${API_URL}/api/v1/admin/quotations`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(quotePayload),
    });
    if (!quoteRes.ok) throw new Error(`Quotation creation failed: ${quoteRes.status}`);
    const quote = await quoteRes.json();
    console.log(`  - Quotation created: ${quote.quotation_number}`);
    console.log(`    Total: ${quote.total_amount} ${quote.currency}`);

    // Verify subtotal math: (100 * 15.0) + (50 * 12.0) = 1500 + 600 = 2100.0
    if (quote.total_amount !== 2100.0) {
      throw new Error(`Calculation error: expected total 2100.0, got ${quote.total_amount}`);
    }
    console.log(`  - Quotation mathematical totals verified accurate`);

    // 2. Status update: Draft -> Sent
    const sendRes = await fetch(`${API_URL}/api/v1/admin/quotations/${quote.id}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ status: "Sent" }),
    });
    if (!sendRes.ok) throw new Error(`Quotation status update failed: ${sendRes.status}`);
    const sentQuote = await sendRes.json();
    console.log(`  - Quotation transitioned to: ${sentQuote.status}`);

    results.passed++;
    results.workflows.push({ id: "E2E-05", name: "Quotation Workflow", status: "PASSED" });
    console.log("✔ [E2E-05] Quotation Workflow: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-05", name: "Quotation Workflow", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-05] Quotation Workflow: FAILED (${err.message})\n`);
  }

  // --- E2E-06: RBAC & Permission Enforcement ---
  console.log("▶ [E2E-06] Testing RBAC & Permission Enforcement...");
  try {
    // 1. Create a customer user to test unauthorized access
    const custEmail = `rbac_probe_${Date.now()}@test.org`;
    const custPass = "TestRbacPass@2026!";
    await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: "RBAC Probe User",
        email: custEmail,
        password: custPass,
        account_type: "Individual",
      }),
    });
    const custAuth = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: custEmail, password: custPass }),
    }).then(r => r.json());
    const custToken = custAuth.access_token;

    // 2. Verify admin endpoints reject unauthenticated requests (401)
    const noAuthRes = await fetch(`${API_URL}/api/v1/admin/users`);
    if (noAuthRes.status !== 401) throw new Error(`Expected 401 for anonymous access, got ${noAuthRes.status}`);
    console.log(`  - Anonymous request rejected with 401 Unauthorized`);

    // 3. Verify admin endpoints reject customer role (403)
    const custAdminRes = await fetch(`${API_URL}/api/v1/admin/users`, {
      headers: { "Authorization": `Bearer ${custToken}` },
    });
    if (custAdminRes.status !== 403) throw new Error(`Expected 403 for customer accessing admin users, got ${custAdminRes.status}`);
    console.log(`  - Customer role rejected with 403 Forbidden on admin routes`);

    // 4. Verify admin user succeeds (200)
    const adminUsersRes = await fetch(`${API_URL}/api/v1/admin/users`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    if (adminUsersRes.status !== 200) throw new Error(`Admin failed to access users: ${adminUsersRes.status}`);
    console.log(`  - Administrator verified with 200 OK access`);

    results.passed++;
    results.workflows.push({ id: "E2E-06", name: "RBAC & Permission Enforcement", status: "PASSED" });
    console.log("✔ [E2E-06] RBAC & Permission Enforcement: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-06", name: "RBAC & Permission Enforcement", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-06] RBAC & Permission Enforcement: FAILED (${err.message})\n`);
  }

  // --- E2E-07: Document Security & Upload ---
  console.log("▶ [E2E-07] Testing Document Security & Upload...");
  try {
    // 1. Upload valid PDF document
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Title (PRIME Dossier) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";
    
    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\npharmaceutical_coa\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="Dossier-Amoxicillin.pdf"\r\nContent-Type: application/pdf\r\n\r\n${pdfContent}\r\n`,
      `--${boundary}--\r\n`,
    ];
    const uploadBody = bodyParts.join("");

    const uploadRes = await fetch(`${API_URL}/api/v1/admin/documents/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: uploadBody,
    });

    if (!uploadRes.ok) throw new Error(`PDF upload failed with status ${uploadRes.status}`);
    const docData = await uploadRes.json();
    console.log(`  - Document successfully uploaded: ${docData.filename} (ID: ${docData.id})`);

    // 2. Unauthenticated download rejected (401)
    const unauthDownload = await fetch(`${API_URL}${docData.download_url}`);
    if (unauthDownload.status !== 401) {
      throw new Error(`Expected 401 on unauthenticated download, got ${unauthDownload.status}`);
    }
    console.log(`  - Unauthenticated download rejected with 401`);

    // 3. Authorized download succeeds (200)
    const authDownload = await fetch(`${API_URL}${docData.download_url}`, {
      headers: { "Authorization": `Bearer ${adminToken}` },
    });
    if (authDownload.status !== 200) {
      throw new Error(`Expected 200 on admin download, got ${authDownload.status}`);
    }
    console.log(`  - Authorized admin download verified with 200 OK`);

    // 4. Invalid file extension rejection (.exe)
    const invalidBody = [
      `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\ngeneral\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="payload.exe"\r\nContent-Type: application/octet-stream\r\n\r\nMALICIOUS\r\n`,
      `--${boundary}--\r\n`,
    ].join("");
    const rejectRes = await fetch(`${API_URL}/api/v1/admin/documents/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: invalidBody,
    });
    if (rejectRes.status !== 400) {
      throw new Error(`Expected 400 for forbidden extension, got ${rejectRes.status}`);
    }
    console.log(`  - Executable upload safely rejected with 400 Bad Request`);

    results.passed++;
    results.workflows.push({ id: "E2E-07", name: "Document Security & Upload", status: "PASSED" });
    console.log("✔ [E2E-07] Document Security & Upload: PASSED\n");
  } catch (err) {
    results.failed++;
    results.workflows.push({ id: "E2E-07", name: "Document Security & Upload", status: "FAILED", error: err.message });
    console.error(`✖ [E2E-07] Document Security & Upload: FAILED (${err.message})\n`);
  }

  // Teardown browser
  if (cdp) await cdp.close();
  chromeProc.kill();

  console.log("===============================================================");
  console.log(`E2E WORKFLOW SUMMARY: ${results.passed}/${results.total} PASSED (${results.failed} FAILED)`);
  console.log("===============================================================");

  if (results.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2EWorkflows().catch((err) => {
  console.error("Fatal error running E2E workflows:", err);
  process.exit(1);
});
