package com.bviit.analytics.sms.config;

import com.bviit.analytics.sms.dto.SmsTemplateGroupInfo;
import com.bviit.analytics.sms.dto.SmsTemplateInfo;
import com.bviit.analytics.sms.service.SmsOffsetConfigService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * 솔라피 연동 설정 — 값은 전부 env 로 주입한다(backend/.env). 시크릿 하드코딩 금지.
 *
 * <h3>슬롯 구조 — 차수 3 × 수술 그룹 5 = 15</h3>
 * 예전에는 차수 3슬롯뿐이었고 오프셋도 <code>interval-days × 차수</code> 하나로 계산했다.
 * 그런데 수술 후 고객케어 TF 확정안(v5)은 <b>수술마다 1차 시점이 다르고 문구도 다르다</b>:
 * <pre>
 *   스마일수술 D+1 · D+7 · D+14      라식     D+1 · D+7 · D+14
 *   렌즈삽입   D+3 · D+7 · D+14      라섹     D+5 · D+7 · D+14
 * </pre>
 * 그래서 슬롯을 (그룹, 차수)로 쪼갰다. 오프셋은 {@link SurgeryGroup} 이 갖고,
 * 문구·템플릿 ID 는 env 에서 그룹별로 읽는다.
 *
 * <h3>env 키</h3>
 * <pre>
 *   SOLAPI_TPL_SMILE_1_ID    알림톡 템플릿 ID
 *   SOLAPI_TPL_SMILE_1_SMS   문자 본문 (미설정 시 문자 발송 불가)
 * </pre>
 * 그룹은 SMILE·LASIK·LASEK·ICL·ETC, 차수는 1~3 이다.
 *
 * 슬롯은 항상 15개가 그대로 내려간다(비었다고 감추지 않는다) — 차수 컬럼이 사라지면
 * 표가 흔들리고, <b>설정이 빠졌다는 사실 자체가 화면에 보여야</b> 하기 때문이다.
 * 준비 여부는 alimtalkReady/smsReady 로 알린다.
 */
@Component
@Getter
@RequiredArgsConstructor
public class SolapiProperties {

    private final Environment env;
    /**
     * 오프셋 소스 — DB 우선, 없으면 SurgeryGroup 코드 상수 fallback.
     * ObjectProvider 로 감싸 순환 참조를 피한다(서비스도 SolapiProperties 를 참조할 여지가 있어).
     */
    private final ObjectProvider<SmsOffsetConfigService> offsetConfigProvider;

    @Value("${solapi.api-key:}") private String apiKey;
    @Value("${solapi.api-secret:}") private String apiSecret;
    /** 계정에 등록된 발신번호 — 01012345678 형식(하이픈 없이). */
    @Value("${solapi.from:}") private String from;
    /** 카카오 비즈니스 채널 pfId — 알림톡 발송에 필수. */
    @Value("${solapi.pf-id:}") private String pfId;

    /**
     * Dry-run 안전장치 — 기본 <b>true</b> (개발단계 실수로 실제 문자가 나가는 걸 막는다).
     * 운영 발송하려면 {@code SOLAPI_DRY_RUN=false} 로 명시적 해제 필요.
     *
     * <p>true + {@link #overrideTo} 비어 있음: 솔라피 API 미호출, 로그만.
     * true + {@link #overrideTo} 지정: 실제 API 호출하되 수신자만 override 번호로 (실 흐름 검증용).
     * false: 원 수신자로 실 발송.
     * <p>어느 경우든 이력(sms_send_log) 은 남고, dry-run 로그 케이스는 messageType=DRY_RUN 으로 구분된다.
     */
    @Value("${solapi.dry-run:true}") private boolean dryRun;

    /**
     * 로컬·dev 관찰용 수신자 대체 — dry-run 안에서만 유효. 값이 있으면 실 솔라피 API 를
     * 호출하되 수신자만 이 번호로 강제한다("내 폰으로만 나가게" 패턴).
     *
     * <p>dry-run=false 이면 무시 — 운영에서 실수로 남아 있어도 원 수신자로 정상 발송된다.
     * 형식은 하이픈 없는 010… (예: 01012345678).
     */
    @Value("${solapi.override-to:}") private String overrideTo;

    /**
     * 웹훅 서명 검증용 시크릿 — 콘솔에서 웹훅 등록 시 {@code secret} 필드에 넣은 문자열과 같아야 한다.
     *
     * <p>솔라피는 매 요청의 {@code X-Solapi-Secret} 헤더에 <b>secret 원문의 SHA1 해시</b>를 담아 보낸다
     * (body 서명이 아니라 정적 토큰에 가깝다). 서버는 여기 저장된 secret 을 sha1 해 헤더 값과 대조한다.
     *
     * <p>비어 있으면 서명 검증을 건너뛴다 — 로컬·초기 부트스트랩용. 운영은 반드시 채운다
     * (설정 안 된 상태로 외부 노출되면 누구나 발송 상태를 조작할 수 있다).
     */
    @Value("${solapi.webhook-secret:}") private String webhookSecret;

    @Value("${solapi.templates.t1.label:수술 후 안내 1차}") private String t1Label;
    @Value("${solapi.templates.t2.label:수술 후 안내 2차}") private String t2Label;
    @Value("${solapi.templates.t3.label:수술 후 안내 3차}") private String t3Label;

    public boolean isConfigured() {
        return !apiKey.isBlank() && !apiSecret.isBlank() && !from.isBlank();
    }

    /** 웹훅 서명 검증을 실제로 수행할지 — 시크릿이 채워져 있어야 한다. */
    public boolean isWebhookSecretConfigured() {
        return webhookSecret != null && !webhookSecret.isBlank();
    }

    /** 차수 3개. 각 차수가 그룹별 슬롯을 품는다. */
    public List<SmsTemplateInfo> templates() {
        return List.of(tier(1, t1Label), tier(2, t2Label), tier(3, t3Label));
    }

    private SmsTemplateInfo tier(int tier, String label) {
        List<SmsTemplateGroupInfo> groups = SurgeryGroup.ALL.stream()
                .map(g -> slot(g, tier))
                .toList();
        return new SmsTemplateInfo("T" + tier, label, tier, groups);
    }

    private SmsTemplateGroupInfo slot(SurgeryGroup group, int tier) {
        String prefix = "solapi.templates." + group.code().toLowerCase() + ".t" + tier + ".";
        String templateId = env.getProperty(prefix + "template-id", "");
        String smsText = readSmsBody(prefix + "sms-text");
        // 1차는 "수술 후 N주가 지났습니다" 같은 경과 선언이 없어 지연 버전이 필요 없다 —
        // 기본 본문을 그대로 쓴다. 그래서 env 키는 2·3차 × 5그룹 = 10개만 둔다.
        String smsTextDelayed = tier == 1 ? smsText : readSmsBody(prefix + "sms-text-delayed");
        boolean alimtalkReady = isConfigured() && !pfId.isBlank() && !templateId.isBlank();
        boolean smsReady = isConfigured() && !smsText.isBlank();
        boolean delayedReady = isConfigured() && !smsTextDelayed.isBlank();
        return new SmsTemplateGroupInfo(
                group.code(), group.label(), group.opTypes(), resolveOffset(group, tier),
                templateId, smsText, smsTextDelayed, alimtalkReady, smsReady, delayedReady);
    }

    /**
     * 문자 본문 env 읽기. docker compose env_file 은 escape 시퀀스를 해석하지 않아
     * 개행이 `\n` 두 글자로 들어온다 — 여기서 실제 개행으로 되돌린다.
     * .env 는 한 줄 = 한 값이라 개행을 넣을 방법이 이것뿐이다.
     */
    private String readSmsBody(String key) {
        return env.getProperty(key, "").replace("\\n", "\n");
    }

    /**
     * 오프셋 결정 — {@link SmsOffsetConfigService} 가 있으면 DB 값 (UI 로 편집 가능),
     * 없으면 {@link SurgeryGroup#offsetOf} 코드 상수 fallback.
     * 서비스 미주입 프로파일(예: sms 도메인 미로딩)에서도 안전하게 동작.
     */
    private int resolveOffset(SurgeryGroup group, int tier) {
        SmsOffsetConfigService service = offsetConfigProvider.getIfAvailable();
        if (service == null) return group.offsetOf(tier);
        return service.offsetOf(group.code(), tier);
    }

    public Optional<SmsTemplateInfo> findTemplate(String code) {
        return templates().stream().filter(t -> t.code().equals(code)).findFirst();
    }

    /**
     * 실제 발송에 쓸 슬롯 — 대상의 수술 종류(op_type)로 그룹을 정해 찾는다.
     * 분류되지 않는 수술은 ETC 로 떨어지며, ETC 문구를 채우지 않았다면 발송되지 않는다.
     */
    public Optional<SmsTemplateGroupInfo> findSlot(String templateCode, String opType) {
        SurgeryGroup group = SurgeryGroup.of(opType);
        return findTemplate(templateCode).flatMap(t -> t.groups().stream()
                .filter(g -> g.groupCode().equals(group.code()))
                .findFirst());
    }

    /** 대상의 수술 종류 기준 차수 오프셋. 예정일 계산의 단일 출처다. */
    public int offsetDays(String templateCode, String opType) {
        return findSlot(templateCode, opType).map(SmsTemplateGroupInfo::offsetDays).orElse(0);
    }
}
