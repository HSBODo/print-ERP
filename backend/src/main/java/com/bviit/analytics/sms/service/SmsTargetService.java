package com.bviit.analytics.sms.service;

import com.bviit.analytics.common.exception.DataSourceUnavailableException;
import com.bviit.analytics.sms.dto.SmsImportResult;
import com.bviit.analytics.sms.dto.SmsLookupRow;
import com.bviit.analytics.sms.dto.SmsSendLogRow;
import com.bviit.analytics.sms.dto.SmsTargetRequest;
import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.dto.SmsTargetRow;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.bviit.analytics.sms.entity.SmsOptOut;
import com.bviit.analytics.sms.entity.SmsSendLog;
import com.bviit.analytics.sms.entity.SmsTarget;
import com.bviit.analytics.sms.repository.SmsOptOutRepository;
import com.bviit.analytics.sms.repository.SmsCrmContactRepository;
import com.bviit.analytics.sms.repository.SmsSendLogRepository;
import com.bviit.analytics.sms.repository.SmsSurgeryImportRepository;
import com.bviit.analytics.sms.repository.SmsTargetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashSet;
import java.util.IntSummaryStatistics;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/** 발송 대상 CRUD + 상태 토글 + 마트 수술자 자동 등록. */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsTargetService {

    private final SmsTargetRepository targetRepository;
    private final SmsSendLogRepository logRepository;
    /** 수신거부 목록 — 적재 때 새 행을 처음부터 홀딩으로 만들고, 화면 표시에도 쓴다. */
    private final SmsOptOutRepository optOutRepository;
    /** postgres-mart 프로파일에서만 존재 — 없으면 자동 등록이 503 으로 응답한다. */
    private final ObjectProvider<SmsSurgeryImportRepository> importRepositoryProvider;
    /** mssql 프로파일에서만 존재. 마트에 번호가 없을 때만 쓰는 보조 조회(없으면 그냥 건너뛴다). */
    private final ObjectProvider<SmsCrmContactRepository> crmContactRepositoryProvider;
    private final SolapiProperties solapiProperties;

    /**
     * 조회 기준 — 같은 기간이라도 무엇을 묻는지가 다르다.
     *   SURGERY   그 기간에 수술한 사람 (기본)
     *   SCHEDULED 그 기간에 **보낼 예정**인 사람 = 수술일 + 차수 오프셋. "오늘 나갈 사람" 점검용.
     *   SENT      그 기간에 **실제로 보낸** 사람. "어제 잘 나갔나" 점검용.
     * 예정일은 수술일에서 계산되는 값이라 별도 컬럼 없이 날짜를 밀어 조회하면 된다.
     */
    /**
     * 조회 — 수술일 기준이면 **마트에서 먼저 채운 뒤** 돌려준다.
     *
     * 왜 조회가 적재를 겸하나 — 사람이 [수술자 불러오기]를 눌러야만 목록이 생기면
     * 누르는 걸 잊은 기간은 통째로 비어 보이고, 그게 "그 기간엔 수술이 없었다"와
     * 구분되지 않는다. 조회 = 그 기간의 수술자를 본다는 뜻이어야 한다.
     *
     * 적재는 멱등이다(chart_no + surgery_date UNIQUE). 여러 번 눌러도 늘지 않고,
     * AUTO 행만 CRM 최신값으로 갱신되며 홀딩·MANUAL 은 건드리지 않는다.
     *
     * SCHEDULED·SENT 기준에는 적재하지 않는다 — 그 날짜는 수술일이 아니라
     * 예정일·발송일이라 같은 구간을 수술일로 읽으면 엉뚱한 사람을 담는다.
     *
     * 마트가 없는 프로파일(mssql 단독 등)에서는 조용히 건너뛰고 이미 있는 행만 보여준다 —
     * 조회가 통째로 503 이 되면 홀딩 관리조차 못 한다.
     *
     * ⚠️ 나중에 자동화(큐)가 적재를 맡으면 이 호출은 빼도 된다. 그때까지의 임시 경로다.
     */
    @Transactional
    public List<SmsTargetRow> findRowsAutoImport(LocalDate from, LocalDate to, String basis, String templateCode) {
        if (basis == null || basis.isBlank() || "SURGERY".equalsIgnoreCase(basis)) {
            try {
                importFromSurgeryList(from, to);
            } catch (DataSourceUnavailableException e) {
                log.debug("마트 미연결 — 자동 적재를 건너뛴다: {}", e.getMessage());
            }
        }
        return findRows(from, to, basis, templateCode);
    }

    @Transactional(readOnly = true)
    public List<SmsTargetRow> findRows(LocalDate from, LocalDate to, String basis, String templateCode) {
        List<SmsTarget> targets = switch (basis == null ? "SURGERY" : basis.toUpperCase()) {
            case "SCHEDULED" -> findByScheduled(from, to, templateCode);
            case "SENT" -> findBySent(from, to, templateCode);
            default -> targetRepository.findBySurgeryDateBetweenOrderBySurgeryDateAscIdAsc(from, to);
        };
        return toRows(targets);
    }

    /**
     * 예정일 기준 = 기준일을 오프셋만큼 앞으로 민 구간. 차수 미지정이면 세 차수의 합집합.
     *
     * ⚠️ 오프셋이 대상마다 다르다 — 같은 1차라도 스마일 D+1, 렌즈삽입 D+3, 라섹 D+5 다.
     *    그래서 후보를 넉넉히 읽은 뒤(전 그룹 오프셋의 최소~최대) 각 행의 수술 종류로
     *    실제 예정일을 다시 계산해 걸러낸다. 한 번에 좁히려면 그룹별로 쿼리를
     *    쪼개야 하는데, 그룹이 5개뿐이고 후보 폭도 며칠 수준이라 이쪽이 단순하다.
     */
    private List<SmsTarget> findByScheduled(LocalDate from, LocalDate to, String templateCode) {
        List<SmsTemplateInfo> tiers = templateCode == null || templateCode.isBlank()
                ? solapiProperties.templates()
                : solapiProperties.findTemplate(templateCode).map(List::of).orElseGet(List::of);
        if (tiers.isEmpty()) return List.of();

        IntSummaryStatistics stats = tiers.stream()
                .flatMap(t -> t.groups().stream())
                .mapToInt(SmsTemplateGroupInfo::offsetDays)
                .summaryStatistics();
        if (stats.getCount() == 0) return List.of();

        List<SmsTarget> candidates = targetRepository.findByScheduleBaseBetweenOrderBySurgeryDateAscIdAsc(
                from.minusDays(stats.getMax()), to.minusDays(stats.getMin()));
        return candidates.stream()
                .filter(t -> tiers.stream().anyMatch(tier -> {
                    LocalDate scheduled = t.scheduleBase()
                            .plusDays(solapiProperties.offsetDays(tier.code(), t.getOpType()));
                    return !scheduled.isBefore(from) && !scheduled.isAfter(to);
                }))
                .toList();
    }

    private List<SmsTarget> findBySent(LocalDate from, LocalDate to, String templateCode) {
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<SmsSendLog> logs = templateCode == null || templateCode.isBlank()
                ? logRepository.findBySentAtGreaterThanEqualAndSentAtLessThan(start, end)
                : logRepository.findByTemplateCodeAndSentAtGreaterThanEqualAndSentAtLessThan(templateCode, start, end);
        List<Long> ids = logs.stream().map(SmsSendLog::getTargetId).distinct().toList();
        if (ids.isEmpty()) return List.of();
        return targetRepository.findAllById(ids).stream()
                .sorted(Comparator.comparing(SmsTarget::getSurgeryDate).thenComparing(SmsTarget::getId))
                .toList();
    }

    private List<SmsTargetRow> toRows(List<SmsTarget> targets) {
        List<Long> ids = targets.stream().map(SmsTarget::getId).toList();
        Map<Long, List<SmsSendLogRow>> logsByTarget = ids.isEmpty()
                ? Map.of()
                : logRepository.findByTargetIdInOrderBySentAtDesc(ids).stream()
                        .map(SmsSendLogRow::from)
                        .collect(Collectors.groupingBy(SmsSendLogRow::getTargetId));
        // 수신거부는 번호 단위라 행마다 묻지 않고 한 번에 확인한다.
        Set<String> optedOut = optedOutPhones(targets);
        return targets.stream()
                .map(t -> SmsTargetRow.from(t, logsByTarget.getOrDefault(t.getId(), List.of()),
                        optedOut.contains(SmsTarget.normalizePhone(t.getPhone()))))
                .toList();
    }

    private Set<String> optedOutPhones(List<SmsTarget> targets) {
        Set<String> phones = targets.stream()
                .map(t -> SmsTarget.normalizePhone(t.getPhone()))
                .filter(p -> !p.isBlank())
                .collect(Collectors.toSet());
        if (phones.isEmpty()) return Set.of();
        return optOutRepository.findByPhoneIn(phones).stream()
                .map(SmsOptOut::getPhone)
                .collect(Collectors.toSet());
    }

    /**
     * 차트번호로 수술 환자 정보를 찾아 온다 — 대상 추가 팝업이 이름·수술일·연락처를 채우는 데 쓴다.
     * 마트에 없어도 예외로 막지 않는다(직접 입력으로 계속 진행 가능) — found=false 로 알린다.
     */
    @Transactional(readOnly = true)
    public SmsLookupRow lookup(String rawChartNo) {
        String chartNo = rawChartNo == null ? "" : rawChartNo.replace("-", "").trim();
        if (chartNo.isBlank()) {
            throw new IllegalArgumentException("차트번호를 입력하세요.");
        }
        SmsSurgeryImportRepository importRepository = importRepositoryProvider.getIfAvailable();
        if (importRepository == null) {
            throw new DataSourceUnavailableException("마트 미연결 환경에서는 차트번호 조회를 사용할 수 없습니다.");
        }
        return importRepository.findLatestByChartNo(chartNo)
                .map(row -> {
                    String surgeryDate = str(row.get("surgeryDate"));
                    boolean registered = !surgeryDate.isBlank()
                            && targetRepository.existsByChartNoAndSurgeryDate(chartNo, LocalDate.parse(surgeryDate));
                    String phone = SmsTarget.normalizePhone(str(row.get("phone")));
                    // 비었을 때뿐 아니라 **무효한 번호(더미 01000000000 등)** 도 CRM 에서 다시 찾는다.
                    // 비었을 때만 보면, CRM 에서 번호를 고쳐도 화면의 더미 값이 그대로 남는다.
                    if (!SmsTarget.isValidPhone(phone)) {
                        String fromCrm = SmsTarget.normalizePhone(findCrmPhone(chartNo));
                        if (SmsTarget.isValidPhone(fromCrm)) phone = fromCrm;
                    }
                    return new SmsLookupRow(true, registered, chartNo,
                            str(row.get("name")), phone,
                            surgeryDate, str(row.get("surgeryType")), str(row.get("opType")),
                            str(row.get("surgeryR")), str(row.get("surgeryL")));
                })
                .orElseGet(() -> SmsLookupRow.notFound(chartNo));
    }

    @Transactional
    public SmsTargetRow create(SmsTargetRequest request) {
        String chartNo = request.chartNo().replace("-", "").trim();
        LocalDate surgeryDate = request.surgeryDateOrToday();
        // 수술 분류가 없으면 ETC 로 떨어지고, ETC 문구가 비어 있어 **영영 발송되지 않는 행**이 된다.
        // 조용히 목록에만 쌓이느니 등록을 막고 분류를 고르게 한다.
        if (request.opType() == null || request.opType().isBlank()) {
            throw new IllegalArgumentException("수술 분류를 선택하세요. 분류가 없으면 보낼 문구가 정해지지 않습니다.");
        }
        if (targetRepository.existsByChartNoAndSurgeryDate(chartNo, surgeryDate)) {
            throw new IllegalArgumentException("이미 등록된 대상입니다(차트번호 " + chartNo + " · 수술일 " + surgeryDate + ").");
        }
        SmsTarget target = SmsTarget.builder()
                .chartNo(chartNo)
                .name(request.nameOrEmpty())
                .phone(request.phone())
                .surgeryDate(surgeryDate)
                .surgeryType(request.surgeryType())
                .opType(request.opType())
                .surgeryR(request.surgeryR())
                .surgeryL(request.surgeryL())
                .status(SmsTarget.STATUS_SENDABLE)
                .source(SmsTarget.SOURCE_MANUAL)
                .build();
        target.stampCreated(LocalDateTime.now());
        return SmsTargetRow.from(targetRepository.save(target), List.of());
    }

    @Transactional
    public SmsTargetRow update(Long id, SmsTargetRequest request) {
        LocalDateTime now = LocalDateTime.now();
        SmsTarget target = getTarget(id);
        // 연락처만 반영한다 — 나머지 필드는 CRM 이 정본이라 요청에 실려 와도 무시한다.
        target.changePhone(request.phone(), now);
        rebaseIfOverdue(target, now);   // 번호를 고쳐 보낼 수 있게 됐으면 지나간 차수를 되살린다
        return SmsTargetRow.from(target, List.of());
    }

    /**
     * 지나간 차수를 되살린다 — 안 보낸 차수 중 가장 이른 것이 **오늘**이 되도록 기준일을 다시 깐다.
     * (기준일 = 오늘 − 그 차수 오프셋 → 나머지 차수는 원래 간격을 그대로 유지)
     *
     * 부르는 곳은 둘: **연락처 수정**과 **홀딩 해제**. 둘 다 "이제 보낼 수 있게 된 시점"이라
     * 그때부터 다시 시작하는 게 맞다. 이미 보낸 차수는 건드리지 않는다(중복 발송 방지).
     * 보낼 수 없는 상태(홀딩·번호 무효)이거나 아직 예정일이 안 지났으면 아무것도 하지 않는다.
     */
    private void rebaseIfOverdue(SmsTarget target, LocalDateTime now) {
        if (!target.isSendable() || !target.hasValidPhone()) return;

        Set<String> sentCodes = logRepository.findByTargetIdInOrderBySentAtDesc(List.of(target.getId())).stream()
                .filter(log -> !SmsSendLog.STATUS_FAILED.equals(log.getStatus()))
                .map(SmsSendLog::getTemplateCode)
                .collect(Collectors.toSet());

        // 오프셋은 이 대상의 수술 종류로 정해진다 — 그룹마다 1차 시점이 다르다.
        Optional<SmsTemplateInfo> firstUnsent = solapiProperties.templates().stream()
                .filter(tier -> !sentCodes.contains(tier.code()))
                .min(Comparator.comparingInt(
                        tier -> solapiProperties.offsetDays(tier.code(), target.getOpType())));
        if (firstUnsent.isEmpty()) return;   // 세 차수 다 보냈으면 되살릴 게 없다

        LocalDate today = LocalDate.now();
        int offset = solapiProperties.offsetDays(firstUnsent.get().code(), target.getOpType());
        if (!target.scheduleBase().plusDays(offset).isBefore(today)) return;   // 아직 안 지났다

        target.rebaseSchedule(today.minusDays(offset), now);
    }

    /** 발송 홀딩 ↔ 발송 대기 토글의 실체 — status 는 SENDABLE/HOLD 만 허용. */
    @Transactional
    public SmsTargetRow changeStatus(Long id, String status) {
        LocalDateTime now = LocalDateTime.now();
        SmsTarget target = getTarget(id);
        target.changeStatus(status, now);
        rebaseIfOverdue(target, now);   // 홀딩을 푼 시점부터 다시 시작
        return SmsTargetRow.from(target, List.of());
    }

    /** 툴바 [발송중지]/[홀딩 해제] — 선택한 대상을 한 번에 바꾼다. 없는 id 는 조용히 건너뛴다. */
    @Transactional
    public int changeStatusBulk(List<Long> ids, String status) {
        LocalDateTime now = LocalDateTime.now();
        int changed = 0;
        for (Long id : ids) {
            SmsTarget target = targetRepository.findById(id).orElse(null);
            if (target == null) continue;
            target.changeStatus(status, now);
            rebaseIfOverdue(target, now);
            changed++;
        }
        return changed;
    }

    /**
     * 마트 수술자 리스트에서 기간 내 수술 완료자를 대상으로 올린다.
     *
     * 이미 있는 (차트번호, 수술일) 행은 지우지 않고 **CRM 최신값으로 갱신**한다 —
     * 연락처의 정답은 CRM 이므로, CRM 에서 번호를 고친 뒤 다시 불러오면 여기에 반영돼야 한다.
     * 다만 사람이 손댄 행(MANUAL)은 건드리지 않는다. 발송 취소 상태와 이력은 항상 보존한다.
     */
    @Transactional
    public SmsImportResult importFromSurgeryList(LocalDate from, LocalDate to) {
        SmsSurgeryImportRepository importRepository = importRepositoryProvider.getIfAvailable();
        if (importRepository == null) {
            throw new DataSourceUnavailableException("마트 미연결 환경에서는 수술자 자동 등록을 사용할 수 없습니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        Set<String> seen = new HashSet<>();
        int created = 0;
        int updated = 0;
        int skipped = 0;
        for (Map<String, Object> row : importRepository.findSurgeryRows(from, to)) {
            String chartNo = str(row.get("chartNo"));
            String surgeryDate = str(row.get("surgeryDate"));
            if (chartNo.isBlank() || surgeryDate.isBlank()) {
                skipped++;
                continue;
            }
            LocalDate date = LocalDate.parse(surgeryDate);
            // 같은 조회 안의 중복은 첫 행만 쓴다 — 양안 수술로 행이 갈린 경우, 그리고
            // 같은 날 일반 수술과 재수술이 함께 잡힌 경우(한 세션이 두 원천에 기록된 건).
            // 사람 기준으로 하루 한 번만 안내하면 되므로 뒤 행은 버린다.
            if (!seen.add(chartNo + "|" + surgeryDate)) {
                skipped++;
                continue;
            }
            String name = str(row.get("name"));
            // 마트에 번호가 없으면 CRM 에서 한 번 더 찾는다 — 재수술 환자는 원 수술이
            // 마트 적재 이전이라 마트 어디에도 안 잡히는 경우가 있다.
            String phone = SmsTarget.normalizePhone(str(row.get("phone")));
            if (!SmsTarget.isValidPhone(phone)) {
                String fromCrm = SmsTarget.normalizePhone(findCrmPhone(chartNo));
                if (SmsTarget.isValidPhone(fromCrm)) phone = fromCrm;
            }
            String surgeryType = str(row.get("surgeryType"));
            String opType = str(row.get("opType"));
            String surgeryR = str(row.get("surgeryR"));
            String surgeryL = str(row.get("surgeryL"));

            SmsTarget existing = targetRepository.findByChartNoAndSurgeryDate(chartNo, date).orElse(null);
            if (existing != null) {
                boolean same = name.equals(nz(existing.getName()))
                        && phone.equals(nz(existing.getPhone()))
                        && surgeryType.equals(nz(existing.getSurgeryType()))
                        && opType.equals(nz(existing.getOpType()))
                        && surgeryR.equals(nz(existing.getSurgeryR()))
                        && surgeryL.equals(nz(existing.getSurgeryL()));
                if (!existing.isAuto() || same) {
                    skipped++;
                } else {
                    existing.refreshFromCrm(name, phone, surgeryType, opType, surgeryR, surgeryL, now);
                    updated++;
                }
                continue;
            }
            // 수신거부한 사람이면 처음부터 홀딩으로 만든다 — 홀딩은 수술 건별이라
            // 그냥 두면 새 수술마다 되살아나 다시 발송 대상이 된다.
            boolean optedOut = !phone.isBlank() && optOutRepository.existsByPhone(phone);
            SmsTarget target = SmsTarget.builder()
                    .chartNo(chartNo)
                    .name(name)
                    .phone(phone)
                    .surgeryDate(date)
                    .surgeryType(surgeryType)
                    .opType(opType)
                    .surgeryR(surgeryR)
                    .surgeryL(surgeryL)
                    .status(optedOut ? SmsTarget.STATUS_HOLD : SmsTarget.STATUS_SENDABLE)
                    .source(SmsTarget.SOURCE_AUTO)
                    .build();
            target.stampCreated(now);
            targetRepository.save(target);
            created++;
        }
        log.info("SMS 대상 불러오기: range={}..{}, created={}, updated={}, skipped={}",
                from, to, created, updated, skipped);
        return new SmsImportResult(created, updated, skipped);
    }

    SmsTarget getTarget(Long id) {
        return targetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("발송 대상을 찾을 수 없습니다: " + id));
    }

    /** CRM(MSSQL) 미연결 프로파일에서는 빈 값 — 번호를 못 채울 뿐 불러오기는 계속된다. */
    private String findCrmPhone(String chartNo) {
        SmsCrmContactRepository repository = crmContactRepositoryProvider.getIfAvailable();
        return repository == null ? "" : repository.findPhone(chartNo);
    }

    private static String str(Object value) {
        return value == null ? "" : value.toString().trim();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
