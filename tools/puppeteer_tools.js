const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

/**
 * Launch a browser and navigate to a URL
 * @param {Object} options - Browser launch options
 * @returns {Promise<Object>} Browser and page instances
 */
async function launchBrowser(options = {}) {
  const defaultOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  };

  const browser = await puppeteer.launch({ ...defaultOptions, ...options });
  const page = await browser.newPage();
  
  // Set default viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  return { browser, page };
}

/**
 * Navigate to a URL and extract page content
 * @param {string} url - URL to navigate to
 * @param {Object} options - Navigation options
 * @returns {Promise<Object>} Page content and metadata
 */
async function navigateAndExtract(url, options = {}) {
  const { browser, page } = await launchBrowser(options.browserOptions);
  
  try {
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: options.timeout || 30000
    });

    // Wait for additional selector if specified
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
    }

    // Extract content based on selector or get full content
    let content;
    if (options.selector) {
      content = await page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        return Array.from(elements).map(el => ({
          text: el.textContent?.trim(),
          html: el.innerHTML,
          attributes: Object.fromEntries(
            Array.from(el.attributes).map(attr => [attr.name, attr.value])
          )
        }));
      }, options.selector);
    } else {
      content = await page.content();
    }

    // Get page metadata
    const metadata = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }));

    return {
      content,
      metadata,
      success: true
    };

  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  } finally {
    await browser.close();
  }
}

/**
 * Take a screenshot of a webpage
 * @param {string} url - URL to screenshot
 * @param {Object} options - Screenshot options
 * @returns {Promise<Object>} Screenshot result
 */
async function takeScreenshot(url, options = {}) {
  const { browser, page } = await launchBrowser(options.browserOptions);
  
  try {
    await page.goto(url, { 
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: options.timeout || 30000
    });

    // Wait for selector if specified
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
    }

    // Set viewport if specified
    if (options.viewport) {
      await page.setViewport(options.viewport);
    }

    // Take screenshot
    const screenshotOptions = {
      type: options.format || 'png',
      quality: options.quality || 90,
      fullPage: options.fullPage || false,
      ...options.screenshotOptions
    };

    let screenshotBuffer;
    if (options.element) {
      const element = await page.$(options.element);
      if (element) {
        screenshotBuffer = await element.screenshot(screenshotOptions);
      } else {
        throw new Error(`Element ${options.element} not found`);
      }
    } else {
      screenshotBuffer = await page.screenshot(screenshotOptions);
    }

    // Save to file if path specified
    if (options.savePath) {
      await fs.ensureDir(path.dirname(options.savePath));
      await fs.writeFile(options.savePath, screenshotBuffer);
    }

    return {
      success: true,
      buffer: screenshotBuffer,
      size: screenshotBuffer.length,
      savedTo: options.savePath || null
    };

  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  } finally {
    await browser.close();
  }
}

/**
 * Interact with page elements (click, type, etc.)
 * @param {string} url - URL to navigate to
 * @param {Array} actions - Array of actions to perform
 * @param {Object} options - Interaction options
 * @returns {Promise<Object>} Interaction result
 */
async function interactWithPage(url, actions, options = {}) {
  const { browser, page } = await launchBrowser(options.browserOptions);
  
  try {
    await page.goto(url, { 
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: options.timeout || 30000
    });

    const results = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'click':
            await page.click(action.selector);
            results.push({ action: 'click', selector: action.selector, success: true });
            break;

          case 'type':
            await page.type(action.selector, action.text, { delay: action.delay || 100 });
            results.push({ action: 'type', selector: action.selector, text: action.text, success: true });
            break;

          case 'select':
            await page.select(action.selector, action.value);
            results.push({ action: 'select', selector: action.selector, value: action.value, success: true });
            break;

          case 'wait':
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: action.timeout || 5000 });
            } else if (action.timeout) {
              await page.waitForTimeout(action.timeout);
            }
            results.push({ action: 'wait', success: true });
            break;

          case 'scroll':
            await page.evaluate((options) => {
              window.scrollBy(options.x || 0, options.y || 0);
            }, action);
            results.push({ action: 'scroll', success: true });
            break;

          case 'extract':
            const extracted = await page.evaluate((sel) => {
              const elements = document.querySelectorAll(sel);
              return Array.from(elements).map(el => el.textContent?.trim());
            }, action.selector);
            results.push({ action: 'extract', selector: action.selector, data: extracted, success: true });
            break;

          default:
            results.push({ action: action.type, error: 'Unknown action type', success: false });
        }

        // Wait between actions if specified
        if (action.waitAfter) {
          await page.waitForTimeout(action.waitAfter);
        }

      } catch (actionError) {
        results.push({ 
          action: action.type, 
          selector: action.selector, 
          error: actionError.message, 
          success: false 
        });
      }
    }

    // Get final page state
    const finalState = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title
    }));

    return {
      success: true,
      results,
      finalState
    };

  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  } finally {
    await browser.close();
  }
}

/**
 * Generate PDF from webpage
 * @param {string} url - URL to convert to PDF
 * @param {Object} options - PDF generation options
 * @returns {Promise<Object>} PDF generation result
 */
async function generatePDF(url, options = {}) {
  const { browser, page } = await launchBrowser(options.browserOptions);
  
  try {
    await page.goto(url, { 
      waitUntil: options.waitUntil || 'networkidle2',
      timeout: options.timeout || 30000
    });

    // Wait for selector if specified
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
    }

    const pdfOptions = {
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      margin: options.margin || { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      ...options.pdfOptions
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    // Save to file if path specified
    if (options.savePath) {
      await fs.ensureDir(path.dirname(options.savePath));
      await fs.writeFile(options.savePath, pdfBuffer);
    }

    return {
      success: true,
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      savedTo: options.savePath || null
    };

  } catch (error) {
    return {
      error: error.message,
      success: false
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  launchBrowser,
  navigateAndExtract,
  takeScreenshot,
  interactWithPage,
  generatePDF
};