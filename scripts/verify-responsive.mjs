import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const BASE_URL = "http://localhost:3000";

const VIEWPORTS = [
  { name: "Small mobile (320x568)", width: 320, height: 568, isMobile: true },
  { name: "Mobile (360x800)", width: 360, height: 800, isMobile: true },
  { name: "Mobile (390x844)", width: 390, height: 844, isMobile: true },
  { name: "Large mobile (430x932)", width: 430, height: 932, isMobile: true },
  { name: "Small tablet (600x960)", width: 600, height: 960, isMobile: true },
  { name: "Tablet (768x1024)", width: 768, height: 1024, isMobile: true },
  { name: "Large tablet (1024x1366)", width: 1024, height: 1366, isMobile: false },
  { name: "Laptop (1280x800)", width: 1280, height: 800, isMobile: false },
  { name: "Desktop (1440x900)", width: 1440, height: 900, isMobile: false },
  { name: "Large desktop (1920x1080)", width: 1920, height: 1080, isMobile: false },
];

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

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: isMobile,
    });
    await this.send('Emulation.setVisibleSize', { width, height }).catch(() => {});
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 900));
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Evaluation failed');
    }
    return res.result?.value;
  }

  async screenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runVerification() {
  console.log("=== STARTING RESPONSIVE OPTIMIZATION VERIFICATION (W10) ===");

  // Obtain real admin JWT token directly from backend API
  console.log("Fetching live JWT token from FastAPI backend...");
  let adminToken = "";
  try {
    const authRes = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@primebyactivist.com", password: "PrimeAdmin@2026!" })
    }).then(r => r.json());
    adminToken = authRes.access_token;
    console.log("Successfully retrieved administrator token:", adminToken.substring(0, 25) + "...");
  } catch (err) {
    console.error("Failed to fetch token from backend:", err.message);
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const results = {
    viewportsTested: 0,
    overflowChecks: [],
    mobileDrawerChecks: [],
    tableScrollChecks: [],
    modalLineItemChecks: [],
    screenshotsSaved: [],
    errors: [],
  };

  try {
    const list = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
    const pageTarget = list.find(t => t.type === 'page') || list[0];
    const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log("Connected to Chrome via CDP.");

    // Inject session token into sessionStorage on origin and login via proxy
    await cdp.navigate(`${BASE_URL}/login`);
    await new Promise(r => setTimeout(r, 600));

    const loginRes = await cdp.evaluate(`
      (async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@primebyactivist.com', password: 'PrimeAdmin@2026!' })
        });
        const data = await res.json();
        sessionStorage.setItem("prime_access_token", data.access_token);
        return { status: res.status, user: data.user?.role };
      })()
    `);
    console.log("In-browser authenticated login result:", loginRes);

    // Step 2: Test All 10 Viewports for Public & Admin Routes
    const publicRoutes = ["/", "/products", "/contact", "/login"];
    const adminRoutes = ["/admin/dashboard", "/admin/orders", "/admin/quotations", "/admin/products", "/admin/users"];

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.name} ---`);
      results.viewportsTested++;
      await cdp.setViewport(vp.width, vp.height, vp.isMobile);

      // Check Public Routes
      for (const route of publicRoutes) {
        await cdp.navigate(`${BASE_URL}${route}`);
        const pageMetrics = await cdp.evaluate(`
          (() => {
            const scrollWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            const hasHorizontalOverflow = scrollWidth > winWidth + 1;
            return {
              scrollWidth,
              winWidth,
              hasHorizontalOverflow,
            };
          })()
        `);

        const status = !pageMetrics.hasHorizontalOverflow ? "PASS" : "FAIL";
        results.overflowChecks.push({
          viewport: vp.name,
          route,
          status,
          scrollWidth: pageMetrics.scrollWidth,
          winWidth: pageMetrics.winWidth,
        });

        console.log(`  [${status}] ${route}: no overflow (${pageMetrics.scrollWidth} <= ${pageMetrics.winWidth})`);
      }

      // Check Admin Routes
      for (const route of adminRoutes) {
        await cdp.navigate(`${BASE_URL}${route}`);
        const adminMetrics = await cdp.evaluate(`
          (() => {
            const scrollWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            const hasHorizontalOverflow = scrollWidth > winWidth + 1;
            return {
              scrollWidth,
              winWidth,
              hasHorizontalOverflow,
            };
          })()
        `);

        const status = !adminMetrics.hasHorizontalOverflow ? "PASS" : "FAIL";
        results.overflowChecks.push({
          viewport: vp.name,
          route: `Admin ${route}`,
          status,
          scrollWidth: adminMetrics.scrollWidth,
          winWidth: adminMetrics.winWidth,
        });

        console.log(`  [${status}] Admin ${route}: no overflow (${adminMetrics.scrollWidth} <= ${adminMetrics.winWidth})`);
      }
    }

    // Step 3: Deep Verification of Mobile Off-Canvas Drawer (390x844)
    console.log("\n--- Testing Mobile Off-Canvas Drawer at 390x844 ---");
    await cdp.setViewport(390, 844, true);
    await cdp.navigate(`${BASE_URL}/admin/orders`);
    // Wait for authStore.init() to resolve and mount the admin shell
    await new Promise(r => setTimeout(r, 1200));

    const drawerInitial = await cdp.evaluate(`
      (() => {
        const toggle = document.querySelector('.admin-mobile-toggle');
        const sidebar = document.querySelector('.app-sidebar');
        return {
          toggleExists: !!toggle,
          toggleVisible: toggle ? window.getComputedStyle(toggle).display !== 'none' : false,
          sidebarOpen: sidebar ? sidebar.classList.contains('mobile-open') : false
        };
      })()
    `);

    console.log("Drawer initial state:", drawerInitial);

    // Click toggle to open drawer
    await cdp.evaluate(`document.querySelector('.admin-mobile-toggle')?.click();`);
    await new Promise(r => setTimeout(r, 400));

    const drawerOpened = await cdp.evaluate(`
      (() => {
        const sidebar = document.querySelector('.app-sidebar');
        const backdrop = document.querySelector('.sidebar-mobile-backdrop');
        const closeBtn = document.querySelector('.sidebar-mobile-close');
        return {
          sidebarOpen: sidebar ? sidebar.classList.contains('mobile-open') : false,
          sidebarTransform: sidebar ? window.getComputedStyle(sidebar).transform : null,
          backdropExists: !!backdrop,
          closeBtnVisible: closeBtn ? window.getComputedStyle(closeBtn).display !== 'none' : false
        };
      })()
    `);

    console.log("Drawer opened state:", drawerOpened);
    results.mobileDrawerChecks.push({
      test: "Mobile sidebar opens with backdrop and close button",
      status: drawerOpened.sidebarOpen && drawerOpened.backdropExists ? "PASS" : "FAIL",
      details: drawerOpened
    });

    // Save screenshot of open drawer
    const openDrawerScreenshot = "screenshots/admin-390x844-drawer-open.png";
    await cdp.screenshot(openDrawerScreenshot);
    results.screenshotsSaved.push(openDrawerScreenshot);

    // Close drawer via backdrop click
    await cdp.evaluate(`document.querySelector('.sidebar-mobile-backdrop')?.click();`);
    await new Promise(r => setTimeout(r, 400));

    const drawerClosed = await cdp.evaluate(`
      (() => {
        const sidebar = document.querySelector('.app-sidebar');
        const backdrop = document.querySelector('.sidebar-mobile-backdrop');
        return {
          sidebarOpen: sidebar ? sidebar.classList.contains('mobile-open') : false,
          backdropExists: !!backdrop
        };
      })()
    `);
    console.log("Drawer closed state after backdrop click:", drawerClosed);
    results.mobileDrawerChecks.push({
      test: "Mobile sidebar closes on backdrop click",
      status: !drawerClosed.sidebarOpen && !drawerClosed.backdropExists ? "PASS" : "FAIL",
      details: drawerClosed
    });

    // Step 4: Table and Modal Line Item Responsive Check on Orders (390x844)
    console.log("\n--- Testing Orders Management & Modal Line Items at 390x844 ---");
    await cdp.navigate(`${BASE_URL}/admin/orders`);

    const tableCheck = await cdp.evaluate(`
      (() => {
        const table = document.querySelector('table');
        const container = table?.parentElement;
        return {
          tableExists: !!table,
          containerOverflowX: container ? window.getComputedStyle(container).overflowX : null,
          tableMinWidth: table ? window.getComputedStyle(table).minWidth : null,
          containerWidth: container ? container.clientWidth : null,
          tableScrollWidth: table ? table.scrollWidth : null,
        };
      })()
    `);
    console.log("Orders table responsive metrics:", tableCheck);
    results.tableScrollChecks.push({
      page: "/admin/orders",
      status: tableCheck.containerOverflowX === 'auto' && parseInt(tableCheck.tableMinWidth) >= 600 ? "PASS" : "FAIL",
      details: tableCheck
    });

    const ordersScreenshot = "screenshots/admin-orders-390x844.png";
    await cdp.screenshot(ordersScreenshot);
    results.screenshotsSaved.push(ordersScreenshot);

    // Open Initialize New Order Modal
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Initialize New Order'));
        btn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    const orderModalGridCheck = await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('.fixed.inset-0');
        const itemRow = document.querySelector('.max-h-48 .grid');
        return {
          modalExists: !!modal,
          itemRowClasses: itemRow ? itemRow.className : null,
          itemRowWidth: itemRow ? itemRow.clientWidth : null,
          modalWidth: modal ? modal.clientWidth : null,
        };
      })()
    `);
    console.log("Order modal responsive line items:", orderModalGridCheck);
    results.modalLineItemChecks.push({
      modal: "Create Order Line Items",
      status: orderModalGridCheck.modalExists && orderModalGridCheck.itemRowClasses.includes("grid-cols-2") ? "PASS" : "FAIL",
      details: orderModalGridCheck
    });

    // Close modal
    await cdp.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
        cancelBtn?.click();
      })()
    `);

    // Step 5: Test Quotations Create Modal Line Items (390x844)
    console.log("\n--- Testing Quotations Management & Modal at 390x844 ---");
    await cdp.navigate(`${BASE_URL}/admin/quotations`);
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New Commercial Quotation'));
        btn?.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    const quotationModalCheck = await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('.fixed.inset-0');
        const itemRow = modal ? modal.querySelector('.grid.grid-cols-2') || modal.querySelector('.grid') : null;
        return {
          modalExists: !!modal,
          itemRowClasses: itemRow ? itemRow.className : null,
        };
      })()
    `);
    console.log("Quotation modal responsive check:", quotationModalCheck);
    results.modalLineItemChecks.push({
      modal: "Create Quotation Line Items",
      status: quotationModalCheck.modalExists && quotationModalCheck.itemRowClasses.includes("grid-cols-2") ? "PASS" : "FAIL",
      details: quotationModalCheck
    });

    const quotationModalScreenshot = "screenshots/admin-quotations-modal-390x844.png";
    await cdp.screenshot(quotationModalScreenshot);
    results.screenshotsSaved.push(quotationModalScreenshot);

    // Close quotation modal
    await cdp.evaluate(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
        cancelBtn?.click();
      })()
    `);

    // Step 6: Capture Required Benchmark Screenshots
    console.log("\n--- Capturing Benchmark Screenshots ---");
    // Home at 390x844
    await cdp.setViewport(390, 844, true);
    await cdp.navigate(`${BASE_URL}/`);
    await cdp.screenshot("screenshots/home-390x844.png");
    results.screenshotsSaved.push("screenshots/home-390x844.png");

    // Home at 768x1024
    await cdp.setViewport(768, 1024, true);
    await cdp.navigate(`${BASE_URL}/`);
    await cdp.screenshot("screenshots/home-768x1024.png");
    results.screenshotsSaved.push("screenshots/home-768x1024.png");

    // Home at 1440x900
    await cdp.setViewport(1440, 900, false);
    await cdp.navigate(`${BASE_URL}/`);
    await cdp.screenshot("screenshots/home-1440x900.png");
    results.screenshotsSaved.push("screenshots/home-1440x900.png");

    // Products at 390x844
    await cdp.setViewport(390, 844, true);
    await cdp.navigate(`${BASE_URL}/products`);
    await cdp.screenshot("screenshots/products-390x844.png");
    results.screenshotsSaved.push("screenshots/products-390x844.png");

    // Login at 320x568 (Smallest mobile)
    await cdp.setViewport(320, 568, true);
    await cdp.navigate(`${BASE_URL}/login`);
    await cdp.screenshot("screenshots/login-320x568.png");
    results.screenshotsSaved.push("screenshots/login-320x568.png");

    cdp.close();
  } catch (err) {
    console.error("Verification failed:", err);
    results.errors.push(err.message);
  } finally {
    chromeProc.kill();
    console.log("\nChrome terminated.");
  }

  // Summary Report
  const totalChecks = results.overflowChecks.length;
  const passedChecks = results.overflowChecks.filter(c => c.status === "PASS").length;
  const failedChecks = totalChecks - passedChecks;

  console.log("\n=======================================================");
  console.log("RESPONSIVE OPTIMIZATION VERIFICATION SUMMARY");
  console.log("=======================================================");
  console.log(`Viewports Tested:       ${results.viewportsTested} / 10`);
  console.log(`Page Overflow Checks:   ${passedChecks} / ${totalChecks} PASSED (${failedChecks} failed)`);
  console.log(`Mobile Drawer Tests:    ${results.mobileDrawerChecks.filter(c => c.status === "PASS").length} / ${results.mobileDrawerChecks.length} PASSED`);
  console.log(`Table Scroll Tests:     ${results.tableScrollChecks.filter(c => c.status === "PASS").length} / ${results.tableScrollChecks.length} PASSED`);
  console.log(`Modal Line Item Tests:  ${results.modalLineItemChecks.filter(c => c.status === "PASS").length} / ${results.modalLineItemChecks.length} PASSED`);
  console.log(`Screenshots Captured:   ${results.screenshotsSaved.length}`);
  console.log(`Execution Errors:       ${results.errors.length}`);
  console.log("=======================================================");

  fs.writeFileSync('verification-results.json', JSON.stringify(results, null, 2));
}

runVerification();
