package com.example.app;

import com.example.app.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
		"app.jwt.secret=test-jwt-secret-value-for-context-tests-123456",
		"spring.h2.console.enabled=false",
		// 컨텍스트 간 인메모리 DB 공유로 인한 시드 오염 방지 — 이 테스트 전용 DB 사용
		"spring.datasource.url=jdbc:h2:mem:app-context-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
		"app.seed.enabled=false"
})
class ApplicationTests {

	@Autowired
	private UserRepository userRepository;

	@Test
	void contextLoadsWithoutDefaultSeedData() {
		assertThat(userRepository.count()).isZero();
	}

}
