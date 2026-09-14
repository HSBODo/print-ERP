package com.bviit.analytics.sms;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.sms.config.SurgeryGroup;
import com.bviit.analytics.sms.dto.SmsLookupRow;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.bviit.analytics.sms.entity.SmsSendLog;
import com.bviit.analytics.sms.entity.SmsTarget;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 문자 발송 관리의 **판정 규칙**을 못 박는다.
 * 화면·자동화가 모두 이 규칙 위에 서 있어서, 조용히 바뀌면 오발송이나 누락으로 이어진다.
 */
class SmsDomainRulesTest {

    private static SmsTarget target(String phone, LocalDate surgeryDate) {
        SmsTarget t = SmsTarget.builder()
                .chartNo("2234451").name("홍길동").phone(phone).surgeryDate(surgeryDate)
                .status(SmsTarget.STATUS_SENDABLE).source(SmsTarget.SOURCE_AUTO)
                .build();
        t.stampCreated(LocalDateTime.now());
        return t;
    }

    @Test
    void 더미_번호는_발송_불가로_판정한다() {
        // 번호를 모를 때 자리만 채우는 관행 때문에 형식만 맞는 값이 섞여 들어온다.
        assertThat(SmsTarget.isValidPhone("01000000000")).isFalse();
        assertThat(SmsTarget.isValidPhone("0000")).isFalse();
        assertThat(SmsTarget.isValidPhone("")).isFalse();
        assertThat(SmsTarget.isValidPhone(null)).isFalse();
        assertThat(SmsTarget.isValidPhone("01011111111")).isFalse();
        // 해외 번호는 국내 문자로 못 보낸다.
        assertThat(SmsTarget.isValidPhone("6581251143")).isFalse();
    }

    @Test
    void 정상_휴대폰은_하이픈이_있어도_발송_가능하다() {
        assertThat(SmsTarget.isValidPhone("01080690814")).isTrue();
        assertThat(SmsTarget.isValidPhone("010-8069-0814")).isTrue();
        assertThat(SmsTarget.normalizePhone("010-8069-0814")).isEqualTo("01080690814");
    }

    @Test
    void 홀딩은_되돌릴_수_있고_허용되지_않는_상태는_거부한다() {
        SmsTarget t = target("01080690814", LocalDate.of(2026, 8, 1));
        assertThat(t.isSendable()).isTrue();

        t.changeStatus(SmsTarget.STATUS_HOLD, LocalDateTime.now());
        assertThat(t.isSendable()).isFalse();

        t.changeStatus(SmsTarget.STATUS_SENDABLE, LocalDateTime.now());
        assertThat(t.isSendable()).isTrue();

        // 구버전 값도 홀딩으로 받아준다(이미 저장된 행이 있다).
        t.changeStatus("CANCELED", LocalDateTime.now());
        assertThat(t.isSendable()).isFalse();

        assertThatThrownBy(() -> t.changeStatus("WHATEVER", LocalDateTime.now()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 기준일은_기본이_수술일이고_재조정하면_달라진다() {
        SmsTarget t = target("01080690814", LocalDate.of(2026, 8, 3));
        assertThat(t.scheduleBase()).isEqualTo(LocalDate.of(2026, 8, 3));
        assertThat(t.isRebased()).isFalse();

        // 1차(+7)가 오늘이 되도록 기준일을 민다 — 지나간 차수를 되살리는 규칙.
        t.rebaseSchedule(LocalDate.of(2026, 8, 6), LocalDateTime.now());
        assertThat(t.scheduleBase()).isEqualTo(LocalDate.of(2026, 8, 6));
        assertThat(t.isRebased()).isTrue();
    }

    @Test
    void 접수_성공은_완료가_아니라_대기다() {
        SmsSendLog log = SmsSendLog.builder()
                .targetId(1L).templateCode("T1").requestedChannel("ALIMTALK")
                .status(SmsSendLog.STATUS_PENDING).sentAt(LocalDateTime.now())
                .build();

        log.applyAcceptResult("ATA", "G4V", "M4V", null, SmsSendLog.STATUS_PENDING, null);
        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_PENDING);
        assertThat(log.getSolapiMessageId()).isEqualTo("M4V");

        // 도달이 확인돼야 완료다.
        LocalDateTime delivered = LocalDateTime.of(2026, 8, 13, 14, 32);
        log.applyDeliveryResult("SMS", "4000", SmsSendLog.STATUS_SUCCESS, delivered, true, null);
        assertThat(log.getStatus()).isEqualTo(SmsSendLog.STATUS_SUCCESS);
        assertThat(log.getDeliveredAt()).isEqualTo(delivered);
        assertThat(log.isReplacement()).isTrue();
    }

    /**
     * 적재 SQL 의 op_type 목록과 SurgeryGroup 의 그룹 정의가 어긋나면 잡는다.
     *
     * 왜 필요한가 — 목록이 두 곳(SQL 문자열 · 자바 상수)에 있다. 그룹을 늘리면서
     * 한쪽만 고치면 "화면에는 그룹이 생겼는데 대상이 안 들어온다"(또는 그 반대)가 된다.
     * 조용히 어긋나는 종류의 사고라 테스트로 묶어 둔다.
     */
    @Test
    void 적재SQL의_수술종류가_그룹정의와_일치한다() {
        // 주석은 걷어낸다 — 설명문에 'list_reoperation' 같은 단어가 나와도 실제 쿼리가 아니다.
        String sql = SqlLoader.load("sql/sms/select-surgery-targets.sql")
                .lines()
                .filter(line -> !line.stripLeading().startsWith("--"))
                .collect(java.util.stream.Collectors.joining("\n"));

        // 안내 문구가 있는 4개 그룹(ETC 제외)의 op_type 전부가 SQL 에 있어야 한다.
        SurgeryGroup.ALL.stream()
                .filter(g -> !g.code().equals("ETC"))
                .flatMap(g -> g.opTypes().stream())
                .forEach(opType -> assertThat(sql)
                        .as("적재 SQL 에 %s 가 빠졌다 — 이 수술 환자는 대상으로 안 들어온다", opType)
                        .contains("'" + opType + "'"));

        // 반대로, 문구가 없는 종류는 적재하지 않는다.
        assertThat(sql)
                .as("백내장·재수술은 문구가 없어 적재 대상이 아니다")
                .doesNotContain("'catMulti'")
                .doesNotContain("'catMono'")
                .doesNotContain("'catEdof'")
                .doesNotContain("'reopLens'")
                .doesNotContain("'reopLaser'")
                .doesNotContain("list_reoperation");
    }

    /** 1차 시점은 그룹마다 다르다 — 회복 속도가 달라서다. 2·3차는 같다. */
    @Test
    void 그룹마다_1차_시점이_다르다() {
        assertThat(SurgeryGroup.of("smilePro").offsetOf(1)).isEqualTo(1);
        assertThat(SurgeryGroup.of("smile").offsetOf(1)).isEqualTo(1);
        assertThat(SurgeryGroup.of("lasik").offsetOf(1)).isEqualTo(1);
        assertThat(SurgeryGroup.of("icl").offsetOf(1)).isEqualTo(3);
        assertThat(SurgeryGroup.of("tIcl").offsetOf(1)).isEqualTo(3);
        assertThat(SurgeryGroup.of("lasek").offsetOf(1)).isEqualTo(5);

        // 2·3차는 네 그룹 모두 같다.
        SurgeryGroup.ALL.forEach(g -> {
            assertThat(g.offsetOf(2)).isEqualTo(7);
            assertThat(g.offsetOf(3)).isEqualTo(14);
        });
    }

    /**
     * 차트번호 조회 응답의 **필드 집합**을 못 박는다.
     *
     * 화면(zod lookupSchema)이 이 키들을 전부 필수로 검증하기 때문에, 하나만 빠져도
     * 파싱이 통째로 실패해 [조회] 버튼이 죽는다. 실제로 opType 이 누락돼 그렇게 됐었다(2026-08-14).
     * 필드를 지우거나 이름을 바꾸려면 프론트 스키마를 같이 고쳐야 한다는 뜻이다.
     */
    @Test
    void 차트번호_조회_응답은_화면이_요구하는_필드를_모두_담는다() throws Exception {
        String json = new com.fasterxml.jackson.databind.ObjectMapper()
                .writeValueAsString(SmsLookupRow.notFound("2234451"));
        com.fasterxml.jackson.databind.JsonNode node =
                new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);

        assertThat(node.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "found", "alreadyRegistered", "chartNo", "name", "phone",
                "surgeryDate", "surgeryType", "opType", "surgeryR", "surgeryL");
    }

    /**
     * 수정은 <b>연락처만</b> 바꾼다.
     * 차트번호·수술일·수술 종류는 CRM 이 정본이라, API 로 들어와도 반영하지 않는다 —
     * 여기서 바뀌면 마트와 어긋난 행이 생기고 예정일·문구가 통째로 달라진다.
     */
    @Test
    void 수정은_연락처_외의_값을_바꾸지_않는다() {
        SmsTarget t = target("01000000000", LocalDate.of(2026, 8, 6));
        t.changePhone("010-8069-0814", LocalDateTime.now());

        assertThat(t.getPhone()).isEqualTo("01080690814");   // 하이픈은 저장 전에 벗긴다
        assertThat(t.getChartNo()).isEqualTo("2234451");
        assertThat(t.getSurgeryDate()).isEqualTo(LocalDate.of(2026, 8, 6));
        // 사람이 손댄 행은 MANUAL 로 올려 자동 적재가 덮지 못하게 한다.
        assertThat(t.isAuto()).isFalse();
    }

    /**
     * 슬롯이 상황에 맞는 본문을 고른다.
     * 재조정된 대상에게는 경과 선언("수술 후 일주일이 지났습니다")을 뺀 본문이 나가야 한다 —
     * 발송이 밀리면 그 문장이 거짓이 되기 때문이다.
     */
    @Test
    void 재조정된_대상은_경과_문장을_뺀_본문을_쓴다() {
        SmsTemplateGroupInfo slot = new SmsTemplateGroupInfo(
                "SMILE", "스마일수술", List.of("smilePro", "smile"), 7,
                "TPL_ID", "수술 후 일주일이 지났습니다. 오늘부터는…", "오늘부터는…",
                true, true, true);

        assertThat(slot.textFor(false)).contains("일주일이 지났습니다");
        assertThat(slot.textFor(true)).doesNotContain("지났습니다");
        assertThat(slot.sendable()).isTrue();
    }

    /** 분류되지 않는 수술은 ETC 로 떨어진다 — 남의 문구가 나가면 안 된다. */
    @Test
    void 모르는_수술은_ETC로_간다() {
        assertThat(SurgeryGroup.of("catMulti").code()).isEqualTo("ETC");
        assertThat(SurgeryGroup.of("reopLens").code()).isEqualTo("ETC");
        assertThat(SurgeryGroup.of("presbyond").code()).isEqualTo("ETC");
        assertThat(SurgeryGroup.of("").code()).isEqualTo("ETC");
        assertThat(SurgeryGroup.of(null).code()).isEqualTo("ETC");
    }
}
