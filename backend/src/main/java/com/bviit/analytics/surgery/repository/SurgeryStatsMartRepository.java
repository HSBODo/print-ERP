package com.bviit.analytics.surgery.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * 수술 마트 read 전용 리포지토리.
 *
 * PR-2: 클래스만 존재, 아직 서비스에서 사용하지 않음.
 * PR-3 Cutover에서 SurgeryStatsService/SurgeryListService가 이 클래스로 스위치할 예정.
 *
 * 반환 shape은 기존 MSSQL 직결 결과와 동일해서 서비스 전환 시 UI 영향 없음.
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class SurgeryStatsMartRepository {

    private static final String SELECT_MONTHLY_SQL = SqlLoader.load("sql/mart/select-surgery-monthly.sql");
    private static final String SELECT_DAILY_SQL   = SqlLoader.load("sql/mart/select-surgery-daily.sql");
    private static final String SELECT_LIST_SQL    = SqlLoader.load("sql/mart/select-list-surgery.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    public List<SurgeryMonthlyItem> findMonthly(List<Integer> years) {
        return jdbc.query(
                SELECT_MONTHLY_SQL,
                new MapSqlParameterSource("years", years),
                (rs, i) -> SurgeryMonthlyItem.builder()
                        .year(rs.getInt("yr"))
                        .month(rs.getInt("mo"))
                        .lasek(rs.getInt("lasek"))
                        .lasik(rs.getInt("lasik"))
                        .smile(rs.getInt("smile"))
                        .smilePro(rs.getInt("smilePro"))
                        .icl(rs.getInt("icl"))
                        .tIcl(rs.getInt("tIcl"))
                        .kpl(rs.getInt("kpl"))
                        .tKpl(rs.getInt("tKpl"))
                        .viva(rs.getInt("viva"))
                        .presbyond(rs.getInt("presbyond"))
                        .piolPatients(rs.getInt("piolPatients"))
                        .catMulti(rs.getInt("catMulti"))
                        .catMono(rs.getInt("catMono"))
                        .catEdof(rs.getInt("catEdof"))
                        .xtra(rs.getInt("xtra"))
                        .waveVision(rs.getInt("waveVision"))
                        .monoVision(rs.getInt("monoVision"))
                        .contra(rs.getInt("contra"))
                        .personal(rs.getInt("personal"))
                        .lasekEx(rs.getInt("lasekEx"))
                        .lasekRed(rs.getInt("lasekRed"))
                        .reoperation(rs.getInt("reoperation"))
                        .reopLaser(rs.getInt("reopLaser"))
                        .reopLens(rs.getInt("reopLens"))
                        .visionPatients(rs.getInt("visionPatients"))
                        .cataractPatients(rs.getInt("cataractPatients"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<SurgeryDailyItem> findDaily(String from, String to) {
        return jdbc.query(
                SELECT_DAILY_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, i) -> SurgeryDailyItem.builder()
                        .date(rs.getString("date"))
                        .lasek(rs.getInt("lasek"))
                        .lasik(rs.getInt("lasik"))
                        .smile(rs.getInt("smile"))
                        .smilePro(rs.getInt("smilePro"))
                        .icl(rs.getInt("icl"))
                        .tIcl(rs.getInt("tIcl"))
                        .kpl(rs.getInt("kpl"))
                        .tKpl(rs.getInt("tKpl"))
                        .viva(rs.getInt("viva"))
                        .presbyond(rs.getInt("presbyond"))
                        .piolPatients(rs.getInt("piolPatients"))
                        .catMulti(rs.getInt("catMulti"))
                        .catMono(rs.getInt("catMono"))
                        .catEdof(rs.getInt("catEdof"))
                        .xtra(rs.getInt("xtra"))
                        .waveVision(rs.getInt("waveVision"))
                        .monoVision(rs.getInt("monoVision"))
                        .contra(rs.getInt("contra"))
                        .personal(rs.getInt("personal"))
                        .lasekEx(rs.getInt("lasekEx"))
                        .lasekRed(rs.getInt("lasekRed"))
                        .reoperation(rs.getInt("reoperation"))
                        .reopLaser(rs.getInt("reopLaser"))
                        .reopLens(rs.getInt("reopLens"))
                        .visionPatients(rs.getInt("visionPatients"))
                        .cataractPatients(rs.getInt("cataractPatients"))
                        .total(rs.getInt("total"))
                        .build()
        );
    }

    public List<Map<String, Object>> findList(String from, String to) {
        return jdbc.queryForList(
                SELECT_LIST_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to)
        );
    }
}
