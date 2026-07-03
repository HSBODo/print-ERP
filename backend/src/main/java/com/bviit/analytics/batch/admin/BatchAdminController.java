package com.bviit.analytics.batch.admin;

import com.bviit.analytics.batch.BatchOrchestrator;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 관리자 배치 트리거 (local/dev 전용 — prod 프로파일에선 활성화되지 않음).
 *
 * PR-8에서 정식 Admin API로 확장 예정. 지금은 마트 실 데이터 스모크 테스트용 shim.
 *
 * 사용 예:
 *   1) 로그인해서 JWT 획득
 *      curl -X POST http://localhost:18080/api/auth/login \
 *           -H "Content-Type: application/json" \
 *           -d '{"loginId":"admin","password":"1234"}'
 *   2) 배치 트리거
 *      curl -X POST 'http://localhost:18080/api/dev/mart/surgery/rerun?from=2026-06-01&to=2026-06-30' \
 *           -H "Authorization: Bearer <TOKEN>"
 */
@RestController
@RequestMapping("/api/dev/mart")
@Profile({"local", "dev"})
@RequiredArgsConstructor
public class BatchAdminController {

    private final BatchOrchestrator orchestrator;
    private final SurgeryReconcileService reconcileService;
    private final ReservationReconcileService reservationReconcileService;
    private final ExamReconcileService examReconcileService;
    private final ConsultationReconcileService consultationReconcileService;
    private final OutpatientReconcileService outpatientReconcileService;
    private final OverallReconcileService overallReconcileService;
    private final EtcReconcileService etcReconcileService;

    @PostMapping("/surgery/rerun")
    public Map<String, Object> rerunSurgery(
            @RequestParam String from,
            @RequestParam String to
    ) {
        LocalDate fromDate = LocalDate.parse(from);
        LocalDate toDate = LocalDate.parse(to);
        orchestrator.runManual(fromDate, toDate);
        return Map.of(
                "ok", true,
                "from", from,
                "to", to,
                "note", "check batch_run_log for details"
        );
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

    // ─── 예약 도메인 ─────────────────────────────────────────
    // orchestrator.runManual은 전체 도메인 잡을 순차 실행하므로 별도 예약 전용 rerun 엔드포인트는
    // 두지 않는다(다른 도메인까지 함께 실행됨). 필요 시 각 잡을 직접 주입해 분리 가능.

    @GetMapping("/reservation/reconcile-monthly")
    public Map<String, Object> reconcileReservationMonthly(@RequestParam List<Integer> years) {
        return reservationReconcileService.reconcileMonthly(years);
    }

    @GetMapping("/reservation/reconcile-list")
    public Map<String, Object> reconcileReservationList(@RequestParam String from, @RequestParam String to) {
        return reservationReconcileService.reconcileList(from, to);
    }

    @GetMapping("/reservation/reconcile-kakao")
    public Map<String, Object> reconcileReservationKakao(@RequestParam String from, @RequestParam String to) {
        return reservationReconcileService.reconcileKakao(from, to);
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

    // ─── 기타 도메인 ─────────────────────────────────────────

    @GetMapping("/etc/reconcile-b2b-revenue")
    public Map<String, Object> reconcileB2bRevenue(@RequestParam List<Integer> years) {
        return etcReconcileService.reconcileB2bRevenue(years);
    }
}
