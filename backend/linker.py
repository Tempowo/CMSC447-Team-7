import logging
from datetime import date, datetime, timedelta
import mysql.connector
import json
from mysql.connector import errorcode

# Set up logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Log to console
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)


# insert functions to standard tables

# Units table should be updated rarely, and only by system administrators
# name {string} - name of a unit, should be unique and is checked as such
add_unit = ("INSERT INTO units "
                   "(name) "
                   "VALUES (%s)"
            )

# Adds the information for a new data (such as a Google Form)
# unit_id {int} - must be the id of an existing unit
# upload_date {DATE} - date of upload, automatically sourced from database time
# num_responses {int} - number of entries in the form
add_form_info = ("INSERT INTO form_info "
                    "(unit_id, upload_date, num_responses) "
                    "VALUES (%s, CURDATE(), %s)"
                 )

# form_id {int} - must be the id from an existing form_info, should be generated along side one
# key {string} - represents the name of the data point (such as "Demographic"), must be unique per form
# value {string} - represents the answer (such as "Veteran")
add_data_point = ("INSERT INTO data_points"
                    "(form_id, key, value) "
                    "VALUES (%s, %s, %s)"
                )

# insert functions for backend tables

# Adds a new monthly(?) aggregate to simplfy queries, queries should target these instead of the unit itself
# unit_id {int} - must be the id of an existing unit
# num_served {int} - number of students served in the month
# date (DATE) - automatically provded date for aggregate
# new_students {int} - unique student identifiers created in the month
add_unit_aggregate = ("INSERT INTO unit_aggregates" 
                        "(unit_id, num_served, date, new_students) "
                        "VALUES (%s, %s, CURDATE(), %s) "
                      )

# Students are stored by ID only for uniqueness, nothing else should be done with them nor should they be accessible by users
# umbc_id {int} - a unique umbc_id for a student, should be filled automatically when uploading
add_student = ("INSERT INTO students "
                    "(umbc_id) "
                    "VALUES (%s)"
               )

# query functions for backend tables

# Get all surveys by date range
get_form_by_date = ("SELECT unit_id, upload_date, num_responses FROM form_info "
                 "WHERE upload_date BETWEEN %s AND %s")

# Get all aggregates by date range
get_aggregate_by_date = ("SELECT unit_id, num_served, date, new_students "
                         "WHERE date BETWEEN %s AND %s")

OUTPUT_PATH = "data/SQL-data.json"

# Placeholder enrollment per semester (NOT official figures)
SEMESTERS = [
    {"name": "Fall 2025", "enrollment": 14100},
    {"name": "Spring 2026", "enrollment": 13900},
    {"name": "Fall 2026", "enrollment": 14200},
]

# Query table for list of units
UNITS = []

# Query all data_points for the selected populations (the specific ids will be added as a "picker")
POPULATIONS = []

# Name: build_semester
# Desc: Builds every table the dashboard needs for one semester.
# Precondition: semester_name is like "Fall 2025"; enrollment is a positive whole number.
# Postcondition: Returns a dictionary of reach, unit, participation, and monthly data.
def build_semester(semester, year):
    if semester == "Fall":
        start_date = datetime.date(year, 8, 1)
        end_date = datetime.month(year, 12, 31)
    else:
        start_date = datetime.month(year, 1, 1)
        end_date = datetime.month(year, 5, 31)

    cursor.execute(get_aggregate_by_date, (start_date, end_date))

    unit_served = {}
    monthly = []
    total_served = 0
    total_new = 0
    for (unit_id, num_served, date, new_students) in cursor:
        unit_served[unit_id] = num_served
        monthly.append({"month": date.strftime("%b"), "unique": new_students, "repeat": round(num_served - new_students)})

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
# Postcondition: data/SQL-data.json is written.
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
    try:
        print("Testing connection...")
        cnx = mysql.connector.connect(
            user='TestUser',
            password='1234',
            host='localhost',
            database='dashboarddata'
        )
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Invalid username or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print(err)
    else:
        cursor = cnx.cursor()

        main()
        cnx.close()