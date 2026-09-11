package com.bviit.analytics.marketing.service;

import com.bviit.analytics.common.exception.RowLockedException;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionUpsertRequest;
import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 접수 행 수기 추가·수정·삭제.
 * 삭제는 동기화가 한 번도 지나가지 않은 수기 행(origin='manual' AND locked_at IS NULL)에서만 허용된다.
 */
@Service
@Profile("postgres-mart")
@RequiredArgsConstructor
public class OverseasMarketingEditService implements OverseasMarketingEditor {

    private final OverseasMarketingRepository repository;

    @Override
    @Transactional
    public long createRow(OverseasMarketingReceptionUpsertRequest request, String actor) {
        return repository.insertManualRow(parameters(request).addValue("createdBy", actor));
    }

    @Override
    @Transactional
    public void updateRow(long rowNumber, OverseasMarketingReceptionUpsertRequest request, String actor) {
        requireRow(rowNumber);
        repository.updateRow(parameters(request)
                .addValue("rowNumber", rowNumber)
                .addValue("updatedBy", actor));
    }

    @Override
    @Transactional
    public void deleteRow(long rowNumber) {
        Map<String, Object> meta = requireRow(rowNumber);
        boolean manual = "manual".equals(String.valueOf(meta.get("origin")));
        if (!manual || meta.get("locked_at") != null) {
            throw new RowLockedException("동기화를 거친 행은 삭제할 수 없습니다. 수정만 가능합니다.");
        }
        if (repository.deleteManualRow(rowNumber) == 0) {
            throw new RowLockedException("동기화를 거친 행은 삭제할 수 없습니다. 수정만 가능합니다.");
        }
    }

    private Map<String, Object> requireRow(long rowNumber) {
        Map<String, Object> meta = repository.findRowMeta(rowNumber);
        if (meta == null) {
            throw new IllegalArgumentException("존재하지 않는 접수 행입니다: " + rowNumber);
        }
        return meta;
    }

    private MapSqlParameterSource parameters(OverseasMarketingReceptionUpsertRequest request) {
        return new MapSqlParameterSource()
                .addValue("inquiryDate", blankToNull(request.inquiryDate()))
                .addValue("name", request.name().trim())
                .addValue("contact", blankToNull(request.contact()))
                .addValue("email", blankToNull(request.email()))
                .addValue("gender", blankToNull(request.gender()))
                .addValue("dob", blankToNull(request.dob()))
                .addValue("nationality", blankToNull(request.nationality()))
                .addValue("ethnicity", blankToNull(request.ethnicity()))
                .addValue("occupation", blankToNull(request.occupation()))
                .addValue("contactLens", blankToNull(request.contactLens()))
                .addValue("medicalConditions", blankToNull(request.medicalConditions()))
                .addValue("medicationAllergy", blankToNull(request.medicationAllergy()))
                .addValue("departureSchedule", blankToNull(request.departureSchedule()))
                .addValue("examDate", blankToNull(request.examDate()))
                .addValue("surgeryDate", blankToNull(request.surgeryDate()))
                .addValue("surgeryCost", blankToNull(request.surgeryCost()))
                .addValue("channel", blankToNull(request.channel()))
                .addValue("onlineChannel", blankToNull(request.onlineChannel()))
                .addValue("remark", blankToNull(request.remark()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
