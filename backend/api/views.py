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

from .models import (
    UserRegistrationTbl, DonorTbl, HospitalRegistrationTbl,
    BloodRequestTbl, AppointmentTbl, BloodTypeTbl, EventTbl, RecipientTbl, BloodStorageTbl
)


# =============================================================================
# AUTHENTICATION
# =============================================================================

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = UserRegistrationTbl.objects.filter(
                email=data.get('email'), status='Active'
            ).first()
            if not user:
                return JsonResponse({'error': 'User not found'}, status=404)
            if user.password == data.get('password'):
                return JsonResponse({
                    'message': 'Login successful',
                    'user': {
                        'name':  user.full_name,
                        'email': user.email,
                        'role':  user.user_role,
                        'id':    user.user_id,
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
            data  = json.loads(request.body)
            email = data.get('email')
            role  = data.get('role')
            token = get_random_string(64)

            initial_status = 'Active' if role == 'Recipient' else 'Pending'
            assigned_token = None if role == 'Recipient' else token

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM user_registration_tbl WHERE email = %s", [email]
                )
                if cursor.fetchone():
                    return JsonResponse({'error': 'Email already registered'}, status=400)

                cursor.execute("""
                    INSERT INTO user_registration_tbl
                    (full_name, email, password, contact_no, user_role, status, verification_token)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, [
                    data.get('fullName'), email, data.get('password'),
                    data.get('phone'), role, initial_status, assigned_token
                ])
                new_user_id = cursor.lastrowid

                if role == 'Donor':
                    cursor.execute(
                        "SELECT blood_id FROM blood_type_tbl WHERE blood_type = %s",
                        [data.get('bloodGroup')]
                    )
                    blood_res = cursor.fetchone()
                    blood_id  = blood_res[0] if blood_res else None

                    cursor.execute("""
                        INSERT INTO donor_tbl
                        (user_id, blood_id, address, date_of_birth, weight,
                         registration_date, gender, city)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, [
                        new_user_id, blood_id,
                        data.get('address', ''),
                        data.get('dob', '2000-01-01'),
                        data.get('weight', 60),
                        timezone.now(),
                        data.get('gender', 'Male'),
                        data.get('city', 'Vadodara'),
                    ])

                elif role == 'Hospital':
                    cursor.execute("""
                        INSERT INTO hospital_registration_tbl
                        (user_id, hospital_name, address, contact_email, city)
                        VALUES (%s, %s, %s, %s, %s)
                    """, [
                        new_user_id, data.get('fullName'),
                        data.get('address', ''), email,
                        data.get('city', 'Vadodara'),
                    ])

                elif role == 'Recipient':
                    cursor.execute(
                        "SELECT blood_id FROM blood_type_tbl WHERE blood_type = %s",
                        [data.get('bloodGroup', 'O+')]
                    )
                    blood_res = cursor.fetchone()
                    blood_id  = blood_res[0] if blood_res else None

                    cursor.execute("""
                        INSERT INTO recipient_tbl
                        (user_id, full_name, blood_id, contact_number, address)
                        VALUES (%s, %s, %s, %s, %s)
                    """, [
                        new_user_id,
                        data.get('fullName', ''),
                        blood_id,
                        data.get('phone', '0000000000'),
                        data.get('address', 'Hospital Admission')
                    ])

            if role != 'Recipient':
                verify_url = (
                    f"http://localhost:8000/api/verify-email/"
                    f"?token={token}&email={email}"
                )
                send_mail(
                    'Verify your LifeLink Account',
                    f'Please click the link to verify your account: {verify_url}',
                    'noreply@lifelink.com',
                    [email],
                    fail_silently=True,
                )
                return JsonResponse(
                    {'message': 'Registration successful! Verification email sent.'},
                    status=201
                )
            else:
                return JsonResponse(
                    {
                        'message': 'Patient registered successfully and auto-activated!',
                        'userId': new_user_id
                    },
                    status=201
                )

        except Exception as e:
            print(f"Registration Error: {e}")
            return JsonResponse({'error': str(e)}, status=500)


def verify_email(request):
    token = request.GET.get('token')
    email = request.GET.get('email')
    if not token or not email:
        return JsonResponse({'error': 'Invalid verification link'}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE user_registration_tbl "
                "SET status = 'Active', verification_token = NULL "
                "WHERE email = %s AND verification_token = %s AND status = 'Pending'",
                [email, token]
            )
            if cursor.rowcount > 0:
                return JsonResponse({'message': 'Email verified! You can now log in.'})
            return JsonResponse({'error': 'Invalid or expired link.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# DONOR DASHBOARD & PROFILE
# =============================================================================

def donor_dashboard_stats(request):
    email = request.GET.get('email')
    try:
        user  = UserRegistrationTbl.objects.filter(email=email).first()
        donor = DonorTbl.objects.filter(user=user).first()
        blood_type = "Unknown"
        if donor and donor.blood_id:
            b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
            if b_obj:
                blood_type = b_obj.blood_type
        fulfilled_count = (
            AppointmentTbl.objects.filter(donor=donor, status='Fulfilled').count()
            if donor else 0
        )
        last_donation = (
            AppointmentTbl.objects
            .filter(donor=donor, status='Fulfilled')
            .order_by('-appointment_date')
            .first()
        )
        return JsonResponse({
            'stats': {
                'total':    fulfilled_count,
                'lives':    fulfilled_count * 3,
                'lastDate': (
                    last_donation.appointment_date.strftime('%Y-%m-%d')
                    if last_donation else 'N/A'
                ),
            },
            'user_details': {
                'name':      user.full_name,
                'id':        donor.donor_id if donor else "N/A",
                'bloodType': blood_type,
                'city':      donor.city   if (donor and donor.city)   else "Not Set",
                'weight':    donor.weight if (donor and donor.weight) else None,
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def active_requests(request):
    email = request.GET.get('email')
    try:
        donor_city = None
        if email:
            user  = UserRegistrationTbl.objects.filter(email=email).first()
            donor = DonorTbl.objects.filter(user=user).first()
            if donor and donor.city:
                donor_city = donor.city

        query = BloodRequestTbl.objects.select_related(
            'recipient', 'hospital'
        ).filter(status='Pending')

        if donor_city:
            query = query.filter(hospital__city__iexact=donor_city)

        reqs = query.order_by('-request_date')[:4]

        data = []
        for req in reqs:
            p_name = "Urgent Patient"
            if req.recipient and req.recipient.full_name:
                p_name = req.recipient.full_name

            city = "Unknown"
            if req.hospital and req.hospital.city:
                city = req.hospital.city
            elif req.recipient and hasattr(req.recipient, 'address') and req.recipient.address:
                city = req.recipient.address.split(',')[-1].strip()

            data.append({
                'id':          int(req.request_id),
                'patientName': str(p_name),
                'bloodGroup':  str(req.blood_group),
                'units':       str(req.units),
                'urgency':     str(req.urgency),
                'city':        city,
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def donor_appointments_list(request):
    email = request.GET.get('email')
    try:
        user = UserRegistrationTbl.objects.filter(email=email).first()
        if not user:
            return JsonResponse([], safe=False)
        donor = DonorTbl.objects.filter(user=user).first()
        if not donor:
            return JsonResponse([], safe=False)
        latest_app = (
            AppointmentTbl.objects
            .filter(donor=donor)
            .exclude(status='Fulfilled')
            .order_by('-appointment_date')
            .first()
        )
        if latest_app:
            appt_dt  = latest_app.appointment_date
            time_str = appt_dt.strftime('%I:%M %p') if appt_dt else "Time N/A"
            return JsonResponse([{
                'id':         latest_app.appointment_id,
                'centerName': (
                    latest_app.hospital.hospital_name
                    if latest_app.hospital else "Main Center"
                ),
                'date':   appt_dt.strftime('%Y-%m-%d') if appt_dt else "N/A",
                'time':   time_str,
                'status': latest_app.status,
            }], safe=False)
        return JsonResponse([], safe=False)
    except Exception as e:
        print(f"Error fetching appointment: {e}")
        return JsonResponse([], safe=False)


def donor_history_list(request):
    email = request.GET.get('email')
    try:
        user  = UserRegistrationTbl.objects.filter(email=email).first()
        donor = DonorTbl.objects.filter(user=user).first()
        hist  = AppointmentTbl.objects.filter(donor=donor).order_by('-appointment_date')
        data  = []
        for h in hist:
            blood_type_name = "Whole Blood"
            if h.status == 'Fulfilled' and donor and donor.blood_id:
                b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
                if b_obj:
                    blood_type_name = f"Whole Blood ({b_obj.blood_type})"
            data.append({
                'id':           h.appointment_id,
                'date':         h.appointment_date.strftime('%Y-%m-%d'),
                'location':     h.hospital.hospital_name if h.hospital else "Unknown Center",
                'units':        "1",
                'donationType': blood_type_name,
                'status':       h.status,
            })
        return JsonResponse(data, safe=False)
    except Exception:
        return JsonResponse([], safe=False)


@csrf_exempt
def donor_profile_view(request):
    email = request.GET.get('email')
    user  = UserRegistrationTbl.objects.filter(email=email).first()
    donor = DonorTbl.objects.filter(user=user).first()
    if request.method == 'GET':
        blood_type_name = ""
        if donor and donor.blood_id:
            b_obj = BloodTypeTbl.objects.filter(blood_id=donor.blood_id).first()
            if b_obj:
                blood_type_name = b_obj.blood_type
        return JsonResponse({
            'fullName':   user.full_name,
            'email':      user.email,
            'phone':      user.contact_no,
            'dob':        donor.dob.strftime('%Y-%m-%d') if (donor and donor.dob) else "",
            'address':    donor.address if donor else "",
            'city':       donor.city    if donor else "",
            'weight':     donor.weight  if donor else "",
            'gender':     donor.gender  if donor else "",
            'bloodGroup': blood_type_name,
        })
    elif request.method == 'PUT':
        data            = json.loads(request.body)
        user.full_name  = data.get('fullName',  user.full_name)
        user.contact_no = data.get('phone',     user.contact_no)
        user.save()
        if donor:
            donor.address = data.get('address', donor.address)
            donor.city    = data.get('city',    donor.city)
            donor.dob     = data.get('dob',     donor.dob)
            donor.weight  = data.get('weight',  donor.weight)
            donor.gender  = data.get('gender',  donor.gender)
            donor.save()
        return JsonResponse({'message': 'Profile updated'})


@csrf_exempt
def register_for_event(request):
    if request.method == 'POST':
        try:
            data     = json.loads(request.body)
            email    = data.get('email')
            event_id = data.get('eventId')
            user  = UserRegistrationTbl.objects.filter(email=email).first()
            donor = DonorTbl.objects.filter(user=user).first()
            event = EventTbl.objects.filter(event_id=event_id).first()
            if not donor or not event:
                return JsonResponse({'error': 'Profile or Event not found.'}, status=404)
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO appointment_tbl
                    (donor_id, event_id, hospital_id, appointment_date, status,
                     health_questionnaire_data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [
                    donor.donor_id, event.event_id, event.hospital_id,
                    event.event_date or timezone.now(), 'Pending', '{}'
                ])
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
                    "UPDATE appointment_tbl SET status = 'Canceled' "
                    "WHERE appointment_id = %s",
                    [appointment_id]
                )
            return JsonResponse({'message': 'Canceled via fallback logic'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# =============================================================================
# DONOR INTEREST — "I CAN DONATE"
# =============================================================================

@csrf_exempt
def donor_interest_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data       = json.loads(request.body)
        email      = data.get('email')
        request_id = data.get('requestId')
        if not email or not request_id:
            return JsonResponse({'error': 'email and requestId are required.'}, status=400)
        user = UserRegistrationTbl.objects.filter(email=email).first()
        if not user:
            return JsonResponse({'error': 'User not found.'}, status=404)
        donor = DonorTbl.objects.filter(user=user).first()
        if not donor:
            return JsonResponse({'error': 'Donor profile not found.'}, status=404)
        blood_request = (
            BloodRequestTbl.objects
            .select_related('hospital')
            .filter(request_id=request_id)
            .first()
        )
        if not blood_request:
            return JsonResponse({'error': 'Blood request not found.'}, status=404)
        hospital_id = blood_request.hospital_id if blood_request.hospital_id else None
        if hospital_id:
            existing = AppointmentTbl.objects.filter(
                donor=donor,
                hospital_id=hospital_id,
                status__in=['Pending', 'Confirmed']
            ).first()
            if existing:
                return JsonResponse({
                    'message':       'You already have a pending appointment with this hospital.',
                    'alreadyExists': True,
                }, status=200)
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO appointment_tbl
                (donor_id, hospital_id, appointment_date, status, health_questionnaire_data)
                VALUES (%s, %s, %s, %s, %s)
            """, [
                donor.donor_id,
                hospital_id,
                timezone.now() + datetime.timedelta(days=1),
                'Pending',
                json.dumps({'interestedInRequestId': request_id}),
            ])
        return JsonResponse({
            'message':   'Interest registered! The hospital has been notified.',
            'requestId': request_id,
        }, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def express_donor_interest(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data       = json.loads(request.body)
        email      = data.get('email')
        request_id = data.get('requestId')
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT d.donor_id, u.full_name, bt.blood_type
                FROM donor_tbl d
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                LEFT JOIN blood_type_tbl bt  ON d.blood_id = bt.blood_id
                WHERE u.email = %s
            """, [email])
            donor_row = cursor.fetchone()
            if not donor_row:
                return JsonResponse({'error': 'Donor profile not found.'}, status=404)
            donor_id, donor_name, blood_type = donor_row
            cursor.execute("""
                SELECT 1 FROM donor_interest_log
                WHERE donor_id = %s AND request_id = %s
            """, [donor_id, request_id])
            if cursor.fetchone():
                return JsonResponse({'message': 'Already expressed interest.'}, status=200)
            cursor.execute("""
                INSERT INTO donor_interest_log
                (donor_id, request_id, donor_name, blood_type, expressed_at)
                VALUES (%s, %s, %s, %s, %s)
            """, [donor_id, request_id, donor_name, blood_type, timezone.now()])
        return JsonResponse(
            {'message': f'Thank you {donor_name}! The hospital has been notified.'},
            status=201
        )
    except Exception as e:
        return JsonResponse(
            {'message': 'Interest registered (local fallback).', 'detail': str(e)},
            status=200
        )


# =============================================================================
# FEATURE 4: DONOR NOTIFICATIONS
# =============================================================================

def get_donor_notifications(request):
    email = request.GET.get('email')
    if not email:
        return JsonResponse([], safe=False)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    a.appointment_id,
                    a.appointment_date,
                    a.status,
                    h.hospital_name
                FROM appointment_tbl a
                JOIN donor_tbl d ON a.donor_id = d.donor_id
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                LEFT JOIN hospital_registration_tbl h ON a.hospital_id = h.hospital_id
                WHERE u.email = %s
                ORDER BY a.appointment_date DESC
                LIMIT 20
            """, [email])
            rows = cursor.fetchall()
        notifications = []
        for row in rows:
            appt_id, appt_date, status, hospital = row
            date_str = appt_date.strftime('%b %d') if appt_date else 'N/A'
            if status == 'Confirmed':
                notifications.append({
                    'id':            f'appt-{appt_id}-confirmed',
                    'type':          'success',
                    'title':         'Appointment Confirmed ✅',
                    'message':       f'{hospital} confirmed your appointment on {date_str}.',
                    'appointmentId': appt_id,
                    'read':          False,
                })
            elif status == 'Rejected':
                notifications.append({
                    'id':            f'appt-{appt_id}-rejected',
                    'type':          'warning',
                    'title':         'Appointment Declined',
                    'message':       f'Your request for {date_str} at {hospital} was declined. Please reschedule.',
                    'appointmentId': appt_id,
                    'read':          False,
                })
            elif status == 'Fulfilled':
                notifications.append({
                    'id':            f'appt-{appt_id}-fulfilled',
                    'type':          'info',
                    'title':         'Donation Recorded 🩸',
                    'message':       f'Your donation on {date_str} at {hospital} has been logged. Thank you!',
                    'appointmentId': appt_id,
                    'read':          False,
                })
            elif status == 'Screening Failed':
                notifications.append({
                    'id':            f'appt-{appt_id}-screening',
                    'type':          'warning',
                    'title':         'Screening Unsuccessful ⚠️',
                    'message':       f'You were marked ineligible during screening on {date_str}. Please check with {hospital}.',
                    'appointmentId': appt_id,
                    'read':          False,
                })
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT br.request_id, br.blood_group, br.urgency, r.full_name
                FROM blood_request_tbl br
                JOIN recipient_tbl r ON br.recipient_id = r.recipient_id
                JOIN donor_tbl d ON d.blood_id = (
                    SELECT blood_id FROM blood_type_tbl
                    WHERE blood_type = br.blood_group LIMIT 1
                )
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                WHERE u.email = %s
                  AND br.status = 'Pending'
                  AND br.urgency IN ('Critical', 'High')
                LIMIT 3
            """, [email])
            urgent_rows = cursor.fetchall()
        for row in urgent_rows:
            req_id, blood_group, urgency, patient_name = row
            notifications.insert(0, {
                'id':        f'req-{req_id}-alert',
                'type':      'urgent',
                'title':     f'🚨 Urgent {blood_group} Needed!',
                'message':   f'{patient_name} urgently needs {blood_group} blood. Can you help?',
                'requestId': req_id,
                'read':      False,
            })
        return JsonResponse(notifications[:10], safe=False)
    except Exception as e:
        return JsonResponse([], safe=False)


# =============================================================================
# FEATURE 5: DONOR ELIGIBILITY (56-day countdown)
# =============================================================================

def get_donor_eligibility(request):
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'eligible': True, 'daysRemaining': 0, 'lastDonation': None})
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT MAX(a.appointment_date)
                FROM appointment_tbl a
                JOIN donor_tbl d ON a.donor_id = d.donor_id
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                WHERE u.email = %s AND a.status = 'Fulfilled'
            """, [email])
            row = cursor.fetchone()
        last_donation = row[0] if row and row[0] else None
        if not last_donation:
            return JsonResponse({
                'eligible':         True,
                'daysRemaining':    0,
                'lastDonation':     None,
                'nextEligibleDate': None,
            })
        next_eligible = last_donation + datetime.timedelta(days=56)
        try:
            today = (
                datetime.datetime.now(tz=last_donation.tzinfo)
                if getattr(last_donation, 'tzinfo', None)
                else datetime.datetime.now()
            )
        except Exception:
            today = datetime.datetime.now()
        days_remaining = max(0, (next_eligible - today).days)
        return JsonResponse({
            'eligible':         days_remaining == 0,
            'daysRemaining':    days_remaining,
            'lastDonation':     last_donation.strftime('%Y-%m-%d'),
            'nextEligibleDate': next_eligible.strftime('%Y-%m-%d'),
        })
    except Exception as e:
        return JsonResponse({'eligible': True, 'daysRemaining': 0, 'error': str(e)})


# =============================================================================
# FEATURE 1: DONATION CERTIFICATE DATA
# =============================================================================

def get_certificate_data(request, appointment_id):
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    a.appointment_id,
                    a.appointment_date,
                    u.full_name        AS donor_name,
                    u.email            AS donor_email,
                    bt.blood_type,
                    h.hospital_name,
                    h.address          AS hospital_address,
                    a.status
                FROM appointment_tbl a
                JOIN donor_tbl d      ON a.donor_id = d.donor_id
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                LEFT JOIN blood_type_tbl bt ON d.blood_id = bt.blood_id
                LEFT JOIN hospital_registration_tbl h ON a.hospital_id = h.hospital_id
                WHERE a.appointment_id = %s AND a.status = 'Fulfilled'
            """, [appointment_id])
            row = cursor.fetchone()
        if not row:
            return JsonResponse(
                {'error': 'Certificate not available for this record.'},
                status=404
            )
        cols = [
            'appointment_id', 'appointment_date', 'donor_name', 'donor_email',
            'blood_type', 'hospital_name', 'hospital_address', 'status',
        ]
        data = dict(zip(cols, row))
        if data.get('appointment_date'):
            try:
                data['appointment_date'] = data['appointment_date'].strftime('%B %d, %Y')
            except Exception:
                data['appointment_date'] = str(data['appointment_date'])
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# ADMIN DASHBOARD & REPORTS
# =============================================================================

def admin_dashboard_stats(request):
    try:
        hospital_id_raw = request.GET.get('hospital_id')
        hospital_id = int(hospital_id_raw) if hospital_id_raw else None

        hospital_name = "Central Admin Dashboard"
        if hospital_id:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT hospital_name FROM hospital_registration_tbl WHERE hospital_id = %s",
                    [hospital_id]
                )
                row = cursor.fetchone()
                if row:
                    hospital_name = row[0]

        with connection.cursor() as cursor:

            cursor.execute("SELECT COUNT(*) FROM user_registration_tbl WHERE user_role = 'Donor'")
            donor_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM user_registration_tbl WHERE user_role = 'Hospital'")
            hospital_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM user_registration_tbl WHERE user_role = 'Recipient'")
            recipient_count = cursor.fetchone()[0]

            if hospital_id:
                cursor.execute(
                    "SELECT COALESCE(SUM(quantity), 0) FROM blood_storage_tbl WHERE hospital_id = %s AND status = 'Available'",
                    [hospital_id]
                )
            else:
                cursor.execute("SELECT COALESCE(SUM(quantity), 0) FROM blood_storage_tbl WHERE status = 'Available'")
            total_units = cursor.fetchone()[0]

            if hospital_id:
                cursor.execute(
                    "SELECT COUNT(*) FROM blood_request_tbl WHERE status = 'Pending' AND hospital_id = %s",
                    [hospital_id]
                )
            else:
                cursor.execute("SELECT COUNT(*) FROM blood_request_tbl WHERE status = 'Pending'")
            pending_requests = cursor.fetchone()[0]

            if hospital_id:
                cursor.execute("""
                    SELECT
                        bt.blood_type,
                        COALESCE(SUM(bs.quantity), 0) AS total_qty
                    FROM blood_type_tbl bt
                    LEFT JOIN blood_storage_tbl bs
                        ON bt.blood_id = bs.blood_id
                        AND bs.hospital_id = %s
                        AND bs.status = 'Available'
                    GROUP BY bt.blood_id, bt.blood_type
                    ORDER BY bt.blood_id
                """, [hospital_id])
            else:
                cursor.execute("""
                    SELECT
                        bt.blood_type,
                        COALESCE(SUM(bs.quantity), 0) AS total_qty
                    FROM blood_type_tbl bt
                    LEFT JOIN blood_storage_tbl bs
                        ON bt.blood_id = bs.blood_id
                        AND bs.status = 'Available'
                    GROUP BY bt.blood_id, bt.blood_type
                    ORDER BY bt.blood_id
                """)
            inventory_rows = cursor.fetchall()

            activity = []
            for i in range(3):
                d = datetime.date.today() - datetime.timedelta(days=i * 30)
                if hospital_id:
                    cursor.execute(
                        "SELECT COUNT(*) FROM appointment_tbl "
                        "WHERE status = 'Fulfilled' AND MONTH(appointment_date) = %s AND hospital_id = %s",
                        [d.month, hospital_id]
                    )
                else:
                    cursor.execute(
                        "SELECT COUNT(*) FROM appointment_tbl "
                        "WHERE status = 'Fulfilled' AND MONTH(appointment_date) = %s",
                        [d.month]
                    )
                don = cursor.fetchone()[0]

                if hospital_id:
                    cursor.execute(
                        "SELECT COUNT(*) FROM blood_request_tbl "
                        "WHERE MONTH(request_date) = %s AND hospital_id = %s",
                        [d.month, hospital_id]
                    )
                else:
                    cursor.execute(
                        "SELECT COUNT(*) FROM blood_request_tbl WHERE MONTH(request_date) = %s",
                        [d.month]
                    )
                req = cursor.fetchone()[0]

                activity.append({
                    'month':     d.strftime('%B'),
                    'donations': don,
                    'requests':  req,
                    'outcome':   f"{don - req:+}",
                })

        inventory = []
        for blood_type, count in inventory_rows:
            inventory.append({
                'type':     blood_type,
                'count':    int(count),
                'capacity': 100,
                'status':   'Critical' if count == 0 else ('Low' if count < 10 else 'Stable'),
            })

        stats = {
            'donors':           donor_count,
            'hospitals':        hospital_count,
            'recipients':       recipient_count,
            'total_units':      int(total_units),
            'pending_requests': pending_requests,
        }

        return JsonResponse({
            'hospital_name':    hospital_name,
            'stats':            stats,
            'inventory':        inventory,
            'monthly_activity': activity,
        })
    except Exception as e:
        import traceback
        print("admin_dashboard_stats ERROR:", traceback.format_exc())
        return JsonResponse({'error': str(e)}, status=500)


def user_list(request):
    users = UserRegistrationTbl.objects.values(
        'user_id', 'full_name', 'email', 'user_role', 'status'
    )
    return JsonResponse(list(users), safe=False)


@csrf_exempt
def delete_user(request, user_id):
    if request.method == 'DELETE':
        UserRegistrationTbl.objects.filter(user_id=user_id).update(status='Banned')
        return JsonResponse({'message': 'User disabled successfully'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# =============================================================================
# HOSPITAL: get hospital_id for a logged-in hospital user
# =============================================================================

def get_hospital_id(request):
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'error': 'email required'}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT h.hospital_id, h.hospital_name
                FROM hospital_registration_tbl h
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                WHERE u.email = %s
            """, [email])
            row = cursor.fetchone()
        if not row:
            return JsonResponse({'error': 'Hospital profile not found'}, status=404)
        return JsonResponse({'hospitalId': row[0], 'hospitalName': row[1]})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# EVENTS & HOSPITAL ACTIONS
# =============================================================================

def event_list(request):
    try:
        events = EventTbl.objects.select_related('hospital').all().order_by('-event_date')
        data = [{
            'id':           e.event_id,
            'title':        e.event_title,
            'location':     e.location,
            'date':         e.event_date.strftime('%Y-%m-%d') if e.event_date else "N/A",
            'startTime':    e.start_time,
            'endTime':      e.end_time,
            'seats':        e.seats_available,
            'hospitalName': e.hospital.hospital_name if e.hospital else "Unknown",
        } for e in events]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def delete_event_view(request, event_id):
    if request.method == 'DELETE':
        EventTbl.objects.filter(event_id=event_id).delete()
        return JsonResponse({'message': 'Event successfully removed'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def fulfill_appointment_view(request, appointment_id):
    if request.method not in ('POST', 'GET'):
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    appt = AppointmentTbl.objects.filter(appointment_id=appointment_id).first()
    if not appt:
        return JsonResponse({'error': 'Not found'}, status=404)
    appt.status = 'Fulfilled'
    appt.save()
    try:
        BloodStorageTbl.objects.create(
            appointment=appt,
            blood_id=appt.donor.blood_id if appt.donor else None,
            quantity=1,
            status='Available',
            expiry_date=datetime.date.today() + datetime.timedelta(days=42),
        )
    except Exception:
        # If blood_id column missing from model vs DB, use raw SQL
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO blood_storage_tbl
                (appointment_id, blood_id, quantity, expiry_date, status, hospital_id)
                SELECT %s, d.blood_id, 1, %s, 'Available', %s
                FROM donor_tbl d WHERE d.donor_id = %s
            """, [
                appointment_id,
                (datetime.date.today() + datetime.timedelta(days=42)).isoformat(),
                appt.hospital_id if appt.hospital_id else None,
                appt.donor_id if appt.donor_id else None,
            ])
    return JsonResponse({'message': 'Stock updated'})


# =============================================================================
# RAW SQL ENDPOINTS
# =============================================================================

@csrf_exempt
def create_blood_request_raw(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT recipient_id FROM recipient_tbl WHERE user_id = %s",
                    [data.get('userId')]
                )
                recipient = cursor.fetchone()
                if not recipient:
                    return JsonResponse({'error': 'Recipient profile not found'}, status=404)

                hospital_id = data.get('hospitalId')

                cursor.execute("""
                    INSERT INTO blood_request_tbl
                    (recipient_id, hospital_id, blood_group, units, urgency,
                     doctor_name, status, request_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, [
                    recipient[0],
                    hospital_id,
                    data.get('bloodGroup'),
                    data.get('units'),
                    data.get('urgency'),
                    data.get('doctorName', 'Emergency Dept'),
                    'Pending',
                    timezone.now(),
                ])
                new_request_id = cursor.lastrowid

            request_type = 'global city-wide' if hospital_id is None else 'hospital-targeted'
            return JsonResponse({
                'message':   f'Blood request created successfully ({request_type})',
                'requestId': new_request_id,
                'isGlobal':  hospital_id is None,
            }, status=201)
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
                    "UPDATE user_registration_tbl "
                    "SET full_name = %s, contact_no = %s WHERE email = %s",
                    [data.get('fullName'), data.get('phone'), data.get('email')]
                )
                cursor.execute(
                    "UPDATE donor_tbl "
                    "SET address = %s, city = %s, weight = %s, gender = %s "
                    "WHERE user_id = ("
                    "    SELECT user_id FROM user_registration_tbl WHERE email = %s"
                    ")",
                    [
                        data.get('address'), data.get('city'),
                        data.get('weight'),  data.get('gender'),
                        data.get('email'),
                    ]
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
                cursor.execute("""
                    INSERT INTO blood_storage_tbl
                    (hospital_id, blood_id, quantity, expiry_date, status)
                    VALUES (
                        %s,
                        (SELECT blood_id FROM blood_type_tbl WHERE blood_type = %s),
                        %s, %s, %s
                    )
                """, [
                    data.get('hospitalId'),
                    data.get('bloodGroup'),
                    data.get('units'),
                    data.get('expiryDate'),
                    'Available',
                ])
            return JsonResponse({'message': 'Stock updated successfully'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Method not allowed'}, status=405)


# =============================================================================
# RECIPIENT REQUEST STATUS + LIVE DONOR INTEREST COUNT
# =============================================================================

def get_recipient_requests(request):
    email = request.GET.get('email')
    if not email:
        return JsonResponse([], safe=False)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    br.request_id,
                    br.blood_group,
                    br.units,
                    br.urgency,
                    br.status,
                    br.request_date,
                    br.hospital_id,
                    COALESCE(h.hospital_name, 'Open to Any Hospital') AS hospital_name,
                    COALESCE(h.city, 'N/A')                           AS hospital_city
                FROM blood_request_tbl br
                LEFT JOIN hospital_registration_tbl h ON br.hospital_id = h.hospital_id
                JOIN recipient_tbl r      ON br.recipient_id = r.recipient_id
                JOIN user_registration_tbl u ON r.user_id = u.user_id
                WHERE u.email = %s
                ORDER BY br.request_date DESC
            """, [email])
            rows = cursor.fetchall()
        results = []
        for row in rows:
            (req_id, blood_group, units, urgency, status,
             req_date, hospital_id, hospital_name, hospital_city) = row
            interest_count = 0
            try:
                with connection.cursor() as c2:
                    c2.execute(
                        "SELECT COUNT(*) FROM donor_interest_log WHERE request_id = %s",
                        [req_id]
                    )
                    ic_row = c2.fetchone()
                    interest_count = ic_row[0] if ic_row else 0
            except Exception:
                pass
            results.append({
                'requestId':          req_id,
                'bloodGroup':         blood_group,
                'units':              units,
                'urgency':            urgency,
                'status':             status,
                'requestDate':        req_date.strftime('%Y-%m-%d') if req_date else 'N/A',
                'hospitalName':       hospital_name,
                'hospitalCity':       hospital_city,
                'hospitalId':         hospital_id,
                'donorInterestCount': interest_count,
                'isGlobal':           hospital_id is None,
            })
        return JsonResponse(results, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# RECIPIENT BILLING & ONLINE PAYMENT
# =============================================================================

def get_recipient_bills(request):
    email = request.GET.get('email')
    if not email:
        return JsonResponse([], safe=False)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    inv.bill_no,
                    inv.quantity,
                    inv.rate,
                    inv.blood_received_by,
                    inv.mobile_no,
                    a.appointment_date,
                    bt.blood_type,
                    COALESCE(p.status, 'Unpaid')                    AS payment_status,
                    COALESCE(p.amount, inv.quantity * inv.rate)     AS amount,
                    p.payment_id,
                    p.payment_date
                FROM invoice_no_tbl inv
                LEFT JOIN appointment_tbl a   ON inv.appointment_id = a.appointment_id
                LEFT JOIN blood_type_tbl bt   ON inv.blood_id = bt.blood_id
                LEFT JOIN payment_tbl p       ON p.bill_no = inv.bill_no
                JOIN donor_tbl d              ON inv.donor_id = d.donor_id
                JOIN user_registration_tbl u  ON d.user_id = u.user_id
                WHERE u.email = %s
                ORDER BY inv.bill_no DESC
            """, [email])
            rows = cursor.fetchall()
        bills = []
        for row in rows:
            (bill_no, qty, rate, received_by, mobile,
             appt_date, blood_type, pay_status, amount, pay_id, pay_date) = row
            bills.append({
                'billNo':          bill_no,
                'quantity':        qty,
                'rate':            float(rate)   if rate   else 500.0,
                'amount':          float(amount) if amount else float(qty or 1) * 500.0,
                'bloodReceivedBy': received_by or 'N/A',
                'mobileNo':        mobile       or 'N/A',
                'appointmentDate': appt_date.strftime('%Y-%m-%d') if appt_date else 'N/A',
                'bloodType':       blood_type   or 'N/A',
                'paymentStatus':   pay_status,
                'paymentId':       pay_id,
                'paymentDate':     pay_date.strftime('%Y-%m-%d') if pay_date else None,
            })
        return JsonResponse(bills, safe=False)
    except Exception as e:
        return JsonResponse([], safe=False)


@csrf_exempt
def mark_bill_paid(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data    = json.loads(request.body)
        bill_no = data.get('billNo')
        email   = data.get('email')
        mode    = data.get('paymentMode', 'Online')
        if not bill_no or not email:
            return JsonResponse({'error': 'billNo and email are required.'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT r.recipient_id
                FROM recipient_tbl r
                JOIN user_registration_tbl u ON r.user_id = u.user_id
                WHERE u.email = %s
            """, [email])
            rec_row = cursor.fetchone()
            if not rec_row:
                return JsonResponse({'error': 'Recipient profile not found.'}, status=404)
            recipient_id = rec_row[0]
            cursor.execute(
                "SELECT quantity * rate FROM invoice_no_tbl WHERE bill_no = %s",
                [bill_no]
            )
            amount_row = cursor.fetchone()
            if not amount_row:
                return JsonResponse({'error': 'Invoice not found.'}, status=404)
            amount = float(amount_row[0]) if amount_row[0] else 0.0
            cursor.execute(
                "SELECT 1 FROM payment_tbl WHERE bill_no = %s AND status = 'Paid'",
                [bill_no]
            )
            if cursor.fetchone():
                return JsonResponse({'message': 'This bill has already been paid.'}, status=200)
            cursor.execute("""
                INSERT INTO payment_tbl
                (recipient_id, bill_no, amount, payment_date, status, mode)
                VALUES (%s, %s, %s, %s, 'Paid', %s)
            """, [recipient_id, bill_no, amount, timezone.now(), mode])
        return JsonResponse({
            'message': 'Payment recorded successfully!',
            'amount':  amount,
            'billNo':  bill_no,
        }, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# HOSPITAL APPOINTMENTS — LIST & UPDATE (NEW)
# GET  /api/hospital/appointments/?email=<hospital_user_email>
# POST /api/hospital/appointments/<id>/update/  { "status": "Confirmed"|"Rejected" }
# POST /api/hospital/appointments/<id>/fulfill/ (reuses fulfill_appointment_view)
# =============================================================================

def hospital_appointments_list(request):
    """
    Returns all donor appointments for the hospital the logged-in user belongs to.
    """
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'error': 'email required'}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    a.appointment_id,
                    a.appointment_date,
                    a.status,
                    u.full_name   AS donor_name,
                    u.email       AS donor_email,
                    bt.blood_type
                FROM appointment_tbl a
                JOIN donor_tbl d ON a.donor_id = d.donor_id
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                LEFT JOIN blood_type_tbl bt ON d.blood_id = bt.blood_id
                JOIN hospital_registration_tbl h ON a.hospital_id = h.hospital_id
                JOIN user_registration_tbl hu ON h.user_id = hu.user_id
                WHERE hu.email = %s
                ORDER BY a.appointment_date DESC
            """, [email])
            rows = cursor.fetchall()

        data = []
        for row in rows:
            appt_id, appt_date, status, donor_name, donor_email, blood_type = row
            data.append({
                'id':          appt_id,
                'donorName':   donor_name,
                'donorEmail':  donor_email,
                'bloodType':   blood_type or 'Unknown',
                'date':        appt_date.strftime('%Y-%m-%d') if appt_date else 'N/A',
                'time':        appt_date.strftime('%I:%M %p') if appt_date else 'N/A',
                'requestDate': appt_date.strftime('%Y-%m-%d') if appt_date else 'N/A',
                'status':      status,
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def hospital_appointment_update(request, appointment_id):
    """
    Updates appointment status to Confirmed or Rejected.
    POST body: { "status": "Confirmed" | "Rejected" }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data       = json.loads(request.body)
        new_status = data.get('status')
        if new_status not in ('Confirmed', 'Rejected', 'Screening Failed'):
            return JsonResponse({'error': 'Invalid status value'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE appointment_tbl SET status = %s WHERE appointment_id = %s",
                [new_status, appointment_id]
            )
            if cursor.rowcount == 0:
                return JsonResponse({'error': 'Appointment not found'}, status=404)
        return JsonResponse({'message': f'Appointment {new_status.lower()} successfully.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# HOSPITAL EVENTS — LIST, CREATE, AND DONOR ROSTER (NEW)
# GET  /api/hospital/events/?email=<hospital_user_email>
# POST /api/hospital/events/create/   { email, title, date, startTime, endTime, location, seats, description }
# GET  /api/hospital/events/<id>/donors/
# =============================================================================

def hospital_events_list(request):
    """
    Returns all events created by the hospital the logged-in user belongs to.
    Also includes a count of registered donors and remaining seats per event.
    """
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'error': 'email required'}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    e.event_id,
                    e.event_title,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    e.location,
                    e.seats_available,
                    COUNT(a.appointment_id) AS registered_count
                FROM event_tbl e
                JOIN hospital_registration_tbl h ON e.hospital_id = h.hospital_id
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                LEFT JOIN appointment_tbl a
                    ON a.event_id = e.event_id
                    AND a.status NOT IN ('Rejected', 'Canceled')
                WHERE u.email = %s
                GROUP BY e.event_id, e.event_title, e.event_date, e.start_time, e.end_time,
                         e.location, e.seats_available
                ORDER BY e.event_date DESC
            """, [email])
            rows = cursor.fetchall()

        data = []
        for row in rows:
            event_id, title, event_date, start_time, end_time, location, total_seats, reg_count = row
            seats_left = max(0, (total_seats or 0) - (reg_count or 0))
            data.append({
                'id':              event_id,
                'title':           title,
                'date':            event_date.strftime('%Y-%m-%d') if event_date and not isinstance(event_date, str) else (event_date or ''),
                'startTime':       start_time if start_time else '',
                'endTime':         end_time if end_time else '',
                'location':        location or '',
                'seats':           seats_left,
                'registeredCount': reg_count or 0,
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def hospital_events_create(request):
    """
    Creates a new event for the hospital the logged-in user belongs to.
    POST body: { email, title, date, startTime, endTime, location, seats, description }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        body = json.loads(request.body)
        email       = body.get('email')
        title       = body.get('title')
        date        = body.get('date')
        start_time  = body.get('startTime')
        end_time    = body.get('endTime')
        location    = body.get('location')
        seats       = int(body.get('seats') or 100)
        description = body.get('description', '')

        if not all([email, title, date, start_time, end_time, location]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        with connection.cursor() as cursor:
            # Resolve hospital_id from user email
            cursor.execute("""
                SELECT h.hospital_id
                FROM hospital_registration_tbl h
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                WHERE u.email = %s
                LIMIT 1
            """, [email])
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'error': 'Hospital not found for this email'}, status=404)
            hospital_id = row[0]

            cursor.execute("""
                INSERT INTO event_tbl
                    (hospital_id, event_title, event_date, start_time, end_time, location, seats_available, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, [hospital_id, title, date, start_time, end_time, location, seats, description])

        return JsonResponse({'message': 'Event created successfully.'}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def hospital_event_donors(request, event_id):
    """
    Returns all donors registered (via appointment) for a specific event.
    GET /api/hospital/events/<event_id>/donors/
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    a.appointment_id,
                    u.full_name   AS donor_name,
                    u.email       AS donor_email,
                    bt.blood_type,
                    a.status
                FROM appointment_tbl a
                JOIN donor_tbl d ON a.donor_id = d.donor_id
                JOIN user_registration_tbl u ON d.user_id = u.user_id
                LEFT JOIN blood_type_tbl bt ON d.blood_id = bt.blood_id
                WHERE a.event_id = %s
                ORDER BY a.appointment_id ASC
            """, [event_id])
            rows = cursor.fetchall()

        data = []
        for row in rows:
            appt_id, donor_name, donor_email, blood_type, status = row
            data.append({
                'appointmentId': appt_id,
                'donorName':     donor_name,
                'donorEmail':    donor_email,
                'bloodType':     blood_type or 'Unknown',
                'status':        status,
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# =============================================================================
# HOSPITAL STOCK AUDIT LOG
# GET /api/hospital/stock-log/?email=<hospital_user_email>
# =============================================================================

def hospital_stock_log(request):
    email = request.GET.get("email")
    if not email:
        return JsonResponse({"error": "email required"}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT h.hospital_id
                FROM hospital_registration_tbl h
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                WHERE u.email = %s LIMIT 1
            """, [email])
            row = cursor.fetchone()
            if not row:
                return JsonResponse({"error": "Hospital not found"}, status=404)
            hospital_id = row[0]

            cursor.execute("""
                SELECT
                    bs.unit_id,
                    bs.expiry_date,
                    bt.blood_type,
                    bs.quantity,
                    COALESCE(u.full_name, "Manual Entry") AS donor_name,
                    COALESCE(e.event_title, "Direct Donation") AS source
                FROM blood_storage_tbl bs
                LEFT JOIN blood_type_tbl bt ON bs.blood_id = bt.blood_id
                LEFT JOIN appointment_tbl a ON bs.appointment_id = a.appointment_id
                LEFT JOIN donor_tbl d ON a.donor_id = d.donor_id
                LEFT JOIN user_registration_tbl u ON d.user_id = u.user_id
                LEFT JOIN event_tbl e ON a.event_id = e.event_id
                WHERE bs.hospital_id = %s
                ORDER BY bs.unit_id DESC
            """, [hospital_id])
            in_rows = cursor.fetchall()

            cursor.execute("""
                SELECT
                    br.request_id,
                    br.request_date,
                    br.blood_group,
                    br.units,
                    COALESCE(r.full_name, "Unknown Patient") AS patient_name,
                    CONCAT("Request #", br.request_id) AS source
                FROM blood_request_tbl br
                LEFT JOIN recipient_tbl r ON br.recipient_id = r.recipient_id
                WHERE br.hospital_id = %s AND br.status = "Fulfilled"
                ORDER BY br.request_date DESC
            """, [hospital_id])
            out_rows = cursor.fetchall()

        transactions = []
        for row in in_rows:
            unit_id, expiry_date, blood_type, quantity, donor_name, source = row
            transactions.append({
                "id":        f"in-{unit_id}",
                "type":      "IN",
                "date":      expiry_date.strftime("%Y-%m-%d") if expiry_date else "N/A",
                "time":      "",
                "entity":    donor_name,
                "bloodGroup": blood_type or "N/A",
                "quantity":  quantity,
                "reason":    source,
            })
        for row in out_rows:
            req_id, req_date, blood_group, units, patient_name, source = row
            transactions.append({
                "id":        f"out-{req_id}",
                "type":      "OUT",
                "date":      req_date.strftime("%Y-%m-%d") if req_date else "N/A",
                "time":      req_date.strftime("%I:%M %p") if req_date else "",
                "entity":    patient_name,
                "bloodGroup": blood_group or "N/A",
                "quantity":  units,
                "reason":    source,
            })
        transactions.sort(key=lambda x: x["date"], reverse=True)
        return JsonResponse(transactions, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



# =============================================================================
# HOSPITAL PATIENT REQUESTS
# GET  /api/hospital/requests/?email=<hospital_user_email>
# POST /api/requests/<id>/update-status/  { "status": "Approved"|"Rejected"|"Pending" }
# =============================================================================

def hospital_requests_list(request):
    """
    Returns all blood requests submitted to this hospital.
    """
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'error': 'email required'}, status=400)
    try:
        with connection.cursor() as cursor:
            # Resolve hospital_id
            cursor.execute("""
                SELECT h.hospital_id
                FROM hospital_registration_tbl h
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                WHERE u.email = %s LIMIT 1
            """, [email])
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'error': 'Hospital not found'}, status=404)
            hospital_id = row[0]

            cursor.execute("""
                SELECT
                    br.request_id,
                    br.blood_group,
                    br.units,
                    br.urgency,
                    br.status,
                    br.request_date,
                    br.doctor_name,
                    COALESCE(r.full_name, 'Unknown Patient') AS patient_name,
                    COALESCE(r.contact_number, 'N/A')        AS contact,
                    COALESCE(r.address, 'N/A')               AS address
                FROM blood_request_tbl br
                LEFT JOIN recipient_tbl r ON br.recipient_id = r.recipient_id
                WHERE br.hospital_id = %s
                ORDER BY br.request_date DESC
            """, [hospital_id])
            rows = cursor.fetchall()

        data = []
        for row in rows:
            (req_id, blood_group, units, urgency, status,
             req_date, doctor, patient, contact, address) = row
            data.append({
                'id':         req_id,
                'bloodGroup': blood_group,
                'units':      units,
                'urgency':    urgency,
                'status':     status,
                'date':       req_date.strftime('%Y-%m-%d') if req_date else 'N/A',
                'doctor':     doctor or 'N/A',
                'patient':    patient,
                'contact':    contact,
                'address':    address,
                'gender':     'N/A',
                'age':        'N/A',
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_request_status(request, request_id):
    """
    Updates a blood request status to Approved, Rejected, or Pending.
    POST body: { "status": "Approved" | "Rejected" | "Pending" }
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data       = json.loads(request.body)
        new_status = data.get('status')
        if new_status not in ('Approved', 'Rejected', 'Pending', 'Fulfilled'):
            return JsonResponse({'error': 'Invalid status value'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE blood_request_tbl SET status = %s WHERE request_id = %s",
                [new_status, request_id]
            )
            if cursor.rowcount == 0:
                return JsonResponse({'error': 'Request not found'}, status=404)
        return JsonResponse({'message': f'Request marked as {new_status}.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def confirm_transfusion(request):
    """
    Updates appointment to 'Transfusion Done', generates an invoice,
    and sets the blood request to 'Awaiting Payment'.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        appointment_id = data.get('appointmentId')
        request_id = data.get('requestId')

        if not appointment_id or not request_id:
            return JsonResponse({'error': 'appointmentId and requestId are required'}, status=400)

        with connection.cursor() as cursor:
            # 1. Update Appointment Status
            cursor.execute(
                "UPDATE appointment_tbl SET status = 'Transfusion Done' WHERE appointment_id = %s",
                [appointment_id]
            )

            # 2. Fetch data for Invoice (Donor, Recipient, Blood ID)
            cursor.execute("""
                SELECT a.donor_id, r.recipient_id, d.blood_id 
                FROM appointment_tbl a
                JOIN donor_tbl d ON a.donor_id = d.donor_id
                CROSS JOIN blood_request_tbl br
                JOIN recipient_tbl r ON br.recipient_id = r.recipient_id
                WHERE a.appointment_id = %s AND br.request_id = %s
            """, [appointment_id, request_id])
            
            row = cursor.fetchone()
            if not row:
                return JsonResponse({'error': 'Linked records not found'}, status=404)
            
            donor_id, recipient_id, blood_id = row

            # 3. Create Invoice Record
            cursor.execute("""
                INSERT INTO invoice_no_tbl 
                (appointment_id, donor_id, blood_id, blood_received_by, quantity, rate)
                SELECT %s, %s, %s, full_name, 1, 500.0
                FROM recipient_tbl WHERE recipient_id = %s
            """, [appointment_id, donor_id, blood_id, recipient_id])

            # 4. Update Blood Request Status
            cursor.execute(
                "UPDATE blood_request_tbl SET status = 'Awaiting Payment' WHERE request_id = %s",
                [request_id]
            )

        return JsonResponse({'message': 'Transfusion confirmed and invoice generated.'}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
def get_hospital_subscription(request):
    email = request.GET.get('email')
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT s.end_date, s.status, h.hospital_name
                FROM hospital_subscription_tbl s
                JOIN hospital_registration_tbl h ON s.hospital_id = h.hospital_id
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                WHERE u.email = %s
            """, [email])
            row = cursor.fetchone()
            
        if not row:
            return JsonResponse({'error': 'Subscription not found'}, status=404)
            
        return JsonResponse({
            'endDate': row[0].strftime('%Y-%m-%d') if row[0] else 'N/A',
            'status': row[1],
            'hospitalName': row[2]
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def renew_hospital_subscription(request):
    """Adds 30 days to the existing subscription end date."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data = json.loads(request.body)
        email = data.get('email')

        with connection.cursor() as cursor:
            # Update by adding 30 days to the current end_date
            cursor.execute("""
                UPDATE hospital_subscription_tbl s
                JOIN hospital_registration_tbl h ON s.hospital_id = h.hospital_id
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                SET s.end_date = DATE_ADD(GREATEST(s.end_date, NOW()), INTERVAL 30 DAY),
                    s.status = 'Active'
                WHERE u.email = %s
            """, [email])
            
            if cursor.rowcount == 0:
                return JsonResponse({'error': 'Hospital subscription not found'}, status=404)

        return JsonResponse({'message': 'Subscription renewed for 30 days.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def get_hospital_profile(request):
    """
    Fetches the hospital's profile details based on the logged-in user's email.
    """
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'error': 'email required'}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT h.hospital_name, h.license_no, h.address, h.city
                FROM hospital_registration_tbl h
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                WHERE u.email = %s
            """, [email])
            row = cursor.fetchone()
            
        if not row:
            return JsonResponse({'error': 'Hospital profile not found'}, status=404)
            
        return JsonResponse({
            'hospitalName': row[0],
            'licenseNo': row[1] or 'N/A',
            'address': row[2],
            'city': row[3]
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
def get_recipient_profile(request):
    """
    GET /api/recipient/profile/?email=<email>
    Returns recipient's contact info and blood type.
    """
    email = request.GET.get('email')
    if not email:
        return JsonResponse({'error': 'email required'}, status=400)
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT r.full_name, r.contact_number, r.address, bt.blood_type
                FROM recipient_tbl r
                JOIN user_registration_tbl u ON r.user_id = u.user_id
                LEFT JOIN blood_type_tbl bt  ON r.blood_id = bt.blood_id
                WHERE u.email = %s
            """, [email])
            row = cursor.fetchone()
        if not row:
            return JsonResponse({'error': 'Recipient profile not found'}, status=404)
        return JsonResponse({
            'fullName':      row[0] or '',
            'contactNumber': row[1] or '',
            'address':       row[2] or '',
            'bloodType':     row[3] or '',
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_recipient_profile(request):
    """
    PUT /api/recipient/profile/update/
    Body: { email, contactNumber, address }
    Updates the recipient's mutable fields.
    """
    if request.method != 'PUT':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data    = json.loads(request.body)
        email   = data.get('email')
        contact = data.get('contactNumber', '')
        address = data.get('address', '')
        if not email:
            return JsonResponse({'error': 'email required'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE recipient_tbl r
                JOIN user_registration_tbl u ON r.user_id = u.user_id
                SET r.contact_number = %s, r.address = %s
                WHERE u.email = %s
            """, [contact, address, email])
        return JsonResponse({'message': 'Profile updated successfully.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_hospital_profile(request):
    """
    PUT /api/hospital/profile/update/
    Body: { email, hospitalName, address, city }
    Updates hospital registration details.
    """
    if request.method != 'PUT':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    try:
        data  = json.loads(request.body)
        email = data.get('email')
        if not email:
            return JsonResponse({'error': 'email required'}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE hospital_registration_tbl h
                JOIN user_registration_tbl u ON h.user_id = u.user_id
                SET h.hospital_name = %s,
                    h.address       = %s,
                    h.city          = %s
                WHERE u.email = %s
            """, [
                data.get('hospitalName', ''),
                data.get('address', ''),
                data.get('city', ''),
                email,
            ])
        return JsonResponse({'message': 'Hospital profile updated successfully.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)