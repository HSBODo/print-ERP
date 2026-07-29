package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.config.HomepageSourceDialect;
import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약자 리스트_홈페이지 SQL 리소스 불변식.
 *
 * <p>여기서 지키는 건 "레거시 화면과 같은 건수가 나오는가"다. 회귀 기준은
 * from=2026-06-01 / to=2026-06-30 → <b>206건</b>. 스냅샷·운영 DB 양쪽에서 실측 확인했다.
 * 아래 조건 중 하나라도 빠지면 값이 조용히 달라진다:
 * <ul>
 *   <li>category 필터 누락 → 753 (다른 상담 채널이 섞임)
 *   <li>종료일 반개구간 누락 → 199 (종료일 당일이 통째로 누락)
 *   <li>del_tf 누락 → 2026-06 엔 우연히 206 그대로지만, 삭제건(전체 281건)이 낀 기간에서 갈린다
 * </ul>
 *
 * <p><b>소스가 둘이라 SQL 세트도 둘이다</b>(스냅샷 SQLite / 운영 MariaDB). 같은 데이터인데
 * 스키마가 다르다 — 캐시가 원본을 snake_case 로 개명해 적재했기 때문이다. 두 세트가 어긋나면
 * 한쪽 소스에서만 화면이 깨지므로, 계약(별칭)은 <b>공통 테스트</b>로 양쪽에 강제한다.
 *
 * <p>실제 건수 검증은 소스(파일/터널)가 있어야 해서 CI 에서 돌릴 수 없다 — 여기서는 쿼리 형태를 고정한다.
 */
class ReservationListHomepageSqlResourceTest {

    /**
     * 단언 대상은 SQL 본문뿐이다.
     * <ul>
     *   <li>주석 제거 — SQL 파일 주석에 'ORDER BY C_NO DESC' 같은 문구가 설명으로 들어있어,
     *       걷어내지 않으면 본문에서 그 절이 사라져도 테스트가 통과해버린다.
     *   <li>공백 정규화 — 별칭 정렬용 공백 개수에 단언이 매이지 않게 한다.
     * </ul>
     */
    private static String sqlBody(HomepageSourceDialect dialect, String fileName) {
        return SqlLoader.load(ReservationListHomepageRepository.sqlPath(dialect, fileName))
                .replaceAll("--[^\\n]*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /** 프론트 zod 계약. 인용부호는 방언마다 다르므로(SQLite "x" / MariaDB `x`) 이름만 본다. */
    private static final String[] ALIASES = {
            "legacyNo", "deviceType", "name", "phone", "reserveDate", "reserveTime",
            "utmSource", "utmMedium", "utmCampaign", "referralCode",
            "examType", "surgeryTf", "isReserve", "regDate",
    };

    @ParameterizedTest
    @EnumSource(HomepageSourceDialect.class)
    void 목록_sql은_어느_소스든_프론트_zod_계약인_camelCase_별칭_14개를_보존한다(HomepageSourceDialect dialect) {
        String sql = sqlBody(dialect, "reservation-list-homepage.sql");

        for (String alias : ALIASES) {
            assertThat(sql)
                    .as("%s 세트에 별칭 %s 누락 — 한쪽 소스에서만 화면이 깨진다", dialect, alias)
                    .containsPattern("AS [\"`]" + alias + "[\"`]");
        }
    }

    @ParameterizedTest
    @EnumSource(HomepageSourceDialect.class)
    void 목록_sql은_어느_소스든_레거시_동일건수_조건을_보존한다(HomepageSourceDialect dialect) {
        String sql = sqlBody(dialect, "reservation-list-homepage.sql");

        assertThat(sql).contains(":from", ":to");
        // 채널 고정 — 빼면 전화상담 등이 섞여 206 → 753
        assertThat(sql).containsIgnoringCase("CATEGORY = 'COUNSELONLINE'");
        // 삭제건 제외 — 레거시 PHP 하드코딩
        assertThat(sql).containsIgnoringCase("DEL_TF = 'N'");
    }

    @ParameterizedTest
    @EnumSource(HomepageSourceDialect.class)
    void 목록_sql은_어느_소스든_테스트_이름_행을_배치_소스에서_걸러낸다(HomepageSourceDialect dialect) {
        String sql = sqlBody(dialect, "reservation-list-homepage.sql");

        // 이름에 '테스트'/'TEST' 포함건 제외 — 리스트 화면 정합용 배치 필터.
        // 빠지면 마트에 테스트 데이터가 흘러들어 리스트·집계가 부풀어 오른다.
        assertThat(sql).containsIgnoringCase("NOT LIKE '%테스트%'");
        assertThat(sql).containsIgnoringCase("NOT LIKE '%TEST%'");
    }

    @Test
    void 스냅샷_세트는_SQLite_스키마와_방언을_쓴다() {
        String sql = sqlBody(HomepageSourceDialect.SQLITE, "reservation-list-homepage.sql");

        assertThat(sql)
                .contains("FROM consultations")
                // legacy_no 는 정수라 CAST 가 빠지면 JSON 이 숫자가 되고 zod(string)가 깨진다.
                .contains("CAST(legacy_no AS TEXT) AS \"legacyNo\"")
                // 반개구간 — 깨지면 종료일 당일 등록분이 사라진다(206 → 199).
                .contains("reg_date < date(:to, '+1 day')")
                // 등록일이 아니라 PK 역순. 레거시 화면 No 재현의 전제다.
                .contains("ORDER BY legacy_no DESC");
    }

    @Test
    void 운영_세트는_TBL_COUNSEL_원본_스키마와_MariaDB_방언을_쓴다() {
        String sql = sqlBody(HomepageSourceDialect.MARIADB, "reservation-list-homepage.sql");

        assertThat(sql)
                // 캐시가 개명한 이름(consultations/legacy_no/name)은 운영 DB 에 없다.
                .contains("FROM TBL_COUNSEL")
                .doesNotContain("consultations")
                .contains("CAST(C_NO AS CHAR) AS `legacyNo`")
                // REG_DATE 는 datetime — 포맷을 빼면 JDBC 가 Timestamp 를 올려 zod(string)가 깨진다.
                .contains("DATE_FORMAT(REG_DATE, '%Y-%m-%d %H:%i:%s')")
                // 반개구간(206 → 199 방지)의 MariaDB 판
                .contains("REG_DATE < DATE_ADD(:to, INTERVAL 1 DAY)")
                .contains("ORDER BY C_NO DESC");
    }

    @ParameterizedTest
    @EnumSource(HomepageSourceDialect.class)
    void 월별_list_raw_sql은_어느_소스든_리스트_화면과_동일_집계를_보존한다(HomepageSourceDialect dialect) {
        String sql = sqlBody(dialect, "monthly-list-raw.sql");

        assertThat(sql).contains(":from", ":to");
        assertThat(sql).containsIgnoringCase("CATEGORY = 'COUNSELONLINE'");
        assertThat(sql).containsIgnoringCase("DEL_TF = 'N'");
        // 리스트 화면과 정합 위해 EXAM_TYPE 필터·DISTINCT 없다. 하나라도 들어오면 값이 조용히 줄어든다.
        assertThat(sql).doesNotContainIgnoringCase("EXAM_TYPE");
        assertThat(sql).doesNotContainIgnoringCase("DISTINCT");
        assertThat(sql).containsIgnoringCase("COUNT(*)");
        // 테스트 이름 필터 — 리스트 화면과 동일하게 걸어야 월별 집계가 정합.
        assertThat(sql).containsIgnoringCase("NOT LIKE '%테스트%'");
        assertThat(sql).containsIgnoringCase("NOT LIKE '%TEST%'");
    }

    @ParameterizedTest
    @EnumSource(HomepageSourceDialect.class)
    void 마지막_등록일시_sql은_신선도판단용이라_삭제건을_거르지_않는다(HomepageSourceDialect dialect) {
        String sql = sqlBody(dialect, "last-reg-date.sql");

        assertThat(sql).containsPattern("(?i)MAX\\(REG_DATE\\)");
        assertThat(sql).containsPattern("AS [\"`]lastRegDate[\"`]");
        assertThat(sql).containsIgnoringCase("CATEGORY = 'COUNSELONLINE'");
        assertThat(sql).doesNotContainIgnoringCase("DEL_TF");
    }

    @Test
    void 방언은_URL_접두사로_판별한다() {
        assertThat(HomepageSourceDialect.of("jdbc:mariadb://127.0.0.1:13306/bseyecom_db")).isEqualTo(HomepageSourceDialect.MARIADB);
        assertThat(HomepageSourceDialect.of("jdbc:sqlite:/app/legacy/x.sqlite?open_mode=1")).isEqualTo(HomepageSourceDialect.SQLITE);
        // 미지 접두사는 기존 기본 동작(스냅샷)으로 — 실시간으로 오인해 경고를 끄는 것보다 안전하다.
        assertThat(HomepageSourceDialect.of("")).isEqualTo(HomepageSourceDialect.SQLITE);

        // 실시간 여부 = 경고 배너 on/off 의 근거
        assertThat(HomepageSourceDialect.MARIADB.live()).isTrue();
        assertThat(HomepageSourceDialect.SQLITE.live()).isFalse();
    }
}
