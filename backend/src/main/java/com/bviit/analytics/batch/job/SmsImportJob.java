package com.bviit.analytics.batch.job;

import com.bviit.analytics.batch.repository.BatchSuccessLogRepository;
import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.sms.dto.SmsImportResult;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import com.bviit.analytics.sms.service.SmsDispatchQueueService;
import com.bviit.analytics.sms.service.SmsTargetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 문자 발송 대상 자동 등록 잡.
 *
 * <p>지금까지는 관리자 화면이 열릴 때마다 {@link SmsTargetService#findRowsAutoImport} 가
 * {@code importFromSurgeryList} 를 호출해 즉석 upsert 했다(임시 경로).
 * 이 잡은 그 로직을 배치로 승격한 것으로, 다른 마트 배치와 같은 규약을 따른다:
 *
 * <ul>
 *   <li>매일 03:30 (BatchOrchestrator daily) 이 SURGERY 뒤에 실행 — list_surgery 를 소스로 쓰기 때문</li>
 *   <li>매월 1일 03:30 (BatchOrchestrator monthly-reconcile) 이 전월 전체 재적재</li>
 *   <li>관리자 API {@code POST /api/admin/batch/rerun?from&to&domain=SMS} 로 부분 재실행</li>
 * </ul>
 *
 * <p>중복 처리: {@code importFromSurgeryList} 가 이미 (chart_no, surgery_date) UNIQUE 로 멱등하다.
 * 자동 등록된 AUTO 행은 CRM 값 갱신 UPDATE, 수동(MANUAL)은 손대지 않음, 수신거부 번호는 HOLD.
 *
 * <p>마트 미연결 프로파일에서는 조용히 skip (다른 마트 잡과 같은 패턴).
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SmsImportJob {

    static final String MART_NAME = "sms";

    private final SmsTargetService targetService;
    private final SmsTargetRepository targetRepository;
    private final SmsDispatchQueueService queueService;
    private final BatchSuccessLogRepository successLogRepository;

    /**
     * from..to 수술자를 sms_target 에 idempotent 적재 + T1/T2/T3 큐 심기.
     *
     * <p>트랜잭션은 서비스 계층이 소유(@Transactional on importFromSurgeryList / enqueueForTargets).
     * 배치 잡 자체는 트랜잭션 밖에서 얇게 감싸기만 한다.
     *
     * <p>Phase 2 — target upsert 후 그 범위의 SENDABLE 대상에 대해 T1/T2/T3 큐 3행을
     * enqueueForTargets 로 심는다. 이미 있는 (target, tier, scheduled_at) 조합은 조용히 skip.
     */
    public Map<String, Integer> run(LocalDate from, LocalDate to) {
        log.info("SmsImportJob start: range={}..{}", from, to);
        Map<String, Integer> stats = new LinkedHashMap<>();
        try {
            SmsImportResult result = targetService.importFromSurgeryList(from, to);
            stats.put("sms_target_created", result.created());
            stats.put("sms_target_updated", result.updated());
            stats.put("sms_target_skipped", result.skipped());
            // 대상 범위의 SENDABLE 만 큐 등록. 홀딩·수신거부 대상은 여기서 배제된다(안전장치).
            List<SmsTarget> inRange = targetRepository
                    .findBySurgeryDateBetweenOrderBySurgeryDateAscIdAsc(from, to);
            int enqueued = queueService.enqueueForTargets(inRange);
            stats.put("sms_queue_enqueued", enqueued);
            successLogRepository.upsert(MART_NAME, to);
            log.info("SmsImportJob done: {}", stats);
        } catch (DataSourceUnavailableException e) {
            // 마트 미연결(list_surgery 없음) 이면 skip — 화면·다른 배치와 같은 패턴.
            log.info("SmsImportJob skip — 마트 미연결: {}", e.getMessage());
            stats.put("sms_target_created", 0);
            stats.put("sms_target_updated", 0);
            stats.put("sms_target_skipped", 0);
            stats.put("sms_queue_enqueued", 0);
        }
        return stats;
    }
}
