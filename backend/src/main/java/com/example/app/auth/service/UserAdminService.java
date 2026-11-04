package com.example.app.auth.service;

import com.example.app.auth.dto.UserCreateRequest;
import com.example.app.auth.dto.UserRow;
import com.example.app.auth.dto.UserUpdateRequest;
import com.example.app.auth.entity.Role;
import com.example.app.auth.entity.User;
import com.example.app.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * 계정 관리 (CRUD) — ADMIN 전용.
 *
 * <p>안전장치:
 * <ul>
 *   <li>자기 자신 삭제 금지 — 로그인 상태에서 자기 계정을 지우면 시스템에서 튕겨나감</li>
 *   <li>마지막 ADMIN 삭제 금지 — 남은 ADMIN 이 없으면 정책 조작이 완전 잠긴다</li>
 *   <li>자기 자신 롤·부서 변경 금지 — 자기 롤을 STAFF 로 낮추면 자충수</li>
 *   <li>롤·부서 조합 강제 — {@link User#isValidCombination(Role, com.example.app.auth.entity.Department)}</li>
 *   <li>비밀번호 응답 절대 미포함 — {@link UserRow} 는 password 필드 없음</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserRow> listUsers() {
        return userRepository.findAllByOrderByLoginIdAsc().stream()
                .map(UserRow::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserRow getUser(Long id) {
        return UserRow.from(findByIdOrThrow(id));
    }

    @Transactional
    public UserRow createUser(UserCreateRequest request) {
        String loginId = normalize(request.loginId());
        String email = normalizeEmail(request.email());

        if (userRepository.existsByLoginIdIgnoreCase(loginId)) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다: " + loginId);
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + email);
        }
        if (!User.isValidCombination(request.role(), request.department())) {
            throw new IllegalArgumentException(
                    "롤·부서 조합이 유효하지 않습니다: " + request.role() + " × " + request.department());
        }

        User user = User.builder()
                .loginId(loginId)
                .email(email)
                .name(request.name().trim())
                .password(passwordEncoder.encode(request.password()))
                .role(request.role())
                .department(request.department())
                .build();

        return UserRow.from(userRepository.save(user));
    }

    @Transactional
    public UserRow updateUser(Long id, UserUpdateRequest request, String actingLoginId) {
        User user = findByIdOrThrow(id);
        boolean editingSelf = user.getLoginId().equalsIgnoreCase(actingLoginId);
        String newEmail = normalizeEmail(request.email());

        if (!user.getEmail().equalsIgnoreCase(newEmail)
                && userRepository.existsByEmailIgnoreCase(newEmail)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + newEmail);
        }

        // 자기 자신의 롤·부서 변경 금지.
        // 다른 계정은 유효한 조합이면 자유롭게 변경 가능.
        if (editingSelf) {
            if (user.getRole() != request.role() || user.getDepartment() != request.department()) {
                throw new IllegalArgumentException(
                        "자기 자신의 롤·부서는 변경할 수 없습니다. 다른 관리자에게 요청하세요.");
            }
        } else {
            user.changeRoleAndDepartment(request.role(), request.department());
        }

        user.updateProfile(newEmail, request.name().trim());

        if (request.hasNewPassword()) {
            user.changePassword(passwordEncoder.encode(request.password()));
        }

        return UserRow.from(user);
    }

    @Transactional
    public void deleteUser(Long id, String actingLoginId) {
        User user = findByIdOrThrow(id);

        if (user.getLoginId().equalsIgnoreCase(actingLoginId)) {
            throw new IllegalArgumentException("자기 자신은 삭제할 수 없습니다.");
        }

        if (user.getRole() == Role.ADMIN && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new IllegalArgumentException(
                    "마지막 ADMIN 은 삭제할 수 없습니다 — 최소 한 명은 남아야 합니다.");
        }

        userRepository.delete(user);
        log.info("[UserAdmin] {} 이(가) 사용자 삭제: id={}, loginId={}",
                actingLoginId, user.getId(), user.getLoginId());
    }

    private User findByIdOrThrow(Long id) {
        return userRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다: id=" + id));
    }

    private String normalize(String loginId) {
        return loginId == null ? null : loginId.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
