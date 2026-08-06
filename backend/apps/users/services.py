from django.db import transaction

from .models import Address, User, UserProfile
from .selectors import AddressSelector


class UserService:
    """Business logic for creating and mutating User accounts."""

    @staticmethod
    @transaction.atomic
    def register_user(*, email: str, password: str, first_name: str = '',
                       last_name: str = '', phone_number: str | None = None) -> User:
        """
        Creates a new User account together with its related UserProfile.
        Password hashing is delegated to the custom UserManager.
        """
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
        )
        UserProfile.objects.create(user=user)
        return user


class AddressService:
    """Business logic for creating and mutating User Addresses."""

    @staticmethod
    @transaction.atomic
    def create_address(*, user, validated_data: dict) -> Address:
        """
        Creates a new Address for the user. The first address a user ever creates,
        or any address explicitly requested as default, becomes the default address.
        """
        is_requested_default = validated_data.get('is_default', False)
        has_existing_addresses = AddressSelector.get_user_addresses(user).exists()

        if is_requested_default or not has_existing_addresses:
            AddressService._unset_current_default(user)
            validated_data['is_default'] = True
        else:
            validated_data['is_default'] = False

        return Address.objects.create(user=user, **validated_data)

    @staticmethod
    @transaction.atomic
    def update_address(*, address: Address, validated_data: dict) -> Address:
        """Updates an existing Address, keeping the default-address invariant consistent."""
        if validated_data.get('is_default'):
            AddressService._unset_current_default(address.user, exclude_address=address)

        for field, value in validated_data.items():
            setattr(address, field, value)
        address.save()
        return address

    @staticmethod
    @transaction.atomic
    def delete_address(*, address: Address) -> None:
        """
        Soft-deletes an Address. If the deleted address was the default one,
        promotes the most recently created remaining address to default.
        """
        was_default = address.is_default
        address.soft_delete()

        if was_default:
            next_default = AddressSelector.get_user_addresses(address.user).first()
            if next_default:
                next_default.is_default = True
                next_default.save(update_fields=['is_default'])

    @staticmethod
    def _unset_current_default(user, exclude_address: Address | None = None) -> None:
        """Clears the is_default flag on all of the user's other addresses."""
        queryset = Address.objects.filter(user=user, is_deleted=False, is_default=True)
        if exclude_address is not None:
            queryset = queryset.exclude(pk=exclude_address.pk)
        queryset.update(is_default=False)