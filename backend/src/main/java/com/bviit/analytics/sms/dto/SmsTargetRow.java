package com.bviit.analytics.sms.dto;

import com.bviit.analytics.sms.entity.SmsTarget;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SmsTargetRow {

    private final Long id;
    private final String chartNo;
    private final String name;
    private final String phone;
    /** 실제로 보낼 수 있는 번호인지 — false 면 화면에서 '발송 불가'로 표시하고 발송에서 뺀다. */
    private final boolean phoneValid;
    private final String surgeryDate;
    /** 예정일 계산 기준일 — 보통 수술일과 같고, 재조정된 행만 다르다. */
    private final String scheduleBase;
    /** 기준일이 수술일과 달라진 행(연락처 수정·홀딩 해제로 되살아난 건). */
    private final boolean rebased;
    private final String surgeryType;
    /** 수술 종류 코드(smilePro·catMulti·reopLens …) — 라벨은 프론트가 붙인다. */
    private final String opType;
    private final String surgeryR;
    private final String surgeryL;
    private final String status;
    private final String source;
    /**
     * 이 번호가 <b>수신거부 목록</b>에 있는지. 홀딩과 달리 사람 단위라 다음 수술에도 계속 막힌다 —
     * 화면은 홀딩과 구분해 보여주고, 토글로 풀 수 없게 한다.
     */
    private final boolean optedOut;
    /** 이 대상의 발송 이력(최신순). 템플릿별 발송 여부는 프론트가 이 목록에서 파생한다. */
    private final List<SmsSendLogRow> logs;

    public static SmsTargetRow from(SmsTarget target, List<SmsSendLogRow> logs) {
        return from(target, logs, false);
    }

    public static SmsTargetRow from(SmsTarget target, List<SmsSendLogRow> logs, boolean optedOut) {
        return SmsTargetRow.builder()
                .optedOut(optedOut)
                .id(target.getId())
                .chartNo(target.getChartNo())
                .name(target.getName())
                .phone(target.getPhone() == null ? "" : target.getPhone())
                .phoneValid(target.hasValidPhone())
                .surgeryDate(target.getSurgeryDate().toString())
                .scheduleBase(target.scheduleBase().toString())
                .rebased(target.isRebased())
                .surgeryType(target.getSurgeryType() == null ? "" : target.getSurgeryType())
                .opType(target.getOpType() == null ? "" : target.getOpType())
                .surgeryR(target.getSurgeryR() == null ? "" : target.getSurgeryR())
                .surgeryL(target.getSurgeryL() == null ? "" : target.getSurgeryL())
                .status(target.getStatus())
                .source(target.getSource())
                .logs(logs)
                .build();
    }
}
