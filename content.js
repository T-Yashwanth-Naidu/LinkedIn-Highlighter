// Declare a global observer to avoid redundant MutationObservers
let observer;

// ===============================
// Detect LinkedIn Dark Mode
// ===============================
function isLinkedInDarkMode() {
    const htmlClassList = document.documentElement.classList;
    return htmlClassList.contains('theme--dark-lix'); // LinkedIn dark mode indicator
}

// ===============================
// Highlight Job Cards Based on State
// ===============================
function highlightJobs() {
    const jobCards = document.querySelectorAll('.job-card-container'); // Select all job cards
    const darkMode = isLinkedInDarkMode(); // Detect if dark mode is active

    jobCards.forEach((jobCard) => {
        // Find the footer state element
        const jobStateElement = jobCard.querySelector('.job-card-container__footer-job-state');
        if (!jobStateElement) return; // Skip if no job state exists

        const jobState = jobStateElement.textContent.trim(); // Get the job state text

        // Apply styles based on job state
        if (jobState === "Viewed") {
            jobCard.style.backgroundColor = darkMode ? "#807800" : "yellow"; // Dark yellow or yellow
            jobCard.style.color = darkMode ? "white" : "black";
        } else if (jobState === "Applied") {
            jobCard.style.backgroundColor = darkMode ? "#003d00" : "lightgreen"; // Dark green or light green
            jobCard.style.color = darkMode ? "white" : "black";
        } else if (jobState === "Saved") {
            jobCard.style.backgroundColor = darkMode ? "#006b6b" : "cyan"; // Dark cyan or cyan
            jobCard.style.color = darkMode ? "white" : "black";
        }

        // Apply dark/light mode styling to additional job card elements
        const title = jobCard.querySelector('.artdeco-entity-lockup__title');
        if (title) title.style.color = darkMode ? "white" : "black";

        const subtitle = jobCard.querySelector('.artdeco-entity-lockup__subtitle span');
        if (subtitle) subtitle.style.color = darkMode ? "white" : "black";

        const caption = jobCard.querySelector('.artdeco-entity-lockup__caption span');
        if (caption) caption.style.color = darkMode ? "white" : "black";

        const metadata = jobCard.querySelectorAll('.artdeco-entity-lockup__metadata span, .job-card-container__job-insight-text');
        metadata.forEach((item) => {
            item.style.color = darkMode ? "white" : "black";
        });

        const footerItems = jobCard.querySelectorAll('.job-card-container__footer-wrapper li span');
        footerItems.forEach((item) => {
            item.style.color = darkMode ? "white" : "black";
        });

        if (jobStateElement) {
            jobStateElement.style.color = darkMode ? "white" : "black";
            jobStateElement.style.fontWeight = "bold"; // Bold styling for job state
        }
    });
}

// ===============================
// Observe DOM Changes for Job Cards
// ===============================
function observeDOMChanges() {
    const targetNode = document.body; // Monitor the entire page for changes
    const observerConfig = { childList: true, subtree: true };

    const observer = new MutationObserver(() => {
        highlightJobs(); // Reapply highlights when the DOM changes
    });

    observer.observe(targetNode, observerConfig);
}

// ===============================
// Clear Existing Keyword Highlights
// ===============================
function clearHighlights() {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');
    if (!jobDescriptionContainer) return;

    jobDescriptionContainer.querySelectorAll('span.highlight').forEach((highlightedSpan) => {
        const parent = highlightedSpan.parentNode;
        parent.replaceChild(document.createTextNode(highlightedSpan.textContent), highlightedSpan);
        parent.normalize(); // Merge adjacent text nodes
    });
}

// ===============================
// Highlight Selected Keywords in Job Descriptions
// ===============================
function highlightKeywords(keywords) {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');
    if (!jobDescriptionContainer || !keywords || keywords.length === 0) return;

    // Clear existing highlights
    clearHighlights();

    // Escape special characters in keywords for regex
    const escapedKeywords = keywords.map((keyword) =>
        keyword.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').trim()
    );

    const regexPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

    // Define keywords for red highlighting
    const redKeywords = ['U.S. Security Clearance', 'Clearance', 'Secret', 'Citizen', 'GC', 'Citizenship'];
    const redKeywordsRegex = new RegExp(`\\b(${redKeywords.map((k) => k.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')).join('|')})\\b`, 'gi');

    // Highlight text nodes recursively
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const matches = node.nodeValue.match(regexPattern);
            if (matches) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;

                matches.forEach((match) => {
                    const matchIndex = node.nodeValue.indexOf(match, lastIndex);

                    if (matchIndex > lastIndex) {
                        fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex, matchIndex)));
                    }

                    const span = document.createElement('span');
                    span.className = 'highlight';

                    if (redKeywordsRegex.test(match)) {
                        span.style.backgroundColor = 'red'; // Red for specific keywords
                        span.style.color = 'white';
                    } else {
                        span.style.backgroundColor = 'yellow'; // Yellow for others
                        span.style.color = 'black';
                    }
                    span.textContent = match;
                    fragment.appendChild(span);

                    lastIndex = matchIndex + match.length;
                });

                if (lastIndex < node.nodeValue.length) {
                    fragment.appendChild(document.createTextNode(node.nodeValue.slice(lastIndex)));
                }

                node.replaceWith(fragment);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            Array.from(node.childNodes).forEach((child) => processNode(child));
        }
    }

    Array.from(jobDescriptionContainer.childNodes).forEach((child) => processNode(child));
}

// ===============================
// Monitor Job Descriptions for Changes
// ===============================
function monitorJobDescription(keywords) {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');
    if (!jobDescriptionContainer) return;

    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
        highlightKeywords(keywords);
    });

    observer.observe(jobDescriptionContainer, { childList: true, subtree: true });
    highlightKeywords(keywords);
}

// ===============================
// Load and Apply Saved Keywords
// ===============================
chrome.storage.local.get(['keywords'], (result) => {
    const keywords = result.keywords || [];
    monitorJobDescription(keywords);
});

// ===============================
// Message Listener for Keyword Updates
// ===============================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.keywords) {
        console.log("Received keywords:", message.keywords); // Debug log
        highlightKeywords(message.keywords); // Call your highlighting function
        sendResponse({ status: "success", keywords: message.keywords });
    } else {
        console.error("No keywords received.");
        sendResponse({ status: "error", message: "No keywords provided." });
    }
});


// ===============================
// Initialize Observers and Highlights
// ===============================
observeDOMChanges();
highlightJobs();