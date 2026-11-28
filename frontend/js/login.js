// Dean of Students Impact Dashboard - Login page (S1)
// Checks the two fields, then signs the user in against the sample accounts.
//
// MOCK: There is no real UMBC sign-in yet (SRS 2.5.7). This page accepts any non-empty password
// for a known, active username in data/sample-users.json. The real password check must happen
// on the server, and the password must never be stored by the dashboard.

// ===== Constants =====

const USERS_URL = "data/sample-users.json";
const USERNAME_MAX_LENGTH = 32;
const PASSWORD_MAX_LENGTH = 128;
const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;

const MESSAGE_USERNAME_EMPTY = "Enter your UMBC username.";
const MESSAGE_USERNAME_LONG = "Use 32 characters or fewer.";
const MESSAGE_USERNAME_FORMAT = "Use letters and digits only.";
const MESSAGE_PASSWORD_EMPTY = "Enter your password.";
const MESSAGE_PASSWORD_LONG = "Use 128 characters or fewer.";
const MESSAGE_WRONG_CREDENTIALS = "Your username or password is incorrect.";
const MESSAGE_NOT_ACTIVE = "Your account is not active. Contact the Dean of Students Office.";
const MESSAGE_NO_HOME_PAGE = "You are signed in, but your home page is not built yet in this version.";
const MESSAGE_USERS_FAILED = "The sample accounts could not be loaded. Open this page through a local server (VS Code Live Server, or run: python -m http.server).";

// ===== Page elements (looked up once by cacheLoginElements, then reused) =====

const loginElements = {};

// Name: cacheLoginElements
// Desc: Finds every page element the login script needs.
// Precondition: The page has finished loading (this script runs at the end of the body).
// Postcondition: loginElements holds a reference to each field, message, and button.
function cacheLoginElements() {

    loginElements.form = document.getElementById("login-form");
    loginElements.usernameInput = document.getElementById("username");
    loginElements.passwordInput = document.getElementById("password");
    loginElements.usernameError = document.getElementById("username-error");
    loginElements.passwordError = document.getElementById("password-error");
    loginElements.formError = document.getElementById("form-error");
    loginElements.timeoutNote = document.getElementById("timeout-note");
    loginElements.signInButton = document.getElementById("sign-in");

}

// ===== Checking the fields (D1 and D2) =====

// Name: getUsernameProblem
// Desc: Checks the username against the rules for D1.
// Precondition: text is the username as typed.
// Postcondition: Returns "" if the username is fine, otherwise a one-line message saying what to fix.
function getUsernameProblem(text) {

    let problem = "";

    if (text.length === 0) {
        problem = MESSAGE_USERNAME_EMPTY;
    } else if (text.length > USERNAME_MAX_LENGTH) {
        problem = MESSAGE_USERNAME_LONG;
    } else if (!USERNAME_PATTERN.test(text)) {
        problem = MESSAGE_USERNAME_FORMAT;
    }

    return problem;

}

// Name: getPasswordProblem
// Desc: Checks the password against the rules for D2. Any characters are allowed.
// Precondition: text is the password as typed.
// Postcondition: Returns "" if the password is fine, otherwise a one-line message saying what to fix.
function getPasswordProblem(text) {

    let problem = "";

    if (text.length === 0) {
        problem = MESSAGE_PASSWORD_EMPTY;
    } else if (text.length > PASSWORD_MAX_LENGTH) {
        problem = MESSAGE_PASSWORD_LONG;
    }

    return problem;

}

// Name: showFieldProblem
// Desc: Shows or clears the red outline and message under one field.
// Precondition: input and errorElement belong to the same field; message is "" to clear.
// Postcondition: The field is outlined and its message shown, or both are cleared.
function showFieldProblem(input, errorElement, message) {

    if (message === "") {
        errorElement.hidden = true;
        errorElement.textContent = "";
        input.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
    } else {
        errorElement.textContent = message;
        errorElement.hidden = false;
        input.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
    }

}

// Name: showFormError
// Desc: Shows a red message above the Sign in button, or hides it.
// Precondition: message is "" to hide.
// Postcondition: The message is shown or hidden.
function showFormError(message) {

    loginElements.formError.textContent = message;
    loginElements.formError.hidden = (message === "");

}

// Name: checkBothFields
// Desc: Checks both fields and shows any problems.
// Precondition: loginElements has been filled.
// Postcondition: Returns true only if both fields are valid.
function checkBothFields() {

    const usernameProblem = getUsernameProblem(loginElements.usernameInput.value);
    const passwordProblem = getPasswordProblem(loginElements.passwordInput.value);

    showFieldProblem(loginElements.usernameInput, loginElements.usernameError, usernameProblem);
    showFieldProblem(loginElements.passwordInput, loginElements.passwordError, passwordProblem);

    const bothValid = usernameProblem === "" && passwordProblem === "";

    return bothValid;

}

// Name: updateSignInButton
// Desc: Turns the Sign in button on only when both fields are valid. Shows no messages.
// Precondition: loginElements has been filled.
// Postcondition: The button is enabled or disabled.
function updateSignInButton() {

    const usernameProblem = getUsernameProblem(loginElements.usernameInput.value);
    const passwordProblem = getPasswordProblem(loginElements.passwordInput.value);

    loginElements.signInButton.disabled = !(usernameProblem === "" && passwordProblem === "");

}

// ===== Signing in (MOCK) =====

// Name: loadUsers
// Desc: Loads the sample accounts.
// Precondition: USERS_URL points to the generated sample-users.json file.
// Postcondition: Returns the list of user records. Throws an error if the file cannot be loaded.
async function loadUsers() {

    const response = await fetch(USERS_URL);

    if (!response.ok) {
        throw new Error("HTTP " + response.status);
    }

    const fileData = await response.json();
    const users = fileData.users;

    return users;

}

// Name: findUser
// Desc: Finds a sample account by username, ignoring upper and lower case.
// Precondition: users is the list from loadUsers; username is text.
// Postcondition: Returns the user record, or null if there is no such username.
function findUser(users, username) {

    const wanted = username.toLowerCase();
    let foundUser = null;

    // Looks through the accounts until the username matches
    for (let i = 0; i < users.length && foundUser === null; i++) {

        if (users[i].username.toLowerCase() === wanted) {
            foundUser = users[i];
        }

    }

    return foundUser;

}

// Name: handleFormSubmit
// Desc: Runs when the form is submitted (Sign in button or Enter key). Signs the user in, or
//       shows what went wrong.
// Precondition: loginElements has been filled.
// Postcondition: A valid, active user is signed in and sent to their home page; otherwise a message is shown.
async function handleFormSubmit(event) {

    event.preventDefault();
    showFormError("");

    // Step 1: Stops if either field has a problem
    if (!checkBothFields()) {
        return;
    }

    // Step 2: Loads the sample accounts
    let users = [];
    try {
        users = await loadUsers();
    } catch (error) {
        showFormError(MESSAGE_USERS_FAILED);
        return;
    }

    // Step 3: Unknown username (the mock cannot check passwords, see the top of this file)
    const user = findUser(users, loginElements.usernameInput.value);
    if (user === null) {
        showFormError(MESSAGE_WRONG_CREDENTIALS);
        return;
    }

    // Step 4: Deactivated account
    if (!user.isActive) {
        showFormError(MESSAGE_NOT_ACTIVE);
        return;
    }

    // Step 5: Starts the session and opens the user's home page
    startSession(user);
    const homeHref = getHomeHref(user.role);

    if (homeHref === null) {
        endSession();
        showFormError(MESSAGE_NO_HOME_PAGE);
        return;
    }

    window.location.href = homeHref;

}

// ===== Other event handlers =====

// Name: handleUsernameBlur
// Desc: Checks the username when the user leaves the field.
// Precondition: loginElements has been filled.
// Postcondition: The username's message is shown or cleared.
function handleUsernameBlur() {
    showFieldProblem(loginElements.usernameInput, loginElements.usernameError, getUsernameProblem(loginElements.usernameInput.value));
}

// Name: handlePasswordBlur
// Desc: Checks the password when the user leaves the field.
// Precondition: loginElements has been filled.
// Postcondition: The password's message is shown or cleared.
function handlePasswordBlur() {
    showFieldProblem(loginElements.passwordInput, loginElements.passwordError, getPasswordProblem(loginElements.passwordInput.value));
}

// Name: handleFieldInput
// Desc: Runs on every key typed; updates the Sign in button and hides an old sign-in error.
// Precondition: loginElements has been filled.
// Postcondition: The button reflects whether both fields are valid.
function handleFieldInput() {
    showFormError("");
    updateSignInButton();
}

// ===== Start =====

// Name: init
// Desc: Starts the login page: theme, timeout note, and event handlers.
// Precondition: The page and scripts have finished loading.
// Postcondition: The page is ready for the user to sign in.
function init() {

    cacheLoginElements();
    applyTheme(getSavedTheme());

    // Shows the note after an idle sign-out
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === TIMEOUT_REASON) {
        loginElements.timeoutNote.hidden = false;
    }

    // Connects the fields and the form
    loginElements.usernameInput.addEventListener("blur", handleUsernameBlur);
    loginElements.passwordInput.addEventListener("blur", handlePasswordBlur);
    loginElements.usernameInput.addEventListener("input", handleFieldInput);
    loginElements.passwordInput.addEventListener("input", handleFieldInput);
    loginElements.form.addEventListener("submit", handleFormSubmit);

    loginElements.usernameInput.focus();

}

init();
