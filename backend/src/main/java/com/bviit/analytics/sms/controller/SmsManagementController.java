package com.bviit.analytics.sms.controller;

import com.bviit.analytics.common.dto.ApiResponse;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsImportResult;
import com.bviit.analytics.sms.dto.SmsLookupRow;
import com.bviit.analytics.sms.dto.SmsOffsetRow;
import com.bviit.analytics.sms.dto.SmsOffsetUpdateRequest;
import com.bviit.analytics.sms.dto.SmsOptOutRow;
import com.bviit.analytics.sms.dto.SmsSendRequest;
import com.bviit.analytics.sms.dto.SmsSendResult;
import com.bviit.analytics.sms.dto.SmsSolapiBalanceInfo;
import com.bviit.analytics.sms.dto.SmsSolapiTemplateInfo;
import com.bviit.analytics.sms.dto.SmsTargetRequest;
import com.bviit.analytics.sms.dto.SmsStatusRequest;
import com.bviit.analytics.sms.dto.SmsTargetRow;
import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.bviit.analytics.sms.service.SmsOffsetConfigService;
import com.bviit.analytics.sms.service.SmsOptOutService;
import com.bviit.analytics.sms.service.SmsSendService;
import com.bviit.analytics.sms.service.SmsTargetService;
import com.bviit.analytics.sms.service.SolapiBalanceService;
import com.bviit.analytics.sms.service.SolapiSyncService;
import com.bviit.analytics.sms.service.SolapiTemplateLookupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * 문자 발송 관리 API — ADMIN 롤 전용(SecurityConfig 의 /api/sms-management/** 매처).
 * 연락처가 응답에 실리는 화면이라 백엔드에서도 롤을 강제한다(프론트 가드에만 의존하지 않는다).
 *
 *   GET    /api/sms-management/lookup?chartNo=2234076        # 차트번호로 환자 정보 조회
 *   GET    /api/sms-management/targets?from=2026-08-01&to=2026-08-31
 *   POST   /api/sms-management/targets                  # 수동 추가
 *   PUT    /api/sms-management/targets/{id}             # 연락처만 수정 (MANUAL 승격)
 *   PUT    /api/sms-management/targets/{id}/status?value=SENDABLE|HOLD   # 홀딩 ↔ 해제
 *   PUT    /api/sms-management/targets/status           # 선택 대상 일괄 홀딩/해제
 *   POST   /api/sms-management/targets/import?from&to   # 마트 수술자 자동 등록
 *   POST   /api/sms-management/send                     # 발송 실행 (건별 이력 적재)
 *   POST   /api/sms-management/sync?sentFrom&sentTo     # 발송 결과 되가져오기 (발송시각 기준)
 *   GET    /api/sms-management/templates                # 템플릿 3종 슬롯 정의
 *   POST   /api/sms-management/opt-outs                 # 수신거부 등록 (선택 대상의 번호)
 *   GET    /api/sms-management/opt-outs                 # 수신거부 목록 (번호는 가려서)
 *   DELETE /api/sms-management/opt-outs?phone=          # 수신거부 해제
 *
 * 대상 <b>삭제 API 는 없다</b> — 보내면 안 되는 사람은 지우지 않고 홀딩한다(왜 안 보냈는지가 남아야 한다).
 */
@RestController
@RequestMapping("/api/sms-management")
@RequiredArgsConstructor
public class SmsManagementController {

    private final SmsTargetService targetService;
    private final SmsOptOutService optOutService;
    private final SmsSendService sendService;
    private final SolapiSyncService syncService;
    private final SolapiProperties solapiProperties;
    private final SmsOffsetConfigService offsetConfigService;
    private final SolapiTemplateLookupService solapiTemplateLookupService;
    private final SolapiBalanceService solapiBalanceService;

    /** 차트번호 조회 — 대상 추가 팝업이 이름·수술일·연락처를 채운다. */
    @GetMapping("/lookup")
    public ResponseEntity<ApiResponse<SmsLookupRow>> lookup(@RequestParam String chartNo) {
        return ResponseEntity.ok(ApiResponse.ok(targetService.lookup(chartNo)));
    }

    /**
     * 대상 조회. <b>수술일 기준이면 마트에서 먼저 채운 뒤</b> 돌려준다 —
     * 따로 [수술자 불러오기]를 누르지 않아도 그 기간의 수술자가 바로 보인다.
     * 적재는 멱등이라(chart_no + surgery_date UNIQUE) 여러 번 조회해도 늘지 않는다.
     *
     * @param basis        SURGERY(수술일·기본) / SCHEDULED(발송예정일) / SENT(실제발송일)
     * @param templateCode 차수 지정(T1~T3). 비우면 전체 차수.
     */
    @GetMapping("/targets")
    public ResponseEntity<ApiResponse<List<SmsTargetRow>>> targets(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "SURGERY") String basis,
            @RequestParam(required = false) String templateCode
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                targetService.findRowsAutoImport(from, to, basis, templateCode)));
    }

    @PostMapping("/targets")
    public ResponseEntity<ApiResponse<SmsTargetRow>> create(@Valid @RequestBody SmsTargetRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(targetService.create(request)));
    }

    @PutMapping("/targets/{id}")
    public ResponseEntity<ApiResponse<SmsTargetRow>> update(
            @PathVariable Long id, @Valid @RequestBody SmsTargetRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(targetService.update(id, request)));
    }

    @PutMapping("/targets/{id}/status")
    public ResponseEntity<ApiResponse<SmsTargetRow>> changeStatus(
            @PathVariable Long id, @RequestParam String value) {
        return ResponseEntity.ok(ApiResponse.ok(targetService.changeStatus(id, value)));
    }

    /** 선택 대상 일괄 홀딩/해제 — 툴바의 [발송중지]/[홀딩 해제]. */
    @PutMapping("/targets/status")
    public ResponseEntity<ApiResponse<Integer>> changeStatusBulk(@Valid @RequestBody SmsStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                targetService.changeStatusBulk(request.targetIds(), request.value())));
    }

    /**
     * 수신거부 등록 — 선택한 대상의 <b>번호</b>를 목록에 올리고, 같은 번호의 대상을 전부 홀딩한다.
     *
     * 홀딩과 다른 점은 <b>사람 단위</b>라는 것이다. 홀딩은 (차트번호 + 수술일) 행 하나에 걸려서
     * 다음 수술 때 새 행이 생기면 되살아나는데, 수신거부는 그 뒤로도 계속 막는다.
     */
    @PostMapping("/opt-outs")
    public ResponseEntity<ApiResponse<Integer>> registerOptOut(@Valid @RequestBody SmsStatusRequest request,
                                                              Authentication authentication) {
        String actor = authentication == null ? "system" : authentication.getName();
        return ResponseEntity.ok(ApiResponse.ok(optOutService.registerByTargets(request.targetIds(), actor)));
    }

    /** 수신거부 목록 — 번호는 가려서 내려간다. */
    @GetMapping("/opt-outs")
    public ResponseEntity<ApiResponse<List<SmsOptOutRow>>> optOuts() {
        return ResponseEntity.ok(ApiResponse.ok(optOutService.findAll()));
    }

    /**
     * 수신거부 해제. <b>홀딩은 함께 풀지 않는다</b> —
     * 목록에서 빠졌다고 지난 차수가 한꺼번에 나가면 곤란해서, 홀딩 해제는 사람이 따로 누른다.
     */
    @DeleteMapping("/opt-outs")
    public ResponseEntity<ApiResponse<Boolean>> releaseOptOut(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.ok(optOutService.release(phone)));
    }

    /**
     * id 로 수신거부 해제 — 관리 모달용. 목록 응답의 phone 은 마스킹돼 있어 phone 파라미터가 아닌 id 로 지운다.
     */
    @DeleteMapping("/opt-outs/{id}")
    public ResponseEntity<ApiResponse<Boolean>> releaseOptOutById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(optOutService.releaseById(id)));
    }

    /**
     * 발송 결과 갱신 — 솔라피에 다시 물어 도달시각·대체발송·최종 상태를 채운다.
     *
     * ⚠️ 기간은 **발송 시각(sentAt)** 기준이다. 수술일 조회 범위를 그대로 넘기면
     *    "전일 수술자를 오늘 발송" 같은 경우 오늘 생긴 이력을 못 찾는다.
     *    비워두면 최근 {@code days}일(기본 7일)을 본다 — 자동화는 이 형태로 부르면 된다.
     */
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Integer>> sync(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sentFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate sentTo,
            @RequestParam(required = false, defaultValue = "7") int days
    ) {
        LocalDate to = sentTo != null ? sentTo : LocalDate.now();
        LocalDate from = sentFrom != null ? sentFrom : to.minusDays(Math.max(days, 0));
        return ResponseEntity.ok(ApiResponse.ok(syncService.sync(from, to)));
    }

    @PostMapping("/targets/import")
    public ResponseEntity<ApiResponse<SmsImportResult>> importTargets(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.ok(targetService.importFromSurgeryList(from, to)));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<SmsSendResult>> send(
            @Valid @RequestBody SmsSendRequest request, Authentication authentication) {
        String sentBy = authentication == null ? "" : authentication.getName();
        return ResponseEntity.ok(ApiResponse.ok(sendService.send(request, sentBy)));
    }

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<SmsTemplateInfo>>> templates() {
        return ResponseEntity.ok(ApiResponse.ok(solapiProperties.templates()));
    }

    /**
     * 솔라피 알림톡 템플릿 검증 조회 — 설정된(templateId 채워진) 슬롯만
     * 솔라피 API 로 조회해 검수 상태·본문·이름·messageType 을 함께 돌려준다.
     *
     * <p>API 키 미설정 시 빈 목록. 조회 실패한 슬롯은 응답에 포함되되 {@code found=false}
     * 와 {@code errorMessage} 로 표기된다(개별 슬롯 실패가 전체 조회를 막지 않는다).
     */
    @GetMapping("/solapi-templates")
    public ResponseEntity<ApiResponse<List<SmsSolapiTemplateInfo>>> solapiTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(solapiTemplateLookupService.listConfigured()));
    }

    /**
     * 솔라피 계정 잔액 조회 — 자동 발송 큐 카드에 노출한다.
     * API 키 미설정이면 configured=false, 조회 실패는 errorMessage 로 표기 (500 안 던짐).
     */
    @GetMapping("/solapi-balance")
    public ResponseEntity<ApiResponse<SmsSolapiBalanceInfo>> solapiBalance() {
        return ResponseEntity.ok(ApiResponse.ok(solapiBalanceService.getBalance()));
    }

    /**
     * 1·2·3차 오프셋 그리드 조회 — SMILE·LASIK·LASEK·ICL 4행.
     * ETC 는 발송 대상이 아니라 응답에 포함되지 않는다.
     */
    @GetMapping("/offsets")
    public ResponseEntity<ApiResponse<List<SmsOffsetRow>>> offsets() {
        List<SmsOffsetRow> rows = offsetConfigService.getAll().values().stream()
                .map(SmsOffsetRow::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }

    /**
     * 오프셋 원자적 편집 — 4행 전체를 함께 보낸다(그리드 UI 계약).
     * 저장 즉시 캐시가 무효화되어 다음 조회부터 새 오프셋이 반영된다.
     * actor 는 SecurityContext 의 principal name (JWT sub).
     */
    @PutMapping("/offsets")
    public ResponseEntity<ApiResponse<List<SmsOffsetRow>>> updateOffsets(
            @Valid @RequestBody SmsOffsetUpdateRequest request,
            Authentication authentication) {
        String actor = authentication == null ? "unknown" : authentication.getName();
        List<SmsOffsetConfigService.OffsetUpdate> updates = request.rows().stream()
                .map(r -> new SmsOffsetConfigService.OffsetUpdate(
                        r.groupCode(), r.tier1Offset(), r.tier2Offset(), r.tier3Offset()))
                .toList();
        SmsOffsetConfigService.TierUpdate tiers = new SmsOffsetConfigService.TierUpdate(
                request.tier1Time(), request.tier2Time(), request.tier3Time(),
                request.tier1Kind(), request.tier2Kind(), request.tier3Kind());
        List<SmsOffsetRow> rows = offsetConfigService.updateAll(updates, tiers, actor).values().stream()
                .map(SmsOffsetRow::from).toList();
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }
}
