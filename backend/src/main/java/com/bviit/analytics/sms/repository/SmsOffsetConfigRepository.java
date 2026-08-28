package com.bviit.analytics.sms.repository;

import com.bviit.analytics.sms.entity.SmsOffsetConfig;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 4행짜리 룩업 표라 파생 쿼리도 없다. groupCode(=PK) 조회와 saveAll 만 쓴다.
 *
 * ⚠️ 여기에는 SQL 텍스트 블록을 두지 않는다(RepositorySqlResourceCoverageTest 가 막는다).
 */
public interface SmsOffsetConfigRepository extends JpaRepository<SmsOffsetConfig, String> {
}
