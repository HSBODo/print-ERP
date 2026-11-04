package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * 인증은 JWT 필터(JwtAuthenticationFilter)가 전담하므로 Spring 기본 인메모리 사용자를 끈다
 * (켜 두면 쓰이지 않는 임시 비밀번호가 기동 로그에 출력된다).
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class Application {

	public static void main(String[] args) {
		SpringApplication.run(Application.class, args);
	}

}
