package com.bviit.analytics.common.repository;

import com.bviit.analytics.etc.repository.B2bRevenueStatsRepository;
import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class RepositorySqlResourceCoverageTest {

    private static final Pattern SQL_RESOURCE_CONSTANT =
            Pattern.compile("\"(sql/[^\"]+\\.sql)\"");

    @Test
    void repository_java에는_긴_sql_text_block과_string_builder를_두지_않는다() throws Exception {
        Path root = Path.of("src/main/java/com/bviit/analytics");

        List<Path> violations;
        try (var files = Files.walk(root)) {
            violations = files
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(RepositorySqlResourceCoverageTest::isRepositoryJava)
                    .filter(path -> {
                        try {
                            String text = Files.readString(path);
                            return text.contains("\"\"\"") || text.contains("StringBuilder");
                        } catch (Exception e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .toList();
        }

        assertThat(violations)
                .as("SQL은 src/main/resources/sql/** 리소스와 작은 템플릿 치환으로 관리한다")
                .isEmpty();
    }

    @Test
    void sql_resource에는_java_문자열_조합_흔적을_남기지_않는다() throws Exception {
        Path root = Path.of("src/main/resources/sql");

        List<Path> violations;
        try (var files = Files.walk(root)) {
            violations = files
                    .filter(path -> path.toString().endsWith(".sql"))
                    .filter(path -> {
                        try {
                            String text = Files.readString(path);
                            return text.contains("\"\"\"")
                                    || text.contains("+ classifyCase")
                                    || text.contains("+ qualify")
                                    || text.contains("+ lensMarkers");
                        } catch (Exception e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .toList();
        }

        assertThat(violations)
                .as("리소스 SQL은 실행 가능한 SQL 또는 명시적 placeholder만 담는다")
                .isEmpty();
    }

    @Test
    void repository가_참조하는_sql_resource는_모두_로드된다() throws Exception {
        Path root = Path.of("src/main/java/com/bviit/analytics");
        List<String> resources = new ArrayList<>();

        try (var files = Files.walk(root)) {
            for (Path path : files
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(RepositorySqlResourceCoverageTest::isRepositoryJava)
                    .toList()) {
                Matcher matcher = SQL_RESOURCE_CONSTANT.matcher(Files.readString(path));
                while (matcher.find()) {
                    resources.add(matcher.group(1));
                }
            }
        }

        assertThat(resources).isNotEmpty();
        assertThat(resources)
                .allSatisfy(resource -> assertThat(SqlLoader.load(resource))
                        .as(resource)
                        .isNotBlank());
    }

    @Test
    void b2b_동적_템플릿은_최종_sql에_placeholder를_남기지_않는다() throws Exception {
        B2bRevenueStatsRepository repository = new B2bRevenueStatsRepository(null);
        Method method = B2bRevenueStatsRepository.class.getDeclaredMethod(
                "buildMonthlyRevenueQuery",
                String.class,
                String.class
        );
        method.setAccessible(true);

        String sql = (String) method.invoke(repository, "OP_COST_SELECT", "EXAM_COST_SELECT");

        assertThat(sql).doesNotContain("__");
        assertThat(sql).contains("OP_COST_SELECT", "EXAM_COST_SELECT");
    }

    private static boolean isRepositoryJava(Path path) {
        return path.toString().replace('\\', '/').contains("/repository/");
    }
}
