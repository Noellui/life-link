from django.urls import path
from . import views

urlpatterns = [
    # --- AUTHENTICATION ---
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('verify-email/', views.verify_email, name='verify_email'),

    # --- ADMIN DASHBOARD ---
    path('admin/stats/', views.admin_dashboard_stats, name='admin_stats'),
    path('admin/users/', views.user_list, name='user_list'),
    path('admin/users/<int:user_id>/', views.delete_user, name='delete_user'),
    path('admin/events/<int:event_id>/', views.delete_event_view, name='delete_event'),
    path('admin/events/', views.event_list, name='admin_event_list'),

    # --- DONOR DASHBOARD & PROFILE ---
    path('donor/stats/', views.donor_dashboard_stats, name='donor_stats'),
    path('donor/profile/', views.donor_profile_view, name='donor_profile'),
    path('donor/requests/', views.active_requests, name='active_requests'),
    path('donor/appointments/', views.donor_appointments_list, name='donor_appointments'),
    path('donor/history/', views.donor_history_list, name='donor_history'),
    path('donor/register-event/', views.register_for_event, name='register_event'),
    path('donor/appointments/<int:appointment_id>/cancel/', views.cancel_appointment, name='cancel_appointment'),
    path('donor/interest/', views.express_donor_interest, name='donor_interest'),
    path('donor/certificate/<int:appointment_id>/', views.get_certificate_data, name='certificate_data'),
    path('donor/notifications/', views.get_donor_notifications, name='donor_notifications'),
    path('donor/eligibility/', views.get_donor_eligibility, name='donor_eligibility'),

    # --- HOSPITAL ACTIONS ---
    path('events/', views.event_list, name='event_list'),
    path('appointments/<int:appointment_id>/fulfill/', views.fulfill_appointment_view, name='fulfill_appointment'),

    # --- HOSPITAL APPOINTMENTS (NEW BACKEND-CONNECTED ROUTES) ---
    path('hospital/appointments/', views.hospital_appointments_list, name='hospital_appointments_list'),
    path('hospital/appointments/<int:appointment_id>/update/', views.hospital_appointment_update, name='hospital_appointment_update'),
    path('hospital/appointments/<int:appointment_id>/fulfill/', views.fulfill_appointment_view, name='hospital_fulfill_appointment'),

    # --- HOSPITAL EVENTS (NEW BACKEND-CONNECTED ROUTES) ---
    path('hospital/events/', views.hospital_events_list, name='hospital_events_list'),
    path('hospital/events/create/', views.hospital_events_create, name='hospital_events_create'),
    path('hospital/events/<int:event_id>/donors/', views.hospital_event_donors, name='hospital_event_donors'),

    # --- RAW SQL ENDPOINTS ---
    path('requests/create-raw/', views.create_blood_request_raw, name='create_blood_request_raw'),
    path('profile/update-raw/', views.update_profile_raw, name='update_profile_raw'),
    path('hospital/manage-stock-raw/', views.manage_stock_raw, name='manage_stock_raw'),

    # --- RECIPIENT ---
    path('recipient/create-request/', views.create_blood_request_raw, name='create_request'),
    path('recipient/requests/', views.get_recipient_requests, name='recipient_requests'),
    path('recipient/bills/', views.get_recipient_bills, name='recipient_bills'),
    path('recipient/bills/pay/', views.mark_bill_paid, name='mark_bill_paid'),
]