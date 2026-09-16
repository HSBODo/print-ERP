# Notice_List

> **DB**: SOFTCRM | **컬럼**: 12개 | **행 수**: ~7 (WORK DB 기준)
> **최종 갱신**: 2026-08-10 (WORK DB 실측 대조)

## 역할

사내 공지사항 테이블. 제목/본문(`notice_content` nvarchar(max))·게시 기간(`start_date`~`end_date`)·고정(`is_pinned`)/중요(`is_important`) 플래그·대상 부서(`target_dept`)를 보관하는 소규모 테이블.

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | (없음 — heap 테이블, 2026-08-10 실측 확인) | | `pkey` int NOT NULL이 있으나 PK 제약 미설정 |
| JOIN | emp_num | nchar(6) | 등록 직원 → EMPLOYEE.EMP_NUM |

## 핵심 컬럼

| 컬럼 | 타입 | NULL | 설명 | 비고 |
|------|------|------|------|------|
| pkey | int | N | |  |
| item_code | nchar(2) | Y | |  |
| seq | int | Y | |  |
| notice_title | nvarchar(50) | Y | |  |
| notice_content | nvarchar(max) | Y | 공지 본문 |  |
| emp_num | nchar(6) | Y | |  |
| reg_date | nchar(20) | Y | |  |
| start_date | nchar(10) | Y | |  |
| end_date | nchar(10) | Y | |  |
| is_pinned | nchar(1) | N | |  |
| is_important | nchar(1) | N | |  |
| target_dept | nvarchar(200) | Y | |  |

## 함정 (Gotchas)

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM Notice_List\|JOIN Notice_List' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
