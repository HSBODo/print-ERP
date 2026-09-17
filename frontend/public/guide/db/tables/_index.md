# 테이블 카탈로그 인덱스

> 자동 생성: 2026-04-20 | 재생성: `node tools/generate-table-catalog.js`
> 실측 대조: 2026-08-10 — 전 35개 테이블을 WORK(SOFTCRM_WORK·MCRM_WORK·IPLUS_WORK)·PROD DB와 대조해 컬럼/PK/행 수 검증·갱신 완료
>
> ⚠️ **이 폴더는 softcrm 리포에서 동기화된 사본이다.** 개별 테이블 문서 안의
> `../db-structure-overview.md` · `../db-customer.md` · `../db-code-tables.md` ·
> `../db-referral.md` · `../db-sms.md` · `../db-reservation.md` · `../../specs/...` ·
> `./PrcItmLst.md` 링크는 **원본 리포에만 있는 형제 문서**라 이 리포에서는 열리지 않는다.
> 동기화가 깨지므로 여기서 고치지 말 것 — 필요하면 원본 리포에서 볼 것.

---

## SOFTCRM

| 테이블 | 컬럼 수 | 행 수 | 문서 |
|--------|---------|-------|------|
| [CUSTOM](CUSTOM.md) | 61 | ~587,758 | ✅ |
| [RESERVATION](RESERVATION.md) | 58 | ~3,542,271 | ✅ |
| [EMPLOYEE](EMPLOYEE.md) | 50 | ~1,447 | ✅ |
| [OPERATIONDATA](OPERATIONDATA.md) | 84 | ~306,894 | ✅ |
| [COSTPRICE](COSTPRICE.md) | 31 | ~862,666 | ✅ |
| [EXAM](EXAM.md) | 84 | ~417,377 | ✅ |
| [EXAM_FU](EXAM_FU.md) | 35 | ~15 | ✅ |
| [Cataract_Exam](Cataract_Exam.md) | 87 | ~9,811 | ✅ |
| [Cataract_Operationdata](Cataract_Operationdata.md) | 144 | ~5,537 | ✅ |
| [AS_LIST](AS_LIST.md) | 16 | ~72,233 | ✅ |
| [RECALL_LIST](RECALL_LIST.md) | 17 | ~22,340 | ✅ |
| [RECALL_MR_LIST](RECALL_MR_LIST.md) | 13 | ~37,602 | ✅ |
| [COUNSEL_LIST](COUNSEL_LIST.md) | 15 | ~479,694 | ✅ |
| [CTI_COUNSEL_LIST](CTI_COUNSEL_LIST.md) | 17 | ~445,815 | ✅ |
| [CUSTOM_HISTORY](CUSTOM_HISTORY.md) | 22 | ~2,518,695 | ✅ |
| [CUSTOM_MEMO](CUSTOM_MEMO.md) | 3 | ~242,665 | ✅ |
| [MsgSndLst](MsgSndLst.md) | 15 | ~6,813,564 | ✅ |
| [MOTIVE_NEW01](MOTIVE_NEW01.md) | 32 | ~506,157 | ✅ |
| [MOTIVE_NEW02](MOTIVE_NEW02.md) | 16 | ~576,433 | ✅ |
| [SNS_LIST](SNS_LIST.md) | 4 | ~414 | ✅ |
| [Relation_List](Relation_List.md) | 4 | ~9,879 | ✅ |
| [CusTolCst](CusTolCst.md) | 15 | ~0 | ✅ |
| [RESERVATION_ETC_INFO](RESERVATION_ETC_INFO.md) | 16 | ~29,238 | ✅ |
| [RESERVE_HISTORY](RESERVE_HISTORY.md) | 44 | ~6,853,726 | ✅ |
| [LENS](LENS.md) | 37 | ~11,371 | ✅ |
| [Notice_List](Notice_List.md) | 12 | ~7 | ✅ |
| [HOSPITAL_CFG](HOSPITAL_CFG.md) | 16 | ~1 | ✅ |
| [Clinic_Assign](Clinic_Assign.md) | 15 | ~169,809 | ✅ |
| [RFCARD_LIST](RFCARD_LIST.md) | 10 | ~317,471 | ✅ |
| [Schedule](Schedule.md) | 13 | ~10,073 | ✅ |
| [Schedule_List](Schedule_List.md) | 8 | ~84,991 | ✅ |

## MCRM

| 테이블 | 컬럼 수 | 행 수 | 문서 |
|--------|---------|-------|------|
| [Mh_Opdesk](Mh_Opdesk.md) | 14 | ~143,489 | ✅ |
| [mh_java](mh_java.md) | 7 | ~59,408 | ✅ |
| [DoctorMaster](DoctorMaster.md) | 9 | ~21 | ✅ |

## IPLUS

| 테이블 | 컬럼 수 | 행 수 | 문서 |
|--------|---------|-------|------|
| [PTNTSIGN_New](PTNTSIGN_New.md) | 19 | ~104,941 | ✅ |

---

## 재생성 방법

```bash
# 골격만 생성 (기존 수기 보강 파일은 건너뜀)
node tools/generate-table-catalog.js

# 전체 재생성 (기존 파일 .bak 백업 후 덮어쓰기)
node tools/generate-table-catalog.js --force
```

## 역할 분리

| 문서 | 역할 |
|------|------|
| `CLAUDE.md` | 운영 원칙, 함정 요약, 협업 규칙 |
| `docs/db/tables/*.md` | 테이블 사실 정보, 조인 키, 컬럼, 사용처 |
| `docs/db/db-*.md` | 화면/패널 맥락 (기존 유지) |