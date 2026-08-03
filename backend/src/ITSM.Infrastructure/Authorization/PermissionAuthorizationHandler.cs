﻿using ITSM.Application.Interfaces;
using ITSM.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace ITSM.Infrastructure.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IUserPermissionRepository _userPermissionRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PermissionAuthorizationHandler(
        IUserPermissionRepository userPermissionRepository,
        IHttpContextAccessor httpContextAccessor)
    {
        _userPermissionRepository = userPermissionRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userIdClaim = context.User.FindFirst(ClaimNames.UserId)?.Value;
        if (userIdClaim is null)
        {
            return;
        }

        var userId = long.Parse(userIdClaim);

        // ADMIN_MANAGE her şeyi kapsıyor: proje bazlı yetkilerin ayrıca
        // kontrol edilmesine gerek yok, admin zaten tüm projelerde yetkili.
        if (requirement.PermissionCode != Permissions.AdminManage
            && await _userPermissionRepository.HasPermissionAsync(userId, Permissions.AdminManage, null))
        {
            context.Succeed(requirement);
            return;
        }

        // Route'taki projectId'yi okuyoruz: proje kapsamlı bir yetki
        // (user_permissions.project_id dolu) yalnızca o projede geçerli olsun.
        // Buraya null geçmek, tek bir projeye verilmiş yetkinin tüm projelerde
        // eşleşmesine yol açardı - bkz. HasPermissionAsync'teki OR koşulu.
        var projectId = GetRouteProjectId();

        var hasPermission = await _userPermissionRepository.HasPermissionAsync(userId, requirement.PermissionCode, projectId);
        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }

    private long? GetRouteProjectId()
    {
        var routeValue = _httpContextAccessor.HttpContext?.Request.RouteValues["projectId"]?.ToString();
        return long.TryParse(routeValue, out var projectId) ? projectId : null;
    }
}