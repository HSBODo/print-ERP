package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.config.SurgeryGroup;
import com.bviit.analytics.sms.entity.SmsOffsetConfig;
import com.bviit.analytics.sms.repository.SmsOffsetConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 문자 발송 설정 (그룹×차수 오프셋 + 차수 발송 시각/메시지 종류) 조회·편집.
 *
 * <h3>왜 캐시가 있나</h3>
 * 오프셋·시각·종류는 예정일 계산·발송 판정의 단일 출처다. 4행짜리 룩업이지만 매 호출마다
 * DB 를 두드리면 조회 하나가 그림에 100 회 넘게 걸리기 쉽다. 그래서 {@link ConcurrentHashMap}
 * 에 캐시하고, 편집 시에만 {@code putAll} 로 통째 교체한다.
 *
 * <h3>편집 규칙</h3>
 * <ul>
 *   <li>편집 가능한 그룹은 SMILE·LASIK·LASEK·ICL 4종만. ETC 는 발송 대상 아님.</li>
 *   <li>각 오프셋은 0..30 정수. tier1 ≤ tier2 ≤ tier3 (라섹처럼 같아도 됨).</li>
 *   <li>PUT 은 전체 4행 + 시각 3개 + 종류 3개 원자적 갱신. 부분 갱신 미지원.</li>
 *   <li>시각·종류는 tier-level 이라 4행 모두 같은 값으로 심는다.</li>
 * </ul>
 *
 * <h3>메시지 종류별 시각 검증</h3>
 * <ul>
 *   <li>{@code NOTIFICATION} 알림톡 — 정보성. 시간 제한 없음 (0..23시 자유).</li>
 *   <li>{@code AD} 광고톡 — 광고성. 정보통신망법상 21~08 발송 금지 → hour 8..20 강제.</li>
 * </ul>
 *
 * <h3>fallback</h3>
 * DB 에 행이 없거나 그룹이 빠져 있으면 {@link SurgeryGroup#offsets()} 코드 상수(오프셋) /
 * DEFAULT_TIME(10:00) / DEFAULT_KIND(NOTIFICATION) 로 회귀한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsOffsetConfigService {

    /** 편집 가능한 그룹 화이트리스트. ETC 는 발송 대상이 아니라 제외. */
    public static final Set<String> EDITABLE_GROUPS = Set.of("SMILE", "LASIK", "LASEK", "ICL");

    private static final Set<String> VALID_KINDS = Set.of(
            SmsOffsetConfig.KIND_NOTIFICATION, SmsOffsetConfig.KIND_AD);

    private static final int MIN_OFFSET = 0;
    private static final int MAX_OFFSET = 30;
    /** 광고톡 발송 허용 시(hour) 범위 — 정보통신망법상 광고성 21~08 금지 대비. */
    private static final int AD_MIN_HOUR = 8;
    private static final int AD_MAX_HOUR = 20;
    /** 시각 미지정 시 fallback (오전 10시). DB 컬럼 DEFAULT 와 같은 값. */
    private static final LocalTime DEFAULT_TIME = LocalTime.of(10, 0);
    /** 종류 미지정 시 fallback — 알림톡(정보성). */
    private static final String DEFAULT_KIND = SmsOffsetConfig.KIND_NOTIFICATION;

    private final SmsOffsetConfigRepository repository;
    /**
     * Phase 2 — 오프셋 편집 후 미발송 큐(sms_dispatch_queue) 의 scheduled_at·kind 를
     * 새 값으로 되민다. ObjectProvider 로 감싸 순환 참조 회피 (SmsDispatchQueueService 가
     * 이 서비스의 offsetOf/timeOf/kindOf 를 부른다).
     */
    private final ObjectProvider<SmsDispatchQueueService> queueServiceProvider;

    /** groupCode → SmsOffsetConfig 캐시. 편집 시 refresh() 가 통째 교체한다. */
    private final ConcurrentMap<String, SmsOffsetConfig> cache = new ConcurrentHashMap<>();

    /** 부팅 후 첫 접근 시점에 로딩되도록 한다 — @PostConstruct 는 미연결 프로파일 부팅 실패 리스크. */
    private volatile boolean loaded = false;

    /**
     * 전 그룹 조회 (편집 대상 4그룹 순서로). 캐시 미로드 시 lazy 초기화.
     * ETC 는 반환하지 않는다 — 편집·화면 그리드 대상이 아니다.
     */
    @Transactional(readOnly = true)
    public Map<String, SmsOffsetConfig> getAll() {
        ensureLoaded();
        Map<String, SmsOffsetConfig> ordered = new LinkedHashMap<>();
        for (String code : EDITABLE_GROUPS) {
            SmsOffsetConfig cfg = cache.get(code);
            if (cfg != null) ordered.put(code, cfg);
        }
        return ordered;
    }

    /**
     * 특정 그룹의 차수 오프셋 조회. DB 에 없거나 로딩 실패 시 SurgeryGroup 기본값.
     * 발송·조회 산식의 단일 출처.
     */
    @Transactional(readOnly = true)
    public int offsetOf(String groupCode, int tier) {
        if (groupCode == null) return SurgeryGroup.ETC.offsetOf(tier);
        ensureLoaded();
        SmsOffsetConfig cfg = cache.get(groupCode.toUpperCase());
        if (cfg != null) return cfg.offsetOf(tier);
        return SurgeryGroup.byCode(groupCode).offsetOf(tier);
    }

    /** 차수별 발송 시각 조회. tier-level. DB 미로드 시 DEFAULT_TIME (10:00). */
    @Transactional(readOnly = true)
    public LocalTime timeOf(int tier) {
        ensureLoaded();
        for (SmsOffsetConfig cfg : cache.values()) {
            return cfg.timeOf(tier);
        }
        return DEFAULT_TIME;
    }

    /** 차수별 메시지 종류 조회. tier-level. DB 미로드 시 DEFAULT_KIND (알림톡). */
    @Transactional(readOnly = true)
    public String kindOf(int tier) {
        ensureLoaded();
        for (SmsOffsetConfig cfg : cache.values()) {
            return cfg.kindOf(tier);
        }
        return DEFAULT_KIND;
    }

    /**
     * 4그룹 오프셋 + 3차수 시각·종류 원자적 갱신. 유효성 위반 시 IllegalArgumentException.
     * 트랜잭션 커밋 후 캐시를 통째 리로드한다.
     */
    @Transactional
    public Map<String, SmsOffsetConfig> updateAll(List<OffsetUpdate> updates,
                                                   TierUpdate tiers,
                                                   String actor) {
        if (updates == null || updates.isEmpty()) {
            throw new IllegalArgumentException("업데이트할 오프셋이 비어 있습니다.");
        }
        validateTiers(tiers);
        Map<String, OffsetUpdate> byCode = new LinkedHashMap<>();
        for (OffsetUpdate u : updates) {
            validate(u);
            byCode.put(u.groupCode().toUpperCase(), u);
        }
        LocalDateTime now = LocalDateTime.now();
        String safeActor = (actor == null || actor.isBlank()) ? "unknown" : actor;

        for (Map.Entry<String, OffsetUpdate> e : byCode.entrySet()) {
            String code = e.getKey();
            OffsetUpdate u = e.getValue();
            SmsOffsetConfig existing = repository.findById(code).orElse(null);
            if (existing == null) {
                repository.save(SmsOffsetConfig.builder()
                        .groupCode(code)
                        .tier1Offset(u.tier1()).tier2Offset(u.tier2()).tier3Offset(u.tier3())
                        .tier1Time(tiers.tier1Time()).tier2Time(tiers.tier2Time()).tier3Time(tiers.tier3Time())
                        .tier1Kind(tiers.tier1Kind()).tier2Kind(tiers.tier2Kind()).tier3Kind(tiers.tier3Kind())
                        .updatedBy(safeActor).updatedAt(now).build());
            } else {
                existing.update(u.tier1(), u.tier2(), u.tier3(),
                        tiers.tier1Time(), tiers.tier2Time(), tiers.tier3Time(),
                        tiers.tier1Kind(), tiers.tier2Kind(), tiers.tier3Kind(),
                        safeActor, now);
                repository.save(existing);
            }
        }
        refresh();
        // Phase 2 — 미발송 큐를 새 오프셋·시각으로 재계산. 같은 트랜잭션이라
        // 편집 실패 시 큐 재계산도 롤백된다(원자적). 큐 서비스가 미주입(sms 미로딩)이면 조용히 skip.
        SmsDispatchQueueService queueService = queueServiceProvider.getIfAvailable();
        int rescheduled = queueService == null ? 0 : queueService.recalculateScheduledForPending();
        log.info("SMS 설정 갱신: actor={}, groups={}, times=({},{},{}), kinds=({},{},{}), queue_rescheduled={}",
                safeActor, byCode.keySet(),
                tiers.tier1Time(), tiers.tier2Time(), tiers.tier3Time(),
                tiers.tier1Kind(), tiers.tier2Kind(), tiers.tier3Kind(),
                rescheduled);
        return getAll();
    }

    /** DB 재조회로 캐시 통째 교체. 편집 후 · 부팅 후 lazy 로딩 · 관리자 트리거로 호출. */
    public synchronized void refresh() {
        Map<String, SmsOffsetConfig> fresh = new LinkedHashMap<>();
        for (SmsOffsetConfig cfg : repository.findAll()) {
            fresh.put(cfg.getGroupCode().toUpperCase(), cfg);
        }
        cache.clear();
        cache.putAll(fresh);
        loaded = true;
    }

    private void ensureLoaded() {
        if (!loaded) refresh();
    }

    private static void validate(OffsetUpdate u) {
        if (u == null || u.groupCode() == null || u.groupCode().isBlank()) {
            throw new IllegalArgumentException("group_code 가 비어 있습니다.");
        }
        String code = u.groupCode().toUpperCase();
        if (!EDITABLE_GROUPS.contains(code)) {
            throw new IllegalArgumentException(
                    "편집 대상이 아닌 그룹입니다: " + code + " (허용: " + EDITABLE_GROUPS + ")");
        }
        checkRange(code, "tier1", u.tier1());
        checkRange(code, "tier2", u.tier2());
        checkRange(code, "tier3", u.tier3());
        // 라섹처럼 tier1=5, tier2=7 이 자연스러워 같음도 허용. 대신 역전은 금지.
        if (u.tier1() > u.tier2() || u.tier2() > u.tier3()) {
            throw new IllegalArgumentException(
                    "차수 순서가 어긋납니다 (%s: %d, %d, %d)".formatted(
                            code, u.tier1(), u.tier2(), u.tier3()));
        }
    }

    private static void checkRange(String code, String field, int value) {
        if (value < MIN_OFFSET || value > MAX_OFFSET) {
            throw new IllegalArgumentException(
                    "%s.%s 오프셋 범위 초과: %d (허용: %d..%d)".formatted(
                            code, field, value, MIN_OFFSET, MAX_OFFSET));
        }
    }

    private static void validateTiers(TierUpdate t) {
        if (t == null) throw new IllegalArgumentException("발송 시각·종류가 비어 있습니다.");
        checkKindAndTime(1, t.tier1Kind(), t.tier1Time());
        checkKindAndTime(2, t.tier2Kind(), t.tier2Time());
        checkKindAndTime(3, t.tier3Kind(), t.tier3Time());
    }

    private static void checkKindAndTime(int tier, String kind, LocalTime time) {
        if (kind == null || !VALID_KINDS.contains(kind)) {
            throw new IllegalArgumentException(
                    "tier%d 메시지 종류가 잘못됐습니다: %s (허용: %s)".formatted(tier, kind, VALID_KINDS));
        }
        if (time == null) {
            throw new IllegalArgumentException("tier%d 발송 시각이 비어 있습니다.".formatted(tier));
        }
        // 알림톡은 시간 제한 없음(정보성). 광고톡만 08..20 강제(21시부터 광고 금지).
        if (SmsOffsetConfig.KIND_AD.equals(kind)) {
            int hour = time.getHour();
            if (hour < AD_MIN_HOUR || hour > AD_MAX_HOUR) {
                throw new IllegalArgumentException(
                        "tier%d 광고톡 발송 시각 범위 초과: %s (허용: %d..%d시, 21~08 금지)".formatted(
                                tier, time, AD_MIN_HOUR, AD_MAX_HOUR));
            }
        }
    }

    /** 편집 요청 하나(그룹별 오프셋). Controller DTO 와 서비스 계층의 계약. */
    public record OffsetUpdate(String groupCode, int tier1, int tier2, int tier3) {}

    /** tier-level 갱신 — 시각(HH:mm) + 종류(NOTIFICATION/AD) 3세트. */
    public record TierUpdate(
            LocalTime tier1Time, LocalTime tier2Time, LocalTime tier3Time,
            String tier1Kind, String tier2Kind, String tier3Kind) {}
}
