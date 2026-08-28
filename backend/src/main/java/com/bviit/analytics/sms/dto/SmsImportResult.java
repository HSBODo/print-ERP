package com.bviit.analytics.sms.dto;

/**
 * 수술자 불러오기 결과.
 *   created — 새로 등록한 대상
 *   updated — 이미 있던 자동 등록 행을 CRM 최신값(이름·연락처·수술 구분)으로 갱신한 수
 *   skipped — 수동 등록 행이라 건드리지 않았거나 값이 같아 갱신할 게 없던 수
 */
public record SmsImportResult(int created, int updated, int skipped) {
}
