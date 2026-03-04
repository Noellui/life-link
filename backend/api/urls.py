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
    # FIX: Single canonical route (removed duplicate /api/donor/appointments/ path)
    path('donor/appointments/', views.donor_appointments_list, name='donor_appointments'),
    path('donor/history/', views.donor_history_list, name='donor_history'),
    path('donor/register-event/', views.register_for_event, name='register_event'),
    path('donor/appointments/<int:appointment_id>/cancel/', views.cancel_appointment, name='cancel_appointment'),
    # NEW: "I Can Donate" interest registration endpoint
    path('donor/interest/', views.donor_interest_view, name='donor_interest'),

    # --- HOSPITAL ACTIONS ---
    path('events/', views.event_list, name='event_list'),
    path('appointments/<int:appointment_id>/fulfill/', views.fulfill_appointment_view, name='fulfill_appointment'),

    # --- RAW SQL ENDPOINTS ---
    path('requests/create-raw/', views.create_blood_request_raw, name='create_blood_request_raw'),
    path('profile/update-raw/', views.update_profile_raw, name='update_profile_raw'),
    path('hospital/manage-stock-raw/', views.manage_stock_raw, name='manage_stock_raw'),

    # --- RECIPIENT ---
    path('recipient/create-request/', views.create_blood_request_raw, name='create_request'),
]