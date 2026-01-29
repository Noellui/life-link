import pymysql

# 1. Install the fake driver
pymysql.install_as_MySQLdb()

# 2. Trick Django into thinking the Driver version is compatible
import MySQLdb
MySQLdb.version_info = (2, 2, 1, 'final', 0)
MySQLdb.install_as_MySQLdb = lambda: None

# 3. Trick Django into IGNORING the Database (MariaDB) version check
from django.db.backends.base.base import BaseDatabaseWrapper
BaseDatabaseWrapper.check_database_version_supported = lambda self: None