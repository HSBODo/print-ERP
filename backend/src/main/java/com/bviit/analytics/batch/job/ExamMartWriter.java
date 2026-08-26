package com.bviit.analytics.batch.job;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.exam.dto.ExaminationMonthlyItem;
import com.bviit.analytics.exam.dto.ProcedureExamMonthlyItem;
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
 * 검사 도메인 마트 write 컴포넌트 — PR-6.
 *
 * - 집계(monthly): upsert (ON CONFLICT DO UPDATE)
 * - 리스트(list_exam, list_cataract_exam): 검사일 범위 delete + 새 데이터 insert
 *
 * 트랜잭션 경계는 각 메서드 단위. 배치 잡이 여러 write를 하나로 묶고 싶으면 상위에서 감싼다.
 */
@Slf4j
@Component
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ExamMartWriter {

    private static final String UPSERT_EXAMINATION_MONTHLY_SQL     = SqlLoader.load("sql/mart/exam/upsert-examination-monthly.sql");
    private static final String UPSERT_PROCEDURE_EXAM_MONTHLY_SQL  = SqlLoader.load("sql/mart/exam/upsert-procedure-exam-monthly.sql");
    private static final String DELETE_LIST_EXAM_RANGE_SQL         = SqlLoader.load("sql/mart/exam/delete-list-exam-range.sql");
    private static final String INSERT_LIST_EXAM_SQL               = SqlLoader.load("sql/mart/exam/insert-list-exam.sql");
    private static final String DELETE_LIST_CATARACT_EXAM_RANGE_SQL = SqlLoader.load("sql/mart/exam/delete-list-cataract-exam-range.sql");
    private static final String INSERT_LIST_CATARACT_EXAM_SQL      = SqlLoader.load("sql/mart/exam/insert-list-cataract-exam.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    @Transactional
    public int upsertExaminationMonthly(List<ExaminationMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ExamMartWriter::toExaminationParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_EXAMINATION_MONTHLY_SQL, batch);
        int total = sum(updated);
        log.info("mart_examination_monthly upserted rows={}", total);
        return total;
    }

    @Transactional
    public int upsertProcedureExamMonthly(List<ProcedureExamMonthlyItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(ExamMartWriter::toProcedureExamParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(UPSERT_PROCEDURE_EXAM_MONTHLY_SQL, batch);
        int total = sum(updated);
        log.info("mart_procedure_exam_monthly upserted rows={}", total);
        return total;
    }

    /**
     * 시력교정 검사자 명단은 delete+insert. 검사일(exam_date) 범위의 기존 행을 지우고 새로 삽입.
     * 사후 취소·수정도 자연스럽게 반영됨.
     */
    @Transactional
    public int replaceListExam(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        return replaceList("list_exam", DELETE_LIST_EXAM_RANGE_SQL, INSERT_LIST_EXAM_SQL, from, to, rows);
    }

    /**
     * 백내장 검사자 명단은 delete+insert. Cataract_Exam.EXAM_DATE 기준.
     */
    @Transactional
    public int replaceListCataractExam(LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        return replaceList("list_cataract_exam", DELETE_LIST_CATARACT_EXAM_RANGE_SQL,
                INSERT_LIST_CATARACT_EXAM_SQL, from, to, rows);
    }

    private int replaceList(String tableName, String deleteSql, String insertSql,
                             LocalDate from, LocalDate to, List<Map<String, Object>> rows) {
        int deleted = jdbc.update(
                deleteSql,
                new MapSqlParameterSource()
                        .addValue("from", from, Types.DATE)
                        .addValue("to", to, Types.DATE)
        );
        if (rows.isEmpty()) {
            log.info("{} deleted={} inserted=0 (empty)", tableName, deleted);
            return 0;
        }
        SqlParameterSource[] batch = rows.stream()
                .map(ExamMartWriter::toListParams)
                .toArray(SqlParameterSource[]::new);
        int[] updated = jdbc.batchUpdate(insertSql, batch);
        int inserted = sum(updated);
        log.info("{} deleted={} inserted={}", tableName, deleted, inserted);
        return inserted;
    }

    private static SqlParameterSource toExaminationParams(ExaminationMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("visionCorrection", m.getVisionCorrection())
                .addValue("dreamlens", m.getDreamlens())
                .addValue("cataract", m.getCataract())
                .addValue("examTotal", m.getExamTotal())
                .addValue("total", m.getTotal());
    }

    private static SqlParameterSource toProcedureExamParams(ProcedureExamMonthlyItem m) {
        return new MapSqlParameterSource()
                .addValue("yr", m.getYear())
                .addValue("mo", m.getMonth())
                .addValue("examCount", m.getExamCount())
                .addValue("oneDayExamCount", m.getOneDayExamCount())
                .addValue("total", m.getTotal());
    }

    /**
     * select-exam-list.sql / select-cataract-exam-list.sql의 List&lt;Map&gt; 결과(camelCase alias)를 파라미터로 매핑.
     * 두 SQL이 동일 49필드 계약을 공유하므로 하나의 매핑으로 처리.
     */
    private static SqlParameterSource toListParams(Map<String, Object> row) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        for (String k : LIST_KEYS) {
            Object v = row.get(k);
            // CRM 원본에 whitespace-only 값이 섞여 있어 trim 필수(surgery·reservation와 동일).
            p.addValue(k, v == null ? "" : v.toString().trim());
        }
        return p;
    }

    private static final String[] LIST_KEYS = new String[]{
            "examDate",
            "chartNo", "name", "nameEng",
            // classification: 백내장 리스트 전용(백내장/중단). 시력교정 list_exam SQL은 참조하지 않아 무시된다.
            "examType", "examCategory", "classification", "patientType",
            "examRegDate", "examMemo", "estimate", "surgeryRate", "examTime",
            "recommendedR", "recommendedL",
            "surgeryRegDate", "surgeryReserveDate", "surgeryDate",
            "surgeryR", "surgeryL", "surgeon", "payment",
            "counselor", "doctor",
            "jumin", "birth", "lunar",
            "phone1", "phone2", "email",
            "zip", "addr1", "addr2", "memo",
            "examStop", "opImpossible", "route", "section",
            "motiveL", "motiveM", "motiveS", "motiveMemo",
            "optometrist",
            "cancelCode", "cancelMemo",
            "grade", "job", "lastVisit", "insurance", "nationality",
            // oneDay: 원데이 Y/N. 두 SQL 이 각자 계산한다 —
            //   시력교정(select-exam-list.sql)  = 같은날 M/5(검사OP) 예약 내원
            //   백내장(select-cataract-exam-list.sql) = 그날 백내장검사 예약 진료구분 C_원데이(7)·C_노안원데이(9)
            "oneDay"
    };

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
