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
                cursor.execute("SELECT 1 FROM user_registration_tbl WHERE email = %s", [email])
                if cursor.fetchone():
                    return JsonResponse({'error': 'Email already registered'}, status=400)

                user_sql = """
                    INSERT INTO user_registration_tbl
                    (full_name, email, password, contact_no, user_role, status, verification_token)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(user_sql, [
                    data.get('fullName'), email, data.get('password'),
                    data.get('phone'), role, 'Pending', token
                ])
                new_user_id = cursor.lastrowid

                if role == 'Donor':
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
    email = request.GET.get('email')
    try:
        user = UserRegistrationTbl.objects.filter(email=email).first()
        donor = DonorTbl.objects.filter(user=user).first()

        blood_type = "Unknown"
        if donor and donor.blood_id:
            b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
            if b_obj:
                blood_type = b_obj.blood_type

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
                # FIX: Return actual city from donor record, with a meaningful fallback
                'city': donor.city if (donor and donor.city) else "Not Set",
                # FIX: Return actual weight instead of 'Not Available'
                'weight': donor.weight if (donor and donor.weight) else None,
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def active_requests(request):
    """
    Returns active Pending blood requests for display on the Donor Dashboard.
    FIX: City is now fetched from the linked hospital record instead of being hardcoded.
    """
    try:
        requests = BloodRequestTbl.objects.select_related(
            'recipient', 'hospital'
        ).filter(status='Pending').order_by('-request_date')[:4]

        data = []
        for req in requests:
            p_name = "Urgent Patient"
            if req.recipient and req.recipient.full_name:
                p_name = req.recipient.full_name

            # FIX: Derive city from the linked hospital's city field, with a fallback chain
            city = "Unknown"
            if req.hospital and req.hospital.city:
                city = req.hospital.city
            elif req.recipient and hasattr(req.recipient, 'address') and req.recipient.address:
                # Last resort: show first part of recipient address
                city = req.recipient.address.split(',')[-1].strip()

            data.append({
                'id': int(req.request_id),
                'patientName': str(p_name),
                'bloodGroup': str(req.blood_group),
                'units': str(req.units),
                'urgency': str(req.urgency),
                'city': city,  # FIX: now dynamic, not hardcoded
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def donor_appointments_list(request):
    """
    Returns the most recent non-fulfilled appointment for the donor.
    FIX: Appointment time is now derived from the appointment_date DateTimeField
         instead of being hardcoded to '09:00 AM'.
    """
    email = request.GET.get('email')

    try:
        user = UserRegistrationTbl.objects.filter(email=email).first()
        if not user:
            return JsonResponse([], safe=False)

        donor = DonorTbl.objects.filter(user=user).first()
        if not donor:
            return JsonResponse([], safe=False)

        latest_app = AppointmentTbl.objects.filter(
            donor=donor
        ).exclude(status='Fulfilled').order_by('-appointment_date').first()

        if latest_app:
            # FIX: Extract the time component from the stored DateTimeField
            appt_dt = latest_app.appointment_date
            time_str = appt_dt.strftime('%I:%M %p') if appt_dt else "Time N/A"

            return JsonResponse([{
                'id': latest_app.appointment_id,
                'centerName': latest_app.hospital.hospital_name if latest_app.hospital else "Main Center",
                'date': appt_dt.strftime('%Y-%m-%d') if appt_dt else "N/A",
                'time': time_str,  # FIX: real time from DB, not hardcoded
                'status': latest_app.status
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

        hist = AppointmentTbl.objects.filter(donor=donor).order_by('-appointment_date')

        data = []
        for h in hist:
            # Attempt to look up the blood type for fulfilled donations
            blood_type_name = "Whole Blood"  # default
            if h.status == 'Fulfilled' and donor and donor.blood_id:
                b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
                if b_obj:
                    blood_type_name = f"Whole Blood ({b_obj.blood_type})"

            data.append({
                'id': h.appointment_id,
                'date': h.appointment_date.strftime('%Y-%m-%d'),
                'location': h.hospital.hospital_name if h.hospital else "Unknown Center",
                'units': "1",
                # FIX: donationType now carries blood group info when available
                'donationType': blood_type_name,
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
        # FIX: Include blood type name for display in the profile form
        blood_type_name = ""
        if donor and donor.blood_id:
            b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
            if b_obj:
                blood_type_name = b_obj.blood_type

        return JsonResponse({
            'fullName': user.full_name,
            'email': user.email,
            'phone': user.contact_no,
            'dob': donor.dob.strftime('%Y-%m-%d') if (donor and donor.dob) else "",
            'address': donor.address if donor else "",
            'city': donor.city if donor else "",
            'weight': donor.weight if donor else "",
            'gender': donor.gender if donor else "",
            'bloodGroup': blood_type_name,  # FIX: now sourced from DB join
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

            user = UserRegistrationTbl.objects.filter(email=email).first()
            donor = DonorTbl.objects.filter(user=user).first()
            event = EventTbl.objects.filter(event_id=event_id).first()

            if not donor or not event:
                return JsonResponse({'error': 'Profile or Event not found.'}, status=404)

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
            appointment = AppointmentTbl.objects.filter(appointment_id=appointment_id).first()

            if not appointment:
                return JsonResponse({'error': 'Appointment not found'}, status=404)

            appointment.status = 'Canceled'
            appointment.save()

            if appointment.event_id:
                event = EventTbl.objects.filter(event_id=appointment.event_id).first()
                if event and event.seats_available is not None:
                    event.seats_available += 1
                    event.save()

            return JsonResponse({'message': 'Appointment canceled successfully'})
        except Exception as e:
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE appointment_tbl SET status = 'Canceled' WHERE appointment_id = %s",
                    [appointment_id]
                )
            return JsonResponse({'message': 'Canceled via fallback logic'})

    return JsonResponse({'error': 'Method not allowed'}, status=405)


# -------------------------------------------------------------------------
# NEW: DONOR INTEREST / "I CAN DONATE" ENDPOINT
# -------------------------------------------------------------------------

@csrf_exempt
def donor_interest_view(request):
    """
    NEW ENDPOINT: Called when a donor clicks "I Can Donate" on a blood request.
    Records the donor's interest by creating a pending appointment linked
    to the hospital that owns the request.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            request_id = data.get('requestId')

            if not email or not request_id:
                return JsonResponse({'error': 'email and requestId are required.'}, status=400)

            # 1. Resolve donor from email
            user = UserRegistrationTbl.objects.filter(email=email).first()
            if not user:
                return JsonResponse({'error': 'User not found.'}, status=404)

            donor = DonorTbl.objects.filter(user=user).first()
            if not donor:
                return JsonResponse({'error': 'Donor profile not found.'}, status=404)

            # 2. Resolve the blood request
            blood_request = BloodRequestTbl.objects.select_related('hospital').filter(
                request_id=request_id
            ).first()
            if not blood_request:
                return JsonResponse({'error': 'Blood request not found.'}, status=404)

            # 3. Check donor does not already have a Pending/Confirmed appointment
            #    for this same hospital to avoid duplicate submissions
            hospital_id = blood_request.hospital_id if blood_request.hospital_id else None
            if hospital_id:
                existing = AppointmentTbl.objects.filter(
                    donor=donor,
                    hospital_id=hospital_id,
                    status__in=['Pending', 'Confirmed']
                ).first()
                if existing:
                    return JsonResponse({
                        'message': 'You already have a pending appointment with this hospital.',
                        'alreadyExists': True
                    }, status=200)

            # 4. Create a new appointment (Pending) so the hospital sees the donor's interest
            with connection.cursor() as cursor:
                sql = """
                    INSERT INTO appointment_tbl
                    (donor_id, hospital_id, appointment_date, status, health_questionnaire_data)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(sql, [
                    donor.donor_id,
                    hospital_id,
                    timezone.now() + datetime.timedelta(days=1),  # tentative next-day date
                    'Pending',
                    json.dumps({'interestedInRequestId': request_id})
                ])

            return JsonResponse({
                'message': 'Interest registered! The hospital has been notified.',
                'requestId': request_id
            }, status=201)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

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
            d = datetime.date.today() - datetime.timedelta(days=i * 30)
            don = AppointmentTbl.objects.filter(status='Fulfilled', appointment_date__month=d.month).count()
            req = BloodRequestTbl.objects.filter(request_date__month=d.month).count()
            activity.append({
                'month': d.strftime('%B'), 'donations': don, 'requests': req, 'outcome': f"{don - req:+}"
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
    if not appt:
        return JsonResponse({'error': 'Not found'}, status=404)
    appt.status = 'Fulfilled'
    appt.save()
    BloodStorageTbl.objects.create(
        appointment=appt, blood_id=appt.donor.blood_id if appt.donor else None,
        quantity=1, status='Available', expiry_date=datetime.date.today() + datetime.timedelta(days=42)
    )
    return JsonResponse({'message': 'Stock updated'})


@csrf_exempt
def create_blood_request_raw(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            with connection.cursor() as cursor:
                cursor.execute("SELECT recipient_id FROM recipient_tbl WHERE user_id = %s", [data.get('userId')])
                recipient = cursor.fetchone()

                if not recipient:
                    return JsonResponse({'error': 'Recipient profile not found'}, status=404)

                recipient_id = recipient[0]

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
                cursor.execute(
                    "UPDATE user_registration_tbl SET full_name = %s, contact_no = %s WHERE email = %s",
                    [data.get('fullName'), data.get('phone'), data.get('email')]
                )
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
