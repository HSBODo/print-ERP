#!/bin/bash
#
# analytics 컨테이너 진입점.
#
# Phase 3 (2026-10-23) 로 레거시 홈페이지 MariaDB SSH 터널을 전면 제거.
# 통계·마트 조회는 전부 warehouse Postgres(RDS) 로 통일돼 추가 터널·사이드카가 없다.

set -e

exec java $JAVA_OPTS -jar /app/app.jar
