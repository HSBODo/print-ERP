package com.bviit.analytics.marketing.service;

import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionUpsertRequest;

public interface OverseasMarketingEditor {

    long createRow(OverseasMarketingReceptionUpsertRequest request, String actor);

    void updateRow(long rowNumber, OverseasMarketingReceptionUpsertRequest request, String actor);

    void deleteRow(long rowNumber);
}
