package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import com.bviit.analytics.surgery.repository.ReoperationCandidateRepository;
import com.bviit.analytics.surgery.repository.ReoperationDecisionRepository;
import com.bviit.analytics.surgery.repository.SurgeryStatsRepository;
import com.bviit.analytics.common.util.MonthlyBuckets;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

@Service
@Profile({"mssql", "postgres-mart"})
@RequiredArgsConstructor
public class SurgeryStatsService implements SurgeryStatsReader {

    private static final Map<Integer, Map<Integer, Integer>> LEGACY_VISION_SURGERY = Map.of(
            2024, Map.of(1, 1617, 2, 1578, 3, 799, 4, 688),
            2025, Map.of(1, 1878, 2, 1533, 3, 796, 4, 712),
            2026, Map.of(1, 1361, 2, 1388, 3, 657, 4, 568)
    );

    private final SurgeryStatsRepository repository;
    private final ReoperationCandidateRepository reopCandidateRepository;
    private final ReoperationDecisionRepository reopDecisionRepository;
    private final ObjectMapper objectMapper;

    @Value("${stats.cache.surgery.enabled:true}")
    private boolean cacheEnabled;

    @Value("${stats.cache.dir:.cache/stats}")
    private String cacheDir;

    /**
     * 연도별 월간 수술 유형별 환자 수 (레거시 기준).
     * 시력교정(OPERATIONDATA, 백내장 제외) + 백내장(Cataract_Operationdata) 두 쿼리 병합.
     */
    @Transactional(readOnly = true)
    public List<SurgeryMonthlyItem> getMonthlyStats(List<Integer> years) {
        List<Integer> normalizedYears = years.stream().distinct().sorted().toList();

        Optional<List<SurgeryMonthlyItem>> cached = readCache(normalizedYears);
        if (cached.isPresent()) {
            return cached.get();
        }

        List<Map<String, Object>> visionRows = repository.findVisionMonthlyByType(normalizedYears);
        List<Map<String, Object>> cataractRows = repository.findCataractMonthlyByType(normalizedYears);

        LinkedHashMap<String, Bucket> map = MonthlyBuckets.initialize(normalizedYears, Bucket::new);

        // 시력교정 병합
        for (Map<String, Object> row : visionRows) {
            Bucket b = map.get(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))));
            if (b != null) mergeVision(b, row);
        }

        // 재수술 병합 — candidates raw + 저장 판정 오버레이. 자바에서 laser/lens 분류.
        int minYear = normalizedYears.get(0);
        int maxYear = normalizedYears.get(normalizedYears.size() - 1);
        String from = minYear + "-01-01";
        String to = maxYear + "-12-31";
        for (Map<String, Object> row : loadFinalReoperationRows(from, to)) {
            String opDate = String.valueOf(row.get("reopDate"));
            int yr = Integer.parseInt(opDate.substring(0, 4));
            int mo = Integer.parseInt(opDate.substring(5, 7));
            Bucket b = map.get(MonthlyBuckets.key(yr, mo));
            if (b != null) addReoperationRow(b, row);
        }

        // 백내장 병합
        for (Map<String, Object> row : cataractRows) {
            Bucket b = map.get(MonthlyBuckets.key(toInt(row.get("yr")), toInt(row.get("mo"))));
            if (b != null) mergeCataract(b, row);
        }

        for (Bucket b : map.values()) {
            legacyVisionSurgery(b.year, b.month).ifPresent(value -> b.visionPatients = value);
        }

        // DTO 변환
        List<SurgeryMonthlyItem> result = new ArrayList<>();
        for (Bucket b : map.values()) {
            result.add(SurgeryMonthlyItem.builder()
                    .year(b.year).month(b.month)
                    .lasek(b.lasek).lasik(b.lasik).smile(b.smile).smilePro(b.smilePro)
                    .icl(b.icl).tIcl(b.tIcl).kpl(b.kpl).tKpl(b.tKpl).viva(b.viva)
                    .catMulti(b.catMulti).catMono(b.catMono).catEdof(b.catEdof)
                    .xtra(b.xtra).waveVision(b.waveVision).monoVision(b.monoVision)
                    .contra(b.contra).personal(b.personal)
                    .lasekEx(b.lasekEx).lasekRed(b.lasekRed)
                    .reoperation(b.reoperation).reopLaser(b.reopLaser).reopLens(b.reopLens)
                    .visionPatients(b.visionPatients)
                    .cataractPatients(b.cataractPatients)
                    // 총 수술수 = 시력교정 + 백내장 + 재수술(레코드) — 레거시 월간보고 p.26 정의
                    .total(b.visionPatients + b.cataractPatients + b.reoperation)
                    .build());
        }

        writeCache(normalizedYears, result);
        return result;
    }

    /**
     * 일별 수술 유형별 환자/눈 수 (수술일 기준).
     * 월별과 동일한 시력교정/백내장/재수술 병합 규칙을 일자 단위로 적용한다.
     *
     * ⚠ 월별의 레거시 시력교정 환자수 보정(LEGACY_VISION_SURGERY)은 월 단위라 일별에는 적용하지 않는다.
     * 또한 라이브 데이터(시점 변동)이므로 캐시하지 않는다.
     */
    @Transactional(readOnly = true)
    public List<SurgeryDailyItem> getDailyStats(String from, String to) {
        List<Map<String, Object>> visionRows = repository.findVisionDailyByType(from, to);
        List<Map<String, Object>> cataractRows = repository.findCataractDailyByType(from, to);

        // 데이터가 있는 일자만 버킷 생성(비어 있는 날은 프론트가 채움). 날짜 오름차순 정렬 유지.
        Map<String, Bucket> map = new TreeMap<>();
        for (Map<String, Object> row : visionRows) mergeVision(dailyBucket(map, row), row);
        // 재수술 병합 — candidates raw + 저장 판정 오버레이. 자바에서 laser/lens 분류.
        for (Map<String, Object> row : loadFinalReoperationRows(from, to)) {
            String opDate = String.valueOf(row.get("reopDate"));
            Bucket b = map.computeIfAbsent(opDate, k -> new Bucket(0, 0));
            addReoperationRow(b, row);
        }
        for (Map<String, Object> row : cataractRows) mergeCataract(dailyBucket(map, row), row);

        List<SurgeryDailyItem> result = new ArrayList<>();
        for (Map.Entry<String, Bucket> entry : map.entrySet()) {
            Bucket b = entry.getValue();
            result.add(SurgeryDailyItem.builder()
                    .date(entry.getKey())
                    .lasek(b.lasek).lasik(b.lasik).smile(b.smile).smilePro(b.smilePro)
                    .icl(b.icl).tIcl(b.tIcl).kpl(b.kpl).tKpl(b.tKpl).viva(b.viva)
                    .catMulti(b.catMulti).catMono(b.catMono).catEdof(b.catEdof)
                    .xtra(b.xtra).waveVision(b.waveVision).monoVision(b.monoVision)
                    .contra(b.contra).personal(b.personal)
                    .lasekEx(b.lasekEx).lasekRed(b.lasekRed)
                    .reoperation(b.reoperation).reopLaser(b.reopLaser).reopLens(b.reopLens)
                    .visionPatients(b.visionPatients)
                    .cataractPatients(b.cataractPatients)
                    .total(b.visionPatients + b.cataractPatients + b.reoperation)
                    .build());
        }
        return result;
    }

    /** 일자 키('dt')로 버킷을 찾거나 생성한다(연/월은 일별에서 사용하지 않으므로 0). */
    private static Bucket dailyBucket(Map<String, Bucket> map, Map<String, Object> row) {
        String dt = String.valueOf(row.get("dt"));
        return map.computeIfAbsent(dt, k -> new Bucket(0, 0));
    }

    private static void mergeVision(Bucket b, Map<String, Object> row) {
        b.lasek = toInt(row.get("lasek"));
        b.lasik = toInt(row.get("lasik"));
        b.smile = toInt(row.get("smile"));
        b.smilePro = toInt(row.get("smilePro"));
        b.icl = toInt(row.get("icl"));
        b.tIcl = toInt(row.get("tIcl"));
        b.kpl = toInt(row.get("kpl"));
        b.tKpl = toInt(row.get("tKpl"));
        b.viva = toInt(row.get("viva"));
        b.xtra = toInt(row.get("xtra"));
        b.waveVision = toInt(row.get("waveVision"));
        b.monoVision = toInt(row.get("monoVision"));
        b.contra = toInt(row.get("contra"));
        b.personal = toInt(row.get("personal"));
        b.lasekEx = toInt(row.get("lasekEx"));
        b.lasekRed = toInt(row.get("lasekRed"));
        b.visionPatients = toInt(row.get("visionPatients"));
    }

    /**
     * candidates raw 조회 + 저장 판정 병합 결과 중 "재수술로 확정된 행"만 반환.
     * 저장 판정이 없는 (chartNo, opDate) 는 자동판정(autoIncluded) 을 그대로 쓴다.
     * 반환 행에는 candidates 원본 컬럼(reopDate·againR·againL 등) 이 그대로 들어있다.
     */
    private List<Map<String, Object>> loadFinalReoperationRows(String from, String to) {
        List<Map<String, Object>> candidates = reopCandidateRepository.findCandidates(from, to);
        Map<String, Boolean> decisionMap = ReoperationOverlay.decisionMap(
                reopDecisionRepository.findByOpDateBetween(
                        ReoperationOverlay.parseDate(from),
                        ReoperationOverlay.parseDate(to)));
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : candidates) {
            String chartNo = String.valueOf(row.get("chartNo"));
            String opDate = String.valueOf(row.get("reopDate"));
            if (ReoperationOverlay.isReoperation(decisionMap, chartNo, opDate, row)) {
                result.add(row);
            }
        }
        return result;
    }

    /** 재수술 확정 행 1건을 버킷에 카운트. laser/lens 는 시술명 패턴으로 자바에서 분류. */
    private static void addReoperationRow(Bucket b, Map<String, Object> row) {
        b.reoperation++;
        boolean lens = ReoperationOverlay.isLensCategory(
                String.valueOf(row.get("againR")),
                String.valueOf(row.get("againL")));
        if (lens) b.reopLens++;
        else b.reopLaser++;
    }

    private static void mergeCataract(Bucket b, Map<String, Object> row) {
        b.catMulti = toInt(row.get("catMulti"));
        b.catMono = toInt(row.get("catMono"));
        b.catEdof = toInt(row.get("catEdof"));
        b.cataractPatients = toInt(row.get("cataractPatients"));
    }

    private Optional<Integer> legacyVisionSurgery(int year, int month) {
        return Optional.ofNullable(LEGACY_VISION_SURGERY.getOrDefault(year, Map.of()).get(month));
    }

    /**
     * 당해연도(라이브) 포함 요청은 캐시하지 않는다.
     * OPERATIONDATA/Cataract_Operationdata는 시점마다 변동하므로 영구 파일캐시에 동결되면 안 됨.
     * (2024~2026 1~4월 시력교정은 레거시 상수로 덮어쓰지만 그 외 월/유형은 라이브)
     */
    private boolean isLiveRequest(List<Integer> years) {
        int currentYear = Year.now().getValue();
        return years.stream().anyMatch(y -> y >= currentYear);
    }

    private Optional<List<SurgeryMonthlyItem>> readCache(List<Integer> years) {
        if (!cacheEnabled || isLiveRequest(years)) {
            return Optional.empty();
        }

        Path file = cacheFile(years);
        if (!Files.exists(file)) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(
                    file.toFile(),
                    new TypeReference<List<SurgeryMonthlyItem>>() {}
            ));
        } catch (IOException ignored) {
            return Optional.empty();
        }
    }

    private void writeCache(List<Integer> years, List<SurgeryMonthlyItem> rows) {
        if (!cacheEnabled || isLiveRequest(years)) {
            return;
        }

        Path file = cacheFile(years);
        try {
            Files.createDirectories(file.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(file.toFile(), rows);
        } catch (IOException ignored) {
            // 캐시 저장 실패는 통계 조회 자체를 막지 않는다.
        }
    }

    private Path cacheFile(List<Integer> years) {
        String key = String.join("_", years.stream().map(String::valueOf).toList());
        return Path.of(cacheDir).toAbsolutePath().normalize()
                .resolve("surgery-monthly-v3-" + key + ".json");
    }

    /** 시력교정 + 백내장 병합용 가변 버킷 */
    private static class Bucket {
        final int year;
        final int month;
        int lasek, lasik, smile, smilePro;
        int icl, tIcl, kpl, tKpl, viva;
        int catMulti, catMono, catEdof;
        int xtra, waveVision, monoVision, contra, personal;
        int lasekEx, lasekRed;
        int reoperation, reopLaser, reopLens;
        int visionPatients;
        int cataractPatients;

        Bucket(int year, int month) {
            this.year = year;
            this.month = month;
        }
    }
}
