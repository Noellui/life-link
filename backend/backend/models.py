from django.db import models

class UserRegistrationTbl(models.Model):
    user_id = models.CharField(db_column='User_id', primary_key=True, max_length=25)
    full_name = models.CharField(max_length=35)
    email = models.CharField(unique=True, max_length=100)
    contact_no = models.CharField(max_length=10)
    password = models.CharField(max_length=16)
    user_role = models.CharField(max_length=10, blank=True, null=True)  # Enum: Admin, Hospital, Donor, Recipient

    class Meta:
        managed = False
        db_table = 'user_registration_tbl'


class BloodTypeTbl(models.Model):
    blood_id = models.IntegerField(primary_key=True)
    blood_type = models.CharField(max_length=5)

    class Meta:
        managed = False
        db_table = 'blood_type_tbl'


class HospitalRegistrationTbl(models.Model):
    hospital_id = models.IntegerField(primary_key=True)
    user = models.ForeignKey(UserRegistrationTbl, models.DO_NOTHING, db_column='user_id', blank=True, null=True)
    password = models.CharField(max_length=16)
    hospital_name = models.CharField(max_length=100)
    address = models.CharField(max_length=100)
    contact_person_name = models.CharField(max_length=50)
    contact_email = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=10)

    class Meta:
        managed = False
        db_table = 'hospital_registration_tbl'


class DonorTbl(models.Model):
    donor_id = models.IntegerField(primary_key=True)
    user = models.ForeignKey(UserRegistrationTbl, models.DO_NOTHING, db_column='user_id', blank=True, null=True)
    blood = models.ForeignKey(BloodTypeTbl, models.DO_NOTHING, db_column='blood_id', blank=True, null=True)
    full_name = models.CharField(max_length=15)
    address = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=10)
    date_of_birth = models.DateField()
    weight = models.IntegerField()
    registration_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'donor_tbl'


class RecipientTbl(models.Model):
    recipient_id = models.IntegerField(primary_key=True)
    user = models.ForeignKey(UserRegistrationTbl, models.DO_NOTHING, db_column='user_id', blank=True, null=True)
    full_name = models.CharField(max_length=15)
    blood = models.ForeignKey(BloodTypeTbl, models.DO_NOTHING, db_column='blood_id', blank=True, null=True)
    contact_number = models.CharField(max_length=10)
    address = models.CharField(max_length=100)
    hospital = models.ForeignKey(HospitalRegistrationTbl, models.DO_NOTHING, db_column='hospital_id', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'recipient_tbl'


class EventTbl(models.Model):
    event_id = models.IntegerField(primary_key=True)
    event_title = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    event_date = models.DateTimeField(blank=True, null=True)
    start_time = models.CharField(max_length=20, blank=True, null=True)
    end_time = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    seats_available = models.IntegerField(blank=True, null=True)
    hospital_id = models.IntegerField()  # Assuming direct ID reference based on SQL

    class Meta:
        managed = False
        db_table = 'event_tbl'


class AppointmentTbl(models.Model):
    appointment_id = models.IntegerField(primary_key=True)
    donor = models.ForeignKey(DonorTbl, models.DO_NOTHING, db_column='donor_id', blank=True, null=True)
    hospital = models.ForeignKey(HospitalRegistrationTbl, models.DO_NOTHING, db_column='hospital_id', blank=True, null=True)
    event = models.ForeignKey(EventTbl, models.DO_NOTHING, db_column='event_id', blank=True, null=True)
    appointment_date = models.DateTimeField()
    status = models.CharField(max_length=25)
    health_questionnaire_data = models.TextField()

    class Meta:
        managed = False
        db_table = 'appointment_tbl'


class BloodRequestTbl(models.Model):
    request_id = models.IntegerField(primary_key=True)
    recipient = models.ForeignKey(RecipientTbl, models.DO_NOTHING, db_column='recipient_id')
    hospital_id = models.IntegerField(blank=True, null=True)
    blood_group = models.CharField(max_length=5)
    units = models.IntegerField()
    urgency = models.CharField(max_length=8)  # Enum: Routine, High, Critical
    doctor_name = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=9, blank=True, null=True)
    request_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'blood_request_tbl'


class BloodStorageTbl(models.Model):
    unit_id = models.IntegerField(primary_key=True)
    appointment = models.ForeignKey(AppointmentTbl, models.DO_NOTHING, db_column='appointment_id', blank=True, null=True)
    blood = models.ForeignKey(BloodTypeTbl, models.DO_NOTHING, db_column='blood_id', blank=True, null=True)
    quantity = models.IntegerField()
    expiry_date = models.DateField()
    status = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = 'blood_storage_tbl'


class InvoiceNoTbl(models.Model):
    bill_no = models.IntegerField(primary_key=True)
    appointment = models.ForeignKey(AppointmentTbl, models.DO_NOTHING, db_column='appointment_id', blank=True, null=True)
    donor = models.ForeignKey(DonorTbl, models.DO_NOTHING, db_column='donor_id', blank=True, null=True)
    blood = models.ForeignKey(BloodTypeTbl, models.DO_NOTHING, db_column='blood_id', blank=True, null=True)
    quantity = models.IntegerField()
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    blood_received_by = models.CharField(max_length=15)
    mobile_no = models.CharField(max_length=10)

    class Meta:
        managed = False
        db_table = 'invoice_no_tbl'


class PaymentTbl(models.Model):
    payment_id = models.IntegerField(primary_key=True)
    recipient = models.ForeignKey(RecipientTbl, models.DO_NOTHING, db_column='recipient_id', blank=True, null=True)
    bill_no = models.ForeignKey(InvoiceNoTbl, models.DO_NOTHING, db_column='bill_no', blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField()
    status = models.CharField(max_length=20)
    mode = models.CharField(max_length=6, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'payment_tbl'


class FeedbackTbl(models.Model):
    feedback_id = models.IntegerField(primary_key=True)
    user = models.ForeignKey(UserRegistrationTbl, models.DO_NOTHING, db_column='user_id', blank=True, null=True)
    user_role = models.CharField(max_length=9)
    comment = models.TextField()
    submission_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'feedback_tbl'


class TransactionLogTbl(models.Model):
    log_id = models.IntegerField(primary_key=True)
    type = models.CharField(max_length=3)  # Enum: IN, OUT
    blood_group = models.CharField(max_length=5)
    quantity = models.IntegerField()
    entity_name = models.CharField(max_length=100)
    reason = models.CharField(max_length=255)
    transaction_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'transaction_log_tbl'