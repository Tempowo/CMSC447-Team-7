// Dean of Students Impact Dashboard - Overview page
// Reads one JSON file of aggregated numbers and draws the table and charts.
// To use real data later, only DATA_URL (and the loadData function) should need to change.

// ===== Constants =====

const DATA_URL = "data/sample-data.json";
const ALL_UNITS_KEY = "all";
const PERCENT_DECIMALS = 1;
const NO_CHANGE_TEXT = "-";

// ===== State (everything that can change while the page is open) =====

const state = {
    data: null,
    semester: null,
    participationUnit: ALL_UNITS_KEY,
    shareAsEnrollment: false,
    charts: {}
};

// ===== Page elements (looked up once by cacheElements, then reused) =====

const elements = {};

// Name: cacheElements
// Desc: Finds every page element the script needs and saves it in the elements object.
// Precondition: The page has finished loading (this script runs at the end of the body).
// Postcondition: elements holds a reference to each control, card, table, and canvas.
function cacheElements() {

    // Controls
    elements.errorMessage = document.getElementById("error-message");
    elements.semesterSelect = document.getElementById("semester-select");

    // Key number cards
    elements.kpiUnique = document.getElementById("kpi-unique");
    elements.kpiUniqueSub = document.getElementById("kpi-unique-sub");
    elements.kpiMulti = document.getElementById("kpi-multi");
    elements.kpiMultiSub = document.getElementById("kpi-multi-sub");
    elements.kpiLargest = document.getElementById("kpi-largest");
    elements.kpiLargestSub = document.getElementById("kpi-largest-sub");

    // Table body
    elements.unitTableBody = document.getElementById("unit-table-body");

}

// ===== Small helpers =====

// Name: formatNumber
// Desc: Formats a whole number with commas (example: 5230 becomes 5,230).
// Precondition: value is a number.
// Postcondition: Returns the formatted text.
function formatNumber(value) {

    // Adds the commas
    const formatted = value.toLocaleString("en-US");

    return formatted;

}

// Name: formatPercent
// Desc: Formats a fraction as a percent (example: 0.372 becomes 37.2%).
// Precondition: fraction is a number (0.5 means 50%).
// Postcondition: Returns the formatted text.
function formatPercent(fraction) {

    // Converts to a percent, rounds, and adds the % sign
    const percentText = (fraction * 100).toFixed(PERCENT_DECIMALS) + "%";

    return percentText;

}

// Name: getUnitName
// Desc: Looks up a unit's display name from its id.
// Precondition: state.data is loaded.
// Postcondition: Returns the unit's name, or the id itself if no match is found.
function getUnitName(unitId) {

    // Starts with the id so the page still works if a unit is missing from the list
    let name = unitId;
    let foundUnit = false;

    // Looks through the units list until a match is found
    for (let i = 0; i < state.data.units.length && !foundUnit; i++) {

        if (state.data.units[i].id === unitId) {
            name = state.data.units[i].name;
            foundUnit = true;
        }

    }

    return name;

}

// Name: getPreviousSemester
// Desc: Finds the semester listed just before the selected one.
// Precondition: state.data and state.semester are set.
// Postcondition: Returns the earlier semester's name, or null if there is none.
function getPreviousSemester() {

    const index = state.data.semesters.indexOf(state.semester);

    // The first semester has nothing before it
    let previous = null;
    if (index > 0) {
        previous = state.data.semesters[index - 1];
    }

    return previous;

}

// Name: fillSelect
// Desc: Fills a <select> element with options and selects one of them.
// Precondition: selectElement exists; options is a list of {value, label}.
// Postcondition: The dropdown shows the options with selectedValue chosen.
function fillSelect(selectElement, options, selectedValue) {

    // Removes any old options
    selectElement.textContent = "";

    // Adds one <option> per entry
    for (let i = 0; i < options.length; i++) {
        const optionElement = document.createElement("option");
        optionElement.value = options[i].value;
        optionElement.textContent = options[i].label;
        optionElement.selected = (options[i].value === selectedValue);
        selectElement.appendChild(optionElement);
    }

}

// Name: makeCell
// Desc: Creates a table cell (<td> or <th>) holding plain text.
// Precondition: tagName is "td" or "th"; className may be an empty string.
// Postcondition: Returns the new cell (not yet added to the page).
function makeCell(tagName, text, className) {

    const cell = document.createElement(tagName);

    // textContent treats the text as plain text, never as HTML
    cell.textContent = text;

    if (className !== "") {
        cell.className = className;
    }

    return cell;

}

// Name: showError
// Desc: Shows a readable error message at the top of the page.
// Precondition: message is text; elements has been filled by cacheElements.
// Postcondition: The error paragraph is visible with the message.
function showError(message) {

    elements.errorMessage.textContent = message;
    elements.errorMessage.hidden = false;

}

// ===== Data =====

// Name: loadData
// Desc: Downloads the dashboard numbers from DATA_URL.
// Precondition: The page is served by a web server (not opened by double-clicking the file).
// Postcondition: Returns the parsed JSON object, or throws an error if it fails.
async function loadData() {

    // Asks the server for the file and waits for the answer
    const response = await fetch(DATA_URL);

    if (!response.ok) {
        throw new Error("Could not load " + DATA_URL + " (status " + response.status + ").");
    }

    // Turns the file's text into a JavaScript object
    const data = await response.json();

    return data;

}

// ===== Setup =====

// Name: init
// Desc: Starts the page: applies the saved theme, loads data, and draws everything.
// Precondition: The page and scripts have finished loading.
// Postcondition: The dashboard is shown, or an error message explains what went wrong.
async function init() {

    // Saves references to the page elements
    cacheElements();

    // Loads the data; shows an error and stops if it fails
    try {
        state.data = await loadData();
    } catch (error) {
        showError("The dashboard data could not be loaded. Open this page through a local server " +
            "(VS Code Live Server, or run: python -m http.server) instead of double-clicking the file. " +
            "Details: " + error.message);
        return;
    }

    // Starts on the most recent semester in the data
    state.semester = state.data.semesters[state.data.semesters.length - 1];


}

init();
