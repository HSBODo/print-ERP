package com.bviit.analytics.sms.service;

import com.bviit.analytics.sms.config.SolapiProperties;
import com.bviit.analytics.sms.config.SurgeryGroup;
import com.bviit.analytics.sms.dto.SmsSendRequest;
import com.bviit.analytics.sms.dto.SmsSendResult;
import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.bviit.analytics.sms.entity.SmsTarget;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 발송 실행의 흐름만 맡는다 — DB 는 SmsSendExecutor 가, 실제 전송은 SolapiSendService 가 한다.
 *
 * ⚠️ 이 클래스에는 @Transactional 을 걸지 않는다. 전체를 한 트랜잭션으로 묶으면
 *    문자가 나간 뒤 DB 실패로 이력이 통째로 롤백되어 "보냈는데 기록 없음" 이 된다.
 *    대상마다 (의도 저장 → 발송 → 결과 기록) 을 독립 트랜잭션으로 처리한다.
 *
 * 한 건이 실패해도 나머지는 계속 간다(부분 성공 허용). 건너뛴 사유는 결과에 담아 돌려준다.
 */
@Service
@RequiredArgsConstructor
public class SmsSendService {

    private static final DateTimeFormatter KOREAN_DATE = DateTimeFormatter.ofPattern("yyyy년 M월 d일");

    private final SmsSendExecutor executor;
    private final SolapiSendService solapiSendService;
    private final SolapiProperties props;

    public SmsSendResult send(SmsSendRequest request, String sentBy) {
        SmsTemplateInfo template = props.findTemplate(request.templateCode())
                .orElseThrow(() -> new IllegalArgumentException("알 수 없는 템플릿입니다: " + request.templateCode()));

        List<SmsSendResult.Item> items = new ArrayList<>();
        int success = 0;
        int failed = 0;
        int skipped = 0;

        for (Long targetId : request.targetIds()) {
            SmsTarget target = executor.findTarget(targetId).orElse(null);
            if (target == null) {
                items.add(item(targetId, "", "SKIPPED", "대상이 존재하지 않습니다."));
                skipped++;
                continue;
            }
            if (!target.isSendable()) {
                items.add(item(targetId, target.getName(), "SKIPPED", "발송 홀딩 상태입니다."));
                skipped++;
                continue;
            }
            String to = SmsTarget.normalizePhone(target.getPhone());
            // 수신거부는 사람 단위라 홀딩과 따로 본다 — 적재 이후에 등록됐을 수 있어 여기서 마지막으로 막는다.
            if (executor.isOptedOut(to)) {
                items.add(item(targetId, target.getName(), "SKIPPED", "수신거부한 번호입니다."));
                skipped++;
                continue;
            }
            if (!SmsTarget.isValidPhone(to)) {
                items.add(item(targetId, target.getName(), "SKIPPED",
                        to.isBlank() ? "연락처가 없습니다." : "발송 불가 — 유효한 휴대폰 번호가 아닙니다."));
                skipped++;
                continue;
            }

            // 이미 나간 차수는 사이클이 바뀌어도 다시 보내지 않는다 — 멱등키만으로는 못 막는다.
            // (기준일이 다시 깔리면 cycle_base 가 달라져 DB 제약을 통과한다.)
            if (executor.alreadySent(targetId, template.code())) {
                items.add(item(targetId, target.getName(), "SKIPPED", "이미 발송된 차수입니다."));
                skipped++;
                continue;
            }
            // 예정일 전에는 보내지 않는다. 문구가 "수술 후 일주일이 지났습니다"라고 말하므로
            // 시점이 어긋나면 사실과 다른 안내가 된다.
            LocalDate scheduled = target.scheduleBase()
                    .plusDays(props.offsetDays(template.code(), target.getOpType()));
            if (scheduled.isAfter(LocalDate.now())) {
                items.add(item(targetId, target.getName(), "SKIPPED",
                        "아직 예정일 전입니다(" + scheduled + " 예정)."));
                skipped++;
                continue;
            }

            // 문구는 대상의 수술 종류가 정한다 — 같은 1차라도 라섹과 스마일의 안내가 다르다.
            // 분류되지 않는 수술은 ETC 로 떨어지고, ETC 문구를 안 채웠으면 여기서 걸러진다.
            SmsTemplateGroupInfo slot = props.findSlot(request.templateCode(), target.getOpType()).orElse(null);
            if (slot == null || !slot.sendable()) {
                items.add(item(targetId, target.getName(), "SKIPPED",
                        "이 수술 종류(" + SurgeryGroup.of(target.getOpType()).label() + ")의 "
                                + template.label() + " 문구가 설정되지 않았습니다."));
                skipped++;
                continue;
            }

            /*
             * 기준일이 밀린 대상(홀딩 해제·연락처 수정)은 2·3차만 **경과 문장을 뺀 문구를 문자로** 보낸다.
             *   왜 문구를 바꾸나 — "수술 후 일주일이 지났습니다"가 거짓이 된다(수술 25일 뒤에 2차가 나갈 수 있다).
             *   왜 문자인가   — 알림톡은 승인된 템플릿이 곧 본문이라, 변형 문구를 쓰려면 카카오 심사를 또 받아야 한다.
             * 1차는 경과 선언이 없어 기본 알림톡/문자를 그대로 써도 사실과 어긋나지 않는다.
             * 지연 본문이 없으면 보내지 않는다 — 조용히 기본 문구가 나가면 그게 바로 잘못된 안내다.
             */
            boolean delayed = target.isRebased();
            boolean delayedTextRequired = delayed && !"T1".equals(template.code());
            String channel = delayedTextRequired ? SolapiSendService.CHANNEL_SMS : request.channel();
            if (delayedTextRequired && !slot.delayedReady()) {
                items.add(item(targetId, target.getName(), "SKIPPED",
                        "예정일이 재조정된 대상인데 " + template.label() + " 지연 문구가 설정되지 않았습니다."));
                skipped++;
                continue;
            }

            // ① 발송 의도를 먼저 커밋한다. 멱등키 충돌이면 이미 보낸 건이라 넘어간다.
            Optional<Long> reserved = executor.reserve(target, template, channel, props.getFrom(), to, sentBy);
            if (reserved.isEmpty()) {
                items.add(item(targetId, target.getName(), "SKIPPED", "이미 발송된 차수입니다."));
                skipped++;
                continue;
            }

            // ② 실제 발송 — 트랜잭션 밖이라 DB 실패가 전송을 되돌리지 않는다.
            // ⚠️ 키는 카카오 승인 템플릿이 실제 사용하는 자리표시자와 일치해야 한다.
            //    현재 승인본은 전부 #{name} 을 쓰고 #{surgeryDate} 는 미사용이지만,
            //    향후 날짜 변수를 승인받을 때 키가 통일돼 있어야 안 깨진다(2026-08-31).
            Map<String, String> variables = Map.of(
                    "#{name}", target.getName(),
                    "#{surgeryDate}", KOREAN_DATE.format(target.getSurgeryDate())
            );
            SolapiSendService.SendOutcome outcome =
                    solapiSendService.send(to, slot, channel, variables, delayedTextRequired);

            // ③ 결과를 그 행에 기록한다.
            executor.complete(reserved.get(), outcome);

            if (outcome.isSuccess()) {
                items.add(item(targetId, target.getName(), "SUCCESS", "", outcome.isDryRun()));
                success++;
            } else {
                items.add(item(targetId, target.getName(), "FAILED", outcome.getFailReason(), false));
                failed++;
            }
        }

        return SmsSendResult.builder()
                .requested(request.targetIds().size())
                .success(success)
                .failed(failed)
                .skipped(skipped)
                .items(items)
                .build();
    }

    private static SmsSendResult.Item item(Long targetId, String name, String result, String detail) {
        return item(targetId, name, result, detail, false);
    }

    private static SmsSendResult.Item item(Long targetId, String name, String result, String detail, boolean dryRun) {
        return SmsSendResult.Item.builder()
                .targetId(targetId).name(name).result(result).detail(detail == null ? "" : detail).dryRun(dryRun)
                .build();
    }
}
