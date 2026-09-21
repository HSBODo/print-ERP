# CusTolCst

> **DB**: SOFTCRM | **컬럼**: 15개 | **행 수**: ~0 (WORK DB 기준)
> **최종 갱신**: 2026-04-20 (자동 생성)

## 역할

<!-- TODO: 한 줄 설명 -->

## PK / FK / JOIN 키

| 키 | 컬럼 | 타입 | 설명 |
|-----|------|------|------|
| PK | idx | int | |

<!-- TODO: FK, JOIN 키 추가 -->

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

<!-- TODO: 이 테이블의 알려진 함정 -->

## 사용처

<!-- TODO: grep -r 'FROM CusTolCst\|JOIN CusTolCst' routes services -->

## 관련 문서

- [db-structure-overview.md](../db-structure-overview.md)

## 대표 조회 예시

```sql
-- TODO
```
