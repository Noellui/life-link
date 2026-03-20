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
    path('admin/finance/', views.admin_finance_report, name='admin_finance_report'),
    path('admin/inventory-report/', views.admin_inventory_report, name='admin_inventory_report'),
    path('admin/demographics-report/', views.admin_demographics_report, name='admin_demographics_report'),
    path('admin/supply-demand-report/', views.admin_supply_demand_report, name='admin_supply_demand_report'),

    # --- DONOR DASHBOARD & PROFILE ---
    path('donor/stats/', views.donor_dashboard_stats, name='donor_stats'),
    path('donor/profile/', views.donor_profile_view, name='donor_profile'),
    path('donor/requests/', views.active_requests, name='active_requests'),
    path('donor/appointments/', views.donor_appointments_list, name='donor_appointments'),
    path('donor/history/', views.donor_history_list, name='donor_history'),
    path('donor/register-event/', views.register_for_event, name='register_event'),
    path('donor/appointments/<int:appointment_id>/cancel/', views.cancel_appointment, name='cancel_appointment'),
    # "I Can Donate" button — writes to appointment_tbl so hospital can see the donor
    path('donor/interest/', views.donor_interest_view, name='donor_interest'),

    path('donor/certificate/<int:appointment_id>/', views.get_certificate_data, name='certificate_data'),
    path('donor/notifications/', views.get_donor_notifications, name='donor_notifications'),
    path('donor/eligibility/', views.get_donor_eligibility, name='donor_eligibility'),

    # Returns request IDs donor has already responded to (checks appointment_tbl, port-agnostic)
    path('donor/my-interests/', views.get_donor_interests, name='donor_my_interests'),
    path('hospitals/by-city/', views.get_hospitals_by_city, name='hospitals_by_city'),

    # --- HOSPITAL ACTIONS ---
    path('events/', views.event_list, name='event_list'),
    path('appointments/<int:appointment_id>/fulfill/', views.fulfill_appointment_view, name='fulfill_appointment'),

    # --- HOSPITAL APPOINTMENTS ---
    path('hospital/appointments/', views.hospital_appointments_list, name='hospital_appointments_list'),
    path('hospital/appointments/<int:appointment_id>/update/', views.hospital_appointment_update, name='hospital_appointment_update'),
    path('hospital/appointments/<int:appointment_id>/cancel/', views.hospital_cancel_appointment, name='hospital_cancel_appointment'),
    path('hospital/appointments/<int:appointment_id>/fulfill/', views.fulfill_appointment_view, name='hospital_fulfill_appointment'),

    # --- HOSPITAL EVENTS ---
    path('hospital/events/', views.hospital_events_list, name='hospital_events_list'),
    path('hospital/events/create/', views.hospital_events_create, name='hospital_events_create'),
    path('hospital/events/<int:event_id>/donors/', views.hospital_event_donors, name='hospital_event_donors'),
    path('hospital/stock-log/', views.hospital_stock_log, name='hospital_stock_log'),
    path('hospital/requests/', views.hospital_requests_list, name='hospital_requests_list'),
    path('hospital/allocate-stock/', views.allocate_blood_stock, name='allocate_stock'),
    path('requests/<int:request_id>/update-status/', views.update_request_status, name='update_request_status'),

    # Transfusion
    path('hospital/appointments/transfusion/', views.confirm_transfusion, name='confirm_transfusion'),
    path('hospital/appointments/backfill-invoice/', views.backfill_invoice, name='backfill_invoice'),

    # Subscription
    path('hospital/subscription/', views.get_hospital_subscription, name='get_hospital_subscription'),
    path('hospital/subscription/renew/', views.renew_hospital_subscription, name='renew_hospital_subscription'),
    path('hospital/subscription/free-trial/', views.create_free_trial_subscription, name='create_free_trial_subscription'),

    # --- RAW SQL ENDPOINTS ---
    path('requests/create-raw/', views.create_blood_request_raw, name='create_blood_request_raw'),
    path('profile/update-raw/', views.update_profile_raw, name='update_profile_raw'),
    path('hospital/manage-stock-raw/', views.manage_stock_raw, name='manage_stock_raw'),

    # --- RECIPIENT ---
    path('recipient/create-request/', views.create_blood_request_raw, name='create_request'),
    path('recipient/requests/', views.get_recipient_requests, name='recipient_requests'),
    path('recipient/nearby-stock/', views.nearby_stock_for_request, name='nearby_stock'),
    path('recipient/check-escalation/', views.check_escalation_eligibility, name='check_escalation'),
    path('recipient/escalate-broadcast/', views.escalate_to_broadcast, name='escalate_broadcast'),
    path('recipient/check-exhausted/', views.check_exhausted_options, name='check_exhausted'),
    path('recipient/bills/', views.get_recipient_bills, name='recipient_bills'),
    path('recipient/bills/pay/', views.mark_bill_paid, name='mark_bill_paid'),

    # Hospital Profile
    path('api/hospital/profile/', views.get_hospital_profile, name='hospital_profile'),
    path('api/hospital/subscription/', views.get_hospital_subscription, name='hospital_subscription'),
    path('api/hospital/subscription/renew/', views.renew_hospital_subscription, name='hospital_subscription_renew'),
    path('api/hospital/subscription/free-trial/', views.create_free_trial_subscription, name='hospital_free_trial'),

    # Recipient profile
    path('recipient/profile/', views.get_recipient_profile, name='recipient_profile'),
    path('recipient/profile/update/', views.update_recipient_profile, name='update_recipient_profile'),

    # Hospital profile update
    path('hospital/profile/update/', views.update_hospital_profile, name='update_hospital_profile'),
    path('hospital/profile/', views.get_hospital_profile, name='get_hospital_profile'),
]