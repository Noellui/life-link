from django.urls import path
from . import views

urlpatterns = [
    # --- AUTHENTICATION ---
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),

    # --- ADMIN DASHBOARD ---
    path('admin/stats/', views.admin_dashboard_stats, name='admin_stats'),
    path('admin/users/', views.user_list, name='user_list'),
    path('admin/users/<int:user_id>/', views.delete_user, name='delete_user'),
    path('admin/events/<int:event_id>/', views.delete_event_view, name='delete_event'),
    path('admin/events/', views.event_list, name='admin_event_list'), # Added for your Events tab

    # --- DONOR DASHBOARD & PROFILE ---
    path('donor/stats/', views.donor_dashboard_stats, name='donor_stats'),
    path('donor/profile/', views.donor_profile_view, name='donor_profile'),
    
    # NOTE: These were missing from your views.py, so I've linked them to existing logic
    # or you can comment them out if not used yet to prevent crashes.
    path('donor/requests/', views.active_requests, name='active_requests'), 
    path('donor/appointments/', views.event_list, name='donor_appointments'),
    path('donor/history/', views.donor_history_list, name='donor_history'),
    # --- HOSPITAL ACTIONS ---
    path('events/', views.event_list, name='event_list'),
    path('appointments/<int:appointment_id>/fulfill/', views.fulfill_appointment_view, name='fulfill_appointment'),
]