package com.bviit.analytics.sms.dto;

import com.bviit.analytics.sms.config.SurgeryGroup;
import com.bviit.analytics.sms.entity.SmsOffsetConfig;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 오프셋 그리드 응답 한 줄 — 그룹 하나의 1·2·3차 오프셋 + tier-level 시각·종류.
 * 시각·종류는 tier-level 이라 4행에 같은 값이 들어있다(프론트는 첫 행 값만 편집).
 */
public record SmsOffsetRow(
        String groupCode,
        String label,
        int tier1Offset,
        int tier2Offset,
        int tier3Offset,
        /** "HH:mm" ISO 문자열로 내보낸다 — 프론트 &lt;input type="time"&gt; 과 자연스러움. */
        LocalTime tier1Time,
        LocalTime tier2Time,
        LocalTime tier3Time,
        /** "NOTIFICATION"(알림톡) / "AD"(광고톡). */
        String tier1Kind,
        String tier2Kind,
        String tier3Kind,
        String updatedBy,
        LocalDateTime updatedAt
) {
    public static SmsOffsetRow from(SmsOffsetConfig cfg) {
        SurgeryGroup group = SurgeryGroup.byCode(cfg.getGroupCode());
        return new SmsOffsetRow(
                cfg.getGroupCode(),
                group.label(),
                cfg.getTier1Offset(),
                cfg.getTier2Offset(),
                cfg.getTier3Offset(),
                cfg.getTier1Time(),
                cfg.getTier2Time(),
                cfg.getTier3Time(),
                cfg.getTier1Kind(),
                cfg.getTier2Kind(),
                cfg.getTier3Kind(),
                cfg.getUpdatedBy(),
                cfg.getUpdatedAt()
        );
    }
}
