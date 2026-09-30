import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { smsApi } from '../api'
import type { SmsQueryBasis, SmsTargetRequest } from '../type/api'

const TARGETS_KEY = 'sms-management-targets'

/**
 * 발송 대상 목록 — 수술일 기간 기준.
 * enabled=false 면 조회하지 않는다(화면에 들어오자마자 자동 조회하지 않기 위해).
 */
export function useSmsTargets(
  from: string,
  to: string,
  enabled = true,
  basis: SmsQueryBasis = 'SURGERY',
  templateCode?: string,
) {
  return useQuery({
    queryKey: [TARGETS_KEY, from, to, basis, templateCode ?? ''],
    queryFn: ({ signal }) =>
      smsApi.getTargets(from, to, basis, templateCode, signal),
    enabled,
    staleTime: 60 * 1000,
    // 창을 다시 클릭할 때마다 다시 부르지 않는다 — 조회는 [조회] 버튼이 정한다.
    // 켜 두면 alt-tab 만 해도 목록이 갱신돼 선택이 흔들린다.
    refetchOnWindowFocus: false,
  })
}

export function useSmsTemplates() {
  return useQuery({
    queryKey: ['sms-management-templates'],
    queryFn: ({ signal }) => smsApi.getTemplates(signal),
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * 솔라피 알림톡 템플릿 검증 조회 — 우리 env 에 설정된 슬롯만 카카오 승인 상태·본문과 함께.
 * enabled 로 모달 열릴 때만 호출. 카카오 승인 문구는 자주 바뀌지 않아 캐시 5분.
 */
export function useSolapiTemplates(enabled: boolean) {
  return useQuery({
    queryKey: ['sms-management-solapi-templates'],
    queryFn: ({ signal }) => smsApi.getSolapiTemplates(signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/** 목록을 바꾸는 모든 액션 — 성공 시 대상 목록 캐시를 무효화해 화면을 갱신한다. */
export function useSmsMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [TARGETS_KEY] })

  const create = useMutation({
    mutationFn: (request: SmsTargetRequest) => smsApi.createTarget(request),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, request }: { id: number; request: SmsTargetRequest }) =>
      smsApi.updateTarget(id, request),
    onSuccess: invalidate,
  })
  const changeStatus = useMutation({
    mutationFn: ({ id, value }: { id: number; value: 'SENDABLE' | 'HOLD' }) =>
      smsApi.changeStatus(id, value),
    onSuccess: invalidate,
  })
  const changeStatusBulk = useMutation({
    mutationFn: ({
      targetIds,
      value,
    }: {
      targetIds: number[]
      value: 'SENDABLE' | 'HOLD'
    }) => smsApi.changeStatusBulk(targetIds, value),
    onSuccess: invalidate,
  })
  /** 수신거부 등록 — 홀딩과 달리 사람 단위라 다음 수술에도 계속 막힌다. */
  const registerOptOut = useMutation({
    mutationFn: (targetIds: number[]) => smsApi.registerOptOut(targetIds),
    onSuccess: invalidate,
  })
  /** 기간은 발송 시각 기준 — 비우면 최근 7일을 본다. */
  const syncResults = useMutation({
    mutationFn: (range?: { sentFrom: string; sentTo: string }) =>
      smsApi.syncResults(range?.sentFrom, range?.sentTo),
    onSuccess: invalidate,
  })
  const importTargets = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      smsApi.importTargets(from, to),
    onSuccess: invalidate,
  })
  /** 차트번호 조회 — 팝업에서 [조회] 버튼으로 실행(자동 조회가 아니라 명시적 액션). */
  const lookup = useMutation({
    mutationFn: (chartNo: string) => smsApi.lookup(chartNo),
  })
  const send = useMutation({
    mutationFn: ({
      targetIds,
      templateCode,
      channel,
    }: {
      targetIds: number[]
      templateCode: string
      channel: 'ALIMTALK' | 'SMS'
    }) => smsApi.send(targetIds, templateCode, channel),
    onSuccess: invalidate,
  })

  return {
    create,
    update,
    changeStatus,
    changeStatusBulk,
    registerOptOut,
    syncResults,
    importTargets,
    send,
    lookup,
  }
}

const OPT_OUTS_KEY = ['sms', 'opt-outs'] as const

/**
 * 수신거부 목록 조회 — 관리 모달에서 씀. 번호는 마스킹된 채로 온다.
 * enabled=false 로 모달 열릴 때만 조회하도록 제어.
 */
export function useSmsOptOuts(enabled = true) {
  return useQuery({
    queryKey: OPT_OUTS_KEY,
    queryFn: ({ signal }) => smsApi.getOptOuts(signal),
    enabled,
    staleTime: 30 * 1000,
  })
}

/**
 * 수신거부 해제 (id 기반). 성공 시 opt-outs 캐시 + targets 캐시 무효화 —
 * 방금 해제한 사람의 대상 상태가 화면에 반영되도록.
 * ⚠️ 홀딩은 자동으로 풀지 않는다 — 서비스 계층 정책.
 */
export function useReleaseSmsOptOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => smsApi.releaseOptOut(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OPT_OUTS_KEY })
      qc.invalidateQueries({ queryKey: [TARGETS_KEY] })
    },
  })
}
