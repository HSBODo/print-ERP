package com.bviit.analytics.marketing.repository;

import com.bviit.analytics.common.util.SqlLoader;
import com.bviit.analytics.marketing.dto.AdSpendItem;
import com.bviit.analytics.marketing.dto.ChannelLensCostItem;
import com.bviit.analytics.marketing.dto.LensCostItem;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 채널 수익성 입력값(광고비·렌즈원가)과 채널별 렌즈원가 집계.
 *
 * <p>조회는 마트만 읽고, 쓰기도 마트 테이블에만 한다 — MSSQL(원천 CRM)은 절대 건드리지 않는다.
 * 다른 통계와 달리 쓰기가 있는 이유는 이 두 값이 CRM 에 존재하지 않아서다(V51 머리주석 참조).
 *
 * <p>SQL 은 전부 resources/sql/mart 리소스다 — 자바에 텍스트 블록으로 두지 않는다
 * (RepositorySqlResourceCoverageTest 가 지키는 규약).
 */
@Repository
@Profile("postgres-mart")
@RequiredArgsConstructor
public class ChannelProfitMartRepository {

    private static final String SELECT_CHANNEL_LENS_COST_SQL =
            SqlLoader.load("sql/mart/select-channel-lens-cost.sql");
    private static final String SELECT_AD_SPEND_SQL =
            SqlLoader.load("sql/mart/select-ad-spend.sql");
    private static final String UPSERT_AD_SPEND_SQL =
            SqlLoader.load("sql/mart/upsert-ad-spend.sql");
    private static final String SELECT_LENS_PRICE_SQL =
            SqlLoader.load("sql/mart/select-lens-price.sql");
    private static final String UPDATE_LENS_PRICE_SQL =
            SqlLoader.load("sql/mart/update-lens-price.sql");

    private final @Qualifier("martJdbcTemplate") NamedParameterJdbcTemplate jdbc;

    /** 채널별 렌즈 원가 (조회 기간의 실제 수술명 기준, 안 단위). */
    public List<ChannelLensCostItem> findChannelLensCost(String from, String to) {
        return jdbc.query(
                SELECT_CHANNEL_LENS_COST_SQL,
                new MapSqlParameterSource().addValue("from", from).addValue("to", to),
                (rs, i) -> ChannelLensCostItem.builder()
                        .channel(rs.getString("channel"))
                        .lensEyes(rs.getInt("lens_eyes"))
                        .lensEyesPriced(rs.getInt("lens_eyes_priced"))
                        .lensEyesUnpriced(rs.getInt("lens_eyes_unpriced"))
                        .lensCostManwon(rs.getLong("lens_cost_manwon"))
                        .build()
        );
    }

    /* ── 광고비 ── */

    public List<AdSpendItem> findAdSpend(String ym) {
        return jdbc.query(
                SELECT_AD_SPEND_SQL,
                new MapSqlParameterSource().addValue("ym", ym),
                (rs, i) -> AdSpendItem.builder()
                        .ym(rs.getString("ym"))
                        .media(rs.getString("media"))
                        .amountManwon(rs.getInt("amount_manwon"))
                        .build()
        );
    }

    public int saveAdSpend(List<AdSpendItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(it -> (SqlParameterSource) new MapSqlParameterSource()
                        .addValue("ym", it.getYm())
                        .addValue("media", it.getMedia())
                        .addValue("amount", it.getAmountManwon()))
                .toArray(SqlParameterSource[]::new);
        return sum(jdbc.batchUpdate(UPSERT_AD_SPEND_SQL, batch));
    }

    /* ── 렌즈 단가 ── */

    public List<LensCostItem> findLensCosts() {
        return jdbc.query(
                SELECT_LENS_PRICE_SQL,
                new MapSqlParameterSource(),
                (rs, i) -> LensCostItem.builder()
                        .opType(rs.getString("op_type"))
                        .unitCostManwon(rs.getInt("unit_cost_manwon"))
                        .build()
        );
    }

    public int saveLensCosts(List<LensCostItem> items) {
        if (items.isEmpty()) return 0;
        SqlParameterSource[] batch = items.stream()
                .map(it -> (SqlParameterSource) new MapSqlParameterSource()
                        .addValue("opType", it.getOpType())
                        .addValue("cost", it.getUnitCostManwon()))
                .toArray(SqlParameterSource[]::new);
        return sum(jdbc.batchUpdate(UPDATE_LENS_PRICE_SQL, batch));
    }

    private static int sum(int[] counts) {
        int s = 0;
        for (int c : counts) s += Math.max(c, 0);
        return s;
    }
}
