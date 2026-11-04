// Dean of Students Impact Dashboard - Overview page
// Reads one JSON file of aggregated numbers and draws the table and charts.
// To use real data later, only DATA_URL (and the loadData function) should need to change.

// ===== Constants =====

const DATA_URL = "data/sample-data.json";
const THEME_STORAGE_KEY = "dashboard-theme";
const THEME_UMBC = "umbc";
const THEME_RT = "rt";
const THEMES = [
    { id: THEME_UMBC, label: "UMBC" },
    { id: THEME_RT, label: "RT Dark" }
];
const ALL_UNITS_KEY = "all";
const PERCENT_DECIMALS = 1;
const NO_CHANGE_TEXT = "-";
const LINE_TENSION = 0.25;
const REPEAT_LINE_DASH = [6, 4];
const SERIES_COLOR_COUNT = 7;
const POINT_STYLES = ["circle", "rect", "triangle", "rectRot", "star", "cross", "crossRot"];
const POINT_RADIUS = 5;

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
    elements.participationUnitSelect = document.getElementById("participation-unit");
    elements.shareToggle = document.getElementById("share-toggle");
    elements.themeToggle = document.getElementById("theme-toggle");

    // Key number cards
    elements.kpiUnique = document.getElementById("kpi-unique");
    elements.kpiUniqueSub = document.getElementById("kpi-unique-sub");
    elements.kpiMulti = document.getElementById("kpi-multi");
    elements.kpiMultiSub = document.getElementById("kpi-multi-sub");
    elements.kpiLargest = document.getElementById("kpi-largest");
    elements.kpiLargestSub = document.getElementById("kpi-largest-sub");

    // Table body
    elements.unitTableBody = document.getElementById("unit-table-body");

    // Chart canvases
    elements.participationCanvas = document.getElementById("participation-chart");
    elements.participationNote = document.getElementById("participation-note");
    elements.unitTrendCanvas = document.getElementById("unit-trend-chart");
    elements.shareCanvas = document.getElementById("share-chart");
    elements.trendCanvas = document.getElementById("trend-chart");

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

// Name: roundPercent
// Desc: Rounds a percent value (already multiplied by 100) for use in a chart.
// Precondition: value is a number.
// Postcondition: Returns the rounded number.
function roundPercent(value) {

    // toFixed gives text, so Number turns it back into a number
    const rounded = Number(value.toFixed(PERCENT_DECIMALS));

    return rounded;

}

// Name: formatPercentTick
// Desc: Adds a % sign to a chart axis label.
// Precondition: value is a number.
// Postcondition: Returns the label text.
function formatPercentTick(value) {

    const tickText = value + "%";

    return tickText;

}

// Name: sortByPercentDescending
// Desc: Comparison function that puts the largest percent first.
// Precondition: a and b each have a numeric percent property.
// Postcondition: Returns a negative, zero, or positive number for Array.sort.
function sortByPercentDescending(a, b) {

    const difference = b.percent - a.percent;

    return difference;

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

// Name: getThemeColors
// Desc: Reads the current theme's chart colors from the CSS variables.
// Precondition: A theme is set on the <html> element.
// Postcondition: Returns an object of color strings for the charts to use.
function getThemeColors() {

    const styles = getComputedStyle(document.documentElement);

    // Reads the numbered line colors (--chart-series-1, --chart-series-2, and so on)
    const series = [];
    for (let i = 1; i <= SERIES_COLOR_COUNT; i++) {
        series.push(styles.getPropertyValue("--chart-series-" + i).trim());
    }

    const colors = {
        bar: styles.getPropertyValue("--chart-bar").trim(),
        lineA: styles.getPropertyValue("--chart-line-a").trim(),
        lineB: styles.getPropertyValue("--chart-line-b").trim(),
        text: styles.getPropertyValue("--chart-text").trim(),
        grid: styles.getPropertyValue("--chart-grid").trim(),
        series: series
    };

    return colors;

}

// Name: applyTheme
// Desc: Switches the page to a theme and remembers the choice in the browser.
// Precondition: themeId matches an id in THEMES.
// Postcondition: The theme is applied; the toggle button label is updated.
function applyTheme(themeId) {

    // Sets the theme on the page and saves it
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);

    // Updates the button text to show the theme name
    elements.themeToggle.textContent = "Theme: " + getThemeLabel(themeId);

}

// ===== Chart helpers =====

// Name: drawChart
// Desc: Draws a Chart.js chart, replacing any earlier chart with the same key.
// Precondition: Chart.js is loaded; canvas is a <canvas> element.
// Postcondition: The chart is drawn and stored in state.charts under chartKey.
function drawChart(chartKey, canvas, config) {

    // Removes the old chart first so charts do not stack up
    if (state.charts[chartKey]) {
        state.charts[chartKey].destroy();
    }

    state.charts[chartKey] = new Chart(canvas, config);

}

// Name: makeBarData
// Desc: Builds the labels and values a horizontal bar chart needs.
// Precondition: rows is a list of {label, percent}; colors comes from getThemeColors.
// Postcondition: Returns a Chart.js data object.
function makeBarData(rows, colors) {

    const labels = [];
    const percents = [];

    // Splits the rows into two parallel lists
    for (let i = 0; i < rows.length; i++) {
        labels.push(rows[i].label);
        percents.push(roundPercent(rows[i].percent));
    }

    const chartData = {
        labels: labels,
        datasets: [{
            data: percents,
            backgroundColor: colors.bar
        }]
    };

    return chartData;

}

// Name: makeBarOptions
// Desc: Builds shared options for the horizontal percent bar charts.
// Precondition: colors comes from getThemeColors.
// Postcondition: Returns a Chart.js options object.
function makeBarOptions(colors) {

    const options = {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { color: colors.text, callback: formatPercentTick },
                grid: { color: colors.grid }
            },
            y: {
                ticks: { color: colors.text },
                grid: { display: false }
            }
        }
    };

    return options;

}

// ===== Rendering =====

// Name: renderKpis
// Desc: Fills in the three key-number cards for the selected semester.
// Precondition: state.data and state.semester are set.
// Postcondition: The three KPI cards show current numbers.
function renderKpis() {

    const reach = state.data.reach[state.semester];
    const enrollment = state.data.enrollment[state.semester];
    const stats = state.data.unitStats[state.semester];
    const multiUnit = reach.two + reach.threePlus;

    // Finds the unit with the most students served
    let largestId = null;
    for (const unitId in stats) {

        if (largestId === null || stats[unitId].studentsServed > stats[largestId].studentsServed) {
            largestId = unitId;
        }

    }

    // Unique students reached
    elements.kpiUnique.textContent = formatNumber(reach.unique);
    elements.kpiUniqueSub.textContent = formatPercent(reach.unique / enrollment) + " of enrolled students";

    // Students served by more than one unit
    elements.kpiMulti.textContent = formatNumber(multiUnit);
    elements.kpiMultiSub.textContent = formatPercent(multiUnit / reach.unique) + " of students reached";

    // Largest unit
    elements.kpiLargest.textContent = getUnitName(largestId);
    elements.kpiLargestSub.textContent = formatNumber(stats[largestId].studentsServed) + " students served";

}

// Name: renderUnitTable
// Desc: Builds one table row per unit for the selected semester.
// Precondition: state.data and state.semester are set.
// Postcondition: The table body lists every unit with its numbers.
function renderUnitTable() {

    const enrollment = state.data.enrollment[state.semester];
    const previousSemester = getPreviousSemester();

    // Removes the old rows
    elements.unitTableBody.textContent = "";

    // Builds one row for each unit
    for (let i = 0; i < state.data.units.length; i++) {
        const unit = state.data.units[i];
        const served = state.data.unitStats[state.semester][unit.id].studentsServed;

        // Works out the change versus the prior semester (if there is one)
        let changeText = NO_CHANGE_TEXT;
        let changeClass = "";
        if (previousSemester !== null) {
            const before = state.data.unitStats[previousSemester][unit.id].studentsServed;

            // Skips the change when the earlier count is zero (cannot divide by zero)
            if (before > 0) {
                const change = (served - before) / before;
                changeText = (change * 100).toFixed(PERCENT_DECIMALS) + "%";

                if (change >= 0) {
                    changeText = "+" + changeText;
                    changeClass = "positive";
                } else {
                    changeClass = "negative";
                }
            }
        }

        // Creates the cells and adds the row to the table
        const row = document.createElement("tr");
        const nameCell = makeCell("th", unit.name, "");
        nameCell.setAttribute("scope", "row");
        row.appendChild(nameCell);
        row.appendChild(makeCell("td", formatNumber(served), "num"));
        row.appendChild(makeCell("td", formatPercent(served / enrollment), "num"));
        row.appendChild(makeCell("td", changeText, "num " + changeClass));
        elements.unitTableBody.appendChild(row);
    }

}

// Name: renderParticipationChart
// Desc: Draws the percent of each population participating, for all units or one unit.
// Precondition: state.data, state.semester, and state.participationUnit are set.
// Postcondition: The participation bar chart is redrawn.
function renderParticipationChart() {

    const colors = getThemeColors();
    const unitKey = state.participationUnit;
    const populations = state.data.participation[state.semester];

    // Turns each population's participant count into a percent of that population
    const rows = [];
    for (let i = 0; i < populations.length; i++) {
        rows.push({
            label: populations[i].population,
            percent: (populations[i].participants[unitKey] / populations[i].enrolled) * 100
        });
    }

    // Puts the largest percent first
    rows.sort(sortByPercentDescending);

    drawChart("participation", elements.participationCanvas, {
        type: "bar",
        data: makeBarData(rows, colors),
        options: makeBarOptions(colors)
    });

    // Shows the overall rate under the chart so each bar can be compared with it
    renderParticipationNote();

}

// Name: renderShareChart
// Desc: Draws each unit's share, as a share of the portfolio or of total enrollment.
// Precondition: state.data, state.semester, and state.shareAsEnrollment are set.
// Postcondition: The unit share bar chart is redrawn.
function renderShareChart() {

    const colors = getThemeColors();
    const stats = state.data.unitStats[state.semester];

    // The comparison base is either total enrollment, or every unit's students added together
    let base = state.data.enrollment[state.semester];
    if (!state.shareAsEnrollment) {
        base = 0;
        for (const unitId in stats) {
            base = base + stats[unitId].studentsServed;
        }
    }

    // Turns each unit's count into a percent of the base
    const rows = [];
    for (const unitId in stats) {
        rows.push({
            label: getUnitName(unitId),
            percent: (stats[unitId].studentsServed / base) * 100
        });
    }

    // Puts the largest percent first
    rows.sort(sortByPercentDescending);

    drawChart("share", elements.shareCanvas, {
        type: "bar",
        data: makeBarData(rows, colors),
        options: makeBarOptions(colors)
    });

}

// Name: renderTrendChart
// Desc: Draws Retriever Essentials unique and repeat students for each month.
// Precondition: state.data and state.semester are set.
// Postcondition: The monthly line chart is redrawn.
function renderTrendChart() {

    const colors = getThemeColors();
    const months = state.data.monthlyEssentials[state.semester];

    // Splits the monthly records into three parallel lists
    const monthNames = [];
    const uniqueCounts = [];
    const repeatCounts = [];
    for (let i = 0; i < months.length; i++) {
        monthNames.push(months[i].month);
        uniqueCounts.push(months[i].unique);
        repeatCounts.push(months[i].repeat);
    }

    drawChart("trend", elements.trendCanvas, {
        type: "line",
        data: {
            labels: monthNames,
            datasets: [
                {
                    label: "Unique students",
                    data: uniqueCounts,
                    borderColor: colors.lineA,
                    backgroundColor: colors.lineA,
                    tension: LINE_TENSION
                },
                {
                    label: "Repeat students",
                    data: repeatCounts,
                    borderColor: colors.lineB,
                    backgroundColor: colors.lineB,
                    borderDash: REPEAT_LINE_DASH,
                    tension: LINE_TENSION
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: colors.text } }
            },
            scales: {
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
                y: { beginAtZero: true, ticks: { color: colors.text }, grid: { color: colors.grid } }
            }
        }
    });

}

// Name: getOverallParticipationFraction
// Desc: Works out the share of ALL enrolled students who participate (all units, or the chosen unit).
// Precondition: state.data, state.semester, and state.participationUnit are set.
// Postcondition: Returns a fraction (0.368 means 36.8%).
function getOverallParticipationFraction() {

    const enrollment = state.data.enrollment[state.semester];

    // For all units, use the unique students reached; for one unit, use that unit's students served
    let participants = state.data.reach[state.semester].unique;
    if (state.participationUnit !== ALL_UNITS_KEY) {
        participants = state.data.unitStats[state.semester][state.participationUnit].studentsServed;
    }

    const fraction = participants / enrollment;

    return fraction;

}

// Name: renderParticipationNote
// Desc: Writes the overall participation rate under the participation chart.
// Precondition: state.data, state.semester, and state.participationUnit are set.
// Postcondition: The note explains how to read each bar against the overall rate.
function renderParticipationNote() {

    const overallFraction = getOverallParticipationFraction();

    elements.participationNote.textContent = "Overall rate: " + formatPercent(overallFraction) +
        " of enrolled students. A population below this rate is participating less than average.";

}

// Name: getUnitStudentsServed
// Desc: Looks up how many students a unit served in a semester.
// Precondition: state.data is loaded.
// Postcondition: Returns the count, or null if that unit has no data for that semester.
function getUnitStudentsServed(unitId, semester) {

    // A missing value becomes null so the chart shows a gap instead of failing
    let count = null;

    if (state.data.unitStats[semester] !== undefined && state.data.unitStats[semester][unitId] !== undefined) {
        count = state.data.unitStats[semester][unitId].studentsServed;
    }

    return count;

}

// Name: renderUnitTrendChart
// Desc: Draws one line per unit showing students served in every semester.
// Precondition: state.data is loaded.
// Postcondition: The unit trend line chart is redrawn.
function renderUnitTrendChart() {

    const colors = getThemeColors();
    const semesters = state.data.semesters;

    // Builds one line (dataset) for each unit
    const datasets = [];
    for (let i = 0; i < state.data.units.length; i++) {
        const unit = state.data.units[i];

        // Collects this unit's count for every semester
        const counts = [];
        for (let j = 0; j < semesters.length; j++) {
            counts.push(getUnitStudentsServed(unit.id, semesters[j]));
        }

        // Each unit gets its own color and point shape (the % wraps around if there are more units than colors)
        datasets.push({
            label: unit.name,
            data: counts,
            borderColor: colors.series[i % colors.series.length],
            backgroundColor: colors.series[i % colors.series.length],
            pointStyle: POINT_STYLES[i % POINT_STYLES.length],
            pointRadius: POINT_RADIUS,
            tension: LINE_TENSION
        });
    }

    drawChart("unitTrend", elements.unitTrendCanvas, {
        type: "line",
        data: {
            labels: semesters,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom", labels: { color: colors.text, usePointStyle: true } }
            },
            scales: {
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
                y: { beginAtZero: true, ticks: { color: colors.text }, grid: { color: colors.grid } }
            }
        }
    });

}

// Name: renderAll
// Desc: Redraws every part of the page for the current choices.
// Precondition: state.data and state.semester are set.
// Postcondition: KPIs, table, and all three charts match the current state.
function renderAll() {

    renderKpis();
    renderUnitTable();
    renderParticipationChart();
    renderShareChart();
    renderTrendChart();
    renderUnitTrendChart();

}

// ===== Event handlers =====

// Name: handleSemesterChange
// Desc: Runs when the semester dropdown changes.
// Precondition: state.data is loaded.
// Postcondition: The whole page is redrawn for the new semester.
function handleSemesterChange() {

    state.semester = elements.semesterSelect.value;
    renderAll();

}

// Name: handleParticipationUnitChange
// Desc: Runs when the participation chart's unit dropdown changes.
// Precondition: state.data is loaded.
// Postcondition: Only the participation chart is redrawn.
function handleParticipationUnitChange() {

    state.participationUnit = elements.participationUnitSelect.value;
    renderParticipationChart();

}

// Name: handleShareToggleChange
// Desc: Runs when the "compare to total student population" checkbox changes.
// Precondition: state.data is loaded.
// Postcondition: Only the unit share chart is redrawn.
function handleShareToggleChange() {

    state.shareAsEnrollment = elements.shareToggle.checked;
    renderShareChart();

}

// Name: handleThemeToggleClick
// Desc: Runs when the theme button is clicked; switches to the other theme.
// Precondition: elements has been filled by cacheElements.
// Postcondition: The other theme is applied; charts are redrawn if data is loaded.
function handleThemeToggleClick() {

    const current = document.documentElement.getAttribute("data-theme");

    // Picks the theme that is not showing right now
    let next = THEME_UMBC;
    if (current === THEME_UMBC) {
        next = THEME_RT;
    }

    applyTheme(next);

    // Charts read their colors when drawn, so they need to be redrawn
    if (state.data !== null) {
        renderAll();
    }

}

// ===== Setup =====

// Name: setupControls
// Desc: Fills the dropdowns and connects the controls to their handlers.
// Precondition: state.data is loaded and state.semester is set.
// Postcondition: Changing any control redraws the matching part of the page.
function setupControls() {

    // Builds the semester options
    const semesterOptions = [];
    for (let i = 0; i < state.data.semesters.length; i++) {
        semesterOptions.push({ value: state.data.semesters[i], label: state.data.semesters[i] });
    }
    fillSelect(elements.semesterSelect, semesterOptions, state.semester);

    // Builds the unit options (starting with "All units")
    const unitOptions = [{ value: ALL_UNITS_KEY, label: "All units" }];
    for (let i = 0; i < state.data.units.length; i++) {
        unitOptions.push({ value: state.data.units[i].id, label: state.data.units[i].name });
    }
    fillSelect(elements.participationUnitSelect, unitOptions, state.participationUnit);

    // Connects each control to its handler function
    elements.semesterSelect.addEventListener("change", handleSemesterChange);
    elements.participationUnitSelect.addEventListener("change", handleParticipationUnitChange);
    elements.shareToggle.addEventListener("change", handleShareToggleChange);

}

// Name: init
// Desc: Starts the page: applies the saved theme, loads data, and draws everything.
// Precondition: The page and scripts have finished loading.
// Postcondition: The dashboard is shown, or an error message explains what went wrong.
async function init() {

    // Saves references to the page elements
    cacheElements();

    // Applies the saved theme and connects the theme button (it works even if the data fails to load)
    applyTheme(getSavedTheme());
    elements.themeToggle.addEventListener("click", handleThemeToggleClick);

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

    setupControls();
    renderAll();

}

init();
