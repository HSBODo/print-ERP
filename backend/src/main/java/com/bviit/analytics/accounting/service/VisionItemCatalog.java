package com.bviit.analytics.accounting.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 시력교정 매출 항목 카탈로그 — PrcCod → 진료명, 과세 항목, 매입사 코드/별칭.
 *
 * <p>한울회계법인 제공 엑셀(2026.06 CRM 매출)을 역산해 금액이 한 원도 안 틀리게 맞춘 매핑이다
 * (회계 원형 디렉팅/회계/_build-crm.js). 여기 없는 코드는 '미분류' 로 모은다 — 조용히 사라지느니 눈에 띄는 게 낫다.
 * 항목 순서(ITEMS)는 화면 컬럼·피벗 줄 순서와 무관하지만 JSON 키 집합의 정본이다.
 */
public final class VisionItemCatalog {

    private VisionItemCatalog() {
    }

    /** PrcCod → 진료명. '36'·'37'·'38' 은 2023~2025 에만 나오는 코드 — 품목명으로 확인해 레거시 진료명에 붙였다. */
    public static final Map<String, String> CODE_TO_ITEM = Map.ofEntries(
            Map.entry("O", "수술"), Map.entry("33", "검사비"), Map.entry("D", "DNA"),
            Map.entry("32", "PRP"), Map.entry("Q", "PRP"), Map.entry("Z", "PIOL렌즈주문"),
            Map.entry("I", "D/L"), Map.entry("F", "D/L용품"), Map.entry("17", "H/L"), Map.entry("V", "기타"),
            Map.entry("35", "올코드라이아이"), Map.entry("39", "올코어아레즈투"),
            Map.entry("34", "올코어vitc"), Map.entry("24", "Dr.PNT"),
            Map.entry("36", "올코어유산균"), Map.entry("37", "글라우포뮬러"), Map.entry("38", "플로터포뮬러")
    );

    /** 금액 0 — 진료구분 라벨에만 쓰이는 코드. */
    public static final Map<String, String> CODE_LABEL_ONLY = Map.of("11", "Free");

    public static final String UNCLASSIFIED = "미분류";

    public static final List<String> ITEMS = List.of(
            "검사비", "수술", "DNA", "PRP", "PIOL렌즈주문", "D/L", "D/L용품", "H/L",
            "올코드라이아이", "올코어아레즈투", "올코어vitc", "Dr.PNT",
            "올코어유산균", "글라우포뮬러", "플로터포뮬러", "기타", UNCLASSIFIED
    );

    /** 과세 = 건기식·영양제 계열. 레거시 피벗의 분홍 블록과 같은 묶음. */
    public static final Set<String> TAX_ITEMS = Set.of(
            "올코드라이아이", "올코어아레즈투", "올코어vitc", "Dr.PNT",
            "올코어유산균", "글라우포뮬러", "플로터포뮬러"
    );

    /** CstCrdCpn(수동입력 카드) 코드 → 매입사. 원본 매입사 열과 1:1 로 대조해 확정. */
    public static final Map<String, String> ACQUIRER_CODE = Map.of(
            "01", "국민", "03", "농협", "04", "롯데", "05", "비씨", "06", "삼성",
            "07", "신한", "18", "현대", "20", "하나(구외환)", "22", "우리", "23", "제로페이"
    );

    /** 단말기 결제의 매입사명이 간편결제로 찍히는 경우 — 원본은 나이스정보통신으로 묶는다. */
    public static final Map<String, String> ACQUIRER_ALIAS = Map.of(
            "위챗페이", "나이스정보통신", "알리페이", "나이스정보통신"
    );
}
