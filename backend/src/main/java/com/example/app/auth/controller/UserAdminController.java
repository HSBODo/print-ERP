package com.example.app.auth.controller;

import com.example.app.auth.dto.UserCreateRequest;
import com.example.app.auth.dto.UserRow;
import com.example.app.auth.dto.UserUpdateRequest;
import com.example.app.auth.service.UserAdminService;
import com.example.app.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 계정 관리 API — ADMIN 롤 전용 (SecurityConfig 의 /api/admin/** 매처).
 *
 * <pre>
 *   GET    /api/admin/users            # 목록
 *   GET    /api/admin/users/{id}       # 단일 조회
 *   POST   /api/admin/users            # 신규
 *   PUT    /api/admin/users/{id}       # 편집 (자기 롤·부서 변경은 400)
 *   DELETE /api/admin/users/{id}       # 삭제 (자기 자신 · 마지막 ADMIN 400)
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserAdminService userAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserRow>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(userAdminService.listUsers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserRow>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userAdminService.getUser(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserRow>> create(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userAdminService.createUser(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserRow>> update(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request,
            Authentication authentication) {
        String actor = authentication == null ? "" : authentication.getName();
        return ResponseEntity.ok(ApiResponse.ok(userAdminService.updateUser(id, request, actor)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            Authentication authentication) {
        String actor = authentication == null ? "" : authentication.getName();
        userAdminService.deleteUser(id, actor);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
