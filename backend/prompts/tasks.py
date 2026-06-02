from celery import shared_task
from django.core.mail import send_mail
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task
def send_email_task(subject, message, recipient_list, from_email='noreply@promptatlas.com'):
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=recipient_list,
        fail_silently=False
    )

@shared_task
def push_notification_task(user_id, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "send_notification",
            "data": data
        }
    )
