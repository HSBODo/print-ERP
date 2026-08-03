package com.bviit.analytics.batch.admin;

import com.bviit.analytics.batch.job.SurgeryMartJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * 재수술 판정 저장 후 영향 받은 날짜 구간의 surgery 마트를 즉시 재빌드.
 *
 * 마트 프로필에서만 활성화되며, 실패해도 예외를 삼킨다 —
 * 판정은 이미 커밋됐고 다음 스케줄 배치가 값을 따라잡는다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ReoperationMartRefresher {

    private final SurgeryMartJob surgeryMartJob;

    public void refresh(LocalDate from, LocalDate to) {
        try {
            surgeryMartJob.run(from, to);
        } catch (Exception e) {
            log.warn("Reoperation mart refresh failed range={}..{} — 다음 스케줄 배치가 값을 따라잡습니다.",
                    from, to, e);
        }
    }
}
