package com.bviit.analytics.exam.service;

import com.bviit.analytics.common.config.EoeisDataSourceConfig;
import com.bviit.analytics.exam.dto.EoeisCheckupResult;
import com.bviit.analytics.exam.repository.EoeisCheckupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@ConditionalOnExpression(EoeisDataSourceConfig.ENABLED_EXPRESSION)
@RequiredArgsConstructor
public class EoeisCheckupService {

    private final EoeisCheckupRepository repository;

    public EoeisCheckupResult getStats(LocalDate from, LocalDate to) {
        return new EoeisCheckupResult(repository.findStats(from, to), repository.findScores());
    }
}
