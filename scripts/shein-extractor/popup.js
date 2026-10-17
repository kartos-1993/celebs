// ============================================================================
// Shein Extractor Popup Controller (Celebs Edition v5.0)
// ============================================================================

const statusEl = document.getElementById('status');
const catalogTargetSelect = document.getElementById('catalogTarget');
const usdRateInput = document.getElementById('usdRate');
const markupInput = document.getElementById('markup');
const defaultStockInput = document.getElementById('defaultStock');
const startOffsetInput = document.getElementById('startOffset');
const batchSizeInput = document.getElementById('batchSize');

// Single Mode Elements
const extractSingleBtn = document.getElementById('extractSingleBtn');
const singlePreview = document.getElementById('singlePreview');
const previewTitle = document.getElementById('previewTitle');
const previewCategory = document.getElementById('previewCategory');
const previewPrice = document.getElementById('previewPrice');
const previewUsd = document.getElementById('previewUsd');
const previewVariants = document.getElementById('previewVariants');
const copySingleJsonBtn = document.getElementById('copySingleJsonBtn');
const downloadSingleJsonBtn = document.getElementById('downloadSingleJsonBtn');

// Batch Mode Elements
const collectBtn = document.getElementById('collectBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBatchGroup = document.getElementById('downloadBatchGroup');
const downloadSeedBtn = document.getElementById('downloadSeedBtn');
const downloadRawBtn = document.getElementById('downloadRawBtn');
const resetBtn = document.getElementById('resetBtn');

let lastExtractedResult = null;

function getConfig() {
  return {
    catalogTarget: catalogTargetSelect.value || '1p',
    usdRate: parseFloat(usdRateInput.value) || 135,
    markup: parseFloat(markupInput.value) || 1.15,
    defaultStock: parseInt(defaultStockInput.value, 10) || 30,
    startOffset: Math.max(1, parseInt(startOffsetInput.value, 10)) - 1,
    batchSize: Math.max(1, parseInt(batchSizeInput.value, 10)) || 5,
  };
}

function updateUI() {
  chrome.storage.local.get(
    [
      'queue',
      'currentIndex',
      'results',
      'seedResults',
      'isPaused',
      'usdRate',
      'markup',
      'defaultStock',
      'catalogTarget',
    ],
    (data) => {
      const count = data.queue ? data.queue.length : 0;
      const progress = data.currentIndex || 0;
      const resultsCount = data.seedResults
        ? data.seedResults.length
        : data.results
          ? data.results.length
          : 0;

      if (data.usdRate) usdRateInput.value = data.usdRate;
      if (data.markup) markupInput.value = data.markup;
      if (data.defaultStock !== undefined) defaultStockInput.value = data.defaultStock;
      if (data.catalogTarget) catalogTargetSelect.value = data.catalogTarget;

      if (count > 0) {
        statusEl.className = 'status';
        statusEl.innerHTML = `<b>Batch Queue:</b> ${count} items<br><b>Progress:</b> ${progress} / ${count}<br><b>Extracted:</b> ${resultsCount} Celebs-ready products`;

        startBtn.style.display = data.isPaused ? 'block' : 'none';
        stopBtn.style.display = data.isPaused ? 'none' : 'block';

        const hasData = resultsCount > 0;
        downloadBatchGroup.style.display = hasData ? 'flex' : 'none';
      } else {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        downloadBatchGroup.style.display = 'none';
      }
    },
  );
}

// ----------------------------------------------------------------------------
// 1. Single Item Extraction
// ----------------------------------------------------------------------------
extractSingleBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  const cfg = getConfig();
  extractSingleBtn.disabled = true;
  extractSingleBtn.textContent = '⏳ Extracting Product...';
  statusEl.className = 'status';
  statusEl.textContent = 'Analyzing DOM, measurements, swatches, and high-res imagery...';

  chrome.tabs.sendMessage(
    tab.id,
    {
      action: 'extractCurrentProduct',
      usdRate: cfg.usdRate,
      markup: cfg.markup,
      defaultStock: cfg.defaultStock,
      catalogTarget: cfg.catalogTarget,
    },
    (response) => {
      extractSingleBtn.disabled = false;
      extractSingleBtn.textContent = '⚡ Extract Active Product Tab';

      if (chrome.runtime.lastError || !response || !response.success) {
        statusEl.className = 'status error';
        statusEl.textContent =
          response?.error ||
          'Failed to extract product. Ensure you are on a SHEIN product detail page (-p- URL) and refresh the tab.';
        return;
      }

      lastExtractedResult = response.result;
      const seed = response.result.seed;

      previewTitle.textContent = seed.title;
      previewTitle.title = seed.title;
      previewCategory.textContent = `${seed.category} → ${seed.subcategory}`;
      previewPrice.textContent = `${seed.discountedPrice.toLocaleString()} (MRP: ${seed.price.toLocaleString()})`;
      previewUsd.textContent = `$${response.result.raw.sheinUsdPrice}`;
      previewVariants.textContent = `${seed.colorVariants.length} Colors, ${seed.sizes.length} Sizes (${seed.skus.length} SKUs)`;

      singlePreview.style.display = 'block';
      statusEl.className = 'status';
      statusEl.textContent = '✅ Extraction successful! Download or copy the JSON payload below.';
    },
  );
});

copySingleJsonBtn.addEventListener('click', () => {
  if (!lastExtractedResult) return;
  const jsonStr = JSON.stringify(lastExtractedResult.seed, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    const orig = copySingleJsonBtn.textContent;
    copySingleJsonBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copySingleJsonBtn.textContent = orig;
    }, 1500);
  });
});

downloadSingleJsonBtn.addEventListener('click', () => {
  if (!lastExtractedResult) return;
  const seed = lastExtractedResult.seed;
  const blob = new Blob([JSON.stringify(seed, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `celebs_${seed.slug || 'product'}.json`;
  a.click();
});

// ----------------------------------------------------------------------------
// 2. Batch Mode (Link Collector & Queue Runner)
// ----------------------------------------------------------------------------
collectBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  const cfg = getConfig();
  statusEl.textContent = 'Scanning category page for product links...';

  chrome.tabs.sendMessage(tab.id, { action: 'collectLinks' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusEl.className = 'status alert';
      statusEl.textContent = 'Please make sure you are on a Shein category or recommendation page!';
      return;
    }

    if (response.links && response.links.length > 0) {
      const selectedLinks = response.links.slice(cfg.startOffset, cfg.startOffset + cfg.batchSize);
      if (selectedLinks.length === 0) {
        statusEl.className = 'status alert';
        statusEl.textContent =
          'No links found in offset range. Scroll down on the page and try again.';
        return;
      }

      chrome.storage.local.set(
        {
          queue: selectedLinks,
          results: [],
          seedResults: [],
          currentIndex: 0,
          isPaused: true,
          usdRate: cfg.usdRate,
          markup: cfg.markup,
          defaultStock: cfg.defaultStock,
          catalogTarget: cfg.catalogTarget,
        },
        () => {
          updateUI();
          statusEl.textContent = `Found ${response.links.length} products. Queued ${selectedLinks.length} items (offsets ${cfg.startOffset + 1} to ${cfg.startOffset + selectedLinks.length}). Ready to start!`;
        },
      );
    } else {
      statusEl.className = 'status alert';
      statusEl.textContent = 'No product links found. Please scroll down to let products load.';
    }
  });
});

startBtn.addEventListener('click', () => {
  const cfg = getConfig();

  chrome.storage.local.set(
    {
      isPaused: false,
      usdRate: cfg.usdRate,
      markup: cfg.markup,
      defaultStock: cfg.defaultStock,
      catalogTarget: cfg.catalogTarget,
    },
    () => {
      updateUI();
      chrome.storage.local.get(['queue', 'currentIndex'], (data) => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (data.queue && data.queue[data.currentIndex]) {
            chrome.tabs.update(tab.id, { url: data.queue[data.currentIndex] });
          }
        });
      });
    },
  );
});

stopBtn.addEventListener('click', () => {
  chrome.storage.local.set({ isPaused: true }, () => {
    updateUI();
    statusEl.className = 'status alert';
    statusEl.textContent = 'Execution paused. Click Start to resume when ready.';
  });
});

resetBtn.addEventListener('click', () => {
  chrome.storage.local.clear(() => {
    lastExtractedResult = null;
    singlePreview.style.display = 'none';
    updateUI();
    statusEl.className = 'status';
    statusEl.textContent = 'Queue and cache reset complete. Ready for new batch.';
  });
});

downloadSeedBtn.addEventListener('click', () => {
  chrome.storage.local.get(['seedResults'], (data) => {
    const results = data.seedResults || [];
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `celebs_seed_batch_${Date.now()}.json`;
    a.click();
  });
});

downloadRawBtn.addEventListener('click', () => {
  chrome.storage.local.get(['results'], (data) => {
    const results = data.results || [];
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shein_raw_batch_${Date.now()}.json`;
    a.click();
  });
});

updateUI();
