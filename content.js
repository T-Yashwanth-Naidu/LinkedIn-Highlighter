let observer; // Declare the observer globally to avoid redundant observers


// Function to detect LinkedIn dark mode
function isLinkedInDarkMode() {
    const htmlClassList = document.documentElement.classList;
    return htmlClassList.contains('theme--dark-lix'); // LinkedIn dark mode indicator
}

// Function to apply highlights to job cards
function highlightJobs() {
    const jobCards = document.querySelectorAll('.job-card-container'); // Select all job cards
    const darkMode = isLinkedInDarkMode(); // Detect if dark mode is active

    jobCards.forEach((jobCard) => {
        // Find the footer state
        const jobStateElement = jobCard.querySelector('.job-card-container__footer-job-state');
        if (!jobStateElement) return; // Skip if no job state exists

        const jobState = jobStateElement.textContent.trim();

        // Apply styles based on job state
        if (jobState === "Viewed") {
            jobCard.style.backgroundColor = darkMode ? "#807800" : "yellow"; // Dark yellow or yellow
            jobCard.style.color = darkMode ? "white" : "black"; // Adjust text color
        } else if (jobState === "Applied") {
            jobCard.style.backgroundColor = darkMode ? "#003d00" : "lightgreen"; // Dark green or light green
            jobCard.style.color = darkMode ? "white" : "black";
        } else if (jobState === "Saved") {
            jobCard.style.backgroundColor = darkMode ? "#006b6b" : "cyan"; // Dark cyan or cyan
            jobCard.style.color = darkMode ? "white" : "black";
        }

        // Style titles
        const title = jobCard.querySelector('.artdeco-entity-lockup__title');
        if (title) {
            title.style.color = darkMode ? "white" : "black";
        }

        // Style subtitles (company names)
        const subtitle = jobCard.querySelector('.artdeco-entity-lockup__subtitle span');
        if (subtitle) {
            subtitle.style.color = darkMode ? "white" : "black";
        }

            // Style captions (e.g., location) - ember178
        const caption = jobCard.querySelector('.artdeco-entity-lockup__caption span');
        if (caption) {
            caption.style.color = darkMode ? "white" : "black";
        }

        // Style metadata (e.g., location, benefits)
        const metadata = jobCard.querySelectorAll('.artdeco-entity-lockup__metadata span, .job-card-container__job-insight-text');
        metadata.forEach((item) => {
            item.style.color = darkMode ? "white" : "black";
        });

        if (jobStateElement) {
            jobStateElement.style.color = darkMode ? "white" : "black";
            jobStateElement.style.fontWeight = "bold"; // Add bold styling
        }
        // Style footer items (e.g., Promoted, Easy Apply)
        const footerItems = jobCard.querySelectorAll('.job-card-container__footer-wrapper li span');
        footerItems.forEach((item) => {
            item.style.color = darkMode ? "white" : "black";
        });
    });
}



// Function to set up MutationObserver
function observeDOMChanges() {
    const targetNode = document.body;
    const observerConfig = { childList: true, subtree: true };

    const observer = new MutationObserver(() => {
        highlightJobs(); // Apply highlights whenever DOM changes
    });

    observer.observe(targetNode, observerConfig);
}

// Function to clear existing highlights
function clearHighlights() {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');

    if (!jobDescriptionContainer) return;

    jobDescriptionContainer.querySelectorAll('span.highlight').forEach((highlightedSpan) => {
        const parent = highlightedSpan.parentNode;
        parent.replaceChild(document.createTextNode(highlightedSpan.textContent), highlightedSpan);
        parent.normalize(); // Merge adjacent text nodes
    });
}

// Function to highlight selected keywords in the job description
function highlightKeywords(keywords) {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');

    if (!jobDescriptionContainer || !keywords || keywords.length === 0) return;

    // Clear existing highlights
    clearHighlights();

    // Escape special characters in the keywords
    const escapedKeywords = keywords.map((keyword) =>
        keyword.replace(/([.*+?^${}()|[\]\\])/g, '\\$1').trim()
    );

    // Create regex pattern to match keywords (case insensitive)
    const regexPattern = new RegExp(`\\b(${escapedKeywords.join('|')})\\b`, 'gi');

    // Recursive function to process and highlight text nodes
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE && regexPattern.test(node.nodeValue)) {
            const span = document.createElement('span');
            span.className = 'highlight';
            span.style.backgroundColor = 'yellow';
            span.style.color = 'black';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = node.nodeValue.replace(regexPattern, (match) => {
                return `<span class="highlight" style="background-color: yellow; color: black;">${match}</span>`;
            });

            const fragment = document.createDocumentFragment();
            Array.from(tempDiv.childNodes).forEach((child) => fragment.appendChild(child));
            node.replaceWith(fragment);
        } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
            Array.from(node.childNodes).forEach((child) => processNode(child));
        }
    }

    // Process all child nodes of the job description container
    Array.from(jobDescriptionContainer.childNodes).forEach((child) => processNode(child));
}

// Function to monitor changes in the job description container
function monitorJobDescription(keywords) {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');
    if (!jobDescriptionContainer) return;

    if (observer) observer.disconnect(); // Disconnect existing observer

    observer = new MutationObserver(() => {
        observer.disconnect(); // Temporarily disconnect to avoid loops
        highlightKeywords(keywords); // Reapply highlights
        observer.observe(jobDescriptionContainer, { childList: true, subtree: true });
    });

    observer.observe(jobDescriptionContainer, { childList: true, subtree: true });

    // Initial highlight for existing content
    highlightKeywords(keywords);
}

// Load saved keywords and monitor the job description for changes
chrome.storage.local.get(['keywords'], (result) => {
    const keywords = result.keywords || [];
    monitorJobDescription(keywords);
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message) => {
    if (message.keywords) {
        monitorJobDescription(message.keywords);
    }
});

// Function to observe changes in the job description container
function observeJobContentChanges() {
    const jobDescriptionContainer = document.querySelector('.jobs-box__html-content');

    if (!jobDescriptionContainer) return;

    // Set up MutationObserver to monitor changes in the job description container
    const observer = new MutationObserver(() => {
        chrome.runtime.onMessage.addListener((message) => {
            if (message.keywords) {
                highlightKeywords(message.keywords); // Reapply highlights when keywords change
            }
        });
    });

    observer.observe(jobDescriptionContainer, { childList: true, subtree: true });
}

// Initial setup
observeJobContentChanges();
// Initial highlighting
highlightJobs();

// Observe DOM changes
observeDOMChanges();
