package com.bviit.analytics.reservation.docs;

import com.bviit.analytics.auth.config.JwtUtil;
import com.bviit.analytics.auth.entity.Department;
import com.bviit.analytics.auth.entity.Role;
import com.bviit.analytics.reservation.dto.ReservationChannelFunnelItem;
import com.bviit.analytics.reservation.dto.ReservationChannelOpTypeItem;
import com.bviit.analytics.reservation.repository.ReservationChannelMartRepository;
import com.epages.restdocs.apispec.ResourceSnippetParameters;
import com.epages.restdocs.apispec.Schema;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.restdocs.AutoConfigureRestDocs;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static com.epages.restdocs.apispec.MockMvcRestDocumentationWrapper.document;
import static com.epages.restdocs.apispec.ResourceDocumentation.resource;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.restdocs.headers.HeaderDocumentation.headerWithName;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.modifyUris;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessRequest;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.preprocessResponse;
import static org.springframework.restdocs.operation.preprocess.Preprocessors.prettyPrint;
import static org.springframework.restdocs.payload.PayloadDocumentation.fieldWithPath;
import static org.springframework.restdocs.payload.PayloadDocumentation.subsectionWithPath;
import static org.springframework.restdocs.request.RequestDocumentation.parameterWithName;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * /api/stats/reservation-channel** 2개 엔드포인트 문서화 (MARKETING 부서 전용).
 *
 * 예약자 리스트를 채널로 묶어 퍼널(예약→취소제외→내원→검사→중단제외→수술→수술완료→재수술)로 낸다.
 * v_reservation_channel 뷰만 읽어 MSSQL 을 타지 않는다 — 터널 장애에도 동작.
 * 저장소 미연결 시 503.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reservation-channel-docs-tests-1234567890",
        "spring.datasource.url=jdbc:h2:mem:reservation-channel-docs;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false",
        "spring.h2.console.enabled=false"
})
@AutoConfigureMockMvc
@AutoConfigureRestDocs
class ReservationChannelDocsTest {

    @Autowired MockMvc mockMvc;
    @Autowired JwtUtil jwtUtil;
    @MockitoBean ReservationChannelMartRepository reservationChannelMartRepository;

    private String bearer() {
        // MARKETING gate — Department.ALL 이면 DEPT_ALL 로 통과.
        return "Bearer " + jwtUtil.generateToken("docs-tester", Role.ADMIN, Department.ALL);
    }

    @BeforeEach
    void stubRepository() {
        when(reservationChannelMartRepository.findFunnel(anyString(), anyString())).thenReturn(List.of(
                ReservationChannelFunnelItem.builder()
                        .channel("네이버")
                        .reserved(320).notCancel(280).visited(240).examined(220)
                        .notStop(200).surgery(140).surgeryDone(120).reop(3)
                        .surgeryAmount(720_000_000L)
                        .reservedPersons(300).notCancelPersons(260).visitedPersons(220)
                        .examinedPersons(200).notStopPersons(180).surgeryPersons(130)
                        .surgeryDonePersons(112).reopPersons(3).surgeryPaidPersons(115)
                        .totalReservedPersons(950).totalNotCancelPersons(830)
                        .totalVisitedPersons(710).totalExaminedPersons(650)
                        .totalNotStopPersons(590).totalSurgeryPersons(420)
                        .totalSurgeryDonePersons(360).totalReopPersons(9)
                        .totalSurgeryAmount(2_400_000_000L).totalSurgeryPaidPersons(355)
                        .build()));

        when(reservationChannelMartRepository.findOpTypes(anyString(), anyString())).thenReturn(List.of(
                ReservationChannelOpTypeItem.builder().channel("네이버").opType("smilePro").persons(48).build(),
                ReservationChannelOpTypeItem.builder().channel("네이버").opType("lasik").persons(22).build(),
                ReservationChannelOpTypeItem.builder().channel(null).opType("smilePro").persons(180).build()));
    }

    @Test
    void reservation_channel_funnel_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-channel")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-channel-funnel",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationChannel")
                                .summary("예약 채널별 퍼널")
                                .description("v_reservation_channel 뷰 기반. 사람이 아니라 예약 건 단위 — 같은 사람이 취소하고 다시 잡으면 2건. "
                                        + "채널 판정: 내원동기(중) 매체명 > 직원 설정표 > 예약경로. "
                                        + "채널별 사람수는 DISTINCT — 채널 합계 ≠ 전체 사람수. 합계는 total* 필드(모든 행에 같은 값)를 쓴다. "
                                        + "MARKETING 부서 전용, 최대 366일, 마트 미연결 시 503.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("등록일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("등록일 종료 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].channel").description("채널명"),
                                        fieldWithPath("data[].reserved").description("전체 예약 (등록일 기준)"),
                                        fieldWithPath("data[].notCancel").description("취소(C) 제외"),
                                        fieldWithPath("data[].visited").description("미내원(Y) 제외 → 실제 내원"),
                                        fieldWithPath("data[].examined").description("검사등록일이 있는 건"),
                                        fieldWithPath("data[].notStop").description("검사중단(exam_stop='Y') 아닌 건"),
                                        fieldWithPath("data[].surgery").description("수술등록일이 있는 건 (수술예약)"),
                                        fieldWithPath("data[].surgeryDone").description("실제 수술일이 있는 건 (완료)"),
                                        fieldWithPath("data[].reop").description("재수술까지 간 건 (코호트 기준 — 최근 코호트는 0이 정상)"),
                                        fieldWithPath("data[].surgeryAmount").description("수술 수납액 합 (원, long)"),
                                        fieldWithPath("data[].reservedPersons").description("사람 수 — 예약"),
                                        fieldWithPath("data[].notCancelPersons").description("사람 수 — 취소 제외"),
                                        fieldWithPath("data[].visitedPersons").description("사람 수 — 내원"),
                                        fieldWithPath("data[].examinedPersons").description("사람 수 — 검사"),
                                        fieldWithPath("data[].notStopPersons").description("사람 수 — 중단 제외"),
                                        fieldWithPath("data[].surgeryPersons").description("사람 수 — 수술등록"),
                                        fieldWithPath("data[].surgeryDonePersons").description("사람 수 — 수술 완료"),
                                        fieldWithPath("data[].reopPersons").description("사람 수 — 재수술"),
                                        fieldWithPath("data[].surgeryPaidPersons").description("사람 수 — 수납 확정 (객단가 분모)"),
                                        fieldWithPath("data[].totalReservedPersons").description("전체(채널 무관) 사람 수 — 예약. 모든 행에 같은 값 (합계행 전용)."),
                                        fieldWithPath("data[].totalNotCancelPersons").description("전체 사람 수 — 취소 제외"),
                                        fieldWithPath("data[].totalVisitedPersons").description("전체 사람 수 — 내원"),
                                        fieldWithPath("data[].totalExaminedPersons").description("전체 사람 수 — 검사"),
                                        fieldWithPath("data[].totalNotStopPersons").description("전체 사람 수 — 중단 제외"),
                                        fieldWithPath("data[].totalSurgeryPersons").description("전체 사람 수 — 수술등록"),
                                        fieldWithPath("data[].totalSurgeryDonePersons").description("전체 사람 수 — 수술 완료"),
                                        fieldWithPath("data[].totalReopPersons").description("전체 사람 수 — 재수술"),
                                        fieldWithPath("data[].totalSurgeryAmount").description("전체 수술 수납액 합 (원)"),
                                        fieldWithPath("data[].totalSurgeryPaidPersons").description("전체 사람 수 — 수납 확정"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationChannelFunnelListResponse"))
                                .build())));
    }

    @Test
    void reservation_channel_op_types_문서화() throws Exception {
        mockMvc.perform(get("/api/stats/reservation-channel/op-types")
                        .param("from", "2026-07-01").param("to", "2026-07-31")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andDo(document("reservation-channel-op-types",
                        preprocessRequest(modifyUris().host("analytics.bnviit.com").removePort(), prettyPrint()),
                        preprocessResponse(prettyPrint()),
                        resource(ResourceSnippetParameters.builder()
                                .tag("ReservationChannel")
                                .summary("예약 채널 × 실제 수술 유형")
                                .description("OPERATIONDATA·Cataract_Operationdata 수술명 분류 (추정 아님). "
                                        + "눈별로 펼쳐 세므로 좌우에 다른 시술을 받으면 두 유형 모두 잡힌다(같은 유형 양안은 1명). "
                                        + "channel=null 은 전체 기준 행 — 채널별 합산은 중복이므로 따로 낸다. MARKETING 부서 전용, 최대 366일.")
                                .requestHeaders(headerWithName(HttpHeaders.AUTHORIZATION).description("Bearer {token} — MARKETING·ALL 부서"))
                                .queryParameters(
                                        parameterWithName("from").description("등록일 시작 (YYYY-MM-DD)"),
                                        parameterWithName("to").description("등록일 종료 (YYYY-MM-DD, 최대 366일)"))
                                .responseFields(
                                        fieldWithPath("success").description("요청 성공 여부"),
                                        fieldWithPath("data[].channel")
                                                .description("채널명 (null=전체 기준 행)").optional()
                                                .type(org.springframework.restdocs.payload.JsonFieldType.STRING),
                                        fieldWithPath("data[].opType")
                                                .description("수술 유형 — smilePro·smile·lasek·tIcl·icl·lasik·tKpl·kpl·presbyond·viva·cat*·other"),
                                        fieldWithPath("data[].persons").description("그 유형을 받은 사람 수"),
                                        subsectionWithPath("meta").description("응답 메타 (source=LIVE)"))
                                .responseSchema(Schema.schema("ReservationChannelOpTypeListResponse"))
                                .build())));
    }
}
