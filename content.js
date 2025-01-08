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

// Initial highlighting
highlightJobs();

// Observe DOM changes
observeDOMChanges();
