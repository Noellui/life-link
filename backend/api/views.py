from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count
from django.db.models.functions import TruncMonth
import json
import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db import connection, transaction
from django.core.mail import send_mail
from django.conf import settings
from django.utils.crypto import get_random_string

# Import all models
from .models import (
    UserRegistrationTbl, DonorTbl, HospitalRegistrationTbl, 
    BloodRequestTbl, AppointmentTbl, BloodTypeTbl, EventTbl, RecipientTbl, BloodStorageTbl
)

# -------------------------------------------------------------------------
# AUTHENTICATION
# -------------------------------------------------------------------------

@csrf_exempt 
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Only allow login for users with Active status
            user = UserRegistrationTbl.objects.filter(email=data.get('email'), status='Active').first()
            if not user:
                return JsonResponse({'error': 'User not found'}, status=404)
            if user.password == data.get('password'):
                return JsonResponse({
                    'message': 'Login successful',
                    'user': {
                        'name': user.full_name, 'email': user.email,
                        'role': user.user_role, 'id': user.user_id
                    }
                }, status=200)
            return JsonResponse({'error': 'Invalid password'}, status=401)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
def register_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            role = data.get('role')
            token = get_random_string(64)

            with connection.cursor() as cursor:
                # 1. Check if email exists
                cursor.execute("SELECT 1 FROM user_registration_tbl WHERE email = %s", [email])
                if cursor.fetchone():
                    return JsonResponse({'error': 'Email already registered'}, status=400)

                # 2. Insert into user_registration_tbl
                user_sql = """
                    INSERT INTO user_registration_tbl 
                    (full_name, email, password, contact_no, user_role, status, verification_token) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(user_sql, [
                    data.get('fullName'), email, data.get('password'),
                    data.get('phone'), role, 'Pending', token
                ])
                
                # 3. Get the new User_id to link profiles
                new_user_id = cursor.lastrowid

                # 4. Handle Donor-specific registration
                if role == 'Donor':
                    # Find blood_id from blood_type_tbl
                    cursor.execute("SELECT blood_id FROM blood_type_tbl WHERE blood_type = %s", [data.get('bloodGroup')])
                    blood_res = cursor.fetchone()
                    blood_id = blood_res[0] if blood_res else None

                    donor_sql = """
                        INSERT INTO donor_tbl 
                        (user_id, blood_id, address, date_of_birth, weight, registration_date, gender, city) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    cursor.execute(donor_sql, [
                        new_user_id, blood_id, data.get('address', ''), 
                        data.get('dob', '2000-01-01'), data.get('weight', 60), 
                        timezone.now(), data.get('gender', 'Male'), data.get('city', 'Vadodara')
                    ])

                # 5. Handle Hospital-specific registration
                elif role == 'Hospital':
                    hospital_sql = """
                        INSERT INTO hospital_registration_tbl 
                        (user_id, hospital_name, address, contact_email, city) 
                        VALUES (%s, %s, %s, %s, %s)
                    """
                    cursor.execute(hospital_sql, [
                        new_user_id, data.get('fullName'), data.get('address', ''), 
                        email, data.get('city', 'Vadodara')
                    ])

            # 6. Send the Verification Email
            verify_url = f"http://localhost:8000/api/verify-email/?token={token}&email={email}"
            send_mail(
                'Verify your LifeLink Account',
                f'Please click the link to verify your account: {verify_url}',
                'noreply@lifelink.com',
                [email],
                fail_silently=False,
            )

            return JsonResponse({'message': 'Registration successful! Verification email sent.'}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)


def verify_email(request):
    token = request.GET.get('token')
    email = request.GET.get('email')

    if not token or not email:
        return JsonResponse({'error': 'Invalid verification link'}, status=400)

    try:
        with connection.cursor() as cursor:
            # Check token and email match a pending user, then activate and clear the token
            cursor.execute(
                "UPDATE user_registration_tbl SET status = 'Active', verification_token = NULL "
                "WHERE email = %s AND verification_token = %s AND status = 'Pending'",
                [email, token]
            )
            if cursor.rowcount > 0:
                return JsonResponse({'message': 'Email verified! You can now log in.'})
            else:
                return JsonResponse({'error': 'Invalid or expired link.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# -------------------------------------------------------------------------
# DONOR DASHBOARD & PROFILE APIS
# -------------------------------------------------------------------------

def donor_dashboard_stats(request):
    """Fills 'Total Donations', 'Lives Impacted', and Top Stats"""
    email = request.GET.get('email')
    try:
        user = UserRegistrationTbl.objects.filter(email=email).first()
        donor = DonorTbl.objects.filter(user=user).first()
        
        # Determine Blood Type
        blood_type = "Unknown"
        if donor and donor.blood_id:
            b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
            if b_obj: blood_type = b_obj.blood_type

        # Stats logic
        fulfilled_count = AppointmentTbl.objects.filter(donor=donor, status='Fulfilled').count() if donor else 0
        last_donation = AppointmentTbl.objects.filter(donor=donor, status='Fulfilled').order_by('-appointment_date').first()
        
        return JsonResponse({
            'stats': {
                'total': fulfilled_count,
                'lives': fulfilled_count * 3,
                'lastDate': last_donation.appointment_date.strftime('%Y-%m-%d') if last_donation else 'N/A'
            },
            'user_details': {
                'name': user.full_name,
                'id': donor.donor_id if donor else "N/A",
                'bloodType': blood_type,
                'city': donor.city if donor else "Not Available"
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def active_requests(request):
    """Fills the 'Urgent Blood Needed' cards with forced data fallback"""
    try:
        # We use select_related to join the User table and get the name
        requests = BloodRequestTbl.objects.select_related('recipient').filter(status='Pending').order_by('-request_date')[:4]
        
        data = []
        for req in requests:
            # If the recipient object is missing, we provide a placeholder
            p_name = "Urgent Patient"
            if req.recipient and req.recipient.full_name:
                p_name = req.recipient.full_name

            data.append({
                'id': int(req.request_id),
                'patientName': str(p_name), # Matches req.patientName
                'bloodGroup': str(req.blood_group), # Matches req.bloodGroup
                'units': str(req.units), # Matches req.units
                'urgency': str(req.urgency), # Matches req.urgency
                'city': "Vadodara" 
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
def donor_appointments_list(request):
    """Fills the 'Request Pending' card with the most recent active appointment"""
    email = request.GET.get('email')
    
    try:
        # 1. Get User and then the linked Donor record
        user = UserRegistrationTbl.objects.filter(email=email).first()
        if not user:
            return JsonResponse([], safe=False)
            
        # Use filter().first() to avoid DoesNotExist crashes
        donor = DonorTbl.objects.filter(user=user).first()
        if not donor:
            return JsonResponse([], safe=False)
        
        # 2. Fetch the most recent appointment that isn't 'Fulfilled'
        # We order by -appointment_date to get the one closest to today or the latest request
        latest_app = AppointmentTbl.objects.filter(
            donor=donor
        ).exclude(status='Fulfilled').order_by('-appointment_date').first()

        if latest_app:
            return JsonResponse([{
                'id': latest_app.appointment_id,
                'centerName': latest_app.hospital.hospital_name if latest_app.hospital else "Main Center",
                'date': latest_app.appointment_date.strftime('%Y-%m-%d'),
                'time': "09:00 AM", # Replace with actual time field if your model has one
                'status': latest_app.status # Values: 'Pending', 'Confirmed', 'Rejected', etc.
            }], safe=False)

        return JsonResponse([], safe=False)

    except Exception as e:
        print(f"Error fetching appointment: {e}")
        return JsonResponse([], safe=False)
    
def donor_history_list(request):
    email = request.GET.get('email')
    try:
        user = UserRegistrationTbl.objects.filter(email=email).first()
        donor = DonorTbl.objects.filter(user=user).first()
        
        # REMOVE status='Fulfilled' to show everything
        hist = AppointmentTbl.objects.filter(donor=donor).order_by('-appointment_date')
        
        data = []
        for h in hist:
            data.append({
                'id': h.appointment_id,
                'date': h.appointment_date.strftime('%Y-%m-%d'),
                'location': h.hospital.hospital_name if h.hospital else "Unknown Center",
                'units': "1", 
                'status': h.status 
            })
        return JsonResponse(data, safe=False)
    except Exception:
        return JsonResponse([], safe=False)
@csrf_exempt
def donor_profile_view(request):
    email = request.GET.get('email')
    user = UserRegistrationTbl.objects.filter(email=email).first()
    donor = DonorTbl.objects.filter(user=user).first()
    if request.method == 'GET':
        return JsonResponse({
            'fullName': user.full_name, 'email': user.email, 'phone': user.contact_no,
            'dob': donor.dob.strftime('%Y-%m-%d') if (donor and donor.dob) else "",
            'address': donor.address if donor else "", 'city': donor.city if donor else "",
            'weight': donor.weight if donor else "Not Available", 'gender': donor.gender if donor else ""
        })
    elif request.method == 'PUT':
        data = json.loads(request.body)
        user.full_name = data.get('fullName', user.full_name)
        user.contact_no = data.get('phone', user.contact_no)
        user.save()
        if donor:
            donor.address = data.get('address', donor.address)
            donor.city = data.get('city', donor.city)
            donor.dob = data.get('dob', donor.dob)
            donor.weight = data.get('weight', donor.weight)
            donor.gender = data.get('gender', donor.gender)
            donor.save()
        return JsonResponse({'message': 'Profile updated'})

@csrf_exempt
def register_for_event(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            event_id = data.get('eventId')

            # 1. Fetch related objects to get IDs
            user = UserRegistrationTbl.objects.filter(email=email).first()
            donor = DonorTbl.objects.filter(user=user).first()
            event = EventTbl.objects.filter(event_id=event_id).first()
            
            if not donor or not event:
                return JsonResponse({'error': 'Profile or Event not found.'}, status=404)

            # 2. Use Raw SQL to bypass Django's 'RETURNING' clause
            with connection.cursor() as cursor:
                sql = """
                    INSERT INTO appointment_tbl 
                    (donor_id, event_id, hospital_id, appointment_date, status, health_questionnaire_data) 
                    VALUES (%s, %s, %s, %s, %s, %s)
                """
                params = [
                    donor.donor_id,
                    event.event_id,
                    event.hospital_id,
                    event.event_date or timezone.now(),
                    'Pending',
                    '{}'
                ]
                cursor.execute(sql, params)

            # 3. Update seats in EventTbl (ORM save usually works for updates)
            if event.seats_available and event.seats_available > 0:
                event.seats_available -= 1
                event.save()

            return JsonResponse({'message': 'Registration successful!'}, status=201)
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
            
    return JsonResponse({'error': 'Method not allowed'}, status=405)
@csrf_exempt
def cancel_appointment(request, appointment_id):
    if request.method == 'POST':
        try:
            # 1. Get the appointment
            appointment = AppointmentTbl.objects.filter(appointment_id=appointment_id).first()
            
            if not appointment:
                return JsonResponse({'error': 'Appointment not found'}, status=404)

            # 2. Update status to Canceled
            appointment.status = 'Canceled'
            appointment.save()

            # 3. If it was linked to a camp event, give the seat back
            if appointment.event:
                event = appointment.event
                if event.seats_available is not None:
                    event.seats_available += 1
                    event.save()

            return JsonResponse({'message': 'Appointment canceled successfully'})
        except Exception as e:
            # If ORM fails, use Raw SQL as a fallback for MariaDB
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE appointment_tbl SET status = 'Canceled' WHERE appointment_id = %s",
                    [appointment_id]
                )
            return JsonResponse({'message': 'Canceled via fallback logic'})
            
    return JsonResponse({'error': 'Method not allowed'}, status=405)

# -------------------------------------------------------------------------
# ADMIN DASHBOARD & REPORTS
# -------------------------------------------------------------------------

def admin_dashboard_stats(request):
    try:
        stats = {
            'donors': UserRegistrationTbl.objects.filter(user_role='Donor').count(),
            'hospitals': UserRegistrationTbl.objects.filter(user_role='Hospital').count(),
            'recipients': UserRegistrationTbl.objects.filter(user_role='Recipient').count(),
            'total_units': BloodStorageTbl.objects.aggregate(total=Sum('quantity'))['total'] or 0,
            'pending_requests': BloodRequestTbl.objects.filter(status='Pending').count()
        }
        inventory = []
        for bt in BloodTypeTbl.objects.all():
            count = BloodStorageTbl.objects.filter(blood_id=bt.blood_id).aggregate(total=Sum('quantity'))['total'] or 0
            inventory.append({
                'type': bt.blood_type, 'count': count, 'capacity': 100,
                'status': 'Critical' if count == 0 else ('Low' if count < 10 else 'Stable')
            })
        activity = []
        for i in range(3):
            d = datetime.date.today() - datetime.timedelta(days=i*30)
            don = AppointmentTbl.objects.filter(status='Fulfilled', appointment_date__month=d.month).count()
            req = BloodRequestTbl.objects.filter(request_date__month=d.month).count()
            activity.append({
                'month': d.strftime('%B'), 'donations': don, 'requests': req, 'outcome': f"{don-req:+}"
            })
        return JsonResponse({'stats': stats, 'inventory': inventory, 'monthly_activity': activity})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def user_list(request):
    users = UserRegistrationTbl.objects.values('user_id', 'full_name', 'email', 'user_role', 'status')
    return JsonResponse(list(users), safe=False)

@csrf_exempt
def delete_user(request, user_id):
    UserRegistrationTbl.objects.filter(user_id=user_id).update(status='Banned')
    return JsonResponse({'message': 'User banned'})

# -------------------------------------------------------------------------
# EVENTS & HOSPITAL ACTIONS
# -------------------------------------------------------------------------

def event_list(request):
    try:
        events = EventTbl.objects.select_related('hospital').all().order_by('-event_date')
        data = [{
            'id': e.event_id, 'title': e.event_title, 'location': e.location,
            'date': e.event_date.strftime('%Y-%m-%d') if e.event_date else "N/A",
            'startTime': e.start_time, 'endTime': e.end_time,
            'seats': e.seats_available, 'hospitalName': e.hospital.hospital_name if e.hospital else "Unknown"
        } for e in events]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def delete_event_view(request, event_id):
    EventTbl.objects.filter(event_id=event_id).delete()
    return JsonResponse({'message': 'Event deleted'})

@csrf_exempt
def fulfill_appointment_view(request, appointment_id):
    appt = AppointmentTbl.objects.filter(appointment_id=appointment_id).first()
    if not appt: return JsonResponse({'error': 'Not found'}, status=404)
    appt.status = 'Fulfilled'; appt.save()
    BloodStorageTbl.objects.create(
        appointment=appt, hospital=appt.hospital, blood_id=appt.donor.blood_id if appt.donor else None,
        quantity=1, status='Available', expiry_date=datetime.date.today() + datetime.timedelta(days=42)
    )
    return JsonResponse({'message': 'Stock updated'})


@api_view(['GET'])
def get_nearest_appointment(request):
    # 1. Ensure the user is authenticated
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    try:
        # 2. Dynamically get the Donor ID linked to the logged-in User
        # This assumes your Donor model has a field like 'user = models.OneToOneField(User, ...)'
        donor = request.user.donor 
        
        now = timezone.now()
        
        # 3. Filter using the dynamic donor object
        nearest = AppointmentTbl.objects.filter(
            donor=donor,
            status='Pending',
            appointment_date__gte=now
        ).order_by('appointment_date').first()

        if nearest:
            data = {
                "id": nearest.appointment_id,
                "hospital": nearest.hospital.hospital_name,
                "day": nearest.appointment_date.strftime('%d'),
                "month": nearest.appointment_date.strftime('%b'),
                "time": nearest.appointment_date.strftime('%I:%M %p'),
                "status": nearest.status
            }
            return Response(data)
        
        return Response({"message": "No upcoming appointments"}, status=200)

    except AttributeError:
        # This handles cases where a User exists but isn't registered as a Donor (e.g., an Admin)
        return Response({"error": "User profile not found"}, status=404)
@api_view(['POST'])
def confirm_appointment_view(request, appointment_id):
    # Your logic for confirming the appointment
    return Response({"message": "Appointment confirmed"})


@csrf_exempt
def create_blood_request_raw(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Use Raw SQL to find the recipient_id linked to the logged-in user
            with connection.cursor() as cursor:
                cursor.execute("SELECT recipient_id FROM recipient_tbl WHERE user_id = %s", [data.get('userId')])
                recipient = cursor.fetchone()
                
                if not recipient:
                    return JsonResponse({'error': 'Recipient profile not found'}, status=404)

                recipient_id = recipient[0]

                # Raw SQL Insert for MariaDB compatibility
                sql = """
                    INSERT INTO blood_request_tbl 
                    (recipient_id, hospital_id, blood_group, units, urgency, doctor_name, status, request_date) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                params = [
                    recipient_id,
                    data.get('hospitalId', 9001),
                    data.get('bloodGroup'),
                    data.get('units'),
                    data.get('urgency'),
                    data.get('doctorName', 'Emergency Dept'),
                    'Pending',
                    timezone.now()
                ]
                cursor.execute(sql, params)
                
            return JsonResponse({'message': 'Blood request created successfully'}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def update_profile_raw(request):
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            with connection.cursor() as cursor:
                # Update User Table
                cursor.execute(
                    "UPDATE user_registration_tbl SET full_name = %s, contact_no = %s WHERE email = %s",
                    [data.get('fullName'), data.get('phone'), data.get('email')]
                )
                # Update Donor Table
                cursor.execute(
                    "UPDATE donor_tbl SET address = %s, city = %s, weight = %s, gender = %s WHERE user_id = (SELECT user_id FROM user_registration_tbl WHERE email = %s)",
                    [data.get('address'), data.get('city'), data.get('weight'), data.get('gender'), data.get('email')]
                )
            return JsonResponse({'message': 'Profile updated successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def manage_stock_raw(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            with connection.cursor() as cursor:
                sql = """
                    INSERT INTO blood_storage_tbl 
                    (hospital_id, blood_id, quantity, expiry_date, status) 
                    VALUES (%s, (SELECT blood_id FROM blood_type_tbl WHERE blood_type = %s), %s, %s, %s)
                """
                params = [
                    data.get('hospitalId'),
                    data.get('bloodGroup'),
                    data.get('units'),
                    data.get('expiryDate'),
                    'Available'
                ]
                cursor.execute(sql, params)
            return JsonResponse({'message': 'Stock updated successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)
