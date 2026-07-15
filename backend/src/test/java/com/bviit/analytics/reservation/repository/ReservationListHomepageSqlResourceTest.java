package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약자 리스트_홈페이지 SQL 리소스 불변식.
 *
 * <p>여기서 지키는 건 "레거시 화면과 같은 건수가 나오는가"다. 회귀 기준은
 * from=2026-06-01 / to=2026-06-30 → <b>206건</b>(운영 화면 동일 조건과 같은 값).
 * 아래 조건 중 하나라도 빠지면 값이 조용히 달라진다:
 * <ul>
 *   <li>category 필터 누락 → 753 (다른 상담 채널이 섞임)
 *   <li>종료일 반개구간 누락 → 199 (종료일 당일이 통째로 누락)
 *   <li>del_tf 누락 → 2026-06 엔 우연히 206 그대로지만, 삭제건(전체 281건)이 낀 기간에서 갈린다
 * </ul>
 * 실제 건수 검증은 소스 파일이 있어야 해서 CI 에서 돌릴 수 없다 — 여기서는 쿼리 형태를 고정한다.
 */
class ReservationListHomepageSqlResourceTest {

    /**
     * 단언 대상은 SQL 본문뿐이다.
     * <ul>
     *   <li>주석 제거 — SQL 파일 주석에 'ORDER BY legacy_no DESC' 같은 문구가 설명으로 들어있어,
     *       걷어내지 않으면 본문에서 그 절이 사라져도 테스트가 통과해버린다.
     *   <li>공백 정규화 — 별칭 정렬용 공백 개수에 단언이 매이지 않게 한다.
     * </ul>
     */
    private static String sqlBody(String resource) {
        return SqlLoader.load(resource)
                .replaceAll("--[^\\n]*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    @Test
    void 목록_sql은_레거시_동일건수를_만드는_조건을_보존한다() {
        String sql = sqlBody(ReservationListHomepageRepository.LIST_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("FROM consultations")
                .contains("category = 'COUNSELONLINE'")
                .contains("del_tf = 'N'")
                .contains("reg_date >= :from")
                // 반개구간 — 이 형태가 깨지면 종료일 당일 등록분이 사라진다(206 → 199).
                .contains("reg_date < date(:to, '+1 day')")
                // 등록일이 아니라 PK 역순. 레거시 화면 No 재현의 전제다.
                .contains("ORDER BY legacy_no DESC");
    }

    @Test
    void 목록_sql은_프론트_zod_계약인_camelCase_별칭을_보존한다() {
        String sql = sqlBody(ReservationListHomepageRepository.LIST_SQL);

        assertThat(sql)
                // legacy_no 는 정수 컬럼이라 CAST 가 빠지면 JSON 이 숫자가 되고 zod(string)가 깨진다.
                .contains("CAST(legacy_no AS TEXT) AS \"legacyNo\"")
                .contains("\"deviceType\"")
                .contains("\"name\"")
                .contains("\"phone\"")
                .contains("\"reserveDate\"")
                .contains("\"reserveTime\"")
                .contains("\"utmSource\"")
                .contains("\"utmMedium\"")
                .contains("\"utmCampaign\"")
                .contains("\"referralCode\"")
                .contains("\"examType\"")
                .contains("\"surgeryTf\"")
                .contains("\"isReserve\"")
                .contains("\"regDate\"");
    }

    @Test
    void 월별_중복제외_sql은_집계_조건을_보존한다() {
        String sql = sqlBody(ReservationListHomepageRepository.MONTHLY_DEDUPED_SQL);

        assertThat(sql)
                .contains(":from", ":to")
                .contains("category = 'COUNSELONLINE'")
                .contains("del_tf = 'N'")
                // 시력교정만 — 백내장(2)·노안(21)·렌즈삽입(24,25)·미상(1) 제외 (2026-07-15 결정)
                .contains("exam_type = '5'")
                // 중복제외 = 달 안에서 전화번호 기준. COUNT(*) 로 바뀌면 온라인 예약이 부풀려진다.
                .contains("COUNT(DISTINCT phone)")
                .contains("reg_date < date(:to, '+1 day')")
                .contains("GROUP BY substr(reg_date, 1, 4), substr(reg_date, 6, 2)");
    }

    @Test
    void 스냅샷_기준일_sql은_신선도판단용이라_삭제건을_거르지_않는다() {
        String sql = sqlBody(ReservationListHomepageRepository.SNAPSHOT_MAX_REG_DATE_SQL);

        assertThat(sql)
                .contains("MAX(reg_date)")
                .contains("\"snapshotMaxRegDate\"")
                .contains("category = 'COUNSELONLINE'")
                .doesNotContain("del_tf");
    }
}
