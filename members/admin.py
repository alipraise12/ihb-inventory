from django.contrib import admin
from .models import Member, Board  # We added Board here!

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    # This shows the columns in the list view
    list_display = ('user', 'position', 'is_active', 'wallet_address')
    # This adds the filter sidebar on the right
    list_filter = ('position', 'is_active')
    # This adds the search bar at the top
    search_fields = ('user__username', 'wallet_address')

@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    # This shows your board details in the list view
    list_display = ('name', 'creator', 'entry_fee', 'is_full', 'created_at')
    # This lets you filter boards by whether they are full or not
    list_filter = ('is_full',)
    # This lets you search by board name or the creator's name
    search_fields = ('name', 'creator__username')









# from django.contrib import admin
# from .models import Member

# @admin.register(Member)
# class MemberAdmin(admin.ModelAdmin):
#     list_display = ('user', 'position', 'is_active', 'wallet_address')
#     list_filter = ('position', 'is_active')
#     search_fields = ('user__username', 'wallet_address')
# # Register your models here.

# @admin.register(Board)
# class BoardAdmin(admin.ModelAdmin):
#     list_display = ('name', 'creator', 'entry_fee', 'is_full', 'created_at')
#     list_filter = ('is_full',)
#     search_fields = ('name', 'creator__username')