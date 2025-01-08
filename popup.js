document.addEventListener('DOMContentLoaded', () => {
    const highlightBtn = document.getElementById('highlight-btn');
    const keywordsInput = document.getElementById('keywords');

    // On button click, send keywords to the content script
    highlightBtn.addEventListener('click', () => {
        const keywords = keywordsInput.value;

        if (keywords) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { keywords });
            });
        }
    });
});
