const statusEl = document.getElementById('status');
const usdRateInput = document.getElementById('usdRate');
const markupInput = document.getElementById('markup');
const defaultStockInput = document.getElementById('defaultStock');
const startOffsetInput = document.getElementById('startOffset');
const batchSizeInput = document.getElementById('batchSize');

const collectBtn = document.getElementById('collectBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadSeedBtn = document.getElementById('downloadSeedBtn');
const downloadRawBtn = document.getElementById('downloadRawBtn');
const resetBtn = document.getElementById('resetBtn');

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

      if (count > 0) {
        statusEl.className = 'status';
        statusEl.innerHTML = `<b>Batch Queue:</b> ${count} items<br><b>Progress:</b> ${progress} / ${count}<br><b>Extracted:</b> ${resultsCount} Celebs-ready products`;

        startBtn.style.display = data.isPaused ? 'block' : 'none';
        stopBtn.style.display = data.isPaused ? 'none' : 'block';

        const hasData = resultsCount > 0;
        downloadSeedBtn.style.display = hasData ? 'block' : 'none';
        downloadRawBtn.style.display = hasData ? 'block' : 'none';
      } else {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        downloadSeedBtn.style.display = 'none';
        downloadRawBtn.style.display = 'none';
      }
    },
  );
}

collectBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const startOffset = Math.max(1, parseInt(startOffsetInput.value, 10)) - 1;
  const batchSize = Math.max(1, parseInt(batchSizeInput.value, 10)) || 5;
  const usdRate = parseFloat(usdRateInput.value) || 135;
  const markup = parseFloat(markupInput.value) || 1.15;
  const defaultStock = parseInt(defaultStockInput.value, 10) || 30;

  statusEl.textContent = 'Scanning category page for product links...';

  chrome.tabs.sendMessage(tab.id, { action: 'collectLinks' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusEl.className = 'status alert';
      statusEl.textContent = 'Please make sure you are on a Shein category or recommendation page!';
      return;
    }

    if (response.links && response.links.length > 0) {
      const selectedLinks = response.links.slice(startOffset, startOffset + batchSize);
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
          usdRate,
          markup,
          defaultStock,
        },
        () => {
          updateUI();
          statusEl.textContent = `Found ${response.links.length} products. Queued ${selectedLinks.length} items (offsets ${startOffset + 1} to ${startOffset + selectedLinks.length}). Ready to start!`;
        },
      );
    } else {
      statusEl.className = 'status alert';
      statusEl.textContent = 'No product links found. Please scroll down to let products load.';
    }
  });
});

startBtn.addEventListener('click', () => {
  const usdRate = parseFloat(usdRateInput.value) || 135;
  const markup = parseFloat(markupInput.value) || 1.15;
  const defaultStock = parseInt(defaultStockInput.value, 10) || 30;

  chrome.storage.local.set({ isPaused: false, usdRate, markup, defaultStock }, () => {
    updateUI();
    chrome.storage.local.get(['queue', 'currentIndex'], (data) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (data.queue && data.queue[data.currentIndex]) {
          chrome.tabs.update(tab.id, { url: data.queue[data.currentIndex] });
        }
      });
    });
  });
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
    updateUI();
    statusEl.className = 'status';
    statusEl.textContent = 'Queue reset complete. Ready for new batch.';
  });
});

downloadSeedBtn.addEventListener('click', () => {
  chrome.storage.local.get(['seedResults'], (data) => {
    const results = data.seedResults || [];
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json',
    });
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
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shein_raw_batch_${Date.now()}.json`;
    a.click();
  });
});

updateUI();
