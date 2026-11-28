// Dean of Students Impact Dashboard - shared page shell
// Used by every page: theme, the signed-in session, the role-based sidebar, Log out, and the
// 30-minute idle timeout.
//
// MOCK: Until the Python backend exists there is no real sign-in. The session below is kept in
// sessionStorage only so the screens can be built and shown. Real sessions will live on the
// server, and the server (not this file) must enforce who can open what (SRS 7.1.1, 7.1.2).

// ===== Constants =====

const SESSION_STORAGE_KEY = "dashboard-session";
const LOGIN_PAGE = "login.html";
const TIMEOUT_REASON = "timeout";
const SESSION_TIMEOUT_MINUTES = 30;
const MILLISECONDS_PER_MINUTE = 60000;
const ROLE_ADMIN = "Administrator";
const ROLE_STAFF = "Unit Staff";
const ACCESS_DENIED_TITLE = "Access denied";

const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_UMBC = "umbc";
const THEME_RT = "rt";
const THEMES = [
    { id: THEME_UMBC, label: "UMBC" },
    { id: THEME_RT, label: "RT Dark" }
];

// Pages each role can open, in sidebar order. A page that is not built yet (isBuilt false) is
// shown greyed out. labelIsUnitName means the label is the signed-in user's own unit name.
const ADMIN_NAV = [
    { id: "overview", label: "Overview", href: "index.html", isBuilt: true, labelIsUnitName: false },
    { id: "unit", label: "Unit pages", href: "unit.html", isBuilt: false, labelIsUnitName: false },
    { id: "engagement", label: "Engagement & Belonging", href: "engagement.html", isBuilt: false, labelIsUnitName: false },
    { id: "history", label: "Upload History", href: "history.html", isBuilt: false, labelIsUnitName: false },
    { id: "admin", label: "Administration", href: "admin.html", isBuilt: false, labelIsUnitName: false }
];

const STAFF_NAV = [
    { id: "unit", label: "", href: "unit.html", isBuilt: false, labelIsUnitName: true },
    { id: "upload", label: "Upload Data", href: "upload.html", isBuilt: false, labelIsUnitName: false },
    { id: "history", label: "Upload History", href: "history.html", isBuilt: false, labelIsUnitName: false }
];

// ===== State and page elements =====

// onThemeChange is a function the page gives us so it can redraw its charts after a theme change
const shell = {
    onThemeChange: null
};

const shellElements = {};

// ===== Theme =====

// Name: getThemeLabel
// Desc: Finds the display label for a theme id.
// Precondition: themeId is text.
// Postcondition: Returns the label, or the id itself if the theme is unknown.
function getThemeLabel(themeId) {

    let label = themeId;
    let foundTheme = false;

    // Looks through THEMES until a match is found
    for (let i = 0; i < THEMES.length && !foundTheme; i++) {

        if (THEMES[i].id === themeId) {
            label = THEMES[i].label;
            foundTheme = true;
        }

    }

    return label;

}

// Name: getSavedTheme
// Desc: Reads the theme the user picked last time.
// Precondition: None.
// Postcondition: Returns the saved theme id, or the default theme if none is saved.
function getSavedTheme() {

    let themeId = localStorage.getItem(THEME_STORAGE_KEY);

    // Nothing saved yet, so use the default
    if (themeId === null) {
        themeId = THEME_UMBC;
    }

    return themeId;

}

// Name: applyTheme
// Desc: Switches the page to a theme and remembers the choice in the browser.
// Precondition: themeId matches an id in THEMES.
// Postcondition: The theme is applied; the theme button label is updated if the page has one.
function applyTheme(themeId) {

    // Sets the theme on the page and saves it
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);

    // Updates the button text to show the theme name (the login page has no theme button)
    if (shellElements.themeToggle) {
        shellElements.themeToggle.textContent = "Theme: " + getThemeLabel(themeId);
    }

}

// ===== Session (MOCK) =====

// Name: getSession
// Desc: Reads the signed-in session from the browser.
// Precondition: None.
// Postcondition: Returns the session object, or null if nobody is signed in.
function getSession() {

    let session = null;
    const savedText = sessionStorage.getItem(SESSION_STORAGE_KEY);

    // Nothing saved means nobody is signed in
    if (savedText !== null) {

        // Damaged text is treated the same as no session
        try {
            session = JSON.parse(savedText);
        } catch (error) {
            session = null;
        }

    }

    return session;

}

// Name: saveSession
// Desc: Saves the session in the browser.
// Precondition: session is an object with the user's details and a lastActive time.
// Postcondition: The session is stored for this browser tab.
function saveSession(session) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

// Name: startSession
// Desc: Starts a session for a user who just signed in.
// Precondition: user is a record from sample-users.json.
// Postcondition: A session with the user's name, role, and unit is saved, with the activity clock at "now".
function startSession(user) {

    const session = {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        unitId: user.unitId,
        unitName: user.unitName,
        lastActive: Date.now()
    };

    saveSession(session);

}

// Name: endSession
// Desc: Removes the session, which signs the user out.
// Precondition: None.
// Postcondition: No session is stored.
function endSession() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

// Name: isSessionExpired
// Desc: Checks whether the user has been idle for longer than the timeout.
// Precondition: session has a lastActive time in milliseconds.
// Postcondition: Returns true if the idle time is over SESSION_TIMEOUT_MINUTES.
function isSessionExpired(session) {

    const idleTime = Date.now() - session.lastActive;
    const limit = SESSION_TIMEOUT_MINUTES * MILLISECONDS_PER_MINUTE;
    const isExpired = idleTime > limit;

    return isExpired;

}

// Name: goToLogin
// Desc: Sends the browser to the login page.
// Precondition: reason is "" or TIMEOUT_REASON.
// Postcondition: The browser leaves this page; the login page shows a note if the reason is a timeout.
function goToLogin(reason) {

    let address = LOGIN_PAGE;

    if (reason !== "") {
        address = LOGIN_PAGE + "?reason=" + reason;
    }

    window.location.href = address;

}

// ===== Navigation by role =====

// Name: getNavItems
// Desc: Gets the sidebar items a role may see.
// Precondition: role is ROLE_ADMIN or ROLE_STAFF.
// Postcondition: Returns the list of items for that role, or an empty list for an unknown role.
function getNavItems(role) {

    let items = [];

    if (role === ROLE_ADMIN) {
        items = ADMIN_NAV;
    } else if (role === ROLE_STAFF) {
        items = STAFF_NAV;
    }

    return items;

}

// Name: findNavItem
// Desc: Finds a role's sidebar item by page id.
// Precondition: pageId is text such as "overview".
// Postcondition: Returns the item, or null if the role may not open that page.
function findNavItem(role, pageId) {

    const items = getNavItems(role);
    let foundItem = null;

    // Looks through the role's items until the page id matches
    for (let i = 0; i < items.length && foundItem === null; i++) {

        if (items[i].id === pageId) {
            foundItem = items[i];
        }

    }

    return foundItem;

}

// Name: getHomeHref
// Desc: Finds the first page of a role that is built, to use as its home page.
// Precondition: role is ROLE_ADMIN or ROLE_STAFF.
// Postcondition: Returns the page address, or null if none of the role's pages are built yet.
function getHomeHref(role) {

    const items = getNavItems(role);
    let homeHref = null;

    // Takes the first built page
    for (let i = 0; i < items.length && homeHref === null; i++) {

        if (items[i].isBuilt) {
            homeHref = items[i].href;
        }

    }

    return homeHref;

}

// ===== Building the sidebar =====

// Name: makeShellElement
// Desc: Creates an element with optional CSS class and text (set as text, never as HTML).
// Precondition: tagName is an HTML tag name; className and text may be "".
// Postcondition: Returns the new element, not yet added to the page.
function makeShellElement(tagName, className, text) {

    const element = document.createElement(tagName);

    if (className !== "") {
        element.className = className;
    }

    element.textContent = text;

    return element;

}

// Name: getNavLabel
// Desc: Gets the text shown for a sidebar item.
// Precondition: item is an entry from ADMIN_NAV or STAFF_NAV; session is the signed-in session.
// Postcondition: Returns the unit name for the unit staff's own page, otherwise the item's label.
function getNavLabel(item, session) {

    let label = item.label;

    if (item.labelIsUnitName) {
        label = session.unitName;
    }

    return label;

}

// Name: buildNavList
// Desc: Builds the list of sidebar links for the signed-in user.
// Precondition: session is the signed-in session; pageId is the page being shown.
// Postcondition: Returns a <ul> with one link per page the role may open. The current page is marked.
function buildNavList(session, pageId) {

    const list = makeShellElement("ul", "nav-list", "");
    const items = getNavItems(session.role);

    for (let i = 0; i < items.length; i++) {

        const listItem = document.createElement("li");
        const link = makeShellElement("a", "nav-link", getNavLabel(items[i], session));

        if (!items[i].isBuilt) {

            // A page that is not built yet cannot be opened
            link.classList.add("disabled");
            link.setAttribute("aria-disabled", "true");
            link.title = "Coming soon";

        } else {

            link.href = items[i].href;

            // Marks the page the user is on
            if (items[i].id === pageId) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
            }

        }

        listItem.appendChild(link);
        list.appendChild(listItem);

    }

    return list;

}

// Name: getAccountName
// Desc: Builds the short name shown in the account area, such as "J. Rivera".
// Precondition: session has firstName and lastName (firstName is not empty).
// Postcondition: Returns the first initial, a period, a space, and the last name.
function getAccountName(session) {
    const accountName = session.firstName.charAt(0) + ". " + session.lastName;
    return accountName;
}

// Name: getAccountRole
// Desc: Builds the role line shown in the account area.
// Precondition: session has a role, and a unitName for Unit Staff.
// Postcondition: Returns "Administrator", or "Unit Staff · {unit name}" for Unit Staff.
function getAccountRole(session) {

    let roleLine = session.role;

    if (session.role === ROLE_STAFF) {
        roleLine = session.role + " · " + session.unitName;
    }

    return roleLine;

}

// Name: buildAccountArea
// Desc: Builds the bottom of the sidebar: who is signed in, the theme button, and Log out.
// Precondition: session is the signed-in session.
// Postcondition: Returns the account <div>; shellElements.themeToggle and shellElements.logoutButton are set.
function buildAccountArea(session) {

    const area = makeShellElement("div", "account", "");

    area.appendChild(makeShellElement("p", "account-name", "Signed in as " + getAccountName(session)));
    area.appendChild(makeShellElement("p", "account-role", getAccountRole(session)));

    shellElements.themeToggle = makeShellElement("button", "theme-toggle", "");
    shellElements.themeToggle.type = "button";
    area.appendChild(shellElements.themeToggle);

    shellElements.logoutButton = makeShellElement("button", "logout-button", "Log out");
    shellElements.logoutButton.type = "button";
    area.appendChild(shellElements.logoutButton);

    return area;

}

// Name: buildSidebar
// Desc: Fills the empty sidebar element with the brand, the role's links, and the account area.
// Precondition: The page has <nav id="sidebar">; session is the signed-in session.
// Postcondition: The sidebar is built and the theme button shows the current theme.
function buildSidebar(session, pageId) {

    // Brand block
    const brand = makeShellElement("div", "brand", "Dean of Students");
    brand.appendChild(makeShellElement("span", "", "Impact Dashboard"));

    shellElements.sidebar.appendChild(brand);
    shellElements.sidebar.appendChild(buildNavList(session, pageId));
    shellElements.sidebar.appendChild(buildAccountArea(session));

    // The theme button was just created, so it needs its label
    shellElements.themeToggle.textContent = "Theme: " + getThemeLabel(getSavedTheme());

}

// ===== Access denied =====

// Name: showAccessDenied
// Desc: Replaces the page content with an access-denied message and a link to the user's home page.
// Precondition: shellElements.main is the <main> element; session is the signed-in session.
// Postcondition: The page content is gone; only the message and link remain.
function showAccessDenied(session) {

    // Removes everything inside <main>
    while (shellElements.main.firstChild) {
        shellElements.main.removeChild(shellElements.main.firstChild);
    }

    const message = makeShellElement("section", "access-denied", "");
    message.appendChild(makeShellElement("h1", "", ACCESS_DENIED_TITLE));
    message.appendChild(makeShellElement("p", "", "Your account (" + getAccountRole(session) + ") cannot open this page."));

    // Links back to the user's home page when one is available
    const homeHref = getHomeHref(session.role);
    if (homeHref !== null) {
        const link = makeShellElement("a", "", "Go to your home page");
        link.href = homeHref;
        message.appendChild(link);
    }

    shellElements.main.appendChild(message);

}

// ===== Event handlers =====

// Name: handleThemeToggleClick
// Desc: Runs when the theme button is clicked; switches to the other theme.
// Precondition: startShell has run.
// Postcondition: The other theme is applied and the page is told so it can redraw its charts.
function handleThemeToggleClick() {

    const current = document.documentElement.getAttribute("data-theme");

    // Picks the theme that is not showing right now
    let next = THEME_UMBC;
    if (current === THEME_UMBC) {
        next = THEME_RT;
    }

    applyTheme(next);

    // Charts read their colors when drawn, so the page redraws them
    if (shell.onThemeChange !== null) {
        shell.onThemeChange();
    }

}

// Name: handleLogoutClick
// Desc: Runs when Log out is clicked; ends the session and returns to the login page.
// Precondition: startShell has run.
// Postcondition: The session is removed and the browser goes to the login page.
function handleLogoutClick() {
    endSession();
    goToLogin("");
}

// Name: handleUserActivity
// Desc: Runs on every click or key press. If the user was idle too long, signs them out;
//       otherwise restarts the idle clock.
// Precondition: startShell has run.
// Postcondition: Either the session's lastActive time is now, or the user is sent to the login page.
function handleUserActivity() {

    const session = getSession();

    if (session === null) {
        goToLogin("");
    } else if (isSessionExpired(session)) {
        endSession();
        goToLogin(TIMEOUT_REASON);
    } else {
        session.lastActive = Date.now();
        saveSession(session);
    }

}

// Name: handlePageShow
// Desc: Runs when the browser shows a page again from its back/forward cache, so a signed-out
//       user cannot see an old page by pressing Back.
// Precondition: startShell has run.
// Postcondition: A user with no session is sent to the login page.
function handlePageShow(event) {

    if (event.persisted && getSession() === null) {
        goToLogin("");
    }

}

// ===== Start =====

// Name: startShell
// Desc: Starts the shared parts of a page: theme, session check, sidebar, and access check.
// Precondition: The page has <nav id="sidebar"> and <main id="main">; pageId matches an id in the nav lists.
// Postcondition: Returns true if the page may continue loading. Returns false if the user was sent to
//                the login page or shown "Access denied"; the page must then stop.
function startShell(pageId, onThemeChange) {

    shellElements.sidebar = document.getElementById("sidebar");
    shellElements.main = document.getElementById("main");
    shell.onThemeChange = onThemeChange;

    // Step 1: Applies the saved theme before anything is drawn
    applyTheme(getSavedTheme());

    // Step 2: Nobody signed in, or idle too long, means back to login
    const session = getSession();
    if (session === null) {
        goToLogin("");
        return false;
    }

    if (isSessionExpired(session)) {
        endSession();
        goToLogin(TIMEOUT_REASON);
        return false;
    }

    // Step 3: Restarts the idle clock for this page load
    session.lastActive = Date.now();
    saveSession(session);

    // Step 4: Builds the sidebar and connects its buttons
    buildSidebar(session, pageId);
    shellElements.themeToggle.addEventListener("click", handleThemeToggleClick);
    shellElements.logoutButton.addEventListener("click", handleLogoutClick);

    // Step 5: Watches for activity and for the Back button
    document.addEventListener("click", handleUserActivity);
    document.addEventListener("keydown", handleUserActivity);
    window.addEventListener("pageshow", handlePageShow);

    // Step 6: Pages the role cannot open show "Access denied"
    const navItem = findNavItem(session.role, pageId);
    if (navItem === null) {
        showAccessDenied(session);
        return false;
    }

    return true;

}
