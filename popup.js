document.addEventListener('DOMContentLoaded', () => {
    const keywordInput = document.getElementById('add-keyword');
    const addBtn = document.getElementById('add-btn');
    const highlightBtn = document.getElementById('highlight-btn');
    const resetBtn = document.getElementById('reset-btn');
    const keywordList = document.getElementById('keyword-list');

    // Load saved keywords and render checkboxes
    chrome.storage.local.get(['keywords'], (result) => {
        const keywords = result.keywords || [];
        renderKeywords(keywords);
    });

    // Add a new keyword
    addBtn.addEventListener('click', () => {
        const keyword = keywordInput.value.trim();
        if (keyword) {
            chrome.storage.local.get(['keywords'], (result) => {
                const keywords = result.keywords || [];
                if (!keywords.includes(keyword)) {
                    keywords.push(keyword);
                    chrome.storage.local.set({ keywords }, () => {
                        renderKeywords(keywords);
                        keywordInput.value = ''; // Clear input field
                    });
                }
            });
        }
    });

    // Apply highlights for selected keywords
    highlightBtn.addEventListener('click', () => {
        const selectedKeywords = Array.from(
            document.querySelectorAll('.keyword-list input[type="checkbox"]:checked')
        ).map((checkbox) => checkbox.value);

        chrome.storage.local.set({ keywords: selectedKeywords }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { keywords: selectedKeywords });
            });
        });
    });

    // Reset all keywords
    resetBtn.addEventListener('click', () => {
        chrome.storage.local.remove('keywords', () => {
            keywordList.innerHTML = '';
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { keywords: [] });
            });
        });
    });

    // Render keywords as checkboxes
    function renderKeywords(keywords) {
        keywordList.innerHTML = '';
        keywords.forEach((keyword) => {
            const li = document.createElement('li');
            li.innerHTML = `<label><input type="checkbox" value="${keyword}" checked /> ${keyword}</label>`;
            keywordList.appendChild(li);
        });
    }
});
