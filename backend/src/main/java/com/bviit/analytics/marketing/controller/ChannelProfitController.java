package com.bviit.analytics.marketing.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.common.stats.StatsPanelSupport;
import com.bviit.analytics.common.stats.StatsRequestValidator;
import com.bviit.analytics.marketing.dto.AdSpendItem;
import com.bviit.analytics.marketing.dto.ChannelLensCostItem;
import com.bviit.analytics.marketing.dto.LensCostItem;
import com.bviit.analytics.marketing.repository.ChannelProfitMartRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 채널별 수익성 — 광고비·렌즈원가 입력과 채널별 렌즈원가 조회.
 *
 * <p>성과 지표(수술완료·수납액·전환율·재수술)는 이미
 * {@code /api/stats/reservation-channel} 이 내려주므로 여기서 다시 만들지 않는다.
 * 이 컨트롤러는 <b>그 화면에 없던 값</b>, 즉 사람이 넣는 두 입력과
 * 그걸로 계산되는 렌즈원가만 담당한다.
 *
 * <p>마트가 없는 프로파일에서는 503 이다(MSSQL 직결 경로를 두지 않는다).
 */
@RestController
@RequestMapping("/api/stats/channel-profit")
@RequiredArgsConstructor
public class ChannelProfitController {

    private static final int MAX_RANGE_DAYS = 366;

    private final Optional<ChannelProfitMartRepository> repository;

    /** 채널별 렌즈 원가 (안 단위). GET ?from=&amp;to= */
    @GetMapping("/lens-cost")
    public ResponseEntity<ApiResponse<List<ChannelLensCostItem>>> getChannelLensCost(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        StatsRequestValidator.validateDateRange(from, to, MAX_RANGE_DAYS);
        return StatsPanelSupport.require(
                repository,
                repo -> repo.findChannelLensCost(from.toString(), to.toString())
        );
    }

    /** 그 달의 매체별 광고비. GET ?ym=2026-07 */
    @GetMapping("/ad-spend")
    public ResponseEntity<ApiResponse<List<AdSpendItem>>> getAdSpend(@RequestParam String ym) {
        return StatsPanelSupport.require(repository, repo -> repo.findAdSpend(ym));
    }

    /** 광고비 저장(월×매체 upsert). */
    @PutMapping("/ad-spend")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> saveAdSpend(
            @RequestBody @Valid List<AdSpendItem> items
    ) {
        return StatsPanelSupport.require(
                repository,
                repo -> Map.of("saved", repo.saveAdSpend(items))
        );
    }

    /** 렌즈 단가표. */
    @GetMapping("/lens-price")
    public ResponseEntity<ApiResponse<List<LensCostItem>>> getLensCosts() {
        return StatsPanelSupport.require(repository, ChannelProfitMartRepository::findLensCosts);
    }

    /** 렌즈 단가 저장. 존재하는 op_type 만 갱신한다(새 유형은 만들지 않는다). */
    @PutMapping("/lens-price")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> saveLensCosts(
            @RequestBody @Valid List<LensCostItem> items
    ) {
        return StatsPanelSupport.require(
                repository,
                repo -> Map.of("saved", repo.saveLensCosts(items))
        );
    }
}
