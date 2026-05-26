from collections.abc import Callable
from typing import Annotated

from fastapi import Depends

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUser, CurrentUserDep
from app.core.exceptions import DistrictMismatchError, ForbiddenError


def require_role(*allowed: UserRole) -> Callable[[CurrentUser], CurrentUser]:
    allowed_set = frozenset(allowed)

    def _checker(user: CurrentUserDep) -> CurrentUser:
        if user.role not in allowed_set:
            raise ForbiddenError("role_not_allowed")
        return user

    return _checker


def require_district_scope(
    user: CurrentUserDep, district_id: str | None = None
) -> CurrentUser:
    if user.role in CROSS_DISTRICT_ROLES:
        return user
    if user.district_id is None:
        raise ForbiddenError("user_has_no_district")
    if district_id is not None and district_id != user.district_id:
        raise DistrictMismatchError()
    return user


def assert_same_district(user: CurrentUser, target_district_id: str) -> None:
    if user.role in CROSS_DISTRICT_ROLES:
        return
    if user.district_id != target_district_id:
        raise DistrictMismatchError()


def deny_writes_for(*roles: UserRole) -> Callable[[CurrentUser], CurrentUser]:
    denied = frozenset(roles)

    def _checker(user: CurrentUserDep) -> CurrentUser:
        if user.role in denied:
            raise ForbiddenError("read_only_role")
        return user

    return _checker


RequireAdmin = Annotated[CurrentUser, Depends(require_role(UserRole.ADMIN))]
RequireDirektorOrAdmin = Annotated[
    CurrentUser, Depends(require_role(UserRole.ADMIN, UserRole.DIREKTOR))
]
