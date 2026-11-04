package com.example.app.common.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA 화면 경로 새로고침·직접 접근 시 index.html 로 포워드한다 (라우팅은 프론트 TanStack Router 가 처리).
 *
 * <p>첫 경로 조각이 예약어(api · docs · webjars · assets · error)가 아니면 모두 화면 경로로 본다.
 * 그래서 새 화면을 추가해도 여기를 고칠 필요가 없다.
 * <ul>
 *   <li>{@code /api/**} — REST API (없는 API 는 404 JSON)</li>
 *   <li>{@code /docs/**} · {@code /webjars/**} — Swagger UI</li>
 *   <li>{@code /assets/**} — Vite 빌드 산출물</li>
 *   <li>최상위 정적 파일(favicon.svg 등) — 점(.)이 들어간 한 조각 경로라 제외된다</li>
 * </ul>
 * ⚠ 프론트 정적 파일을 assets/ 밖 하위 폴더(예: public/files/x.pdf)에 두면 화면 경로로 잡힌다 —
 * 그런 폴더를 만들면 아래 정규식의 예약어에 추가할 것.
 */
@Controller
public class SpaForwardController {

    private static final String SCREEN = "{path:^(?!(?:api|docs|webjars|assets|error)$)[^\\.]*}";

    @GetMapping({"/", "/" + SCREEN, "/" + SCREEN + "/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
