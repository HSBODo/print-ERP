package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 수술 도메인 마트 write 컴포넌트.
 *
 * - 집계(monthly/daily): upsert (ON CONFLICT DO UPDATE)
 * - 리스트(list_surgery): 기간 범위 delete + 새 데이터 insert (해당 날짜 취소·수정도 자연 반영)
 *
 * 트랜잭션 경계는 각 메서드 단위. 배치 잡이 여러 write를 하나로 묶고 싶으면 상위에서 감싼다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SurgeryMartWriter {

    private static final String UPSERT_MONTHLY_SQL     = SqlLoader.load("sql/mart/surgery/upsert-surgery-monthly.sql");
    private static final String UPSERT_DAILY_SQL       = SqlLoader.load("sql/mart/surgery/upsert-surgery-daily.sql");
    private static final String DELETE_LIST_RANGE_SQL  = SqlLoader.load("sql/mart/surgery/delete-list-surgery-range.sql");
    private static final String INSERT_LIST_SQL        = SqlLoader.load("sql/mart/surgery/insert-list-surgery.sql");
    private static final String DELETE_REOP_RANGE_SQL  = SqlLoader.load("sql/mart/surgery/delete-list-reoperation-range.sql");
    private static final String INSERT_REOP_SQL        = SqlLoader.load("sql/mart/surgery/insert-list-reoperation.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertMonthly(List<SurgeryMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(SurgeryMartWriter::toMonthlyParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_MONTHLY_SQL, batch);
        int total = sum(updated);
        log.info("mart_surgery_monthly upserted rows={}", total);
        return total;
    }

    @Transactional
    public int upsertDaily(List<SurgeryDailyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(SurgeryMartWriter::toDailyParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_DAILY_SQL, batch);
        int total = sum(updated);
        log.info("mart_surgery_daily upserted rows={}", total);
        return total;
    }

    /**
     * 리스트는 delete+insert. from/to 범위의 기존 행을 지우고 새로 삽입한다.
     * 소스에서 취소·수정된 케이스도 자연스럽게 반영됨.
     */
    @Transactional
    public int replaceList(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_LIST_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("list_surgery deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(SurgeryMartWriter::toListParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_LIST_SQL, batch);
        int inserted = sum(updated);
        log.info("list_surgery deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    /**
     * 재수술 리스트도 delete+insert. list_surgery 와 같은 이유(취소·수정 자연 반영).
     *
     * rows 는 select-reoperation-candidates.sql 결과 그대로이고, isLens 만 호출측이
     * 자바 ReoperationOverlay 로 계산해 넣어 준다 — 시술명 패턴을 SQL 로 복제하지 않기 위해서다.
     * 저장 판정(reoperation_decision)은 여기서 반영하지 않는다. 화면에서 판정을 고쳐도
     * 배치 없이 즉시 반영돼야 하므로 뷰가 조회 시점에 조인한다.
     */
    @Transactional
    public int replaceReoperation(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                DELETE_REOP_RANGE_SQL,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("list_reoperation deleted={} inserted=0 (empty)", deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(SurgeryMartWriter::toReoperationParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(INSERT_REOP_SQL, batch);
        int inserted = sum(updated);
        log.info("list_reoperation deleted={} inserted={}", deleted, inserted);
        return inserted;
    }

    private static SqlParameterSource toReoperationParams(Map<String, Object> r) {
        return new MapSqlParameterSource()
                .addValue("reopDate", str(r.get("reopDate")))
                .addValue("chartNo", str(r.get("chartNo")))
                .addValue("name", str(r.get("name")))
                .addValue("nameEng", str(r.get("nameEng")))
                .addValue("patientType", str(r.get("patientType")))
                .addValue("surgeon", str(r.get("surgeon")))
                .addValue("payment", str(r.get("payment")))
                .addValue("againR", str(r.get("againR")))
                .addValue("againL", str(r.get("againL")))
                .addValue("reasonCd", str(r.get("reasonCd")))
                .addValue("autoIncluded", toInt(r.get("autoIncluded")))
                .addValue("excludeReason", str(r.get("excludeReason")))
                // 호출측(SurgeryMartJob)이 ReoperationOverlay 로 계산해 넣어 둔 값
                .addValue("isLens", Boolean.TRUE.equals(r.get("isLens")));
    }

    private static String str(Object v) {
        return v == null ? "" : String.valueOf(v);
    }

    private static int toInt(Object v) {
        return v instanceof Number n ? n.intValue() : 0;
    }

    private static SqlParameterSource toMonthlyParams(SurgeryMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("lasek", m.getLasek())
                .addValue("lasik", m.getLasik())
                .addValue("smile", m.getSmile())
                .addValue("smilePro", m.getSmilePro())
                .addValue("icl", m.getIcl())
                .addValue("tIcl", m.getTIcl())
                .addValue("kpl", m.getKpl())
                .addValue("tKpl", m.getTKpl())
                .addValue("viva", m.getViva())
                .addValue("presbyond", m.getPresbyond())
                .addValue("piolPatients", m.getPiolPatients())
                .addValue("catMulti", m.getCatMulti())
                .addValue("catMono", m.getCatMono())
                .addValue("catEdof", m.getCatEdof())
                .addValue("xtra", m.getXtra())
                .addValue("waveVision", m.getWaveVision())
                .addValue("monoVision", m.getMonoVision())
                .addValue("contra", m.getContra())
                .addValue("personal", m.getPersonal())
                .addValue("lasekEx", m.getLasekEx())
                .addValue("lasekRed", m.getLasekRed())
                .addValue("reoperation", m.getReoperation())
                .addValue("reopLaser", m.getReopLaser())
                .addValue("reopLens", m.getReopLens())
                .addValue("visionPatients", m.getVisionPatients())
                .addValue("cataractPatients", m.getCataractPatients())
                .addValue("total", m.getTotal());
    }

    private static SqlParameterSource toDailyParams(SurgeryDailyItem d) {
        return new MapSqlParameterSource()
                .addValue("date", d.getDate())
                .addValue("lasek", d.getLasek())
                .addValue("lasik", d.getLasik())
                .addValue("smile", d.getSmile())
                .addValue("smilePro", d.getSmilePro())
                .addValue("icl", d.getIcl())
                .addValue("tIcl", d.getTIcl())
                .addValue("kpl", d.getKpl())
                .addValue("tKpl", d.getTKpl())
                .addValue("viva", d.getViva())
                .addValue("presbyond", d.getPresbyond())
                .addValue("piolPatients", d.getPiolPatients())
                .addValue("catMulti", d.getCatMulti())
                .addValue("catMono", d.getCatMono())
                .addValue("catEdof", d.getCatEdof())
                .addValue("xtra", d.getXtra())
                .addValue("waveVision", d.getWaveVision())
                .addValue("monoVision", d.getMonoVision())
                .addValue("contra", d.getContra())
                .addValue("personal", d.getPersonal())
                .addValue("lasekEx", d.getLasekEx())
                .addValue("lasekRed", d.getLasekRed())
                .addValue("reoperation", d.getReoperation())
                .addValue("reopLaser", d.getReopLaser())
                .addValue("reopLens", d.getReopLens())
                .addValue("visionPatients", d.getVisionPatients())
                .addValue("cataractPatients", d.getCataractPatients())
                .addValue("total", d.getTotal());
    }

    /**
     * SurgeryListRepository의 List&lt;Map&gt; 결과(원본 SQL alias 그대로)를 파라미터로 매핑.
     * select-surgery-list.sql의 SELECT 컬럼 alias(카멜)와 1:1.
     */
    private static SqlParameterSource toListParams(Map<String, Object> row) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : LIST_KEYS) {
            Object v = row.get(k);
            // CRM 원본에 whitespace-only 값(예: exam_date="   ")이 섞여 있어 trim 필수.
            // NULLIF(x, '')는 whitespace를 잡지 못해 CAST DATE에서 실패한다.
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        return p;
    }

    private static final String[] LIST_KEYS = new String[]{
            "chartNo", "name", "nameEng",
            "surgeryCategory", "surgeryDate", "examDate",
            "patientType", "surgeryReserveDate", "surgeryRegDate", "surgeryTime",
            "surgeryR", "surgeryL", "recommendedR", "recommendedL",
            "estimate", "surgeryRate", "payment",
            "surgeon", "counselor", "doctor", "optometrist",
            "birth", "lunar", "phone1", "phone2", "email",
            "zip", "addr1", "addr2", "memo",
            "grade", "job", "lastVisit",
            "route", "section",
            "motiveL", "motiveM", "motiveS", "motiveMemo",
            "examMemo", "insurance", "nationality"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
