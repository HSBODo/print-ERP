package com.bviit.analytics.batch.admin;

import com.bviit.analytics.batch.BatchOrchestrator;
import com.bviit.analytics.batch.BatchOrchestrator.Domain;
import com.bviit.analytics.batch.dto.BatchRunLog;
import com.bviit.analytics.batch.job.SurgeryMartJob;
import com.bviit.analytics.batch.repository.BatchRunLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

/**
 * 관리자 배치 트리거. 모든 프로파일(local·dev·prod)에서 활성.
 * 접근 제어는 Spring Security(/api/admin/** → hasRole('ADMIN'))에 위임.
 *
 * 사용 예:
 *   1) 로그인해서 JWT 획득
 *      curl -X POST http://localhost:18080/api/auth/login \
 *           -H "Content-Type: application/json" \
 *           -d '{"loginId":"admin","password":"1234"}'
 *   2) 배치 트리거
 *      curl -X POST 'http://localhost:18080/api/admin/batch/rerun?from=2026-06-01&to=2026-06-30' \
 *           -H "Authorization: Bearer <TOKEN>"
 */
@RestController
@RequestMapping("/api/admin/batch")
@Profile("postgres-mart")
@RequiredArgsConstructor
public class BatchAdminController {

    private final BatchOrchestrator orchestrator;
    private final SurgeryMartJob surgeryMartJob;
    private final BatchRunLogRepository batchRunLogRepository;
    private final SurgeryReconcileService reconcileService;
    private final ReservationReconcileService reservationReconcileService;
    private final ExamReconcileService examReconcileService;
    private final ConsultationReconcileService consultationReconcileService;
    private final OutpatientReconcileService outpatientReconcileService;
    private final OverallReconcileService overallReconcileService;
    private final EtcReconcileService etcReconcileService;

    /**
     * 재실행. domain=ALL 이거나 미지정이면 전체 도메인 순차 실행,
     * SURGERY/RESERVATION/EXAM/CONSULTATION/OUTPATIENT/OVERALL/ETC 지정 시 해당 도메인만.
     * 별칭 경로: /rerun, /surgery/rerun.
     */
    @PostMapping({"/surgery/rerun", "/rerun"})
    public Map<String, Object> rerunAll(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false, defaultValue = "ALL") String domain
    ) {
        LocalDate fromDate = LocalDate.parse(from);
        LocalDate toDate = LocalDate.parse(to);
        String normalized = domain == null ? "ALL" : domain.trim().toUpperCase();
        if ("ALL".equals(normalized)) {
            orchestrator.runManual(fromDate, toDate);
        } else {
            Domain target;
            try {
                target = Domain.valueOf(normalized);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Unknown batch domain: " + domain);
            }
            orchestrator.runManual(fromDate, toDate, EnumSet.of(target));
        }
        return Map.of(
                "ok", true,
                "from", from,
                "to", to,
                "domain", normalized,
                "note", "check batch_run_log for details"
        );
    }

    /** 최근 배치 실행 이력 조회 (관리자 화면용). */
    @GetMapping("/run-logs")
    public List<BatchRunLog> recentRunLogs(@RequestParam(defaultValue = "50") int limit) {
        int capped = Math.min(Math.max(limit, 1), 200);
        return batchRunLogRepository.findRecent(capped);
    }

    @GetMapping("/surgery/reconcile-monthly")
    public Map<String, Object> reconcileMonthly(@RequestParam List<Integer> years) {
        return reconcileService.reconcileMonthly(years);
    }

    @GetMapping("/surgery/reconcile-daily")
    public Map<String, Object> reconcileDaily(@RequestParam String from, @RequestParam String to) {
        return reconcileService.reconcileDaily(from, to);
    }

    @GetMapping("/surgery/reconcile-list")
    public Map<String, Object> reconcileList(@RequestParam String from, @RequestParam String to) {
        return reconcileService.reconcileList(from, to);
    }

    /**
     * 재수술 리스트만 백필한다(확정 구간용).
     *
     * /rerun 은 MART_LIVE_FROM(2026-06-01) 이전을 통째로 잘라내므로 그 구간의 원본 행을
     * 채울 방법이 없다. 이 엔드포인트는 list_reoperation 만 다시 쓰고
     * 집계(mart_surgery_daily·monthly)와 list_surgery 는 건드리지 않는다 — 골든값 보존.
     *
     * 예: POST /api/admin/batch/surgery/backfill-reoperation?from=2026-01-01&amp;to=2026-05-31
     */
    @PostMapping("/surgery/backfill-reoperation")
    public Map<String, Object> backfillReoperation(@RequestParam String from, @RequestParam String to) {
        int rows = surgeryMartJob.backfillReoperation(LocalDate.parse(from), LocalDate.parse(to));
        return Map.of(
                "ok", true,
                "from", from,
                "to", to,
                "list_reoperation", rows,
                "note", "집계(daily·monthly)와 list_surgery 는 변경하지 않음"
        );
    }

    // ─── 예약 도메인 ─────────────────────────────────────────
    // orchestrator.runManual은 전체 도메인 잡을 순차 실행하므로 별도 예약 전용 rerun 엔드포인트는
    // 두지 않는다(다른 도메인까지 함께 실행됨). 필요 시 각 잡을 직접 주입해 분리 가능.

    @GetMapping("/reservation/reconcile-monthly")
    public Map<String, Object> reconcileReservationMonthly(@RequestParam List<Integer> years) {
        return reservationReconcileService.reconcileMonthly(years);
    }

    @GetMapping("/reservation/reconcile-overall-monthly")
    public Map<String, Object> reconcileReservationOverallMonthly(@RequestParam List<Integer> years) {
        return reservationReconcileService.reconcileOverallMonthly(years);
    }

    @GetMapping("/reservation/reconcile-list")
    public Map<String, Object> reconcileReservationList(@RequestParam String from, @RequestParam String to) {
        return reservationReconcileService.reconcileList(from, to);
    }

    // ─── 검사 도메인 ─────────────────────────────────────────

    @GetMapping("/exam/reconcile-examination")
    public Map<String, Object> reconcileExamination(@RequestParam List<Integer> years) {
        return examReconcileService.reconcileExamination(years);
    }

    @GetMapping("/exam/reconcile-procedure-exam")
    public Map<String, Object> reconcileProcedureExam(@RequestParam List<Integer> years) {
        return examReconcileService.reconcileProcedureExam(years);
    }

    @GetMapping("/exam/reconcile-exam-list")
    public Map<String, Object> reconcileExamList(@RequestParam String from, @RequestParam String to) {
        return examReconcileService.reconcileExamList(from, to);
    }

    @GetMapping("/exam/reconcile-cataract-exam-list")
    public Map<String, Object> reconcileCataractExamList(@RequestParam String from, @RequestParam String to) {
        return examReconcileService.reconcileCataractExamList(from, to);
    }

    // ─── 전환·성공률 도메인 ──────────────────────────────────

    @GetMapping("/consultation/reconcile-consultation-rate")
    public Map<String, Object> reconcileConsultationRate(@RequestParam List<Integer> years) {
        return consultationReconcileService.reconcileConsultationRate(years);
    }

    @GetMapping("/consultation/reconcile-stop-reason")
    public Map<String, Object> reconcileStopReason(@RequestParam List<Integer> years) {
        return consultationReconcileService.reconcileStopReason(years);
    }

    @GetMapping("/consultation/reconcile-reservation-rate")
    public Map<String, Object> reconcileReservationRate(
            @RequestParam List<Integer> years,
            @RequestParam(defaultValue = "cataract") String category
    ) {
        return consultationReconcileService.reconcileReservationRate(years, category);
    }

    // ─── 외래 도메인 ─────────────────────────────────────────

    @GetMapping("/outpatient/reconcile-monthly")
    public Map<String, Object> reconcileOutpatient(@RequestParam List<Integer> years) {
        return outpatientReconcileService.reconcileMonthly(years);
    }

    // ─── 전체지표 도메인 ─────────────────────────────────────

    @GetMapping("/overall/reconcile-weekly")
    public Map<String, Object> reconcileOverallWeekly(@RequestParam List<Integer> years) {
        return overallReconcileService.reconcileWeekly(years);
    }

    @GetMapping("/overall/reconcile-monthly")
    public Map<String, Object> reconcileOverallMonthly(@RequestParam List<Integer> years) {
        return overallReconcileService.reconcileMonthly(years);
    }

    // ─── 기타 도메인 ─────────────────────────────────────────

    @GetMapping("/etc/reconcile-b2b-revenue")
    public Map<String, Object> reconcileB2bRevenue(@RequestParam List<Integer> years) {
        return etcReconcileService.reconcileB2bRevenue(years);
    }
}
