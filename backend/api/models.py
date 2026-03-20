from django.db import models

# 1. MAIN USER TABLE
class UserRegistrationTbl(models.Model):
    user_id = models.IntegerField(primary_key=True, db_column='User_id') 
    full_name = models.CharField(max_length=100)
    email = models.CharField(max_length=100)
    password = models.CharField(max_length=100)
    contact_no = models.CharField(max_length=15)
    user_role = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='Active')

    class Meta:
        managed = False
        db_table = 'user_registration_tbl'

# 2. BLOOD TYPE HELPER
class BloodTypeTbl(models.Model):
    blood_id = models.IntegerField(primary_key=True)
    blood_type = models.CharField(max_length=5)
    
    class Meta:
        managed = False
        db_table = 'blood_type_tbl'

# 3. DONOR TABLE
class DonorTbl(models.Model):
    donor_id = models.IntegerField(primary_key=True)
    user = models.OneToOneField(UserRegistrationTbl, on_delete=models.CASCADE, db_column='user_id')
    blood_id = models.IntegerField(blank=True, null=True)
    address = models.CharField(max_length=100)
    dob = models.DateField(db_column='date_of_birth')
    weight = models.IntegerField()
    registration_date = models.DateTimeField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'donor_tbl'

# 4. HOSPITAL TABLE
class HospitalRegistrationTbl(models.Model):
    hospital_id = models.IntegerField(primary_key=True)
    user = models.OneToOneField(UserRegistrationTbl, on_delete=models.CASCADE, db_column='user_id')
    hospital_name = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    email = models.CharField(max_length=50, db_column='contact_email')
    license_no = models.CharField(max_length=50, blank=True, null=True)
    hospital_type = models.CharField(max_length=20, blank=True, null=True)
    website = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'hospital_registration_tbl'

# 5. RECIPIENT TABLE
class RecipientTbl(models.Model):
    recipient_id = models.IntegerField(primary_key=True)
    user = models.OneToOneField(UserRegistrationTbl, on_delete=models.CASCADE, db_column='user_id', blank=True, null=True)
    full_name = models.CharField(max_length=100)
    blood_id = models.IntegerField(blank=True, null=True)
    contact_number = models.CharField(max_length=10)
    address = models.CharField(max_length=100)
    hospital = models.ForeignKey(HospitalRegistrationTbl, on_delete=models.CASCADE, db_column='hospital_id', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'recipient_tbl'

# 6. BLOOD REQUEST TABLE
class BloodRequestTbl(models.Model):
    request_id = models.IntegerField(primary_key=True)
    recipient = models.ForeignKey(RecipientTbl, on_delete=models.CASCADE, db_column='recipient_id')
    hospital = models.ForeignKey(HospitalRegistrationTbl, on_delete=models.CASCADE, db_column='hospital_id', blank=True, null=True)
    blood_group = models.CharField(max_length=5)
    units = models.IntegerField()
    urgency = models.CharField(max_length=20) 
    doctor_name = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, default='Pending')
    request_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'blood_request_tbl'

# 7. APPOINTMENT TABLE
class AppointmentTbl(models.Model):
    appointment_id = models.AutoField(primary_key=True)
    donor = models.ForeignKey(DonorTbl, on_delete=models.CASCADE, db_column='donor_id', blank=True, null=True)
    hospital = models.ForeignKey(HospitalRegistrationTbl, on_delete=models.CASCADE, db_column='hospital_id', blank=True, null=True)
    event_id = models.IntegerField(blank=True, null=True)
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=25)
    health_questionnaire_data = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'appointment_tbl'

# 8. BLOOD STORAGE TABLE
class BloodStorageTbl(models.Model):
    unit_id = models.AutoField(primary_key=True)
    appointment = models.ForeignKey(AppointmentTbl, on_delete=models.CASCADE, db_column='appointment_id', blank=True, null=True)
    blood = models.ForeignKey(BloodTypeTbl, on_delete=models.CASCADE, db_column='blood_id', blank=True, null=True)
    quantity = models.IntegerField()
    expiry_date = models.DateField()
    status = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = 'blood_storage_tbl'

# 9. EVENT TABLE
class EventTbl(models.Model):
    event_id = models.AutoField(primary_key=True)
    event_title = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    event_date = models.DateTimeField(blank=True, null=True)
    start_time = models.CharField(max_length=20, blank=True, null=True)
    end_time = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    seats_available = models.IntegerField(default=100)
    hospital = models.ForeignKey(HospitalRegistrationTbl, on_delete=models.CASCADE, db_column='hospital_id')

    class Meta:
        managed = False
        db_table = 'event_tbl'