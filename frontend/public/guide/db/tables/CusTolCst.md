# CusTolCst

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: 0 (WORK·PROD 모두, 2026-08-10 확인)
> **최종 갱신**: 2026-08-10 (WORK·PROD DB 실측 대조)

## 역할

고객 동의서(서명) 관리 테이블. 동의(`CusCstDte`/`CusCstEmp`)·회수(`CusRvc*`)·거부(`CusRfs*`) 일자와 담당 직원, 서명 이미지(`CusSigImg` image)를 담는 구조이나 **WORK·PROD 모두 0행 — 실사용 없음**.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | idx | int | |
| JOIN | CusNum | nvarchar(13) | NOT NULL → CUSTOM.CUST_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| idx | int | N | | PK |
| CusNum | nvarchar(13) | N | |  |
| CusStt | char(1) | Y | |  |
| CusCstDte | nchar(10) | Y | |  |
| CusCstEmp | nchar(6) | Y | |  |
| CusRvcDte | nchar(10) | Y | |  |
| CusRvcEmp | nchar(6) | Y | |  |
| CusRvcCtt | nvarchar(100) | Y | |  |
| CusMmo | nvarchar(300) | Y | |  |
| CusSigImg | image(2147483647) | Y | |  |
| CusRfsDte | nchar(10) | Y | |  |
| CusRfsEmp | nchar(6) | Y | |  |
| CusRfsCtt | nvarchar(100) | Y | |  |
| Pad_Num | int | Y | |  |
| DocFlg | char(1) | Y | |  |

## 함정 (Gotchas)

- **빈 테이블 (2026-08-10 기준 WORK·PROD 모두 0행)**: 조회 로직을 새로 붙이기 전에 실데이터 적재 여부부터 확인할 것.
- `CusSigImg`는 레거시 `image` 타입 — 신규 코드에서 다룰 일이 생기면 varbinary(max) 캐스팅 주의.

## 사용처

<!-- TODO: grep -r 'FROM CusTolCst\|JOIN CusTolCst' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
