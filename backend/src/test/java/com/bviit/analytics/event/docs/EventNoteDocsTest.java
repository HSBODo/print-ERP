package com.bviit.analytics.event.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.common.dto.PageResponse;
import com.bviit.analytics.event.dto.EventNoteRequest;
import com.bviit.analytics.event.dto.EventNoteRow;
import com.bviit.analytics.event.service.EventNoteService;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.restdocs.payload.FieldDescriptor;
import org.springframework.restdocs.payload.JsonFieldType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/event/notes/** 6개 엔드포인트 문서화. EventNoteService 를 목킹해 가상 EventNoteRow 응답을 만든다.
 * 권한: GET = 로그인 사용자 전원 · POST/PUT/DELETE = ADMIN · MEDICAL · MARKETING (DIRECTOR·OVERSEAS_MARKETING 제외).
 * 설계: docs/event-note/design.md
 *
 * 파라미터/헤더/필드는 ResourceSnippetParameters.builder 로 전달해야 OpenAPI 스키마에 반영된다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-event-note-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:event-note-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class EventNoteDocsTest {

    private static final String TAG = "EventNote";
    private static final String READ_AUTH = "Bearer {token} — 로그인 사용자 전원";
    private static final String WRITE_AUTH = "Bearer {token} — ADMIN · MEDICAL · MARKETING 부서 (DIRECTOR·OVERSEAS_MARKETING 은 403)";
    private static final String REQUEST_BODY = """
            {
              "eventDate": "2026-09-01",
              "summary": "추석 프로모션 시작",
              "description": "9/1~9/14 시력교정 추석 프로모션. 온라인 광고 병행.",
              "startDate": "2026-09-01",
              "endDate": "2026-09-14"
            }
            """;

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean EventNoteService eventNoteService;

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.STAFF, Department.MARKETING);
    }

    @BeforeEach
    void stubService() {
        EventNoteRow promotion = row(1L, LocalDate.of(2026, 9, 1), "추석 프로모션 시작",
                "9/1~9/14 시력교정 추석 프로모션. 온라인 광고 병행.",
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 14));
        EventNoteRow closed = row(2L, LocalDate.of(2026, 9, 17), "추석 연휴 휴진",
                "9/17 휴진 — 예약·검사 0건 정상", LocalDate.of(2026, 9, 17), LocalDate.of(2026, 9, 17));

        when(eventNoteService.findPage(any(), any(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(closed, promotion), 0, 20, 2, 1));
        when(eventNoteService.findAllForChart(any(), any())).thenReturn(List.of(promotion, closed));
        when(eventNoteService.get(anyLong())).thenReturn(promotion);
        when(eventNoteService.create(any(EventNoteRequest.class))).thenReturn(promotion);
        when(eventNoteService.update(anyLong(), any(EventNoteRequest.class))).thenReturn(promotion);
        doNothing().when(eventNoteService).delete(anyLong());
    }

    @Test
    void event_notes_page_문서화() throws Exception {
        mockMvc.perform(get("/api/event/notes")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .queryParam("from", "2026-09-01")
                        .queryParam("to", "2026-09-30")
                        .queryParam("page", "0")
                        .queryParam("size", "20"))
                .andExpect(status().isOk())
                .andDo(document("event-notes-page",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag(TAG)
                                .summary("이벤트 노트 페이징 목록 (관리 화면)")
                                .description("발생일(event_date) 기준 기간 필터 + 서버 페이징. 정렬은 발생일 내림차순(같은 날은 최신 등록 순) 고정. "
                                        + "from·to 는 둘 다 주거나 둘 다 생략(생략 = 전체 기간), 하나만 주면 400. 삭제된 행은 나오지 않는다.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description(READ_AUTH))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작일 (YYYY-MM-DD, 발생일 기준 · to 와 함께)").optional(),
                                        parameterWithName("to").description("조회 종료일 (YYYY-MM-DD, 양 끝 포함)").optional(),
                                        parameterWithName("page").description("페이지 번호 (0부터, 기본 0)").optional(),
                                        parameterWithName("size").description("페이지 크기 (1~100, 기본 20)").optional())
                                .responseFields(pageFields())
                                .responseSchema(Schema.schema("EventNotePageResponse"))
                                .build())));
    }

    @Test
    void event_notes_all_문서화() throws Exception {
        mockMvc.perform(get("/api/event/notes/all")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .queryParam("from", "2026-01-01")
                        .queryParam("to", "2026-12-31"))
                .andExpect(status().isOk())
                .andDo(document("event-notes-all",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag(TAG)
                                .summary("이벤트 노트 기간 전체 목록 (차트 오버레이)")
                                .description("발생일이 기간 안인 이벤트를 페이징 없이 전부 반환. 정렬은 발생일 오름차순(차트 x축 순서). "
                                        + "from·to 필수, 최대 1,096일(3년). startDate·endDate 는 조회 조건이 아니라 차트 구간 표시용이다.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description(READ_AUTH))
                                .queryParameters(
                                        parameterWithName("from").description("조회 시작일 (YYYY-MM-DD, 필수)"),
                                        parameterWithName("to").description("조회 종료일 (YYYY-MM-DD, 필수 · 최대 1,096일)"))
                                .responseFields(listFields())
                                .responseSchema(Schema.schema("EventNoteListResponse"))
                                .build())));
    }

    @Test
    void event_notes_get_문서화() throws Exception {
        mockMvc.perform(get("/api/event/notes/{id}", 1L).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("event-notes-get",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag(TAG)
                                .summary("이벤트 노트 단건 조회")
                                .description("PK 로 조회. 없거나 삭제된 행이면 404.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description(READ_AUTH))
                                .pathParameters(parameterWithName("id").description("이벤트 노트 PK"))
                                .responseFields(singleFields())
                                .responseSchema(Schema.schema("EventNoteResponse"))
                                .build())));
    }

    @Test
    void event_notes_create_문서화() throws Exception {
        mockMvc.perform(post("/api/event/notes")
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isOk())
                .andDo(document("event-notes-create",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag(TAG)
                                .summary("이벤트 노트 등록")
                                .description("작성자·작성일시(createdBy·createdAt)는 서버가 로그인 ID·현재 시각으로 채운다(요청에 넣어도 무시). "
                                        + "기간형이면 startDate ≤ eventDate ≤ endDate, 어기면 400 + errors.periodValid.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description(WRITE_AUTH))
                                .requestFields(requestFields())
                                .responseFields(singleFields())
                                .requestSchema(Schema.schema("EventNoteRequest"))
                                .responseSchema(Schema.schema("EventNoteResponse"))
                                .build())));
    }

    @Test
    void event_notes_update_문서화() throws Exception {
        mockMvc.perform(put("/api/event/notes/{id}", 1L)
                        .header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST_BODY))
                .andExpect(status().isOk())
                .andDo(document("event-notes-update",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag(TAG)
                                .summary("이벤트 노트 수정 (전체 교체)")
                                .description("요청 필드로 전부 교체한다(빠진 선택 필드는 null 로 비워진다). 수정자·수정일시는 서버가 갱신. "
                                        + "없거나 삭제된 행이면 404.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description(WRITE_AUTH))
                                .pathParameters(parameterWithName("id").description("이벤트 노트 PK"))
                                .requestFields(requestFields())
                                .responseFields(singleFields())
                                .requestSchema(Schema.schema("EventNoteRequest"))
                                .responseSchema(Schema.schema("EventNoteResponse"))
                                .build())));
    }

    @Test
    void event_notes_delete_문서화() throws Exception {
        mockMvc.perform(delete("/api/event/notes/{id}", 1L).header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("event-notes-delete",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag(TAG)
                                .summary("이벤트 노트 삭제 (소프트 삭제)")
                                .description("delete_flag 만 켠다. 이후 조회·수정·재삭제는 404. 행은 DB 에 남는다.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description(WRITE_AUTH))
                                .pathParameters(parameterWithName("id").description("이벤트 노트 PK"))
                                .responseFields(fieldWithPath("success").description("요청 성공 여부"))
                                .build())));
    }

    /* ── 필드 정의 ── */

    private static FieldDescriptor[] requestFields() {
        return new FieldDescriptor[]{
                fieldWithPath("eventDate").description("이벤트 발생일 (YYYY-MM-DD, 필수) — 조회 기준·차트 마커 위치"),
                fieldWithPath("summary").description("요약 (필수, 1~100자) — 차트 툴팁·목록 제목"),
                fieldWithPath("description").type(JsonFieldType.STRING).description("내용 (최대 5,000자)").optional(),
                fieldWithPath("startDate").type(JsonFieldType.STRING).description("기간형 이벤트 시작일 (YYYY-MM-DD, 선택 · ≤ eventDate)").optional(),
                fieldWithPath("endDate").type(JsonFieldType.STRING).description("기간형 이벤트 종료일 (YYYY-MM-DD, 선택 · ≥ eventDate)").optional()
        };
    }

    private static FieldDescriptor[] rowFields(String prefix) {
        return new FieldDescriptor[]{
                fieldWithPath(prefix + "id").description("이벤트 노트 PK"),
                fieldWithPath(prefix + "eventDate").description("이벤트 발생일 (YYYY-MM-DD)"),
                fieldWithPath(prefix + "summary").description("요약"),
                fieldWithPath(prefix + "description").type(JsonFieldType.STRING).description("내용").optional(),
                fieldWithPath(prefix + "startDate").type(JsonFieldType.STRING).description("기간형 이벤트 시작일 (없으면 null)").optional(),
                fieldWithPath(prefix + "endDate").type(JsonFieldType.STRING).description("기간형 이벤트 종료일 (없으면 null)").optional(),
                fieldWithPath(prefix + "createdBy").description("작성자 로그인 ID (로그인 컨텍스트가 없으면 system)"),
                fieldWithPath(prefix + "createdAt").description("작성일시 (YYYY-MM-DDTHH:mm:ss, Asia/Seoul)"),
                fieldWithPath(prefix + "updatedBy").description("최종 수정자 로그인 ID"),
                fieldWithPath(prefix + "updatedAt").description("최종 수정일시 (YYYY-MM-DDTHH:mm:ss, Asia/Seoul)")
        };
    }

    private static FieldDescriptor[] singleFields() {
        return withSuccess(rowFields("data."));
    }

    private static FieldDescriptor[] listFields() {
        return withSuccess(rowFields("data[]."));
    }

    private static FieldDescriptor[] pageFields() {
        List<FieldDescriptor> fields = new ArrayList<>(List.of(rowFields("data.content[].")));
        fields.add(fieldWithPath("data.page").description("현재 페이지 번호 (0부터)"));
        fields.add(fieldWithPath("data.size").description("페이지 크기"));
        fields.add(fieldWithPath("data.totalElements").description("조건에 맞는 전체 행 수"));
        fields.add(fieldWithPath("data.totalPages").description("전체 페이지 수 (0건이면 0)"));
        return withSuccess(fields.toArray(FieldDescriptor[]::new));
    }

    private static FieldDescriptor[] withSuccess(FieldDescriptor[] fields) {
        List<FieldDescriptor> all = new ArrayList<>();
        all.add(fieldWithPath("success").description("요청 성공 여부"));
        all.addAll(List.of(fields));
        return all.toArray(FieldDescriptor[]::new);
    }

    private static EventNoteRow row(Long id, LocalDate eventDate, String summary, String description,
                                    LocalDate startDate, LocalDate endDate) {
        LocalDateTime at = LocalDateTime.of(2026, 8, 28, 10, 30);
        return new EventNoteRow(id, eventDate, summary, description, startDate, endDate,
                "docs-tester", at, "docs-tester", at);
    }
}
