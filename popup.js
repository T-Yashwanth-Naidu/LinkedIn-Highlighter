document.addEventListener('DOMContentLoaded', () => {
    const addKeywordBtn = document.getElementById('add-keyword-btn');
    const keywordBox = document.getElementById('keyword-box');
    const keywordsContainer = document.getElementById('keywords-container');
    const applyHighlightsBtn = document.getElementById('apply-highlights-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Function to add multiple keywords
    function addKeywords() {
        const input = keywordBox.value.trim();
        if (input === '') return;

        // Split input into multiple keywords based on commas
        const keywords = input.split(',').map((keyword) => keyword.trim()).filter((keyword) => keyword !== '');

        keywords.forEach((keyword) => {
            const keywordItem = document.createElement('div');
            keywordItem.className = 'keyword-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.value = keyword;

            const label = document.createElement('label');
            label.textContent = keyword;

            keywordItem.appendChild(checkbox);
            keywordItem.appendChild(label);
            keywordsContainer.appendChild(keywordItem);
        });

        // Clear the input box and save the updated keywords
        keywordBox.value = '';
        saveKeywords();
    }

    // Function to save keywords to storage
    function saveKeywords() {
        const keywords = [];
        const checkboxes = keywordsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            if (checkbox.checked) {
                keywords.push(checkbox.value);
            }
        });

        chrome.storage.local.set({ keywords });
    }

    // Function to load saved keywords
    function loadKeywords() {
        chrome.storage.local.get(['keywords'], (result) => {
            const keywords = result.keywords || [];
            keywords.forEach((keyword) => {
                const keywordItem = document.createElement('div');
                keywordItem.className = 'keyword-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = true;
                checkbox.value = keyword;

                const label = document.createElement('label');
                label.textContent = keyword;

                keywordItem.appendChild(checkbox);
                keywordItem.appendChild(label);
                keywordsContainer.appendChild(keywordItem);
            });
        });
    }

    // Add event listener to the Add button
    addKeywordBtn.addEventListener('click', addKeywords);

    // Add event listener for Enter key
    keywordBox.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addKeywords();
        }
    });

    // Add event listener for Apply Highlights button
    applyHighlightsBtn.addEventListener('click', () => {
    const keywords = [];
    const checkboxes = keywordsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
        if (checkbox.checked) {
            keywords.push(checkbox.value);
        }
    });

    // Send message to the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { keywords }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent successfully:", response);
                }
            });
        } else {
            console.error("No active tab found.");
        }
    });
});


    // Add event listener for Reset button
    resetBtn.addEventListener('click', () => {
        keywordsContainer.innerHTML = '';
        chrome.storage.local.set({ keywords: [] });
    });

    // Load saved keywords on popup open
    loadKeywords();
});
