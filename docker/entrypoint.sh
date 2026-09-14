#!/bin/bash
#
# analytics 컨테이너 진입점.
#
# BASTION_SSH_HOST 가 설정되면 백그라운드에서 sshpass 로 SSH 터널을 열어
# 127.0.0.1:13306 → 사내망 MariaDB(bseyecom_db) 로 포워딩한다. 앱은
# HOMEPAGE_DATASOURCE_URL=jdbc:mariadb://127.0.0.1:13306/bseyecom_db 로
# 이 터널을 통해 접속한다. BASTION_SSH_HOST 미설정 시 터널 없이 앱만 실행 —
# 이 경우 홈페이지 API 는 503 (Reader 빈이 안 뜸).
#
# 왜 이 구조인가:
#   - 사이드카 컨테이너 없이 하나의 이미지로 배포 → Jenkins 파이프라인이 이미지 하나만
#     빌드/푸시하면 됨(서버측 systemd 세팅도 불필요).
#   - 터널 프로세스가 죽으면 재접속 루프로 자동 복구. 배치가 새벽에만 실행되므로
#     짧은 순단이 있어도 실제 영향은 없음.
#
# 필요한 env:
#   BASTION_SSH_HOST     — 점프서버 호스트
#   BASTION_SSH_PORT     — 점프서버 SSH 포트 (기본 22)
#   BASTION_SSH_USER     — SSH 계정
#   BASTION_SSH_PASSWORD — SSH 패스워드 (계정 인증)
#   HOMEPAGE_DB_HOST     — 최종 목적지 MariaDB (기본 192.168.200.32)
#   HOMEPAGE_DB_PORT     — 최종 목적지 포트 (기본 3306)

set -e

if [ -n "$BASTION_SSH_HOST" ]; then
  echo "[entrypoint] Opening SSH tunnel: 127.0.0.1:13306 -> ${HOMEPAGE_DB_HOST:-192.168.200.32}:${HOMEPAGE_DB_PORT:-3306} via ${BASTION_SSH_USER}@${BASTION_SSH_HOST}:${BASTION_SSH_PORT:-22}"

  # 재접속 루프 — 세션이 끊기면 10초 대기 후 재시도. 앱은 계속 살아 있음.
  # sshpass -e 로 SSHPASS env 를 읽는다(-p <pw> 는 ps 로 노출되어 위험).
  export SSHPASS="$BASTION_SSH_PASSWORD"
  (
    while true; do
      sshpass -e ssh \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o PubkeyAuthentication=no \
        -o PreferredAuthentications=password \
        -o ServerAliveInterval=30 \
        -o ServerAliveCountMax=3 \
        -o ExitOnForwardFailure=yes \
        -N \
        -p "${BASTION_SSH_PORT:-22}" \
        -L "127.0.0.1:13306:${HOMEPAGE_DB_HOST:-192.168.200.32}:${HOMEPAGE_DB_PORT:-3306}" \
        "${BASTION_SSH_USER}@${BASTION_SSH_HOST}" \
        || echo "[entrypoint] SSH tunnel exited (code=$?), restarting in 10s..."
      sleep 10
    done
  ) &

  # 터널 준비 대기 (최대 30초). 넘어가면 앱은 그대로 시작 — HikariCP 가 첫 조회 시 다시 시도.
  echo "[entrypoint] Waiting for tunnel to be ready..."
  for i in $(seq 1 30); do
    if nc -z 127.0.0.1 13306 2>/dev/null; then
      echo "[entrypoint] Tunnel ready after ${i}s"
      break
    fi
    sleep 1
  done
else
  echo "[entrypoint] BASTION_SSH_HOST not set — skipping SSH tunnel (homepage API will return 503)"
fi

exec java $JAVA_OPTS -jar /app/app.jar
