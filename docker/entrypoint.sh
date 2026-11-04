#!/bin/bash
#
# 앱 컨테이너 진입점.
set -e

exec java $JAVA_OPTS -jar /app/app.jar
