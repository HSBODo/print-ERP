package com.bviit.analytics.batch.controller;

import com.bviit.analytics.batch.dto.BatchLastSuccessResponse;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import com.bviit.analytics.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 배치 상태 조회(사용자용). /api/admin/** 이 아니라 /api/batch/** 이므로
 * SecurityConfig 기본 규칙(인증된 사용자면 허용)에 따라 일반 USER 롤도 접근 가능.
 */
@RestController
@RequestMapping("/api/batch")
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchStatusController {

    private final BatchRunLogRepository runLogRepository;

    /** 마지막으로 성공한 DAILY 배치의 대상 날짜와 완료 시각. 이력이 없으면 data=null. */
    @GetMapping("/last-success")
    public ApiResponse<BatchLastSuccessResponse> lastSuccess() {
        return ApiResponse.ok(runLogRepository.findLastSuccessfulDaily().orElse(null));
    }
}
