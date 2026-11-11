import logging
import time
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

try:
    print("Testing connection...")
    cnx = mysql.connector.connect(
        user='root',
        password='3141',
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
    add_unit = ("INSERT INTO unit "
                   "(name) "
                   "VALUES (%s)"
                   )
    data_unit = ('Test',)

    cursor.execute(add_unit, data_unit)
    cnx.commit()

    cursor.execute("SELECT * FROM unit")
    print(cursor.fetchall())

    cursor.close()
    cnx.close()
