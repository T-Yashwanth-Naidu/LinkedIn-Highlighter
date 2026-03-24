document.addEventListener('DOMContentLoaded', () => {

    const addBtn = document.getElementById('add-keyword-btn');
    const input = document.getElementById('keyword-box');
    const container = document.getElementById('keywords-container');
    const applyBtn = document.getElementById('apply-highlights-btn');
    const resetBtn = document.getElementById('reset-btn');

    function addKeywords() {
        const value = input.value.trim();
        if (!value) return;

        const list = value.split(',').map(k => k.trim()).filter(Boolean);

        list.forEach(k => {
            const div = document.createElement('div');

            const cb = document.createElement('input');
            cb.type = "checkbox";
            cb.checked = true;
            cb.value = k;

            const label = document.createElement('label');
            label.textContent = k;

            div.append(cb, label);
            container.appendChild(div);
        });

        input.value = "";
        save();
    }

    function save() {
        const keywords = [...container.querySelectorAll("input:checked")]
            .map(c => c.value);

        chrome.storage.local.set({ keywords });
    }

    function load() {
        chrome.storage.local.get(['keywords'], ({ keywords = [] }) => {
            keywords.forEach(k => {
                const div = document.createElement('div');

                const cb = document.createElement('input');
                cb.type = "checkbox";
                cb.checked = true;
                cb.value = k;

                const label = document.createElement('label');
                label.textContent = k;

                div.append(cb, label);
                container.appendChild(div);
            });
        });
    }

    addBtn.onclick = addKeywords;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addKeywords();
        }
    });

    applyBtn.onclick = () => {
        const keywords = [...container.querySelectorAll("input:checked")]
            .map(c => c.value);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (!tabId) return;

            chrome.tabs.sendMessage(tabId, { keywords }, () => {
                if (chrome.runtime.lastError) {

                    chrome.scripting.executeScript({
                        target: { tabId },
                        files: ["content.js"]
                    }, () => {
                        chrome.tabs.sendMessage(tabId, { keywords });
                    });

                }
            });
        });
    };

resetBtn.onclick = () => {
    container.innerHTML = "";
    chrome.storage.local.set({ keywords: [] });

    // Notify content script to clear highlights
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) return;

        chrome.tabs.sendMessage(tabId, { action: "CLEAR_HIGHLIGHTS" });
    });
};

    load();
});