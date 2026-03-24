console.log("LIH content.js loaded - VERSION TEST 128");

// ===============================
// LinkedIn Job Highlighter
// ===============================

if (!window.highlighterData) {
    window.highlighterData = {
        domObserver: null,
        jobDescriptionObserver: null,
        urlObserver: null,
        keywords: []
    };
}

window.currentJobId ??= null;
window.lastUrl ??= location.href;
window.isHighlighting ??= false;
window.waitPollTimer ??= null;
window.lastDescriptionSignature ??= "";

// ===============================
// KEYWORD GROUPS
// ===============================
const restrictedWords = [
    "clearance",
    "citizen",
    "citizenship",
    "u.s. person",
    "us person",
    "permanent resident",
    "green card",
    "gc",
    "export authorization"
];

const visaWords = [
    "visa",
    "sponsorship",
    "visa sponsorship",
    "f1",
    "h1b"
];

const salaryWords = [
    "salary",
    "pay",
    "compensation",
    "base pay",
    "salary range",
    "$",
    "usd",
    "per year",
    "per annum",
    "bonus"
];

// ===============================
// INIT
// ===============================
if (!window.isContentScriptInitialized) {
    window.isContentScriptInitialized = true;

    initializeHighlighter();

    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
        if (message.action === "CLEAR_HIGHLIGHTS") {
            const container = getJobDescriptionContainer();
            if (container) removeHighlights(container);
            sendResponse({ status: "cleared" });
            return;
        }

        if (message.keywords) {
            console.log("LIH received keywords:", message.keywords);
            window.highlighterData.keywords = message.keywords;
            highlightJobs();
            triggerJobRefresh(true);
            sendResponse({ status: "ok" });
        }
    });
}

// ===============================
// HELPERS
// ===============================
function normalizeText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
}

function isVisible(el) {
    if (!el) return false;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (style.opacity === "0") return false;
    if (el.offsetParent === null && style.position !== "fixed") return false;

    return true;
}

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function getWorkspaceRoot() {
    return document.querySelector("main#workspace") || document.body;
}

function getJobRootContainer() {
    return getWorkspaceRoot();
}

function getJobDetailsPanel() {
    const workspace = getWorkspaceRoot();
    if (!workspace) return null;

    const visibleDivs = Array.from(workspace.querySelectorAll("div"))
        .filter(isVisible)
        .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 250 && rect.height > 250;
        });

    const workspaceRect = workspace.getBoundingClientRect();
    let best = null;
    let bestScore = -1;

    for (const el of visibleDivs) {
        const rect = el.getBoundingClientRect();

        // Prefer right side of workspace
        const centerX = rect.left + rect.width / 2;
        if (centerX < workspaceRect.left + workspaceRect.width * 0.45) {
            continue;
        }

        const text = normalizeText(el.innerText || "");
        if (text.length < 200) continue;

        let score = 0;
        score += rect.width;
        score += rect.height;
        score += text.length / 5;

        const low = text.toLowerCase();
        if (low.includes("qualifications")) score += 1000;
        if (low.includes("responsibilities")) score += 800;
        if (low.includes("about the job")) score += 800;
        if (low.includes("what you'll do")) score += 1200;
        if (low.includes("required skills")) score += 1200;
        if (low.includes("preferred skills")) score += 1200;

        if (score > bestScore) {
            bestScore = score;
            best = el;
        }
    }

    return best;
}

function getSelectedJobCard() {
    return (
        document.querySelector(".jobs-search-results__list-item--active") ||
        document.querySelector('[aria-current="true"]') ||
        null
    );
}

function getJobIdFromPage() {
    const selectedCard =
        document.querySelector(".jobs-search-results__list-item--active [data-job-id]") ||
        document.querySelector('[aria-current="true"] [data-job-id]') ||
        document.querySelector(".job-card-list__entity-lockup [data-job-id]") ||
        document.querySelector("[data-job-id].job-card-list__title");

    if (selectedCard) {
        return selectedCard.getAttribute("data-job-id");
    }

    const match = location.href.match(/currentJobId=(\d+)/);
    if (match) return match[1];

    return null;
}

function looksLikeJDText(text) {
    const low = text.toLowerCase();

    return (
        text.length > 250 &&
        (
            low.includes("about the job") ||
            low.includes("what you'll do") ||
            low.includes("required qualifications") ||
            low.includes("preferred qualifications") ||
            low.includes("responsibilities") ||
            low.includes("required skills") ||
            low.includes("desired skills") ||
            low.includes("skills and aptitudes") ||
            low.includes("experience with")
        )
    );
}

function isNoiseText(text) {
    const low = text.toLowerCase();

    return (
        low === "saved" ||
        low === "viewed" ||
        low.includes("be an early applicant") ||
        low.includes("actively reviewing applicants") ||
        low.includes("connections work here") ||
        low.includes("show match details") ||
        low.includes("tailor my resume") ||
        low.includes("create cover letter") ||
        low.includes("help me update my profile") ||
        low.includes("people you can reach out to") ||
        (low.includes("beta") && low.includes("is this information helpful")) ||
        low.includes("get job alerts for this search")
    );
}

function scoreJDNode(el, panelRect) {
    const text = normalizeText(el.innerText || "");
    if (!text || isNoiseText(text)) return -1;

    const rect = el.getBoundingClientRect();

    // Must be inside right panel
    if (rect.left < panelRect.left - 5) return -1;
    if (rect.right > panelRect.right + 5) return -1;
    if (rect.top < panelRect.top - 20) return -1;
    if (rect.bottom > panelRect.bottom + 20) return -1;

    let score = 0;
    score += text.length;

    const low = text.toLowerCase();

    if (looksLikeJDText(text)) score += 5000;
    if (low.includes("required qualifications")) score += 2500;
    if (low.includes("preferred qualifications")) score += 2500;
    if (low.includes("what you'll do")) score += 2000;
    if (low.includes("required skills")) score += 2000;
    if (low.includes("desired skills")) score += 1800;
    if (low.includes("skills and aptitudes")) score += 1800;
    if (low.includes("about the job")) score += 1200;
    if (low.includes("c++")) score += 100;
    if (low.includes("linux")) score += 100;

    return score;
}

function getJobDescriptionContainer() {
    const detailsPanel = getJobDetailsPanel();
    if (!detailsPanel) {
        console.log("LIH no details panel found");
        return null;
    }

    const panelRect = detailsPanel.getBoundingClientRect();

    // First preference: the actual expandable text spans
    const spanCandidates = Array.from(
        detailsPanel.querySelectorAll('span[data-testid="expandable-text-box"]')
    ).filter(isVisible);

    let best = null;
    let bestScore = -1;

    for (const el of spanCandidates) {
        const score = scoreJDNode(el, panelRect);
        if (score > bestScore) {
            bestScore = score;
            best = el;
        }
    }

    if (best) {
        console.log('LIH matched JD selector: span[data-testid="expandable-text-box"]');
        return best;
    }

    // Fallback: any text-heavy node inside right panel only
    const fallbackCandidates = Array.from(
        detailsPanel.querySelectorAll("div, section, article, span")
    ).filter(isVisible);

    for (const el of fallbackCandidates) {
        const score = scoreJDNode(el, panelRect);
        if (score > bestScore) {
            bestScore = score;
            best = el;
        }
    }

    if (best) {
        console.log("LIH matched fallback JD node");
        return best;
    }

    console.log("LIH no JD selector matched");
    return null;
}

function getDescriptionSignature() {
    const container = getJobDescriptionContainer();
    if (!container) return "";
    return normalizeText(container.innerText || "").slice(0, 2500);
}

function isDark() {
    return document.documentElement.classList.contains("theme--dark-lix");
}

// ===============================
// CLICK + NAVIGATION DETECTION
// ===============================
function observeClicks() {
    document.body.addEventListener(
        "click",
        (e) => {
            const card = e.target.closest(
                [
                    "[data-job-id]",
                    '[role="button"][componentkey*="job-card-component-ref"]',
                    ".jobs-search-results__list-item",
                    ".bc2c66ee"
                ].join(",")
            );

            if (!card) return;

            const clickedJobId =
                card.getAttribute("data-job-id") ||
                card.querySelector("[data-job-id]")?.getAttribute("data-job-id") ||
                null;

            if (clickedJobId) {
                window.currentJobId = clickedJobId;
            }

            setTimeout(() => {
                highlightJobs();
                triggerJobRefresh(true);
            }, 150);
        },
        true
    );
}

function observeUrlChanges() {
    if (window.highlighterData.urlObserver) return;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        onPossibleRouteChange();
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        onPossibleRouteChange();
    };

    window.addEventListener("popstate", onPossibleRouteChange);

    window.highlighterData.urlObserver = new MutationObserver(
        debounce(() => {
            if (location.href !== window.lastUrl) {
                onPossibleRouteChange();
            }
        }, 150)
    );

    window.highlighterData.urlObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function onPossibleRouteChange() {
    const newJobId = getJobIdFromPage();

    if (location.href === window.lastUrl && newJobId === window.currentJobId) {
        return;
    }

    window.lastUrl = location.href;
    window.currentJobId = newJobId || window.currentJobId;

    triggerJobRefresh(true);
}

function triggerJobRefresh(force = false) {
    if (window.waitPollTimer) {
        clearTimeout(window.waitPollTimer);
        window.waitPollTimer = null;
    }

    window.isHighlighting = false;

    const desc = getJobDescriptionContainer();
    if (desc) {
        removeHighlights(desc);
    }

    if (force) {
        window.lastDescriptionSignature = "";
    }

    reconnectJobDescriptionObserver();
    waitForDescriptionAndHighlight(force);
}

// ===============================
// JOB CARD HIGHLIGHT
// ===============================
function highlightJobs() {
    const dark = isDark();

    const possibleCards = Array.from(
        document.querySelectorAll(
            [
                ".jobs-search-results__list-item",
                '[data-view-name="search-entity-result-universal-template"]',
                '[role="button"][componentkey*="job-card-component-ref"]',
                '.bc2c66ee._76f3830b._1a7eb788',
                '[class*="job-card-container"]',
                '[class*="jobs-search-results"] [role="button"]'
            ].join(",")
        )
    ).filter(isVisible);

    possibleCards.forEach((card) => {
        const text = normalizeText(card.innerText || "");
        if (!text) return;

        const visibleCard = getVisualJobCard(card);
        if (!visibleCard) return;

        clearCardStyle(visibleCard);

        if (/\bApplied\b/i.test(text)) {
            applyStyle(visibleCard, dark ? "#0b5d1e" : "#c8f7c5", dark ? "white" : "black");
        } else if (/\bViewed\b/i.test(text)) {
            applyStyle(visibleCard, dark ? "#8a6d00" : "#fff176", "black");
        } else if (/\bSaved\b/i.test(text)) {
            applyStyle(visibleCard, dark ? "#005f73" : "#b2ebf2", dark ? "white" : "black");
        }
    });
}

function getVisualJobCard(node) {
    if (!node) return null;

    return (
        node.closest(".jobs-search-results__list-item") ||
        node.closest('[class*="job-card-container"]') ||
        node.closest('[role="button"][componentkey*="job-card-component-ref"]') ||
        node.closest(".bc2c66ee") ||
        node
    );
}

function applyStyle(card, bg, color) {
    card.style.setProperty("background-color", bg, "important");
    card.style.setProperty("color", color, "important");
    card.style.setProperty("border-radius", "10px", "important");
}

function clearCardStyle(card) {
    card.style.removeProperty("background-color");
    card.style.removeProperty("color");
    card.style.removeProperty("border-radius");
}

// ===============================
// OBSERVERS
// ===============================
function observeJobList() {
    window.highlighterData.domObserver?.disconnect();

    window.highlighterData.domObserver = new MutationObserver(
        debounce(() => {
            highlightJobs();

            const newJobId = getJobIdFromPage();
            if (newJobId && newJobId !== window.currentJobId) {
                window.currentJobId = newJobId;
                triggerJobRefresh(true);
                return;
            }

            const newSignature = getDescriptionSignature();
            if (
                newSignature &&
                newSignature !== window.lastDescriptionSignature &&
                !window.isHighlighting
            ) {
                window.lastDescriptionSignature = newSignature;
                refreshKeywordHighlight();
            }
        }, 250)
    );

    window.highlighterData.domObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function reconnectJobDescriptionObserver() {
    window.highlighterData.jobDescriptionObserver?.disconnect();

    const root = getJobRootContainer();
    if (!root) return;

    window.highlighterData.jobDescriptionObserver = new MutationObserver(
        debounce(() => {
            const desc = getJobDescriptionContainer();
            if (!desc) return;
            if (window.isHighlighting) return;

            const text = normalizeText(desc.innerText || "");
            if (text.length > 200) {
                const signature = getDescriptionSignature();
                if (signature && signature !== window.lastDescriptionSignature) {
                    window.lastDescriptionSignature = signature;
                    refreshKeywordHighlight();
                }
            }
        }, 300)
    );

    window.highlighterData.jobDescriptionObserver.observe(root, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// ===============================
// WAIT FOR REAL JD
// ===============================
function waitForDescriptionAndHighlight(force = false, attempts = 0) {
    const MAX_ATTEMPTS = 120;

    if (attempts >= MAX_ATTEMPTS) return;

    const desc = getJobDescriptionContainer();
    const isBusy = !!document.querySelector('[aria-busy="true"]');

    const hasRealDescription =
        !!desc &&
        isVisible(desc) &&
        normalizeText(desc.innerText || "").length > 300;

    if (hasRealDescription && !isBusy) {
        const newSignature = getDescriptionSignature();

        if (force || newSignature !== window.lastDescriptionSignature) {
            window.lastDescriptionSignature = newSignature;
            refreshKeywordHighlight();
        }
        return;
    }

    window.waitPollTimer = setTimeout(() => {
        waitForDescriptionAndHighlight(force, attempts + 1);
    }, 200);
}

// ===============================
// KEYWORD HIGHLIGHT
// ===============================
function refreshKeywordHighlight() {
    console.log("LIH refreshKeywordHighlight fired");

    if (window.isHighlighting) return;

    const container = getJobDescriptionContainer();
    console.log("LIH container found:", !!container);

    if (!container) return;

    const text = normalizeText(container.innerText || "");
    console.log("LIH container text length:", text.length);

    if (text.length < 300) return;

    window.isHighlighting = true;

    removeHighlights(container);
    highlightKeywords(window.highlighterData.keywords, container);

    console.log(
        "LIH highlighted spans now:",
        container.querySelectorAll(".highlighted-text").length
    );

    setTimeout(() => {
        window.isHighlighting = false;
    }, 400);
}

function highlightKeywords(keywords, container) {
    console.log("LIH highlightKeywords called");
    console.log("LIH keyword count:", (keywords || []).length);
    console.log("LIH first 10 keywords:", (keywords || []).slice(0, 10));
    console.log("LIH container exists:", !!container);

    if (!container) return;

    const allWords = [
        ...(keywords || []),
        ...restrictedWords,
        ...visaWords,
        ...salaryWords
    ]
        .map((k) => String(k).trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    if (!allWords.length) return;

    const escaped = allWords.map((k) =>
        k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );

    const regex = new RegExp(`(${escaped.join("|")})`, "gi");
    const salaryRegex = /\$\s?\d[\d,]*(\.\d+)?/g;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

    let node;
    const nodes = [];

    while ((node = walker.nextNode())) {
        if (!node.nodeValue || !node.nodeValue.trim()) continue;
        if (!node.parentNode) continue;
        if (node.parentNode.closest(".highlighted-text")) continue;
        if (node.parentNode.closest(".lih-wrapper")) continue;
        if (["SCRIPT", "STYLE"].includes(node.parentNode.nodeName)) continue;

        nodes.push(node);
    }

    nodes.forEach((node) => {
        const text = node.nodeValue;

        regex.lastIndex = 0;
        salaryRegex.lastIndex = 0;

        if (!regex.test(text) && !salaryRegex.test(text)) return;

        regex.lastIndex = 0;
        salaryRegex.lastIndex = 0;

        const html = text
            .replace(regex, (match) => {
                const word = match.toLowerCase();

                let bg = "yellow";
                let color = "black";

                if (restrictedWords.some((k) => word.includes(k))) {
                    bg = "red";
                    color = "white";
                } else if (visaWords.some((k) => word.includes(k))) {
                    bg = "#ff8800";
                    color = "black";
                } else if (salaryWords.some((k) => word.includes(k))) {
                    bg = "#00bcd4";
                    color = "white";
                }

                return `<span class="highlighted-text" style="background:${bg};color:${color};">${match}</span>`;
            })
            .replace(salaryRegex, (match) => {
                return `<span class="highlighted-text" style="background:#00bcd4;color:white;">${match}</span>`;
            });

        const wrapper = document.createElement("span");
        wrapper.className = "lih-wrapper";
        wrapper.innerHTML = html;

        node.parentNode.replaceChild(wrapper, node);
    });
}

// ===============================
// CLEANUP
// ===============================
function removeHighlights(container) {
    container.querySelectorAll(".highlighted-text").forEach((el) => {
        el.replaceWith(document.createTextNode(el.textContent));
    });

    container.querySelectorAll(".lih-wrapper").forEach((el) => {
        while (el.firstChild) {
            el.parentNode.insertBefore(el.firstChild, el);
        }
        el.remove();
    });

    container.normalize();
}

// ===============================
// START
// ===============================
function initializeHighlighter() {
    chrome.storage.local.get(["keywords"], ({ keywords = [] }) => {
        window.highlighterData.keywords = keywords;
        window.currentJobId = getJobIdFromPage();
        window.lastUrl = location.href;
        window.lastDescriptionSignature = "";

        observeJobList();
        observeClicks();
        observeUrlChanges();
        reconnectJobDescriptionObserver();

        highlightJobs();
        waitForDescriptionAndHighlight(true);
    });
}