from django.db import models
from django.contrib.auth.models import User

# 1. Put Board FIRST
class Board(models.Model):
    name = models.CharField(max_length=100)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_boards")
    created_at = models.DateTimeField(auto_now_add=True)
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_full = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} (Admin: {self.creator.username})"

# 2. Put Member SECOND
class Member(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    wallet_address = models.CharField(max_length=255, blank=True)
    
    POSITION_CHOICES = [
        ('GIVER', 'Giver'),
        ('BUILDER', 'Builder'),
        ('COORDINATOR', 'Coordinator'),
        ('RECEIVER', 'Receiver'),
    ]
    position = models.CharField(max_length=20, choices=POSITION_CHOICES, default='GIVER')
    is_active = models.BooleanField(default=True)
    
    # Now this works because Board was defined above!
    board = models.ForeignKey(Board, on_delete=models.SET_NULL, null=True, blank=True, related_name="members")

    def __str__(self):
        return f"{self.user.username} - {self.position}"







# from django.db import models
# from django.contrib.auth.models import User

# class Member(models.Model):
#     # Link to the built-in Django User account
#     user = models.OneToOneField(User, on_delete=models.CASCADE)
    
#     # IHB Specific Fields
#     wallet_address = models.CharField(max_length=255, blank=True)
    
#     # Board Positions
#     POSITION_CHOICES = [
#         ('GIVER', 'Giver'),
#         ('BUILDER', 'Builder'),
#         ('COORDINATOR', 'Coordinator'),
#         ('RECEIVER', 'Receiver'),
#     ]
#     position = models.CharField(max_length=20, choices=POSITION_CHOICES, default='GIVER')
#     is_active = models.BooleanField(default=True)

#     board = models.ForeignKey(Board, on_delete=models.SET_NULL, null=True, blank=True, related_name="members")

#     def __str__(self):
#         return f"{self.user.username} - {self.position}"
# # Create your models here.
# class Board(models.Model):
#     name = models.CharField(max_length=100)
#     # This identifies the "Admin" of this specific group
#     creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_boards")
#     created_at = models.DateTimeField(auto_now_add=True)
#     entry_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
#     is_full = models.BooleanField(default=False)

#     def __str__(self):
#         return f"{self.name} (Admin: {self.creator.username})"
