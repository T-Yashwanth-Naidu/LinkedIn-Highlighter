if (!window.domObserver) {
    window.domObserver = null;
}

if (!window.jobDescriptionObserver) {
    window.jobDescriptionObserver = null;
}


if (!window.isContentScriptInitialized) {
    window.isContentScriptInitialized = true;

    console.log("Initializing content script...");

    // Final Initialization Logic
    chrome.storage.local.get(['keywords'], (result) => {
        const keywords = result.keywords || [];
        console.log("Loaded keywords:", keywords); // Debug log

        highlightJobs(); // Initial highlights for job cards
        observeDOMChanges(); // Monitor job list dynamically
        monitorJobDescription(keywords); // Monitor and highlight job descriptions
    });

    // Listen for Keyword Updates
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.keywords) {
            console.log("Received updated keywords:", message.keywords); // Debug log
            highlightKeywords(message.keywords); // Apply updated highlights
            sendResponse({ status: "success", keywords: message.keywords });
        } else {
            console.error("No keywords received in message.");
            sendResponse({ status: "error", message: "No keywords provided."});
        }
    });
} else {
    console.log("Content script already initialized.");
}

// ===============================
// Observe DOM Changes for Job Cards
// ===============================



// Updated Observe DOM Changes function
function observeDOMChanges() {
    const targetNode = document.body; // Monitor the entire page for changes
    const observerConfig = { childList: true, subtree: true };

    // Disconnect and reset the existing observer if it's already active
    if (window.domObserver) {
        window.domObserver.disconnect();
        console.log("Disconnected existing DOM observer.");
    }

    console.log("Initializing DOM observer...");
    window.domObserver = new MutationObserver(() => {
        console.log("DOM changes detected."); // Debug log
        highlightJobs(); // Reapply highlights when the DOM changes
    });

    window.domObserver.observe(targetNode, observerConfig);
}



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
// ===============================
// Updated Highlight Job Cards
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



// Highlight keywords in a specific element
function highlightKeywordsInElement(element, keywords) {
    if (!element || keywords.length === 0) return;

    // Clear existing highlights
    clearHighlights();

    const escapedKeywords = keywords.map((keyword) =>
        keyword.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').trim()
    );
    const regexPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

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
                    span.style.backgroundColor = 'yellow';
                    span.style.color = 'black';
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

    Array.from(element.childNodes).forEach((child) => processNode(child));
}



function observeJobChanges() {
    const targetNode = document.querySelector('.jobs-search-results-list');
    if (!targetNode) return;

    const observer = new MutationObserver(() => {
        console.log("Detected job post updates."); // Debug log
        // Fetch stored keywords and re-monitor the job description
        chrome.storage.local.get(['keywords'], (result) => {
            const keywords = result.keywords || [];
            monitorJobDescription(keywords); // Monitor the new job description container
        });
    
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}



function waitForElement(selector, callback, interval = 100, timeout = 5000) {
    const startTime = Date.now();

    const checkExist = setInterval(() => {
        const element = document.querySelector(selector);
        if (element) {
            clearInterval(checkExist);
            callback(element);
        } else if (Date.now() - startTime > timeout) {
            clearInterval(checkExist);
            console.warn(`Timeout waiting for ${selector}`);
        }
    }, interval);
}


function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
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
    // Wait for the "About the job" container
    waitForElement('.jobs-box__html-content', (jobDescriptionContainer) => {
        console.log("Job description container found:", jobDescriptionContainer);

        // Disconnect any existing observer
        if (window.jobDescriptionObserver) {
            window.jobDescriptionObserver.disconnect();
            console.log("Disconnected existing job description observer.");
        }

        // Create a new observer for the job description
        window.jobDescriptionObserver = new MutationObserver(debounce(() => {
            console.log("Job description content changed."); // Debug log
            highlightKeywords(keywords); // Apply keyword highlights
        }, 300)); // Debounce by 300ms

        // Observe the container for changes
        window.jobDescriptionObserver.observe(jobDescriptionContainer, { childList: true, subtree: true });

        // Apply highlights initially
        highlightKeywords(keywords);
    }, 100, 10000); // Wait up to 10 seconds for the container
}








// ===============================
// Final Initialization
// ===============================
chrome.storage.local.get(['keywords'], (result) => {
    const keywords = result.keywords || [];
    console.log("Loaded keywords:", keywords); // Debug log

    // Initialize observers and highlights
    highlightJobs(); // Initial highlights for job cards
    observeDOMChanges(); // Monitor job list dynamically
    monitorJobDescription(keywords); // Monitor and highlight job descriptions
});

// ===============================
// Listen for Keyword Updates
// ===============================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.keywords) {
        console.log("Received updated keywords:", message.keywords); // Debug log
        highlightKeywords(message.keywords); // Apply updated highlights
        sendResponse({ status: "success", keywords: message.keywords });
    } else {
        console.error("No keywords received in message.");
        sendResponse({ status: "error", message: "No keywords provided." });
    }
});


// ===============================
// Initialize Observers and Highlights
// ===============================
observeDOMChanges();
observeJobChanges();
highlightJobs();