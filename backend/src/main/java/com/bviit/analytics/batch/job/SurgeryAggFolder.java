package com.bviit.analytics.batch.job;

import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * select-surgery-daily-agg.sql 결과를 DTO 로 옮기고 월로 접는 순수 함수 모음.
 *
 * 배치(SurgeryMartJob)와 판정 저장 직후 갱신(SurgeryAggRefresher)이 **같은 코드**를 쓰게
 * 하려고 분리했다. 두 곳이 각자 접으면 판정을 고쳤을 때만 값이 미묘하게 달라질 수 있다.
 */
final class SurgeryAggFolder {

    private SurgeryAggFolder() {
    }

    /** select-surgery-daily-agg.sql 한 행 → DTO. 키는 SQL 의 AS 별칭과 1:1 (SurgeryDailyAggMappingTest 가 잠근다). */
    static SurgeryDailyItem toDailyItem(Map<String, Object> r) {
        return SurgeryDailyItem.builder()
                .date(String.valueOf(r.get("dt")))
                .lasek(num(r, "lasek")).lasik(num(r, "lasik"))
                .smile(num(r, "smile")).smilePro(num(r, "smile_pro"))
                .presbyond(num(r, "presbyond"))
                .icl(num(r, "icl")).tIcl(num(r, "t_icl"))
                .kpl(num(r, "kpl")).tKpl(num(r, "t_kpl")).viva(num(r, "viva"))
                .piolPatients(num(r, "piol_patients"))
                .catMulti(num(r, "cat_multi")).catMono(num(r, "cat_mono")).catEdof(num(r, "cat_edof"))
                .xtra(num(r, "xtra")).waveVision(num(r, "wave_vision"))
                .monoVision(num(r, "mono_vision")).contra(num(r, "contra")).personal(num(r, "personal"))
                .lasekEx(num(r, "lasek_ex")).lasekRed(num(r, "lasek_red"))
                .reoperation(num(r, "reoperation"))
                .reopLaser(num(r, "reop_laser")).reopLens(num(r, "reop_lens"))
                .visionPatients(num(r, "vision_patients"))
                .cataractPatients(num(r, "cataract_patients"))
                .total(num(r, "total"))
                .build();
    }

    private static int num(Map<String, Object> r, String key) {
        Object v = r.get(key);
        return v instanceof Number n ? n.intValue() : 0;
    }

    /**
     * 일별을 월로 접는다.
     *
     * ⚠️ 환자 단위 지표(시력교정·유형별·부가시술)는 일별 DISTINCT 를 **더하는** 방식이라,
     *    같은 사람이 한 달에 다른 날 두 번 수술하면 2 로 센다.
     *    2026-01~08 실측으로 그런 케이스가 0 건임을 확인하고 채택했다(검사 쪽도 같은 구조).
     *    백내장·재수술은 원래 눈/건 단위라 이 문제가 없다.
     *
     * ⚠️ 월 전체 일별을 넘겨야 한다. 일부 날짜만 주면 그 달 합계가 그만큼 줄어든다.
     */
    static List<SurgeryMonthlyItem> aggregateByMonth(List<SurgeryDailyItem> daily) {
        Map<YearMonth, int[]> byMonth = new LinkedHashMap<>();
        for (SurgeryDailyItem d : daily) {
            YearMonth ym = YearMonth.from(LocalDate.parse(d.getDate()));
            // 27 = 아래 누적 순서의 항목 수(lasek..total). 인덱스와 builder 순서를 반드시 같이 고칠 것.
            int[] a = byMonth.computeIfAbsent(ym, k -> new int[27]);
            int i = 0;
            a[i++] += d.getLasek();      a[i++] += d.getLasik();
            a[i++] += d.getSmile();      a[i++] += d.getSmilePro();
            a[i++] += d.getPresbyond();
            a[i++] += d.getIcl();        a[i++] += d.getTIcl();
            a[i++] += d.getKpl();        a[i++] += d.getTKpl();       a[i++] += d.getViva();
            a[i++] += d.getPiolPatients();
            a[i++] += d.getCatMulti();   a[i++] += d.getCatMono();    a[i++] += d.getCatEdof();
            a[i++] += d.getXtra();       a[i++] += d.getWaveVision();
            a[i++] += d.getMonoVision(); a[i++] += d.getContra();     a[i++] += d.getPersonal();
            a[i++] += d.getLasekEx();    a[i++] += d.getLasekRed();
            a[i++] += d.getReoperation();
            a[i++] += d.getReopLaser();  a[i++] += d.getReopLens();
            a[i++] += d.getVisionPatients();
            a[i++] += d.getCataractPatients();
            a[i] += d.getTotal();
        }
        return byMonth.entrySet().stream().map(e -> {
            int[] a = e.getValue();
            return SurgeryMonthlyItem.builder()
                    .year(e.getKey().getYear()).month(e.getKey().getMonthValue())
                    .lasek(a[0]).lasik(a[1]).smile(a[2]).smilePro(a[3]).presbyond(a[4])
                    .icl(a[5]).tIcl(a[6]).kpl(a[7]).tKpl(a[8]).viva(a[9])
                    .piolPatients(a[10])
                    .catMulti(a[11]).catMono(a[12]).catEdof(a[13])
                    .xtra(a[14]).waveVision(a[15]).monoVision(a[16]).contra(a[17]).personal(a[18])
                    .lasekEx(a[19]).lasekRed(a[20])
                    .reoperation(a[21]).reopLaser(a[22]).reopLens(a[23])
                    .visionPatients(a[24]).cataractPatients(a[25]).total(a[26])
                    .build();
        }).toList();
    }
}
