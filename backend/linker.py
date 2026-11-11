import logging
from datetime import date, datetime, timedelta
import mysql.connector
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
    


    cnx.close()
