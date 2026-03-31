import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.db import connection

with connection.cursor() as cursor:
    unified_queries = []
    unified_queries.append("""
        SELECT 'Donor' as role, d.gender, d.city, d.date_of_birth, bt.blood_type, d.registration_date 
        FROM donor_tbl d
        LEFT JOIN blood_type_tbl bt ON d.blood_id = bt.blood_id
    """)
    unified_queries.append("""
        SELECT 'Recipient' as role, r.gender, r.city, r.dob as date_of_birth, bt.blood_type, u.registration_date 
        FROM recipient_tbl r
        JOIN user_registration_tbl u ON r.user_id = u.user_id
        LEFT JOIN blood_type_tbl bt ON r.blood_id = bt.blood_id
    """)
    unified_queries.append("""
        SELECT 'Hospital' as role, 'Not Specified' as gender, h.city, NULL as date_of_birth, NULL as blood_type, u.registration_date 
        FROM hospital_registration_tbl h
        JOIN user_registration_tbl u ON h.user_id = u.user_id
    """)
    combined_sql = " UNION ALL ".join(unified_queries)
    conditions = ["1=1"]
    params = []
    
    role = 'Hospital'
    if role and role != 'All':
        conditions.append("role = %s")
        params.append(role)
        
    filtered_query = f"SELECT * FROM ({combined_sql}) AS combined WHERE " + " AND ".join(conditions)
    
    print(filtered_query)
    cursor.execute(f"SELECT COALESCE(city, 'Unknown'), COUNT(*) as cnt FROM ({filtered_query}) AS f GROUP BY city ORDER BY cnt DESC", params)
    print("CITY:", cursor.fetchall())
