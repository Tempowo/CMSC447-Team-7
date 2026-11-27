# Name: make_sample_data.py
# Desc: Generates fake, portfolio-level sample data for the dashboard front end.
#       Every number is invented (placeholders until stakeholders send real data).
#       Only aggregated counts are produced - no student-level records.
# Precondition: Run from the frontend/ folder with Python 3 (no extra packages).
# Postcondition: Writes data/sample-data.json and prints a short consistency check.
#                The unit pages (unitPages) and Engagement & Belonging (engagement) data use a
#                second random generator, so the original Overview numbers never change.

import json
import random

# Fixed seeds so everyone on the team gets the same sample data.
# The unit page data has its own generator so adding it never changes the Overview numbers.
rng = random.Random(447)
UNIT_PAGE_SEED = 448
unit_rng = random.Random(UNIT_PAGE_SEED)

OUTPUT_PATH = "data/sample-data.json"

# Placeholder enrollment per semester (NOT official figures)
SEMESTERS = [
    {"name": "Fall 2025", "enrollment": 14100},
    {"name": "Spring 2026", "enrollment": 13900},
    {"name": "Fall 2026", "enrollment": 14200},
]

# Placeholder unit list (the real list of seven units is still unconfirmed)
UNITS = [
    {"id": "retriever-essentials", "name": "Retriever Essentials", "weight": 0.22},
    {"id": "retriever-care", "name": "Retriever Care Center", "weight": 0.14},
    {"id": "student-engagement", "name": "Student Engagement", "weight": 0.30},
    {"id": "mosaic", "name": "Mosaic", "weight": 0.08},
    {"id": "graduate-student-life", "name": "Graduate Student Life", "weight": 0.09},
    {"id": "pride-center", "name": "Pride Center", "weight": 0.07},
    {"id": "veteran-student-life", "name": "Veteran Student Life", "weight": 0.04},
]

# Undergraduate and graduate students make up all of enrollment, so these add up to 1 (NOT official figures)
UNDERGRADUATE_FRACTION = 0.78
GRADUATE_FRACTION = 0.22

# Populations and their rough share of enrollment (NOT official figures)
POPULATIONS = [
    {"name": "Undergraduate", "fraction": UNDERGRADUATE_FRACTION},
    {"name": "Graduate", "fraction": GRADUATE_FRACTION},
    {"name": "Transfer", "fraction": 0.17},
    {"name": "First-generation", "fraction": 0.24},
    {"name": "Veteran", "fraction": 0.02},
    {"name": "International", "fraction": 0.08},
]

# Unit page settings. These labels and ranges are generic placeholders, not real stakeholder data.
ESSENTIALS_ID = "retriever-essentials"
PROGRAM_IDS = ["mosaic", "graduate-student-life", "pride-center"]
DEFAULT_METRIC_LABEL = "Sessions"
DEFAULT_METRIC_PER_VISIT = (0.9, 1.1)
UNIT_METRICS = {
    "retriever-essentials": {"label": "Items distributed", "perVisit": (6.5, 9.0)},
}

# Data sources every unit page offers (generic placeholders). Each source covers part of the
# unit's students; the two shares add up to more than 1 because a student can use both sources.
SOURCES = [
    {"id": "source-a", "name": "Source A", "studentShare": (0.65, 0.80), "visitShare": (0.50, 0.70)},
    {"id": "source-b", "name": "Source B", "studentShare": (0.45, 0.60), "visitShare": (0.30, 0.50)},
]

# How much students overlap between months for units other than Retriever Essentials
MONTH_OVERLAP_RANGE = (1.25, 1.45)
VISITS_PER_STUDENT_RANGE = (1.4, 2.2)
REPEAT_RATIO_RANGE = (0.35, 0.60)
REPEAT_RATIO_GROWTH = 0.05
REPEAT_RATIO_CAP = 0.90

# Share of the smallest program's students counted as reached by two or more programs (unconfirmed)
PROGRAM_OVERLAP_SHARE = 0.20

# Months shown for each season, and how a semester's students spread across them
MONTHS = {
    "Fall": {"names": ["Aug", "Sep", "Oct", "Nov", "Dec"], "weights": [0.14, 0.25, 0.27, 0.21, 0.13]},
    "Spring": {"names": ["Jan", "Feb", "Mar", "Apr", "May"], "weights": [0.14, 0.25, 0.27, 0.23, 0.11]},
}


# Name: build_semester
# Desc: Builds every table the dashboard needs for one semester.
# Precondition: semester_name is like "Fall 2025"; enrollment is a positive whole number.
# Postcondition: Returns a dictionary of reach, unit, participation, and monthly data.
def build_semester(semester_name, enrollment):

    # Reach: how many unique students, and how many were served by several units
    unique = round(enrollment * rng.uniform(0.34, 0.42))
    two = round(unique * rng.uniform(0.22, 0.26))
    three_plus = round(unique * rng.uniform(0.06, 0.09))
    one = unique - two - three_plus

    # Total contacts = sum of every unit's count (a student in 2 units counts twice)
    total_contacts = one + 2 * two + 3 * three_plus

    # Gives each unit a little random wobble around its base weight
    weights = []
    for unit in UNITS:
        weights.append(unit["weight"] * rng.uniform(0.85, 1.15))
    weight_sum = sum(weights)

    # Splits the contacts across units using those weights
    unit_served = {}
    for index in range(len(UNITS)):
        unit_id = UNITS[index]["id"]
        unit_served[unit_id] = round(total_contacts * weights[index] / weight_sum)

    # Graduate students are worked out first. Undergraduates are everyone else, so that
    # undergraduate + graduate participants always add up to the unique students reached.
    graduate_enrolled = round(enrollment * GRADUATE_FRACTION)
    graduate_overall = round(graduate_enrolled * rng.uniform(0.25, 0.35))
    graduate_by_unit = {}
    for unit_id in unit_served:
        guess = round(unit_served[unit_id] * (graduate_overall / unique) * rng.uniform(0.8, 1.2))
        graduate_by_unit[unit_id] = min(unit_served[unit_id], guess)

    # Participation by population, overall and per unit
    participation = []
    for population in POPULATIONS:
        enrolled = round(enrollment * population["fraction"])
        participants = {}

        if population["name"] == "Graduate":
            overall = graduate_overall
            for unit_id in unit_served:
                participants[unit_id] = graduate_by_unit[unit_id]
        elif population["name"] == "Undergraduate":
            overall = unique - graduate_overall
            for unit_id in unit_served:
                participants[unit_id] = unit_served[unit_id] - graduate_by_unit[unit_id]
        else:
            overall = round(enrolled * rng.uniform(0.28, 0.55))

            # A unit's participants can never exceed the overall participants
            for unit_id in unit_served:
                guess = round(overall * (unit_served[unit_id] / unique) * rng.uniform(0.8, 1.2))
                participants[unit_id] = min(overall, guess)

        participants["all"] = overall
        participation.append({"population": population["name"], "enrolled": enrolled, "participants": participants})

    # Retriever Essentials unique vs. repeat students by month
    season = semester_name.split()[0]
    month_names = MONTHS[season]["names"]
    month_weights = MONTHS[season]["weights"]
    monthly = []
    for index in range(len(month_names)):
        month_unique = round(unit_served["retriever-essentials"] * month_weights[index] * rng.uniform(0.9, 1.1))
        month_repeat = round(month_unique * rng.uniform(0.35, 0.6))
        monthly.append({"month": month_names[index], "unique": month_unique, "repeat": month_repeat})

    semester_data = {
        "reach": {"unique": unique, "one": one, "two": two, "threePlus": three_plus},
        "unitServed": unit_served,
        "participation": participation,
        "monthlyEssentials": monthly,
    }

    return semester_data


# Name: make_range_key
# Desc: Builds the text key for a range of months, such as "0-4" for the first to the fifth month.
# Precondition: start and end are month positions with start <= end.
# Postcondition: Returns the key text.
def make_range_key(start, end):
    key = str(start) + "-" + str(end)
    return key


# Name: build_month_counts
# Desc: Gets one unit's unique and repeat students for each single month. Retriever Essentials
#       reuses the Overview's monthly numbers so the two pages agree.
# Precondition: unit_total is the unit's students served; built is the semester from build_semester.
# Postcondition: Returns {"unique": [...], "repeat": [...]} with one entry per month.
def build_month_counts(unit_id, unit_total, season, built):
    uniques = []
    repeats = []

    # Step 1: Retriever Essentials copies the Overview's monthly numbers
    if unit_id == ESSENTIALS_ID:
        for entry in built["monthlyEssentials"]:
            uniques.append(entry["unique"])
            repeats.append(entry["repeat"])
        month_counts = {"unique": uniques, "repeat": repeats}
        return month_counts

    # Step 2: Other units spread their students across the months, with some overlap
    weights = MONTHS[season]["weights"]
    overlap = unit_rng.uniform(MONTH_OVERLAP_RANGE[0], MONTH_OVERLAP_RANGE[1])
    for index in range(len(weights)):
        month_unique = round(unit_total * overlap * weights[index] * unit_rng.uniform(0.9, 1.1))
        month_repeat = round(month_unique * unit_rng.uniform(REPEAT_RATIO_RANGE[0], REPEAT_RATIO_RANGE[1]))
        uniques.append(month_unique)
        repeats.append(month_repeat)

    month_counts = {"unique": uniques, "repeat": repeats}
    return month_counts


# Name: build_range_counts
# Desc: Works out unique and repeat students for every From/To pair of months. Unique counts are
#       never added up from the months (BR-21): each range gets its own count, which is
#       scaled so the full range equals the unit's students served.
# Precondition: month_counts comes from build_month_counts; its unique counts add up to at least unit_total.
# Postcondition: Returns {"unique": {range: n}, "repeat": {range: n}} for every range.
def build_range_counts(month_counts, unit_total):
    uniques = month_counts["unique"]
    repeats = month_counts["repeat"]
    month_total = len(uniques)

    # Step 1: The months must overlap a little, otherwise the full range cannot equal the unit total
    all_months_sum = sum(uniques)
    assert all_months_sum >= unit_total, "Monthly unique counts add up to less than the unit total"
    scale = unit_total / all_months_sum

    unique_by_range = {}
    repeat_by_range = {}

    # Step 2: A single month keeps its own counts
    for index in range(month_total):
        key = make_range_key(index, index)
        unique_by_range[key] = uniques[index]
        repeat_by_range[key] = repeats[index]

    # Step 3: Longer ranges are built from shortest to longest
    for length in range(2, month_total + 1):
        for start in range(0, month_total - length + 1):
            end = start + length - 1

            # Adds up the months in this range and finds the busiest single month
            window_unique = 0
            window_repeat = 0
            largest_month = 0
            for index in range(start, end + 1):
                window_unique = window_unique + uniques[index]
                window_repeat = window_repeat + repeats[index]
                if uniques[index] > largest_month:
                    largest_month = uniques[index]

            # Unique: scaled sum, but never below the busiest month inside the range
            unique_value = max(round(window_unique * scale), largest_month)

            # Repeat: a student repeating in a month is also repeating in the whole range,
            # so a range is never below the ranges inside it
            ratio = min(window_repeat / window_unique + REPEAT_RATIO_GROWTH * (length - 1), REPEAT_RATIO_CAP)
            left_inner = repeat_by_range[make_range_key(start, end - 1)]
            right_inner = repeat_by_range[make_range_key(start + 1, end)]
            repeat_value = max(round(unique_value * ratio), left_inner, right_inner)

            key = make_range_key(start, end)
            unique_by_range[key] = unique_value
            repeat_by_range[key] = repeat_value

    range_counts = {"unique": unique_by_range, "repeat": repeat_by_range}
    return range_counts


# Name: build_activity_counts
# Desc: Builds each month's visits and the unit's own main activity count.
# Precondition: uniques is the list of unique students per month.
# Postcondition: Returns {"visits": [...], "metric": [...]} with one entry per month.
def build_activity_counts(unit_id, uniques):
    metric_settings = UNIT_METRICS.get(unit_id)
    per_visit = DEFAULT_METRIC_PER_VISIT
    if metric_settings is not None:
        per_visit = metric_settings["perVisit"]

    visits = []
    metric = []
    for index in range(len(uniques)):
        month_visits = round(uniques[index] * unit_rng.uniform(VISITS_PER_STUDENT_RANGE[0], VISITS_PER_STUDENT_RANGE[1]))
        month_metric = round(month_visits * unit_rng.uniform(per_visit[0], per_visit[1]))
        visits.append(month_visits)
        metric.append(month_metric)

    activity_counts = {"visits": visits, "metric": metric}
    return activity_counts


# Name: scale_range_counts
# Desc: Multiplies every count in a range dictionary by a share and rounds it.
# Precondition: counts maps range keys to whole numbers; share is between 0 and 1.
# Postcondition: Returns a new dictionary with the scaled counts.
def scale_range_counts(counts, share):
    scaled = {}
    for key in counts:
        scaled[key] = round(counts[key] * share)
    return scaled


# Name: build_unit_page
# Desc: Builds everything one unit's page needs for one semester: months, visits, the unit's main
#       activity count, unique and repeat students for every month range, and unique students by
#       population. The data is built for all sources, then split into each source.
# Precondition: built is the semester from build_semester; unit_total equals that unit's students served.
# Postcondition: Returns the unit page dictionary (see sample-data.json "unitPages").
def build_unit_page(unit_id, unit_total, semester_name, built):
    season = semester_name.split()[0]
    year = semester_name.split()[1]

    # Step 1: Month labels such as "Aug 2026"
    month_labels = []
    for month_name in MONTHS[season]["names"]:
        month_labels.append(month_name + " " + year)

    # Step 2: Counts for single months, every month range, and activity
    month_counts = build_month_counts(unit_id, unit_total, season, built)
    range_counts = build_range_counts(month_counts, unit_total)
    activity = build_activity_counts(unit_id, month_counts["unique"])

    # Step 3: Unique students by population. The full range matches the Overview's participation
    # numbers; shorter ranges are in proportion to that range's unique students.
    populations = []
    for entry in built["participation"]:
        population_total = min(entry["participants"][unit_id], unit_total)
        population_by_range = {}
        for key in range_counts["unique"]:
            population_by_range[key] = round(population_total * range_counts["unique"][key] / unit_total)
        populations.append({"name": entry["population"], "enrolled": entry["enrolled"], "uniqueByRange": population_by_range})

    # Step 4: The "all sources" view
    all_sources = {
        "visitsByMonth": activity["visits"],
        "metricByMonth": activity["metric"],
        "uniqueByRange": range_counts["unique"],
        "repeatByRange": range_counts["repeat"],
        "populations": populations,
    }
    data = {"all": all_sources}

    # Step 5: Split into each source. Visits and the main activity count are additive, so the last
    # source takes whatever the earlier sources left, and the sources always add up to "all".
    visits_left = list(activity["visits"])
    metric_left = list(activity["metric"])
    source_list = []
    for source_index in range(len(SOURCES)):
        source = SOURCES[source_index]
        student_share = unit_rng.uniform(source["studentShare"][0], source["studentShare"][1])
        visit_share = unit_rng.uniform(source["visitShare"][0], source["visitShare"][1])
        is_last = source_index == len(SOURCES) - 1

        source_visits = []
        source_metric = []
        for month_index in range(len(visits_left)):
            if is_last:
                source_visits.append(visits_left[month_index])
                source_metric.append(metric_left[month_index])
            else:
                month_visits = round(activity["visits"][month_index] * visit_share)
                month_metric = round(activity["metric"][month_index] * visit_share)
                source_visits.append(month_visits)
                source_metric.append(month_metric)
                visits_left[month_index] = visits_left[month_index] - month_visits
                metric_left[month_index] = metric_left[month_index] - month_metric

        source_populations = []
        for population in populations:
            source_populations.append({
                "name": population["name"],
                "enrolled": population["enrolled"],
                "uniqueByRange": scale_range_counts(population["uniqueByRange"], student_share),
            })

        data[source["id"]] = {
            "visitsByMonth": source_visits,
            "metricByMonth": source_metric,
            "uniqueByRange": scale_range_counts(range_counts["unique"], student_share),
            "repeatByRange": scale_range_counts(range_counts["repeat"], student_share),
            "populations": source_populations,
        }
        source_list.append({"id": source["id"], "name": source["name"]})

    metric_label = DEFAULT_METRIC_LABEL
    if UNIT_METRICS.get(unit_id) is not None:
        metric_label = UNIT_METRICS[unit_id]["label"]

    unit_page = {"months": month_labels, "metricLabel": metric_label, "sources": source_list, "data": data}
    return unit_page


# Name: build_engagement
# Desc: Builds the extra Engagement & Belonging number: students reached by two or more programs,
#       for every month range. The per-program numbers come from each program's own unit page.
# Precondition: unit_pages holds a page for every id in PROGRAM_IDS.
# Postcondition: Returns {"programs": [ids], "multiProgramByRange": {range: n}}.
def build_engagement(unit_pages):
    first_page = unit_pages[PROGRAM_IDS[0]]
    multi_by_range = {}
    for key in first_page["data"]["all"]["uniqueByRange"]:
        smallest = None
        for program_id in PROGRAM_IDS:
            program_unique = unit_pages[program_id]["data"]["all"]["uniqueByRange"][key]
            if smallest is None or program_unique < smallest:
                smallest = program_unique
        multi_by_range[key] = round(smallest * PROGRAM_OVERLAP_SHARE)

    engagement = {"programs": list(PROGRAM_IDS), "multiProgramByRange": multi_by_range}
    return engagement


# Name: check_unit_page
# Desc: Stops the script if a unit page breaks one of the rules below.
# Precondition: page comes from build_unit_page; unit_total and built match the same unit and semester.
# Postcondition: Returns nothing. Raises AssertionError on the first broken rule.
def check_unit_page(unit_id, page, unit_total, built):
    month_total = len(page["months"])
    all_data = page["data"]["all"]
    full_key = make_range_key(0, month_total - 1)

    # Rule: the whole semester equals the Overview's students served
    assert all_data["uniqueByRange"][full_key] == unit_total

    # Rule: Retriever Essentials months match the Overview's monthly chart
    if unit_id == ESSENTIALS_ID:
        for index in range(month_total):
            key = make_range_key(index, index)
            assert all_data["uniqueByRange"][key] == built["monthlyEssentials"][index]["unique"]
            assert all_data["repeatByRange"][key] == built["monthlyEssentials"][index]["repeat"]

    # Rule: the whole-semester population counts match the Overview's participation numbers
    for index in range(len(built["participation"])):
        overview_value = min(built["participation"][index]["participants"][unit_id], unit_total)
        assert all_data["populations"][index]["uniqueByRange"][full_key] == overview_value

    # Rules for every source view: repeat <= unique, bigger ranges never shrink,
    # population <= unique, and visits are at least the unique students
    for view_id in page["data"]:
        view = page["data"][view_id]
        for key in view["uniqueByRange"]:
            start = int(key.split("-")[0])
            end = int(key.split("-")[1])
            assert view["repeatByRange"][key] <= view["uniqueByRange"][key]
            for population in view["populations"]:
                assert population["uniqueByRange"][key] <= view["uniqueByRange"][key]
            if end > start:
                for inner_key in [make_range_key(start, end - 1), make_range_key(start + 1, end)]:
                    assert view["uniqueByRange"][inner_key] <= view["uniqueByRange"][key]
                    assert view["repeatByRange"][inner_key] <= view["repeatByRange"][key]
            visits_total = 0
            for index in range(start, end + 1):
                visits_total = visits_total + view["visitsByMonth"][index]
            if view_id == "all":
                assert visits_total >= view["uniqueByRange"][key]

    # Rules for sources: visits add up to "all", and one source never exceeds "all"
    # while the sources together cover "all"
    for index in range(month_total):
        visits_sum = 0
        for source in page["sources"]:
            visits_sum = visits_sum + page["data"][source["id"]]["visitsByMonth"][index]
        assert visits_sum == all_data["visitsByMonth"][index]
    for key in all_data["uniqueByRange"]:
        source_sum = 0
        for source in page["sources"]:
            source_unique = page["data"][source["id"]]["uniqueByRange"][key]
            assert source_unique <= all_data["uniqueByRange"][key]
            source_sum = source_sum + source_unique
        assert source_sum >= all_data["uniqueByRange"][key]


# Name: main
# Desc: Builds all semesters, checks basic consistency, and writes the JSON file.
# Precondition: The data/ folder exists inside the folder you run this from.
# Postcondition: data/sample-data.json is written.
def main():

    # Starts the result with the lists that do not depend on a semester
    semester_names = []
    enrollment_by_semester = {}
    for semester in SEMESTERS:
        semester_names.append(semester["name"])
        enrollment_by_semester[semester["name"]] = semester["enrollment"]

    unit_list = []
    for unit in UNITS:
        unit_list.append({"id": unit["id"], "name": unit["name"]})

    result = {
        "meta": {"isSample": True, "note": "Invented sample data. Not real student data."},
        "semesters": semester_names,
        "enrollment": enrollment_by_semester,
        "units": unit_list,
        "reach": {},
        "unitStats": {},
        "participation": {},
        "monthlyEssentials": {},
        "unitPages": {},
        "engagement": {},
    }

    # Builds each semester and files its pieces into the result
    for semester in SEMESTERS:
        name = semester["name"]
        built = build_semester(name, semester["enrollment"])

        result["reach"][name] = built["reach"]
        result["participation"][name] = built["participation"]
        result["monthlyEssentials"][name] = built["monthlyEssentials"]

        result["unitStats"][name] = {}
        for unit_id in built["unitServed"]:
            result["unitStats"][name][unit_id] = {"studentsServed": built["unitServed"][unit_id]}

        # Consistency check: no unit can serve more unique students than the portfolio reached
        assert max(built["unitServed"].values()) <= built["reach"]["unique"]

        # Consistency check: undergraduate + graduate participants equal the unique students reached,
        # both overall and inside each unit
        undergraduate = built["participation"][0]["participants"]
        graduate = built["participation"][1]["participants"]
        assert undergraduate["all"] + graduate["all"] == built["reach"]["unique"]
        for unit_id in built["unitServed"]:
            assert undergraduate[unit_id] + graduate[unit_id] == built["unitServed"][unit_id]

        # Consistency check: a unit's participants never exceed the overall participants
        for entry in built["participation"]:
            for unit_id in built["unitServed"]:
                assert entry["participants"][unit_id] <= entry["participants"]["all"]

        # Builds and checks the unit page for every unit in this semester
        result["unitPages"][name] = {}
        for unit in UNITS:
            unit_total = built["unitServed"][unit["id"]]
            page = build_unit_page(unit["id"], unit_total, name, built)
            check_unit_page(unit["id"], page, unit_total, built)
            result["unitPages"][name][unit["id"]] = page

        # Builds and checks the Engagement & Belonging extras
        engagement = build_engagement(result["unitPages"][name])
        for program_id in PROGRAM_IDS:
            for key in engagement["multiProgramByRange"]:
                program_unique = result["unitPages"][name][program_id]["data"]["all"]["uniqueByRange"][key]
                assert engagement["multiProgramByRange"][key] <= program_unique
        result["engagement"][name] = engagement

        print(name, "unique:", built["reach"]["unique"], "multi-unit:",
              built["reach"]["two"] + built["reach"]["threePlus"])

    # Writes the file
    with open(OUTPUT_PATH, "w") as out_file:
        json.dump(result, out_file, indent=2)
    print("Wrote", OUTPUT_PATH)


if __name__ == "__main__":
    main()
