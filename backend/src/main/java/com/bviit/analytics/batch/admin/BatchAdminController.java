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
}
