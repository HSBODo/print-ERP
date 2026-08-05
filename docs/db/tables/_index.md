# 테이블 카탈로그 인덱스

> 자동 생성: 2026-04-20 | 재생성: `node tools/generate-table-catalog.js`
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
| [CUSTOM](CUSTOM.md) | 61 | ~583,429 | ✅ |
| [RESERVATION](RESERVATION.md) | 58 | ~3,478,570 | ✅ |
| [EMPLOYEE](EMPLOYEE.md) | 50 | ~1,440 | ✅ |
| [OPERATIONDATA](OPERATIONDATA.md) | 84 | ~304,087 | ✅ |
| [COSTPRICE](COSTPRICE.md) | 31 | ~853,077 | ✅ |
| [EXAM](EXAM.md) | 84 | ~413,814 | ✅ |
| [EXAM_FU](EXAM_FU.md) | 35 | ~15 | ✅ |
| [Cataract_Exam](Cataract_Exam.md) | 87 | ~9,407 | ✅ |
| [Cataract_Operationdata](Cataract_Operationdata.md) | 144 | ~5,412 | ✅ |
| [AS_LIST](AS_LIST.md) | 16 | ~71,791 | ✅ |
| [RECALL_LIST](RECALL_LIST.md) | 17 | ~22,340 | ✅ |
| [RECALL_MR_LIST](RECALL_MR_LIST.md) | 13 | ~37,594 | ✅ |
| [COUNSEL_LIST](COUNSEL_LIST.md) | 15 | ~474,760 | ✅ |
| [CTI_COUNSEL_LIST](CTI_COUNSEL_LIST.md) | 17 | ~438,560 | ✅ |
| [CUSTOM_HISTORY](CUSTOM_HISTORY.md) | 22 | ~2,498,487 | ✅ |
| [CUSTOM_MEMO](CUSTOM_MEMO.md) | 3 | ~237,255 | ✅ |
| [MsgSndLst](MsgSndLst.md) | 15 | ~6,730,927 | ✅ |
| [MOTIVE_NEW01](MOTIVE_NEW01.md) | 32 | ~499,127 | ✅ |
| [MOTIVE_NEW02](MOTIVE_NEW02.md) | 16 | ~569,005 | ✅ |
| [SNS_LIST](SNS_LIST.md) | 4 | ~412 | ✅ |
| [Relation_List](Relation_List.md) | 4 | ~9,879 | ✅ |
| [CusTolCst](CusTolCst.md) | 15 | ~0 | ✅ |
| [RESERVATION_ETC_INFO](RESERVATION_ETC_INFO.md) | 10 | ~28,413 | ✅ |
| [RESERVE_HISTORY](RESERVE_HISTORY.md) | 44 | ~6,751,231 | ✅ |
| [LENS](LENS.md) | 37 | ~11,053 | ✅ |
| [Notice_List](Notice_List.md) | 12 | ~7 | ✅ |
| [HOSPITAL_CFG](HOSPITAL_CFG.md) | 16 | ~1 | ✅ |
| [Clinic_Assign](Clinic_Assign.md) | 15 | ~166,813 | ✅ |
| [RFCARD_LIST](RFCARD_LIST.md) | 10 | ~82,819 | ✅ |
| [Schedule](Schedule.md) | 13 | ~8,922 | ✅ |
| [Schedule_List](Schedule_List.md) | 8 | ~71,568 | ✅ |

## MCRM

| 테이블 | 컬럼 수 | 행 수 | 문서 |
|--------|---------|-------|------|
| [Mh_Opdesk](Mh_Opdesk.md) | 14 | ~140,485 | ✅ |
| [mh_java](mh_java.md) | 7 | ~59,406 | ✅ |
| [DoctorMaster](DoctorMaster.md) | 9 | ~21 | ✅ |

## IPLUS

| 테이블 | 컬럼 수 | 행 수 | 문서 |
|--------|---------|-------|------|
| [PTNTSIGN_New](PTNTSIGN_New.md) | 17 | ~103,774 | ✅ |

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