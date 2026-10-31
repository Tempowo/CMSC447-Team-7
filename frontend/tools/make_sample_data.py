# Name: make_sample_data.py
# Desc: Generates fake, portfolio-level sample data for the dashboard front end.
#       Every number is invented (placeholders until stakeholders send real data).
#       Only aggregated counts are produced - no student-level records.
# Precondition: Run from the frontend/ folder with Python 3 (no extra packages).
# Postcondition: Writes data/sample-data.json and prints a short consistency check.

import json
import random

# Fixed seed so everyone on the team gets the same sample data
rng = random.Random(447)

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
        print(name, "unique:", built["reach"]["unique"], "multi-unit:",
              built["reach"]["two"] + built["reach"]["threePlus"])

    # Writes the file
    with open(OUTPUT_PATH, "w") as out_file:
        json.dump(result, out_file, indent=2)
    print("Wrote", OUTPUT_PATH)


if __name__ == "__main__":
    main()
